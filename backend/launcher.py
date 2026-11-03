import os
import sys
import time
import socket
import shutil
import threading
import subprocess
import webbrowser
from pathlib import Path

# Adjust path for PyInstaller frozen environment
if getattr(sys, 'frozen', False):
    exe_dir = Path(sys.executable).resolve().parent
    os.chdir(exe_dir)
else:
    bundle_dir = Path(__file__).resolve().parent.parent
    os.chdir(bundle_dir)

import uvicorn
from backend.app.main import app

def is_port_in_use(port: int = 8000) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('127.0.0.1', port)) == 0
    except Exception:
        return False

def launch_app_window(url: str = "http://127.0.0.1:8000"):
    # Wait for server socket to become ready
    for _ in range(30):
        if is_port_in_use(8000):
            break
        time.sleep(0.1)

    # Check for Microsoft Edge or Chrome for dedicated standalone window
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        shutil.which("msedge"),
        shutil.which("chrome")
    ]

    app_proc = None
    for exe in candidates:
        if exe and os.path.exists(exe):
            try:
                cmd = [
                    exe,
                    f"--app={url}",
                    "--window-size=1400,880",
                    "--window-position=center",
                    "--disable-plugins",
                    "--disable-extensions"
                ]
                app_proc = subprocess.Popen(cmd)
                break
            except Exception:
                continue

    if not app_proc:
        webbrowser.open(url)
        return

    # When the desktop application window is closed by the user, terminate local server cleanly
    app_proc.wait()
    os._exit(0)

def main():
    port = 8000
    if is_port_in_use(port):
        launch_app_window(f"http://127.0.0.1:{port}")
        return

    threading.Thread(target=launch_app_window, args=(f"http://127.0.0.1:{port}",), daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

if __name__ == "__main__":
    main()
