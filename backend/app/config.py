import os
from pathlib import Path

REPO_TYPE = os.environ.get("REPO_TYPE", "sqlite")
DATABASE_URL = f"sqlite+aiosqlite:///{Path(__file__).parent.parent / 'data' / 'meals.db'}"
