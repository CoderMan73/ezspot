@REM This will build the frontend docker image and run it using nginx.
@REM Go to localhost:3000 to see the frontend

cd frontend
docker build -t frontend .
docker run -p 3000:80 frontend

