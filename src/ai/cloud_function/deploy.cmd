@echo off
setlocal
cd /d "%~dp0"

set "ENV_ID=%~1"
if "%ENV_ID%"=="" set "ENV_ID=bumpy-damselfly-d5fm66ql428df3c9"

call build.cmd
if errorlevel 1 exit /b 1

if defined TCB_CMD (
  call "%TCB_CMD%" fn deploy ai-extract --runtime Nodejs18.15 --dir dist-function --install-dependency false --force -e %ENV_ID%
  if errorlevel 1 exit /b 1
  call "%TCB_CMD%" --cwd "%~dp0..\..\.." deploy --only gateway -e %ENV_ID%
) else (
  where tcb >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] CloudBase CLI not found.
    echo Install it first: npm install -g @cloudbase/cli
    exit /b 1
  )
  call tcb fn deploy ai-extract --runtime Nodejs18.15 --dir dist-function --install-dependency false --force -e %ENV_ID%
  if errorlevel 1 exit /b 1
  call tcb --cwd "%~dp0..\..\.." deploy --only gateway -e %ENV_ID%
)
set "code=%ERRORLEVEL%"
exit /b %code%
