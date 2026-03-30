# CAPSP26-COE PDF Extraction Team-E-ZSpot

# Project Description
This project will take a SPOT scores document and generate documents in an easy to understand way.

# Stack
MERN stack:
    - MySQL
    - Express
    - React
    - Node

# Requirements
Docker Desktop / Docker Engine must be running.

# How to Run
To locally run in project directory:
- `.\tools\docker-compose-tools.bat up`
- Script will list where to access spun up services.

To locally stop run in project directory:
- `.\tools\docker-compose-tools.bat down`

# How to Login to Adminer
Enter these values into the fields:
System: MySQL / MariaDB
Server: database
Username: user1
Password: DB_PASSWORD in `.env`
Database: database to enter (optional)


# Documentation

- [Docker Guide](docs/Docker.md)
- [Auth Guide](docs/Auth.md)
- [Environment Variables Guide](docs/EnvironmentGuide.md)
