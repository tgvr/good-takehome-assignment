const express = require('express');
const { urlencoded, json } = require('express');
const { Pool } = require('pg');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const path = require('path');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');

const app = express(); 

app.use(urlencoded({ extended: true })) 
app.use(json()) 
const pool = new Pool({
    user: 'admin',
    host: 'postgres_db',
    database: 'backend_db',
    password: 'admin',
    port: 5432,
});
const docker = new Docker();

async function createJobRecord(numValues, numFiles) {
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

async function updateJobStatus(jobId, status) {
    const client = await pool.connect();
    try {
      await client.query('UPDATE jobs SET status = $1 WHERE jobId = $2', [status, jobId]);
    } catch (err) {
      console.error(err);
    } finally {
      client.release();
    }
}

async function createFiles(numValues, numFiles, jobId) {
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

async function sendMessageToQueue(messageToScheduler) {
    try {
        const connection = await amqp.connect('amqp://rabbitmq');
        const channel = await connection.createChannel();
        const queue = 'scheduler_queue';

        await channel.assertQueue(queue, { durable: false });
        await channel.sendToQueue(queue, Buffer.from(JSON.stringify(messageToScheduler)));

        console.log(`Message sent to queue: ${JSON.stringify(messageToScheduler)}`);
    } catch (err) {
        console.error(err);
    }
}


app.get('/', (req, res) => res.send('Dockerizing Node Application')) 

app.listen(8000, () => console.log(`[bootup]: Server is running at port: 8000`));

app.post('/api/create_job', async (req, res) => {
    const { numValues, numFiles } = req.body;
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
    const { numWorkers } = req.body;
    if (!Number.isInteger(numWorkers) || numWorkers <= 0) {
        res.status(400).json({ error: 'Invalid input. numWorkers must be a positive number.' });
        return;
    }

    const containers = await docker.listContainers();
    const filteredContainers = containers.filter(container => container.Image === "localhost:5001/worker-img");
    const numContainers = filteredContainers.length;

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