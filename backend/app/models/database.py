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
            ("food_log", "consumed_servings", "INTEGER"),
            ("food_log", "meal_plan_id", "TEXT"),
            ("food_log", "nutrition", "JSON"),
            ("food_log", "recipe_yield_servings_snapshot", "INTEGER"),
            ("food_log", "recipe_total_nutrition_snapshot", "JSON"),
            ("food_log", "recipe_per_serving_nutrition_snapshot", "JSON"),
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

        for table, old_col, new_col in [
            ("recipes", "servings", "yield_servings"),
            ("meal_plans", "servings", "planned_servings"),
            ("food_log", "recipe_servings", "consumed_servings"),
        ]:
            result = await conn.execute(text(f"PRAGMA table_info({table})"))
            cols = [row[1] for row in result]
            if old_col in cols and new_col in cols:
                await conn.execute(text(
                    f"UPDATE {table} SET {new_col} = {old_col} WHERE {new_col} IS NULL AND {old_col} IS NOT NULL"
                ))
                await conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {old_col}"))
            elif old_col in cols:
                await conn.execute(text(f"ALTER TABLE {table} RENAME COLUMN {old_col} TO {new_col}"))

        await _migrate_food_log_snapshots(conn)


async def _migrate_food_log_snapshots(conn):
    """Backfill food_log snapshot columns from legacy flat nutrition fields.

    Runs exactly once per database: detects the legacy columns (calories,
    protein, carbs, fat) and, for every row, synthesises a nutrition snapshot,
    attempts to load the recipe to build total/per-serving snapshots, then
    drops the legacy columns. Orphaned rows (recipe_id set but recipe missing)
    keep nutrition derived from the legacy fields and leave recipe snapshots
    NULL.
    """
    import json

    result = await conn.execute(text("PRAGMA table_info(food_log)"))
    cols = [row[1] for row in result]
    legacy_cols = [c for c in ("calories", "protein", "carbs", "fat") if c in cols]
    if not legacy_cols:
        return

    rows = (await conn.execute(text(
        "SELECT id, recipe_id, consumed_servings, calories, protein, carbs, fat FROM food_log"
    ))).fetchall()

    recipe_cache: dict[str, dict | None] = {}

    async def load_recipe_snapshot(recipe_id: str) -> dict | None:
        if recipe_id in recipe_cache:
            return recipe_cache[recipe_id]
        r = (await conn.execute(
            text("SELECT id, yield_servings FROM recipes WHERE id = :rid"),
            {"rid": recipe_id},
        )).fetchone()
        if not r:
            recipe_cache[recipe_id] = None
            return None
        ings = (await conn.execute(
            text("SELECT calories, protein, carbs, fat FROM ingredients WHERE recipe_id = :rid"),
            {"rid": recipe_id},
        )).fetchall()
        total = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "nutriments": {}}
        for ing in ings:
            total["calories"] += ing[0] or 0
            total["protein"] += ing[1] or 0
            total["carbs"] += ing[2] or 0
            total["fat"] += ing[3] or 0
        yield_s = r[1] or 0
        per_serving = (
            {k: (v / yield_s if isinstance(v, (int, float)) and yield_s else v) for k, v in total.items()}
            if yield_s
            else {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "nutriments": {}}
        )
        per_serving["nutriments"] = {}
        snapshot = {
            "yield_servings": yield_s,
            "total": total,
            "per_serving": per_serving,
        }
        recipe_cache[recipe_id] = snapshot
        return snapshot

    for row in rows:
        entry_id, recipe_id, consumed_servings, cal, prot, carb, fat = row
        nutrition = {
            "calories": cal or 0,
            "protein": prot or 0,
            "carbs": carb or 0,
            "fat": fat or 0,
            "nutriments": {},
        }
        total_snap = None
        per_serving_snap = None
        yield_snap = None
        if recipe_id:
            snap = await load_recipe_snapshot(recipe_id)
            if snap:
                yield_snap = snap["yield_servings"]
                total_snap = snap["total"]
                per_serving_snap = snap["per_serving"]
        await conn.execute(
            text(
                "UPDATE food_log SET "
                "nutrition = :nutrition, "
                "recipe_yield_servings_snapshot = :yield_snap, "
                "recipe_total_nutrition_snapshot = :total_snap, "
                "recipe_per_serving_nutrition_snapshot = :per_serving_snap "
                "WHERE id = :id"
            ),
            {
                "nutrition": json.dumps(nutrition),
                "yield_snap": yield_snap,
                "total_snap": json.dumps(total_snap) if total_snap is not None else None,
                "per_serving_snap": json.dumps(per_serving_snap) if per_serving_snap is not None else None,
                "id": entry_id,
            },
        )

    for col in legacy_cols:
        await conn.execute(text(f"ALTER TABLE food_log DROP COLUMN {col}"))

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
