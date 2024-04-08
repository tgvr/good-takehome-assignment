import pika
import json
import logging
import os
from decimal import Decimal
from uuid import uuid4
import time

log = logging.getLogger(__name__)

class Worker:
    def __init__(self):
        self.setup_mq_loop()

    def run(self):
        # Start consuming messages
        log.info("Listening for messages...")
        self.channel.start_consuming()

    def setup_mq_loop(self):
        connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
        self.channel = connection.channel()

        # Declare the queue to consume from
        self.hostname = os.getenv('HOSTNAME')
        self.local_queue_name = f'worker_{self.hostname}_queue'
        self.channel.queue_declare(queue=self.local_queue_name)
        self.channel.basic_consume(queue=self.local_queue_name, on_message_callback=self.callback, auto_ack=False)

        # Connect to scheduler queue
        self.channel.queue_declare(queue='scheduler_queue')
        self.publish_message_to_scheduler_queue({
            "message_type": "worker_added",
            "hostname": self.hostname,
        })

    def callback(self, ch, method, properties, body):
        data = json.loads(body)
        task_type_to_handler = {
            'aggregate': self.handle_aggregation_task,
            'average': self.handle_average_task,
        }
        task_type = data['task_type']
        handler = task_type_to_handler.get(task_type)
        if handler:
            handler(data)
        else:
            log.error(f"Unknown task type: {task_type}")
        
        ch.basic_ack(delivery_tag=method.delivery_tag)

    def handle_aggregation_task(self, data: dict):
        """
        {
            "task_type": "aggregate",
            "job_id": "26b99d33-2ced-4a2a-aefd-5354a85ba566",
            "num_original_files": 3,
            "file_indices": ["dab412d9-0ce6-48ae-894e-04a0d3fa55b3", "dab412d9-0ce6-48ae-894e-04a0d3fa55b4"],
        }
        """

        start_time = time.process_time()

        job_id = data['job_id']
        file_indices = data['file_indices']

        # Read the numbers from each input file
        numbers = []
        for file_index in file_indices:
            file_url = os.path.abspath(f"/data/jobs/{job_id}/{file_index}.csv")
            with open(file_url, 'r') as f:
                line = f.readline().strip()
                numbers.append([Decimal(num) for num in line.split(',')])

        # Calculate the sum of numbers in the same position
        sums = [sum(nums) for nums in zip(*numbers)]

        # Write the sums to the output file
        output_file_index = str(uuid4())
        output_file_url = os.path.abspath(f"/data/jobs/{job_id}/{output_file_index}.csv")
        with open(output_file_url, 'w') as f:
            f.write(','.join(str(num) for num in sums))

        end_time = time.process_time()
        execution_time = end_time - start_time

        message_to_scheduler = {
            "message_type": "worker_completed",
            "hostname": self.hostname,
            "job_id": job_id,
            "num_ops": len(sums)*len(data['file_indices']),
            "execution_time": execution_time,
            "output_file_index": output_file_index,
        }
        self.publish_message_to_scheduler_queue(message_to_scheduler)

    def handle_average_task(self, data: dict):
        # Read the file, divide each number by the num_original_files value and save the result to a new file.

        """
        {
            "task_type": "average",
            "job_id": "26b99d33-2ced-4a2a-aefd-5354a85ba566",
            "num_original_files": 3,
            "file_indices": ["dab412d9-0ce6-48ae-894e-04a0d3fa55b3"],
        }
        """

        start_time = time.process_time()

        job_id = data['job_id']
        aggregated_file = data['file_indices'][0]
        num_original_files = Decimal(data['num_original_files'])
        file_url = os.path.abspath(f"/data/jobs/{job_id}/{aggregated_file}.csv")

        with open(file_url, 'r') as f:
            line = f.readline().strip()
            numbers = [Decimal(num) for num in line.split(',')]
        divided_numbers = [round(num / num_original_files, 2) for num in numbers]

        output_file_url = os.path.abspath(f"/data/jobs/{job_id}/output_file.csv")
        with open(output_file_url, 'w') as f:
            f.write(','.join(str(num) for num in divided_numbers))

        end_time = time.process_time()
        execution_time = end_time - start_time

        message_to_scheduler = {
            "message_type": "worker_completed",
            "hostname": self.hostname,
            "job_id": job_id,
            "num_ops": len(divided_numbers)*len(data['file_indices']),
            "execution_time": execution_time,
            "output_file_index": -1,
        }
        self.publish_message_to_scheduler_queue(message_to_scheduler)

    def publish_message_to_scheduler_queue(self, message_data: dict):
        self.channel.basic_publish(exchange='', routing_key='scheduler_queue', body=json.dumps(message_data))


if __name__ == '__main__':
    worker = Worker()
    worker.run()