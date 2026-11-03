@echo off
title PixelTrace Development Environment
color 0B

echo ======================================================================
echo             PIXELTRACE - DUAL HOT-RELOAD DEVELOPMENT MODE
echo            Backend: http://127.0.0.1:8000  ^|  Client: 5173
echo ======================================================================
echo.

start "PixelTrace Backend (FastAPI)" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
start "PixelTrace Client (Vite)" cmd /k "cd client && npm run dev"

timeout /t 3 >nul
start http://127.0.0.1:5173

