@echo off
REM Prevent changes from leaking to parent shell
setlocal

REM Switch to this script's directory first, then move to the repo root so docker-compose runs from the expected location.
cd /d %~dp0
cd ..

if "%1"=="" (
    echo Please provide 'up' or 'down' as argument
    exit /b 1
)

REM /I makes the comparison case-insensitive, so UP/up/Up all work.
if /I "%1"=="up" (
    echo Starting Docker Compose stack...
    call :run_docker_command docker-compose up --build -d
    REM If the helper reports any failure, stop here and return a non-zero exit code.
    if errorlevel 1 exit /b 1

    echo Stack started.
    echo Frontend: http://localhost:3000/
    echo Backend: http://localhost:5000/api
    echo Adminer: http://localhost:8080
    exit /b 0
)

if /I "%1"=="down" (
    echo Stopping Docker Compose stack...
    call :run_docker_command docker-compose down
    if errorlevel 1 exit /b 1

    echo Stack stopped.
    exit /b 0
)

echo Invalid argument. Use 'up' or 'down'.
exit /b 1

:run_docker_command
REM Create a temporary log file path so we can inspect docker-compose output before deciding what to print.
set "LOG_FILE=%TEMP%\docker-compose-tools-%RANDOM%-%RANDOM%.log"
REM %* means "all arguments passed to this label". Here that becomes the docker-compose command.
REM > redirects standard output to the log file. 2>&1 redirects standard error there too.
%* > "%LOG_FILE%" 2>&1
REM Save the docker-compose exit code immediately, because later commands would overwrite ERRORLEVEL.
set "COMMAND_EXIT=%ERRORLEVEL%"

REM findstr searches the captured output for the Docker Desktop named-pipe error.
REM /I makes the match case-insensitive. If the text is found, ERRORLEVEL becomes 0.
findstr /I /C:"dockerDesktopLinuxEngine" "%LOG_FILE%" >nul
set "HAS_ENGINE_ERROR=%ERRORLEVEL%"
findstr /C:"The system cannot find the file specified." "%LOG_FILE%" >nul
set "HAS_MISSING_FILE_ERROR=%ERRORLEVEL%"

REM If either string was not found, this was some other docker-compose result.
REM In that case, fall through to the normal path that prints the original output.
if not "%HAS_ENGINE_ERROR%"=="0" goto return_command_exit
if not "%HAS_MISSING_FILE_ERROR%"=="0" goto return_command_exit

REM If both strings were found, suppress the raw Docker error and print the friendlier message instead.
del "%LOG_FILE%" >nul 2>&1
echo Stack not started, please start Docker Desktop Engine.
exit /b 1

:return_command_exit
REM For all other cases, replay the original docker-compose output so normal errors stay visible.
type "%LOG_FILE%"
del "%LOG_FILE%" >nul 2>&1
exit /b %COMMAND_EXIT%
