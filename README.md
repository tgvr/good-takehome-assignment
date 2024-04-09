# good-takehome-assignment

<img width="1269" alt="image" src="https://github.com/tgvr/good-takehome-assignment/assets/18230127/7b231dd2-b1cb-4204-ba85-4f169363c23d">
<img width="600" alt="image" src="https://github.com/tgvr/good-takehome-assignment/assets/18230127/d9d82fa1-adda-41d4-abe1-2229bd8e2362">

## Components used:

- Backend: node.js, express.js
- Frontend: React.js, vite, Material UI component library
- Database: Postgres
- Other: Docker, Redis, RabbitMQ

## Instructions:

First, have a working Docker setup. `docker` and `docker compose` should be working in your CLI.

```bash
git clone https://github.com/tgvr/good-takehome-assignment.git
cd ./good-takehome-assignment
docker run -d -p 5001:5000 --restart=always --name registry registry:2

./start.sh
```

You can access the web ui at http://localhost:8080
