@echo off
setlocal enabledelayedexpansion
title PixelTrace Forensic Workstation
color 0F

echo ======================================================================
echo           PIXELTRACE - DIGITAL IMAGE FORENSIC WORKSTATION
echo            Local Offline Multi-Method Evidence Analysis
echo ======================================================================
echo.

:: 1. Verify Python Installation
echo [1/4] Verifying Python runtime environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not detected in your PATH.
    echo Please install Python 3.11 or newer from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYTHON_VER=%%v
echo [OK] Python %PYTHON_VER% detected.

:: 2. Check & Install Python Dependencies
echo.
echo [2/4] Verifying Python forensic dependencies...
python -m pip install -r backend\requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [WARNING] Encountered notice installing dependencies. Retrying with verbose output...
    python -m pip install -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install required Python dependencies.
        pause
        exit /b 1
    )
)
echo [OK] Python forensic libraries verified.

:: 3. Check Web Client Build
echo.
echo [3/4] Verifying web client assets...
if exist "client\dist\index.html" (
    echo [OK] Precompiled workstation UI detected in client\dist.
) else (
    echo Web client not yet built. Checking Node.js environment...
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Node.js is required to compile the client UI for the first time.
        echo Please install Node.js 18+ from: https://nodejs.org/
        pause
        exit /b 1
    )
    echo Building React client assets...
    cd client
    call npm install
    call npm run build
    cd ..
    if not exist "client\dist\index.html" (
        echo [ERROR] Frontend build failed.
        pause
        exit /b 1
    )
    echo [OK] Client UI compiled successfully.
)

:: 4. Launch PixelTrace Workstation
echo.
echo [4/4] Starting PixelTrace Workstation on http://127.0.0.1:8000 ...
echo [AIRGAP] Running in pure local offline mode. No external network traffic.
echo.

:: Launch browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8000"

:: Start backend (FastAPI serves both API and React Client on port 8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
pause

