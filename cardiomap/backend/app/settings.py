"""
Application settings and environment configurations for CardioMap API.
"""

import os
from pathlib import Path


class Settings:
    PROJECT_NAME: str = "CardioMap API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Persistent clinical advisory
    DISCLAIMER: str = (
        "Decision support / educational use only. Not a substitute for formal diagnostic "
        "imaging or clinical judgement."
    )

    # Base paths
    APP_DIR: Path = Path(__file__).resolve().parent
    BACKEND_DIR: Path = APP_DIR.parent
    ROOT_DIR: Path = BACKEND_DIR.parent
    ARTIFACTS_DIR: Path = BACKEND_DIR / "artifacts"
    
    # Model artifacts paths
    MODELS_DIR: Path = ARTIFACTS_DIR / "models"
    BASE_MODELS_DIR: Path = ARTIFACTS_DIR / "base_models"
    METRICS_PATH: Path = ARTIFACTS_DIR / "metrics.json"
    SCHEMA_PATH: Path = ARTIFACTS_DIR / "feature_schema.json"
    BACKGROUND_PATH: Path = ARTIFACTS_DIR / "background.parquet"
    VERSION_PATH: Path = ARTIFACTS_DIR / "model_version.txt"

    # CORS configuration
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,*"
        ).split(",")
        if origin.strip()
    ]


settings = Settings()
