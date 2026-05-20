"""Consent store.

Persists the minimal data a user explicitly opts into at the download step:
their name, email and résumé headline. Name and email are PII, so they are
encrypted at rest with Fernet (AES-128-CBC + HMAC). A keyed-free SHA-256 of the
lowercased email is stored alongside purely so a repeat consent updates the
existing row instead of duplicating it. No résumé body, phone or address is
ever written here.

If `store_encryption_key` is unset the store is disabled and `record_consent`
is a no-op - the app still runs, it just persists nothing.
"""

import hashlib
import logging
import os
import sqlite3
import threading
from datetime import datetime, timezone

from cryptography.fernet import Fernet

from app.config import settings

logger = logging.getLogger("resume-builder")

_lock = threading.Lock()
_fernet: Fernet | None = None
_schema_ready = False


def _get_fernet() -> Fernet | None:
    global _fernet
    if _fernet is not None:
        return _fernet
    key = settings.store_encryption_key.strip()
    if not key:
        return None
    _fernet = Fernet(key.encode())
    return _fernet


def is_enabled() -> bool:
    """True when an encryption key is configured and the store will persist."""
    return _get_fernet() is not None


def _ensure_schema() -> None:
    global _schema_ready
    if _schema_ready:
        return
    db_dir = os.path.dirname(settings.store_db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(settings.store_db_path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS subscribers (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                email_hash  TEXT UNIQUE NOT NULL,
                name_enc    BLOB NOT NULL,
                email_enc   BLOB NOT NULL,
                headline    TEXT,
                consent     INTEGER NOT NULL DEFAULT 1,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()
    # Restrict the DB file - it holds (encrypted) personal data.
    try:
        os.chmod(settings.store_db_path, 0o600)
    except OSError:
        pass
    _schema_ready = True


def _email_hash(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()


def record_consent(name: str, email: str, headline: str | None) -> bool:
    """Upsert a consented subscriber. Returns True if stored, False if disabled."""
    fernet = _get_fernet()
    if fernet is None:
        logger.warning("consent store disabled (no encryption key); not persisting")
        return False
    with _lock:
        _ensure_schema()
        now = datetime.now(timezone.utc).isoformat()
        ehash = _email_hash(email)
        name_enc = fernet.encrypt(name.encode("utf-8"))
        email_enc = fernet.encrypt(email.encode("utf-8"))
        head = (headline or "").strip()[:200] or None
        conn = sqlite3.connect(settings.store_db_path)
        try:
            conn.execute(
                """
                INSERT INTO subscribers
                    (email_hash, name_enc, email_enc, headline,
                     consent, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
                ON CONFLICT(email_hash) DO UPDATE SET
                    name_enc   = excluded.name_enc,
                    email_enc  = excluded.email_enc,
                    headline   = excluded.headline,
                    consent    = 1,
                    updated_at = excluded.updated_at
                """,
                (ehash, name_enc, email_enc, head, now, now),
            )
            conn.commit()
        finally:
            conn.close()
    return True
