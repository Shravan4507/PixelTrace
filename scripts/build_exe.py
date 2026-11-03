import subprocess
import sys
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def find_iscc() -> str | None:
    candidates = [
        shutil.which("iscc"),
        shutil.which("ISCC"),
        Path.home() / "AppData" / "Local" / "Programs" / "Inno Setup 6" / "ISCC.exe",
        Path("C:/Program Files (x86)/Inno Setup 6/ISCC.exe"),
        Path("C:/Program Files/Inno Setup 6/ISCC.exe"),
    ]
    for c in candidates:
        if c and Path(c).exists():
            return str(c)
    return None

def build():
    print("=" * 65)
    print("      PIXELTRACE STANDALONE EXECUTABLE & INSTALLER BUILDER")
    print("=" * 65)

    # 1. Build Client if not built
    dist_dir = ROOT_DIR / "client" / "dist"
    if not (dist_dir / "index.html").exists():
        print("\n[1/4] Building React client assets...")
        subprocess.run(["npm", "run", "build"], cwd=str(ROOT_DIR / "client"), shell=True, check=True)
    else:
        print("\n[1/4] Precompiled React client assets verified in client/dist.")

    # 2. PyInstaller command
    print("\n[2/4] Compiling standalone Windows executable with PyInstaller...")
    fonts_dir = ROOT_DIR / "backend" / "app" / "assets" / "fonts"
    icon_file = ROOT_DIR / "assets" / "icon.ico"
    version_file = ROOT_DIR / "scripts" / "version_info.txt"
    manifest_file = ROOT_DIR / "scripts" / "manifest.xml"

    add_data_dist = f"{dist_dir};client/dist" if sys.platform == "win32" else f"{dist_dir}:client/dist"
    add_data_fonts = f"{fonts_dir};backend/app/assets/fonts" if sys.platform == "win32" else f"{fonts_dir}:backend/app/assets/fonts"
    add_data_icon = f"{icon_file};assets" if sys.platform == "win32" else f"{icon_file}:assets"

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--windowed",
        "--name", "PixelTrace",
        "--icon", str(icon_file),
        "--version-file", str(version_file),
        "--manifest", str(manifest_file),
        "--add-data", add_data_dist,
        "--add-data", add_data_fonts,
        "--add-data", add_data_icon,
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
    exe_path = ROOT_DIR / "dist" / "PixelTrace.exe"
    print(f"\n[3/4] Standalone binary generated at: {exe_path}")

    # 3. Compile Windows Setup Installer via Inno Setup
    iscc_path = find_iscc()
    if iscc_path:
        print(f"\n[4/4] Found Inno Setup Compiler at: {iscc_path}")
        print("      Compiling Windows Setup Installer (PixelTrace-Setup.exe)...")
        iss_file = ROOT_DIR / "scripts" / "installer.iss"
        subprocess.run([iscc_path, str(iss_file)], cwd=str(ROOT_DIR), check=True)
        setup_path = ROOT_DIR / "dist" / "PixelTrace-Setup.exe"
        print(f"\n[SUCCESS] Windows Installer created at: {setup_path}")
    else:
        print("\n[4/4] Notice: Inno Setup compiler (ISCC.exe) not found. Skipped installer compilation.")

    print("\n" + "=" * 65)
    print("      BUILD COMPLETED SUCCESSFULLY")
    print("=" * 65)

if __name__ == "__main__":
    build()
