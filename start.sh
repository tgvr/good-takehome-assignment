docker build -t localhost:5001/worker-img ./worker/
docker push localhost:5001/worker-img
docker build -t localhost:5001/backend-img ./backend/
docker push localhost:5001/backend-img
docker build -t localhost:5001/webapp-img ./webapp/
docker push localhost:5001/webapp-img
docker build -t localhost:5001/scheduler-img ./scheduler/
docker push localhost:5001/scheduler-img
docker compose up -d
