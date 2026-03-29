from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import DATABASE_URL
import os

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def init_db():
    os.makedirs(os.path.dirname(DATABASE_URL.replace("sqlite+aiosqlite:///", "")), exist_ok=True)
    from app.models import recipe, meal_plan, shopping_list, pantry_item, food_log, profile  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for table, col, coldef in [
            ("ingredients", "pantry_item_id", "TEXT REFERENCES pantry_items(id)"),
            ("food_log", "slot", "TEXT"),
            ("food_log", "recipe_id", "TEXT REFERENCES recipes(id)"),
            ("food_log", "recipe_servings", "INTEGER"),
            ("meal_plans", "profile_id", "TEXT REFERENCES profiles(id)"),
            ("food_log", "profile_id", "TEXT REFERENCES profiles(id)"),
            ("pantry_items", "category", "TEXT"),
            ("shopping_list_items", "category", "TEXT"),
            ("ingredients", "notes", "TEXT"),
            ("pantry_items", "nutriments", "JSON"),
        ]:
            result = await conn.execute(text(f"PRAGMA table_info({table})"))
            cols = [row[1] for row in result]
            if col not in cols:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {coldef}"))

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
