import sqlite3
from contextlib import contextmanager
from typing import Generator
from backend.app.config import settings
from backend.app.core.logging import logger

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DB_FILE), timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction rollback due to error: {e}")
        raise
    finally:
        conn.close()

def init_db() -> None:
    """Initialize database tables strictly adhering to SQLite local schema."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            reference_number TEXT NOT NULL UNIQUE,
            examiner_name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'OPEN',
            is_archived INTEGER DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS evidence (
            id TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL,
            file_format TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            color_mode TEXT,
            sha256 TEXT NOT NULL,
            md5 TEXT NOT NULL,
            upload_timestamp TEXT NOT NULL,
            status TEXT DEFAULT 'STORED',
            file_path TEXT NOT NULL,
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            evidence_id TEXT NOT NULL,
            analysis_type TEXT NOT NULL,
            parameters_json TEXT,
            results_json TEXT,
            artifact_path TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS comparisons (
            id TEXT PRIMARY KEY,
            case_id TEXT,
            reference_evidence_id TEXT NOT NULL,
            target_evidence_id TEXT NOT NULL,
            algorithm TEXT NOT NULL,
            is_match INTEGER NOT NULL,
            reference_hash TEXT NOT NULL,
            target_hash TEXT NOT NULL,
            comparison_details_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (reference_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
            FOREIGN KEY (target_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            case_id TEXT,
            evidence_id TEXT,
            event_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            examiner_name TEXT,
            details_json TEXT
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            evidence_id TEXT,
            report_format TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            title TEXT NOT NULL,
            examiner_name TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        );
        """)
        
        # Indexes for rapid retrieval
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analyses_evidence ON analyses(evidence_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_case ON reports(case_id);")
        
        logger.info("Local SQLite database schema initialized at %s", settings.DB_FILE)

