import subprocess
import sys
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def build():
    print("=" * 60)
    print("      PIXELTRACE STANDALONE EXECUTABLE BUILDER")
    print("=" * 60)

    # 1. Build Client if not built
    dist_dir = ROOT_DIR / "client" / "dist"
    if not (dist_dir / "index.html").exists():
        print("\n[1/3] Building React client assets...")
        subprocess.run(["npm", "run", "build"], cwd=str(ROOT_DIR / "client"), shell=True, check=True)
    else:
        print("\n[1/3] Precompiled React client assets verified in client/dist.")

    # 2. PyInstaller command
    print("\n[2/3] Compiling standalone Windows executable with PyInstaller...")
    fonts_dir = ROOT_DIR / "backend" / "app" / "assets" / "fonts"

    add_data_dist = f"{dist_dir};client/dist" if sys.platform == "win32" else f"{dist_dir}:client/dist"
    add_data_fonts = f"{fonts_dir};backend/app/assets/fonts" if sys.platform == "win32" else f"{fonts_dir}:backend/app/assets/fonts"

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name", "PixelTrace",
        "--add-data", add_data_dist,
        "--add-data", add_data_fonts,
        "--hidden-import", "uvicorn",
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespans",
        "--hidden-import", "uvicorn.lifespans.on",
        "--hidden-import", "uvicorn.lifespans.off",
        "--hidden-import", "multipart",
        "--hidden-import", "reportlab",
        "--hidden-import", "reportlab.lib",
        "--hidden-import", "reportlab.platypus",
        "--hidden-import", "reportlab.pdfgen",
        "--hidden-import", "reportlab.pdfbase",
        "--hidden-import", "reportlab.pdfbase.ttfonts",
        "--hidden-import", "exifread",
        "--hidden-import", "PIL",
        "--hidden-import", "PIL.Image",
        "--hidden-import", "PIL.ExifTags",
        "--hidden-import", "numpy",
        "--hidden-import", "sqlite3",
        "backend/launcher.py"
    ]

    subprocess.run(cmd, cwd=str(ROOT_DIR), check=True)
    print("\n[3/3] Standalone build complete! Output is located in:")
    print(f"      {ROOT_DIR / 'dist' / 'PixelTrace.exe'}")

if __name__ == "__main__":
    build()

