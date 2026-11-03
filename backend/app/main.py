from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.core.database import init_db
from backend.app.core.logging import logger
from backend.app.services.validation_service import ValidationError

from backend.app.api.routes import (
    direct_analyzer,
    quick_scan,
    cases,
    evidence,
    metadata,
    hashing,
    ela,
    comparison,
    reports,
    audit,
    dashboard
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite schema
    logger.info("PixelTrace Forensic Workstation starting up on %s:%s", settings.HOST, settings.PORT)
    init_db()
    yield
    # Shutdown
    logger.info("PixelTrace Forensic Workstation shutting down.")

app = FastAPI(
    title="PixelTrace Forensic Workstation API",
    version=settings.VERSION,
    description="Locally operated digital image forensics, metadata inspection, hashing, and Error Level Analysis engine.",
    lifespan=lifespan
)

# CORS restricted to loopback
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Centralized exception handlers
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    logger.warning("Forensic Validation Error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "ForensicValidationError", "message": str(exc)}
    )

@app.exception_handler(FileNotFoundError)
async def not_found_exception_handler(request: Request, exc: FileNotFoundError):
    logger.warning("Resource Not Found: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": "ResourceNotFound", "message": str(exc)}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled internal exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "InternalServerError", "message": "An internal forensic processing error occurred."}
    )

# Health endpoints
@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def health_check():
    return {
        "status": "HEALTHY",
        "workstation": "PixelTrace Digital Image Forensics",
        "version": settings.VERSION,
        "database": "SQLite (Local)",
        "offline_operation": True
    }

# Register API v1 Routers
api_v1 = settings.API_V1_STR
app.include_router(direct_analyzer.router, prefix=api_v1)
app.include_router(quick_scan.router, prefix=api_v1)
app.include_router(cases.router, prefix=api_v1)
app.include_router(evidence.router, prefix=api_v1)
app.include_router(metadata.router, prefix=api_v1)
app.include_router(hashing.router, prefix=api_v1)
app.include_router(ela.router, prefix=api_v1)
app.include_router(comparison.router, prefix=api_v1)
app.include_router(reports.router, prefix=api_v1)
app.include_router(audit.router, prefix=api_v1)
app.include_router(dashboard.router, prefix=api_v1)

# Serve Compiled React Client in Single-Port Production Mode
dist_dir = settings.ROOT_DIR / "client" / "dist"
if dist_dir.exists() and (dist_dir / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="static_assets")
    if (dist_dir / "fonts").exists():
        app.mount("/fonts", StaticFiles(directory=str(dist_dir / "fonts")), name="static_fonts")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
