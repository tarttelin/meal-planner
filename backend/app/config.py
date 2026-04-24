import os
from pathlib import Path

REPO_TYPE = os.environ.get("REPO_TYPE", "sqlite")
DATABASE_URL = f"sqlite+aiosqlite:///{Path(__file__).parent.parent / 'data' / 'meals.db'}"
DATA_DIR = Path(__file__).parent.parent / "data"
FIT_FILES_DIR = DATA_DIR / "fit_files"
FIT_FILES_BUCKET = os.environ.get("FIT_FILES_BUCKET")
STRAVA_CLIENT_ID = os.environ.get("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.environ.get("STRAVA_CLIENT_SECRET")
