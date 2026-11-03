# PixelTrace Local Setup Guide (Windows 11)

## Prerequisites
- **Python 3.11+** (Verified with Python 3.12)
- **Node.js 18+** & **npm** (Verified with Node v22, npm 10)
- Operating System: Windows 11 / 10

## 1. Directory Verification
Ensure your terminal is located in the `PixelTrace` root directory:
```powershell
cd Z:\04-10-2026\PixelTrace
```

## 2. Python Backend Setup
Install required forensic analysis libraries:
```powershell
python -m pip install -r backend/requirements.txt
```

## 3. Client Setup
Install client packages:
```powershell
cd client
npm install
cd ..
```

## 4. Run the Application
### Backend (FastAPI on Port 8000)
In Terminal 1:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API documentation will be available at: `http://127.0.0.1:8000/docs`

### Frontend (Vite on Port 5173)
In Terminal 2:
```powershell
cd client
npm run dev
```
Workstation UI will be available at: `http://127.0.0.1:5173`

## 5. Automated Tests Execution
Execute the automated forensic test suite:
```powershell
python -m pytest tests -v
```

## 6. Production Frontend Build
```powershell
cd client
npm run build
```
The compiled static assets will be emitted to `client/dist`.

