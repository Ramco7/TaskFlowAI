@echo off
setlocal
cd /d "%~dp0"

set "ENV_ID=%~1"
if "%ENV_ID%"=="" set "ENV_ID=bumpy-damselfly-d5fm66ql428df3c9"
set "PREVIEW_PATH=preview-ai"

if exist dist-preview rmdir /s /q dist-preview
mkdir dist-preview
copy /y index.html dist-preview\index.html >nul
mkdir dist-preview\src\ai
copy /y src\ai\ai-config.js dist-preview\src\ai\ai-config.js >nul
copy /y src\ai\ai-mock.js dist-preview\src\ai\ai-mock.js >nul
copy /y src\ai\ai-panel.js dist-preview\src\ai\ai-panel.js >nul
copy /y src\ai\ai.css dist-preview\src\ai\ai.css >nul

if defined TCB_CMD (
  call "%TCB_CMD%" hosting deploy .\dist-preview %PREVIEW_PATH% -e %ENV_ID% --safe
) else (
  where tcb >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] CloudBase CLI not found.
    echo Install it first: npm install -g @cloudbase/cli
    rmdir /s /q dist-preview
    exit /b 1
  )
  call tcb hosting deploy .\dist-preview %PREVIEW_PATH% -e %ENV_ID% --safe
)
set "code=%ERRORLEVEL%"

rmdir /s /q dist-preview
exit /b %code%
