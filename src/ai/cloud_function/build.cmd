@echo off
setlocal
cd /d "%~dp0"

if exist dist-function rmdir /s /q dist-function
mkdir dist-function
copy /y index.js dist-function\index.js >nul
copy /y package.json dist-function\package.json >nul
copy /y ..\extraction.schema.json dist-function\extraction.schema.json >nul

echo Staged CloudBase function at %CD%\dist-function
