@echo off

@REM Use bat working directory
cd /d %~dp0

@REM Remove old containers
docker rm -f ezspot-frontend 2>nul
docker rm -f ezspot-backend 2>nul

@REM Build and run frontend
cd ../frontend
docker build -t frontend .
docker run -d -p 3000:80 --name ezspot-frontend frontend

@REM Build and run backend
cd ../backend
docker build -t backend .
docker run -d -p 5000:3000 --name ezspot-backend backend

@REM How to access containers
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000