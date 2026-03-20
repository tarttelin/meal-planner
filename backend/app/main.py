import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import REPO_TYPE
from app.auth import FirebaseAuthMiddleware
from app.routers import recipes, meal_plans, shopping_list, tesco, barcode, pantry, food_log, profiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    if REPO_TYPE == "sqlite":
        from app.models.database import init_db
        await init_db()
    yield

app = FastAPI(title="Meal Planner", lifespan=lifespan)
app.add_middleware(FirebaseAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

all_routers = [
    recipes.router, meal_plans.router, shopping_list.router,
    tesco.router, barcode.router, pantry.router,
    food_log.router, profiles.router,
]
for r in all_routers:
    app.include_router(r, prefix="/api")

static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="static-assets")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        if path.startswith("api/"):
            return
        file_path = os.path.join(static_dir, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))
