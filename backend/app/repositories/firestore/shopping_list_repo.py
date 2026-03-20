import uuid
from datetime import datetime, timezone

from app.repositories.firestore.client import get_firestore_client
from app.repositories.firestore.entity import Entity
from app.schemas.shopping_list import ShoppingListItemCreate, ShoppingListItemUpdate


class ShoppingListRepository:
    def __init__(self):
        self.db = get_firestore_client()

    def _to_entity(self, doc) -> Entity:
        data = doc.to_dict()
        data["id"] = doc.id
        return Entity(data)

    async def get_all(self) -> list[Entity]:
        items = []
        async for doc in self.db.collection("shopping_list_items").order_by("ingredient_name").stream():
            items.append(self._to_entity(doc))
        return items

    async def create(self, data: ShoppingListItemCreate) -> Entity:
        item_id = str(uuid.uuid4())
        doc_data = {
            "ingredient_name": data.ingredient_name,
            "quantity": data.quantity,
            "unit": data.unit,
            "category": data.category,
            "tesco_search_term": data.tesco_search_term,
            "tesco_product_id": None,
            "added_to_basket": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.db.collection("shopping_list_items").document(item_id).set(doc_data)
        doc_data["id"] = item_id
        return Entity(doc_data)

    async def bulk_create(self, items: list[ShoppingListItemCreate]) -> list[Entity]:
        results = []
        for data in items:
            entity = await self.create(data)
            results.append(entity)
        return results

    async def update(self, item_id: str, data: ShoppingListItemUpdate) -> Entity | None:
        doc_ref = self.db.collection("shopping_list_items").document(item_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
        update_data = data.model_dump(exclude_unset=True)
        await doc_ref.update(update_data)
        merged = doc.to_dict()
        merged.update(update_data)
        merged["id"] = item_id
        return Entity(merged)

    async def delete(self, item_id: str) -> bool:
        doc_ref = self.db.collection("shopping_list_items").document(item_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        await doc_ref.delete()
        return True

    async def clear(self):
        async for doc in self.db.collection("shopping_list_items").stream():
            await self.db.collection("shopping_list_items").document(doc.id).delete()
