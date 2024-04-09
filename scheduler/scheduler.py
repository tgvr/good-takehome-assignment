import json
import logging
import pika
import requests
from collections import OrderedDict
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

log = logging.getLogger(__name__)

@dataclass
class WorkerState:
    hostname: str
    throughput: Decimal
    status: str
    latest_job_id: Optional[str] = None
    latest_file_indices: list[int] = field(default_factory=list)
    
    @classmethod
    def from_data(cls, data) -> 'WorkerState':
        return WorkerState(
            hostname=data['hostname'],
            throughput=Decimal(0),
            status='idle'
        )

    def handle_worker_completion(self, num_ops, execution_time):
        self.throughput = Decimal(num_ops) / Decimal(execution_time)
        self.status = 'idle'

    def reset_job_info(self):
        self.latest_job_id = None
        self.latest_file_indices = []


@dataclass
class JobState:
    job_id: str
    num_original_files: int
    num_values: int
    unprocessed_file_indices: list[int]
    wip_distribution: dict[str, list[int]]

    @classmethod
    def from_data(cls, data) -> 'JobState':
        return JobState(
            job_id=data['job_id'],
            num_original_files=data['num_original_files'],
            num_values=data['num_values'],
            unprocessed_file_indices=data['unprocessed_file_indices'],
            wip_distribution={}
        )


class OrderedWorkerPodsDict(OrderedDict):
    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        self.sort_by_value()

    def sort_by_value(self):
        self.sort(key=lambda x: x[1].throughput)

    def sort(self, key):
        items = list(self.items())
        items.sort(key=key)
        super().clear()
        for key, value in items:
            super().__setitem__(key, value)

