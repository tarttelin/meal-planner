import json
import uuid
from datetime import datetime, timezone

from app.repositories.firestore.client import get_firestore_client
from app.repositories.firestore.entity import Entity
from app.schemas.recipe import RecipeCreate, RecipeUpdate


class RecipeRepository:
    def __init__(self):
        self.db = get_firestore_client()

    async def _load_recipe_entity(self, doc) -> Entity:
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

    async def get_all(self, search: str | None = None, tag: str | None = None) -> list[Entity]:
        recipes = []
        async for doc in self.db.collection("recipes").order_by("name").stream():
            entity = await self._load_recipe_entity(doc)
            if search and search.lower() not in entity.name.lower():
                continue
            if tag:
                tags_val = entity.tags
                if isinstance(tags_val, str):
                    try:
                        parsed = json.loads(tags_val)
                    except (json.JSONDecodeError, TypeError):
                        parsed = []
                else:
                    parsed = tags_val or []
                if tag not in parsed:
                    continue
            recipes.append(entity)
        return recipes

    async def get(self, recipe_id: str) -> Entity | None:
        doc = await self.db.collection("recipes").document(recipe_id).get()
        if not doc.exists:
            return None
        return await self._load_recipe_entity(doc)

    async def create(self, data: RecipeCreate) -> Entity:
        recipe_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        doc_data = {
            "name": data.name,
            "description": data.description,
            "yield_servings": data.yield_servings,
            "prep_time_mins": data.prep_time_mins,
            "cook_time_mins": data.cook_time_mins,
            "instructions": json.dumps(data.instructions) if data.instructions else None,
            "tags": json.dumps(data.tags) if data.tags else None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        await self.db.collection("recipes").document(recipe_id).set(doc_data)
        ing_col = self.db.collection("recipes").document(recipe_id).collection("ingredients")
        ingredients = []
        for ing in data.ingredients:
            ing_id = str(uuid.uuid4())
            ing_data = {
                "recipe_id": recipe_id,
                "name": ing.name,
                "quantity": ing.quantity,
                "unit": ing.unit,
                "notes": ing.notes,
                "tesco_search_term": ing.tesco_search_term,
                "calories": ing.calories,
                "protein": ing.protein,
                "carbs": ing.carbs,
                "fat": ing.fat,
                "pantry_item_id": ing.pantry_item_id,
            }
            await ing_col.document(ing_id).set(ing_data)
            ing_data["id"] = ing_id
            ingredients.append(Entity(ing_data))
        doc_data["id"] = recipe_id
        doc_data["ingredients"] = ingredients
        return Entity(doc_data)

    async def update(self, recipe_id: str, data: RecipeUpdate) -> Entity | None:
        doc_ref = self.db.collection("recipes").document(recipe_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
        now = datetime.now(timezone.utc)
        doc_data = {
            "name": data.name,
            "description": data.description,
            "yield_servings": data.yield_servings,
            "prep_time_mins": data.prep_time_mins,
            "cook_time_mins": data.cook_time_mins,
            "instructions": json.dumps(data.instructions) if data.instructions else None,
            "tags": json.dumps(data.tags) if data.tags else None,
            "updated_at": now.isoformat(),
        }
        await doc_ref.update(doc_data)
        ing_col = doc_ref.collection("ingredients")
        async for ing_doc in ing_col.stream():
            await ing_col.document(ing_doc.id).delete()
        ingredients = []
        for ing in data.ingredients:
            ing_id = str(uuid.uuid4())
            ing_data = {
                "recipe_id": recipe_id,
                "name": ing.name,
                "quantity": ing.quantity,
                "unit": ing.unit,
                "notes": ing.notes,
                "tesco_search_term": ing.tesco_search_term,
                "calories": ing.calories,
                "protein": ing.protein,
                "carbs": ing.carbs,
                "fat": ing.fat,
                "pantry_item_id": ing.pantry_item_id,
            }
            await ing_col.document(ing_id).set(ing_data)
            ing_data["id"] = ing_id
            ingredients.append(Entity(ing_data))
        existing = doc.to_dict()
        existing.update(doc_data)
        existing["id"] = recipe_id
        existing["ingredients"] = ingredients
        return Entity(existing)

    async def delete(self, recipe_id: str) -> bool:
        doc_ref = self.db.collection("recipes").document(recipe_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        ing_col = doc_ref.collection("ingredients")
        async for ing_doc in ing_col.stream():
            await ing_col.document(ing_doc.id).delete()
        await doc_ref.delete()
        return True
