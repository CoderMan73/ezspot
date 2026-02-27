@REM Builds and pushes docker to gitlab. Remember to change name and versioning.

@REM DONT change registry
set REGISTRY=container.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot
set VERSION=v0.1

@REM Use bat working directory
cd /d %~dp0

@REM Build and push frontend
cd ../frontend
docker build -t %REGISTRY%/frontend:%VERSION% .
docker push %REGISTRY%/frontend:%VERSION%

@REM Build and push backend
cd ../backend
docker build -t %REGISTRY%/backend:%VERSION% .
docker push %REGISTRY%/backend:%VERSION%