import sys
from pathlib import Path
from pydantic import BaseModel

if getattr(sys, "frozen", False):
    # PyInstaller temporary bundle root where bundled assets reside
    BUNDLE_ROOT = Path(sys._MEIPASS)
    # The actual folder on user's machine where PixelTrace.exe is running (where data & reports should persist)
    PROJECT_ROOT = Path(sys.executable).resolve().parent
    APP_DIR = BUNDLE_ROOT / "backend" / "app"
else:
    APP_DIR = Path(__file__).resolve().parent
    BACKEND_DIR = APP_DIR.parent
    PROJECT_ROOT = BACKEND_DIR.parent
    BUNDLE_ROOT = PROJECT_ROOT

class Settings(BaseModel):
    PROJECT_NAME: str = "PixelTrace"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Path configuration
    ROOT_DIR: Path = PROJECT_ROOT
    BUNDLE_DIR: Path = BUNDLE_ROOT
    DIST_DIR: Path = BUNDLE_ROOT / "client" / "dist"
    DATA_DIR: Path = PROJECT_ROOT / "data"
    CASES_DIR: Path = PROJECT_ROOT / "data" / "cases"
    TEMP_DIR: Path = PROJECT_ROOT / "data" / "temporary"
    DB_DIR: Path = PROJECT_ROOT / "data" / "database"
    DB_FILE: Path = PROJECT_ROOT / "data" / "database" / "pixeltrace.db"
    FONTS_DIR: Path = APP_DIR / "assets" / "fonts"
    REPORTS_DIR: Path = PROJECT_ROOT / "reports"
    
    # Operational constraints
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    MAX_IMAGE_PIXELS: int = 100_000_000  # 100 Megapixels
    ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}
    SUPPORTED_FORMATS: set[str] = {"JPEG", "PNG", "TIFF", "BMP", "WEBP"}
    
    # ELA Parameters
    DEFAULT_ELA_QUALITY: int = 95
    DEFAULT_ELA_SCALE: int = 15
    
    # Network Security
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ]

settings = Settings()

# Ensure directories exist at runtime
settings.CASES_DIR.mkdir(parents=True, exist_ok=True)
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
settings.DB_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
settings.FONTS_DIR.mkdir(parents=True, exist_ok=True)

