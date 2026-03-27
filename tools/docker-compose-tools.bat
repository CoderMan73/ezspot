@echo off

cd /d %~dp0

cd ..

if "%1"=="" (
    echo Please provide 'up' or 'down' as argument
    exit /b 1
)

if /I "%1"=="up" (
    echo Starting Docker Compose stack...
    docker-compose up --build -d
    echo Stack started.
    echo Frontend: http://localhost:3000/
    echo Backend: http://localhost:5000/api
    echo Adminer: http://localhost:8080
    exit /b 0
)

if /I "%1"=="down" (
    echo Stopping Docker Compose stack...
    docker-compose down
    echo Stack stopped.
    exit /b 0
)

echo Invalid argument. Use 'up' or 'down'.
exit /b 1