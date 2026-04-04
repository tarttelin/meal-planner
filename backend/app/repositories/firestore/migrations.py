from google.cloud.firestore_v1 import DELETE_FIELD

from app.repositories.firestore.client import get_firestore_client


FIELD_RENAMES = [
    ("recipes", "servings", "yield_servings"),
    ("meal_plans", "servings", "planned_servings"),
    ("food_log", "recipe_servings", "consumed_servings"),
]


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
