import uuid
from datetime import date

from app.repositories.firestore.client import get_firestore_client
from app.repositories.firestore.entity import Entity
from app.schemas.meal_plan import MealPlanCreate


class MealPlanRepository:
    def __init__(self):
        self.db = get_firestore_client()

    async def _load_recipe(self, recipe_id: str) -> Entity | None:
        doc = await self.db.collection("recipes").document(recipe_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        ingredients = []
        ing_refs = self.db.collection("recipes").document(doc.id).collection("ingredients")
        async for ing_doc in ing_refs.stream():
            ing_data = ing_doc.to_dict()
            ing_data["id"] = ing_doc.id
            ingredients.append(Entity(ing_data))
        data["ingredients"] = ingredients
        return Entity(data)

    def _to_entity(self, doc) -> Entity:
        data = doc.to_dict()
        data["id"] = doc.id
        if isinstance(data.get("date"), str):
            data["date"] = date.fromisoformat(data["date"])
        return Entity(data)

    async def get_week(self, start: date, end: date, profile_id: str | None = None) -> list[Entity]:
        query = (
            self.db.collection("meal_plans")
            .where("date", ">=", start.isoformat())
            .where("date", "<=", end.isoformat())
            .order_by("date")
        )
        plans = []
        async for doc in query.stream():
            entity = self._to_entity(doc)
            if profile_id is not None:
                doc_profile = getattr(entity, "profile_id", None)
                if doc_profile is not None and doc_profile != profile_id:
                    continue
            entity.recipe = await self._load_recipe(entity.recipe_id)
            plans.append(entity)
        return sorted(plans, key=lambda p: (p.date, getattr(p, "slot", "")))

    async def create(self, data: MealPlanCreate) -> Entity:
        plan_id = str(uuid.uuid4())
        doc_data = {
            "date": data.date.isoformat(),
            "slot": data.slot,
            "recipe_id": data.recipe_id,
            "servings": data.servings,
            "profile_id": data.profile_id,
        }
        await self.db.collection("meal_plans").document(plan_id).set(doc_data)
        doc_data["id"] = plan_id
        doc_data["date"] = data.date
        entity = Entity(doc_data)
        entity.recipe = await self._load_recipe(data.recipe_id)
        return entity

    async def delete(self, plan_id: str) -> bool:
        doc_ref = self.db.collection("meal_plans").document(plan_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        await doc_ref.delete()
        return True
