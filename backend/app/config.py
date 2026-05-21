from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=False, extra="ignore", protected_namespaces=()
    )

    gemini_api_key: str = ""
    # Primary model, with a fallback used when the primary times out. Both must
    # be models the API key can call with generateContent.
    model_name: str = "gemini-3.5-flash"
    model_fallback: str = "gemini-2.5-flash"
    # Per-attempt wall-clock budget for a single Gemini call. Two attempts
    # (primary + fallback) must fit inside nginx's 60s /api proxy_read_timeout.
    ai_timeout_seconds: float = 25.0
    ai_enabled: bool = True

    turnstile_secret_key: str = ""

    rate_limit_polish_per_ip_per_hour: int = 10
    rate_limit_render_per_ip_per_hour: int = 60

    max_resume_chars: int = 25_000
    max_pdf_mb: int = 5

    typst_bin: str = "/usr/local/bin/typst"

    log_level: str = "INFO"

    # Consent store. The DB lives on a persistent volume; PII columns are
    # encrypted at rest with the Fernet key below. If the key is empty the
    # consent feature is treated as disabled (nothing is persisted).
    store_db_path: str = "/data/cv.db"
    store_encryption_key: str = ""


settings = Settings()
