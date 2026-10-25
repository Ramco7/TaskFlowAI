@echo off
setlocal
cd /d "%~dp0"

set "ENV_ID=%~1"
if "%ENV_ID%"=="" set "ENV_ID=bumpy-damselfly-d5fm66ql428df3c9"

if exist dist rmdir /s /q dist
mkdir dist
copy /y index.html dist\index.html >nul
mkdir dist\src\ai
copy /y src\ai\ai-config.js dist\src\ai\ai-config.js >nul
copy /y src\ai\ai-mock.js dist\src\ai\ai-mock.js >nul
copy /y src\ai\ai-panel.js dist\src\ai\ai-panel.js >nul
copy /y src\ai\ai.css dist\src\ai\ai.css >nul

if defined TCB_CMD (
  call "%TCB_CMD%" hosting deploy .\dist -e %ENV_ID% --safe
) else (
  where tcb >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] CloudBase CLI not found.
    echo Install it first: npm install -g @cloudbase/cli
    echo Then run: tcb login
    rmdir /s /q dist
    exit /b 1
  )
  call tcb hosting deploy .\dist -e %ENV_ID% --safe
)
set "code=%ERRORLEVEL%"

rmdir /s /q dist
exit /b %code%
