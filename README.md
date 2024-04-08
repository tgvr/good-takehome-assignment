# good-takehome-assignment

This repo contains my code for a short yet good takehome assignment from a early stage startup. The problem provides insights into the following skills:

- Backend Development (using express.js + Typescript)
- Setting up and using message queues + basics of designing and working with distributed systems
- Webapp Development (I chose React.js + vite + Material UI component library)
- Building a Scheduler that breaks down jobs into tasks and assigns them to Workers. The Scheduler focuses on minimizing the execution time for job picked first.
- Building a fleet of Worker nodes which register themselves with the Scheduler and process the tasks assigned to them.
- Building and deploying containerized applications (using Docker).
- Some barebones level of SQL code.
- Modelling HLD given the problem statement and comparing and contrasting tradeoffs between potential approaches.

## Instructions:

First, have a working Docker setup.

```bash
git clone https://github.com/tgvr/good-takehome-assignment.git
cd ./good-takehome-assignment
docker run -d -p 5001:5000 --restart=always --name registry registry:2

# Build the worker container image
docker build -t localhost:5001/worker-img ./worker/
docker push localhost:5001/worker-img

# Backend
docker build -t localhost:5001/backend-img ./backend/
docker push localhost:5001/backend-img

# Webapp
docker build -t localhost:5001/webapp-img ./webapp/
docker push localhost:5001/webapp-img

# Scheduler
docker build -t localhost:5001/scheduler-img ./scheduler/
docker push localhost:5001/scheduler-img

docker compose up -d
```
