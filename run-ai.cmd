@echo off
setlocal
cd /d "%~dp0"

if not defined BDCCP_API (
  echo [WARN] BDCCP_API is not set. Real-model extraction will return API_KEY_MISSING.
  echo        Mock mode in the page still works without a key.
  echo.
)

python -m pip install --disable-pip-version-check -r src\ai\server\requirements.txt
if errorlevel 1 exit /b 1

python -m uvicorn src.ai.server.app:app --host 127.0.0.1 --port 8766
