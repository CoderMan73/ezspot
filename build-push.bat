@REM Builds and pushes docker to gitlab. Remember to change name and versioning.
@REM Or edit the batch file to make it easier later.

@REM Build and push frontend
cd frontend
docker build -t container.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot/frontend:v0.1 .
docker push container.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot/frontend:v0.1