class Scheduler():
    def __init__(self) -> None:
        self.setup_initial_state()
        self.setup_mq_loop()

    def run(self):
        # Start consuming messages
        log.info("Listening for messages...")
        self.channel.start_consuming()

    def setup_initial_state(self):
        self.worker_pods = OrderedWorkerPodsDict()
        self.jobs: dict[str, JobState] = {}
        self.tmp_jobs_completed: list[str] = []

    def setup_mq_loop(self):
        # Connect to local queue
        connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
        self.channel = connection.channel()

        # Declare the queue to consume from
        self.channel.queue_declare(queue='scheduler_queue')
        self.channel.basic_consume(queue='scheduler_queue', on_message_callback=self.callback, auto_ack=False)

    def handle_worker_added(self, data: dict):
        # A new worker node has made itself visible. Add it to the list of workers. Connect to its queue. Initialize with a 0 throughput.

        """
        {
            "message_type": "worker_added",
            "hostname": "worker-1",
        }
        """

        log.info(f"Worker {data['hostname']} added")

        worker_state = WorkerState.from_data(data)
        self.worker_pods[worker_state.hostname] = worker_state

        self.delegate_tasks()

    def handle_worker_removed(self, hostname: str):
        # We found out that the worker is no longer available. If any work was in progress on this node, reset that. Remove the worker from the list of workers.

        log.info(f"Worker {hostname} removed")

        worker_state: WorkerState = self.worker_pods[hostname]
        job_id = worker_state.latest_job_id
        file_indices = worker_state.latest_file_indices
        if job_id and file_indices:
            job_state = self.jobs[job_id]
            job_state.unprocessed_file_indices.extend(file_indices)
            del job_state.wip_distribution[hostname]
        
        del self.worker_pods[hostname]

    def handle_worker_completed(self, data: dict):
        # A worker has completed a task. Update the worker's throughput, re-sort the list of workers and add the next task to the worker.

        """
        {
            "message_type": "worker_completed",
            "hostname": "worker-1",
            "job_id": "job-1",
            "num_ops": 1000,
            "execution_time": 1.0,
            "output_file_index": 15,
        }
        """

        log.info(f"Worker {data['hostname']} completed, data: {json.dumps(data)} further processing...")

        num_ops = data['num_ops']
        execution_time = data['execution_time']
        hostname = data['hostname']
        output_file_index = data['output_file_index']

        worker_state: WorkerState = self.worker_pods[hostname]
        worker_state.handle_worker_completion(num_ops, execution_time)
        self.worker_pods.sort_by_value()

        job_state = self.jobs[worker_state.latest_job_id]
        job_state.unprocessed_file_indices.append(output_file_index)
        del job_state.wip_distribution[hostname]
        
        worker_state.reset_job_info()
        self.delegate_tasks()

    def handle_job_added(self, data: dict):
        # A new job has been added. Add it to the list of jobs. Delegate tasks to workers.

        """
        {
            "message_type": "job_added",
            "job_id": "job-1",
            "num_original_files": 10,
            "num_values": 1000,
            "unprocessed_file_indices": ["file-1", "file-2", "file-3"],
        }
        """

        job_state = JobState.from_data(data)
        self.jobs[job_state.job_id] = job_state
        log.info(f"Job {job_state.job_id} added")

        self.delegate_tasks()

    def handle_job_completed(self, job_id: str):
        log.info(f"Job {job_id} completed, further processing...")

        url = "http://backend:8000/api/notify_job_completed"
        data = {
            "jobId": job_id
        }
        response = requests.post(url, json=data)

        if response.status_code == 200:
            log.info(f"Job {job_id} completion notification sent successfully")
        else:
            log.info(f"Failed to send job {job_id} completion notification")

        self.tmp_jobs_completed.append(job_id)

    def delegate_tasks(self):
        # Taking input as self.jobs and self.worker_pods, delegate tasks to workers till there are no workers available. Also, figure out if a job is completed.

        free_workers = [hostname for hostname, worker_state in self.worker_pods.items() if worker_state.status == 'idle']
        log.info(f"Length of free workers: {len(free_workers)}")
        log.info(f"Length of jobs: {len(self.jobs)}")

        if not self.jobs:
            return

        for job_id, job_state in self.jobs.items():
            if not free_workers:
                return

            # Case 1: Job has no unprocessed files (assert that it has a wip_distribution)
            if not job_state.unprocessed_file_indices:
                assert job_state.wip_distribution

            # Case 2: Job has one unprocessed file index, and it is -1 (assert that it has no wip_distribution)
            elif len(job_state.unprocessed_file_indices) == 1 and job_state.unprocessed_file_indices[0] == -1:
                assert not job_state.wip_distribution
                # this means that the job is completed
                self.handle_job_completed(job_id)

            # Case 3: Job has one unprocessed file index, and it is not -1 (assert that it has no wip_distribution)
            elif len(job_state.unprocessed_file_indices) == 1 and job_state.unprocessed_file_indices[0] != -1:
                if not job_state.wip_distribution:
                    # this means that the mean needs to be computed
                    hostname = free_workers[-1]
                    self.schedule_task_to_worker(job_id, hostname, task_type='average')
                    free_workers.pop()

            # Case 4: Job has more than one unprocessed file indices
            else:
                # assign unprocessed file indices to worker meeting the following conditions:
                # 1. not more than 5 indices are assigned to a worker
                # 2. ratio of number of indices assigned to each worker should be in ratio of their throughput (so higher throughput workers get more work, while not processing more than 5 indices)
                # 3. miniumum number of indices assigned to a worker should be 2

                # for simplicity, we will assign 2-5 indices to each worker, greedily

                while free_workers and len(job_state.unprocessed_file_indices) > 1:
                    hostname = free_workers[-1]
                    self.schedule_task_to_worker(job_id, hostname, task_type='aggregate')
                    free_workers.pop()

        if self.tmp_jobs_completed:
            for job_id in self.tmp_jobs_completed:
                del self.jobs[job_id]
            self.tmp_jobs_completed = []

    def schedule_task_to_worker(self, job_id: str, hostname: str, task_type: str):
        log.info(f"Scheduling task {task_type} for job {job_id} to worker {hostname}")

        max_indices_per_worker = 5
        job_state = self.jobs[job_id]
        file_indices = job_state.unprocessed_file_indices[:max_indices_per_worker]

        message_data = {
            'job_id': job_id,
            'file_indices': file_indices,
            'task_type': task_type,
            'num_original_files': job_state.num_original_files,
        }
        worker_state: WorkerState = self.worker_pods[hostname]
        self.publish_message_to_worker_queue(hostname, message_data)
        worker_state.latest_job_id = job_id
        worker_state.latest_file_indices = file_indices
        worker_state.status = 'busy'

        job_state.wip_distribution[hostname] = file_indices
        job_state.unprocessed_file_indices = job_state.unprocessed_file_indices[max_indices_per_worker:]

    def callback(self, ch, method, properties, body):        
        data = json.loads(body)
        message_type_to_handler = {
            'worker_added': self.handle_worker_added,
            'worker_completed': self.handle_worker_completed,
            'job_added': self.handle_job_added,
        }
        message_type = data['message_type']
        handler = message_type_to_handler.get(message_type)
        if handler:
            handler(data)
        else:
            log.error(f"Unknown message type: {message_type}")
        
        ch.basic_ack(delivery_tag=method.delivery_tag)

    def publish_message_to_worker_queue(self, hostname: str, message_data: dict):
        data = json.dumps(message_data)
        log.info(f"Publishing message {data} to worker {hostname}")
        self.channel.basic_publish(exchange='', routing_key=f'worker_{hostname}_queue', body=data)


if __name__ == '__main__':
    scheduler = Scheduler()
    scheduler.run()