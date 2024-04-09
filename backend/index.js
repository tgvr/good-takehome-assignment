const express = require('express');
const { urlencoded, json } = require('express');
const { Pool } = require('pg');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const path = require('path');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');
const cors = require('cors');
const { createClient } = require('redis');

const app = express();

app.use(urlencoded({ extended: true }))
app.use(json())
app.use(cors({
    origin: '*'
}))

const pool = new Pool({
    user: 'admin',
    host: 'postgres_db',
    database: 'backend_db',
    password: 'admin',
    port: 5432,
});
const docker = new Docker();
const redisClient = createClient({
    url: 'redis://redis:6379'
});

redisClient.on('error', err => console.log('Redis Client Error', err));
redisClient.connect().catch(err => {
    console.error('Failed to connect to Redis:', err);
});


const createJobRecord = async (numValues, numFiles) => {
    const client = await pool.connect();
    try {
      const res = await client.query('INSERT INTO jobs (numValues, numFiles, status) VALUES ($1, $2, $3) RETURNING *', [numValues, numFiles, 'pending_files_creation']);
      return res.rows[0].jobid;
    } catch (err) {
      console.error(err);
    } finally {
      client.release();
    }
}

const updateJobStatus = async (jobId, status) => {
    const client = await pool.connect();
    try {
      await client.query('UPDATE jobs SET status = $1 WHERE jobId = $2', [status, jobId]);
    } catch (err) {
      console.error(err);
    } finally {
      client.release();
    }
}

const createFiles = async (numValues, numFiles, jobId) => {
    const directoryPath = path.join('/data/jobs', jobId);
    if (!existsSync(directoryPath)) {
        mkdirSync(directoryPath, { recursive: true });
    }

    const fileIdentifiers = [];
    for (let i = 1; i <= numFiles; i++) {
        const fileIdentifier = uuidv4();
        const filePath = path.join(directoryPath, `${fileIdentifier}.csv`);
        let fileContent = '';
        for (let j = 0; j < numValues; j++) {
            const randomInt = Math.floor(Math.random() * 1000) + 1;
            fileContent += `${randomInt},`;
        }
        fileContent = fileContent.slice(0, -1); // Remove the last comma
        writeFileSync(filePath, fileContent);
        fileIdentifiers.push(fileIdentifier);
    }
    return { fileIdentifiers };
}

const sendMessageToQueue = async (messageToScheduler) => {
    try {
        const connection = await amqp.connect('amqp://rabbitmq');
        const channel = await connection.createChannel();
        const queue = 'scheduler_queue';

        await channel.assertQueue(queue, { durable: false });
        await channel.sendToQueue(queue, Buffer.from(JSON.stringify(messageToScheduler)));
    } catch (err) {
        console.error(err);
    }
}

const getWorkerContainers = async () => {
    const containers = await docker.listContainers();
    const filteredContainers = containers.filter(container => container.Image === "localhost:5001/worker-img");
    return filteredContainers;
};

app.get('/', (req, res) => res.send('Dockerizing Node Application')) 

app.listen(8000, () => console.log(`[bootup]: Server is running at port: 8000`));

app.post('/api/create_job', async (req, res) => {
    let { numValues, numFiles } = req.body;
    numValues = parseInt(numValues);
    numFiles = parseInt(numFiles);
    if (!Number.isInteger(numValues) || !Number.isInteger(numFiles) || numValues <= 0 || numFiles <= 0) {
        res.status(400).json({ error: 'Invalid input. numValues and numFiles must be positive numbers.' });
        return;
    }

    const jobId = await createJobRecord(numValues, numFiles);
    createFiles(numValues, numFiles, jobId).then(async ({ fileIdentifiers }) => {
        updateJobStatus(jobId, 'input_files_created').then(() => {
            const messageToScheduler = {
                "message_type": "job_added",
                "job_id": jobId,
                "num_original_files": numFiles,
                "num_values": numValues,
                "unprocessed_file_indices": fileIdentifiers,
            }
        
            console.log(`Message to scheduler: ${JSON.stringify(messageToScheduler)}`);
            sendMessageToQueue(messageToScheduler);
        });
    });
    res.status(200).json({ jobId });
});

app.post('/api/notify_job_completed', async (req, res) => {
    const { jobId } = req.body;
    await updateJobStatus(jobId, 'completed');

    res.status(200).json({ jobId });
});

app.post('/api/set_num_workers', async (req, res) => {
    let { numWorkers } = req.body;
    numWorkers = parseInt(numWorkers);
    if (!Number.isInteger(numWorkers) || numWorkers <= 0) {
        res.status(400).json({ error: 'Invalid input. numWorkers must be a positive number.' });
        return;
    }

    const workerContainers = await getWorkerContainers();
    const numContainers = workerContainers.length;
    if (numWorkers < numContainers) {
        res.status(400).json({ error: 'Number of worker containers cannot be less than the current number of replicas.' });
        return;
    }

    const extraContainers = numWorkers - numContainers;
    for (let i = 0; i < extraContainers; i++) {
        docker.createContainer({
            Image: 'localhost:5001/worker-img',
            Env: [
                'PYTHONUNBUFFERED=1',
            ],
            RestartPolicy: {
                Name: 'unless-stopped',
            },
            HostConfig: {
                Binds: [
                    '/Users/tgavara/Developer/good-takehome-assignment/mnt/data/jobs:/data/jobs',
                ],
                NetworkMode: 'good-takehome-assignment_default',
            },
        }).then(container => container.start());
    }

    res.status(200).json({ numWorkers });
});

app.get('/api/get_application_state', async (req, res) => {
    const workerContainers = await getWorkerContainers();
    const jobs = await pool.query('SELECT * FROM jobs');
    const numCompletedJobs = jobs.rows.filter(job => job.status === 'completed').length;
    const numPendingJobs = jobs.rows.filter(job => job.status !== 'completed').length;
    const numWorkers = workerContainers.length;
    const workers = [];
    for (const container of workerContainers) {
        const hostname = container.Id.slice(0, 12);
        let value = JSON.stringify({});
        try {
            value = await redisClient.get(hostname);
            value = JSON.parse(value);
            console.log(value);
        } catch (err) {
            console.log(err);
            console.error(err);
        }
        workers.push({
            hostname,
            // hostname: container.Names[0].substring(1).replace('good-takehome-assignment_', ''),
            container_state: container.State,
            ...value,
        });
    }

    res.status(200).json({
        numWorkers,
        numCompletedJobs,
        numPendingJobs,
        jobs: jobs.rows,
        workers: workers,
    });
});