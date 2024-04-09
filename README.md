# good-takehome-assignment

<img width="1269" alt="image" src="https://github.com/tgvr/good-takehome-assignment/assets/18230127/7b231dd2-b1cb-4204-ba85-4f169363c23d">

This repo contains my code for a short yet good takehome assignment from a early stage startup. The problem provides insights into the following skills:

- Backend Development (using express.js + Typescript)
- Setting up and using message queues + basics of designing and working with distributed systems
- Webapp Development (I chose React.js + vite + Material UI component library)
- Building a Scheduler that breaks down jobs into tasks and assigns them to Workers. The Scheduler focuses on minimizing the execution time for job picked first.
- Building a fleet of Worker nodes which register themselves with the Scheduler and process the tasks assigned to them.
- Building and deploying containerized applications (using Docker).
- Some barebones level of SQL code.
- Modelling HLD given the problem statement and comparing and contrasting tradeoffs between potential approaches.
- Storing certain type of data in Redis

## Instructions:

First, have a working Docker setup. `docker` and `docker compose` should be working in your CLI.

```bash
git clone https://github.com/tgvr/good-takehome-assignment.git
cd ./good-takehome-assignment
docker run -d -p 5001:5000 --restart=always --name registry registry:2

./start.sh
```
