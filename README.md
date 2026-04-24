# CAPSP26-COE PDF Extraction Team-E-ZSpot

# Project Description
EZSpot is a full-stack web application designed to simplify the analysis and reporting of SPOT (Student Perceptions of Teaching) scores. It extracts data from SPOT PDF documents, stores them in a structured database, and allows users to generate professional awards lists and Dean's List memos.

# Features
- **PDF Extraction**: Upload raw SPOT PDF reports to extract instructor and course data automatically.
- **Dynamic Statistics**: Interactive charts to visualize professor rating trends over time.
- **Export Generation**:
    - **Prospective Awards List**: Detailed Excel spreadsheet with course-level data.
    - **Top 30 Awards List**: Summary Excel ranking of high-performing instructors.
    - **Teaching Dean's List**: Professional Word document memo with customizable placeholders and automatic teacher list generation.
- **Real-time Updates**: Automatically refreshes report lists and statistics when background processing completes.
- **CAS Integration**: Secure authentication via Virginia Tech's CAS system.

# Stack
- **Frontend**: React (TypeScript), Recharts, CSS3
- **Backend**: Node.js (Express), TypeScript
- **Processing**: Python 3 (openpyxl, python-docx, docxtpl)
- **Database**: MySQL 8.4

# Requirements
- Docker Desktop or Docker Engine.
- Node.js (for local development outside Docker).
- Python 3.10+ (for local development outside Docker).

# How to Run
To locally run in the project directory using Docker Compose:
- `.\tools\docker-compose-tools.bat up`
- The script will output the URLs to access the frontend and backend services.

To stop the services:
- `.\tools\docker-compose-tools.bat down`

# Documentation
- [Docker & Kubernetes Guide](docs/Docker.md)
- [Auth & CAS Guide](docs/Auth.md)
- [Environment Variables Guide](docs/EnvironmentGuide.md)
- [Document Generation Guide (Excel & Word)](docs/DocumentGeneration.md)
