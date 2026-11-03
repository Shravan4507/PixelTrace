# Contributing to PixelTrace

Thank you for your interest in contributing to **PixelTrace**, an open-source digital image forensics workstation.

## Code of Conduct
Please read and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Git

### 1. Clone & Set Up
```bash
git clone https://github.com/Shravan4507/PixelTrace.git
cd PixelTrace

# Python backend dependencies
python -m pip install -r backend/requirements.txt

# React frontend dependencies
cd client
npm install
cd ..
```

### 2. Dual Hot-Reload Dev Mode
On Windows:
```cmd
start-dev.bat
```
Or manually in two terminals:
- Terminal 1: `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload`
- Terminal 2: `cd client && npm run dev`

### 3. Running Automated Tests
Before submitting a pull request, verify that all automated unit and integration tests pass:
```bash
python -m pytest tests -v
```

And verify the TypeScript build passes:
```bash
cd client
npm run build
cd ..
```

## Pull Request Guidelines
1. Fork the repo and create your branch from `main`.
2. Ensure new forensic features or changes include corresponding test cases in `tests/unit/` or `tests/integration/`.
3. Keep the pure monochromatic workstation aesthetic: strict `#000000` background, no drop shadows, 4px border radius, and global D-DIN typography.
4. Ensure all automated tests pass (`python -m pytest tests`).
5. Open a PR with a clear description of the problem solved.

