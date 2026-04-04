from google.cloud.firestore_v1 import DELETE_FIELD

from app.repositories.firestore.client import get_firestore_client


FIELD_RENAMES = [
    ("recipes", "servings", "yield_servings"),
    ("meal_plans", "servings", "planned_servings"),
    ("food_log", "recipe_servings", "consumed_servings"),
]

LEGACY_FOOD_LOG_NUTRITION_FIELDS = ("calories", "protein", "carbs", "fat")


async def run_migrations() -> None:
    db = get_firestore_client()
    for collection, old_field, new_field in FIELD_RENAMES:
        async for doc in db.collection(collection).stream():
            data = doc.to_dict() or {}
            if old_field not in data:
                continue
            updates = {old_field: DELETE_FIELD}
            if new_field not in data or data.get(new_field) is None:
                updates[new_field] = data[old_field]
            await db.collection(collection).document(doc.id).update(updates)

    await _migrate_food_log_snapshots(db)


async def _migrate_food_log_snapshots(db) -> None:
    """Backfill food_log snapshot fields from legacy flat nutrition fields.

    For each entry with legacy flat nutrition, synthesise a nutrition dict,
    attempt to load the referenced recipe for total/per-serving snapshots,
    then delete the legacy fields. Orphaned rows keep the derived nutrition
    but leave recipe snapshots unset.
    """
    recipe_cache: dict[str, dict | None] = {}

    async def load_recipe_snapshot(recipe_id: str) -> dict | None:
        if recipe_id in recipe_cache:
            return recipe_cache[recipe_id]
        recipe_doc = await db.collection("recipes").document(recipe_id).get()
        if not recipe_doc.exists:
            recipe_cache[recipe_id] = None
            return None
        recipe_data = recipe_doc.to_dict() or {}
        yield_servings = recipe_data.get("yield_servings") or 0
        total = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "nutriments": {}}
        ing_col = db.collection("recipes").document(recipe_id).collection("ingredients")
        async for ing_doc in ing_col.stream():
            ing = ing_doc.to_dict() or {}
            total["calories"] += ing.get("calories") or 0
            total["protein"] += ing.get("protein") or 0
            total["carbs"] += ing.get("carbs") or 0
            total["fat"] += ing.get("fat") or 0
        per_serving = (
            {
                "calories": total["calories"] / yield_servings,
                "protein": total["protein"] / yield_servings,
                "carbs": total["carbs"] / yield_servings,
                "fat": total["fat"] / yield_servings,
                "nutriments": {},
            }
            if yield_servings
            else {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "nutriments": {}}
        )
        snapshot = {
            "yield_servings": yield_servings,
            "total": total,
            "per_serving": per_serving,
        }
        recipe_cache[recipe_id] = snapshot
        return snapshot

    async for doc in db.collection("food_log").stream():
        data = doc.to_dict() or {}
        has_legacy = any(f in data for f in LEGACY_FOOD_LOG_NUTRITION_FIELDS)
        if not has_legacy and "nutrition" in data:
            continue

        nutrition = {
            "calories": data.get("calories") or 0,
            "protein": data.get("protein") or 0,
            "carbs": data.get("carbs") or 0,
            "fat": data.get("fat") or 0,
            "nutriments": {},
        }
        updates: dict = {"nutrition": nutrition}
        for field in LEGACY_FOOD_LOG_NUTRITION_FIELDS:
            if field in data:
                updates[field] = DELETE_FIELD

        recipe_id = data.get("recipe_id")
        if recipe_id:
            snap = await load_recipe_snapshot(recipe_id)
            if snap:
                updates["recipe_yield_servings_snapshot"] = snap["yield_servings"]
                updates["recipe_total_nutrition_snapshot"] = snap["total"]
                updates["recipe_per_serving_nutrition_snapshot"] = snap["per_serving"]

        await db.collection("food_log").document(doc.id).update(updates)
