import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

if getattr(sys, 'frozen', False):
    exe_dir = Path(sys.executable).resolve().parent
    os.chdir(exe_dir)
else:
    bundle_dir = Path(__file__).resolve().parent.parent
    os.chdir(bundle_dir)

import uvicorn
from backend.app.main import app

def open_browser():
    time.sleep(1.8)
    webbrowser.open("http://127.0.0.1:8000")

def main():
    print("=" * 65)
    print("      PIXELTRACE - DIGITAL IMAGE FORENSIC WORKSTATION")
    print("      Standalone Executable Distribution (Local Airgap)")
    print("=" * 65)
    print("\nStarting local workstation at http://127.0.0.1:8000 ...")

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    main()

