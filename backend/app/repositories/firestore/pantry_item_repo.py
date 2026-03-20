import uuid
from datetime import datetime, timezone

from app.repositories.firestore.client import get_firestore_client
from app.repositories.firestore.entity import Entity
from app.schemas.pantry_item import PantryItemCreate


class PantryItemRepository:
    def __init__(self):
        self.db = get_firestore_client()

    def _to_entity(self, doc) -> Entity:
        data = doc.to_dict()
        data["id"] = doc.id
        return Entity(data)

    async def get_all(self, search: str | None = None) -> list[Entity]:
        items = []
        async for doc in self.db.collection("pantry_items").order_by("name").stream():
            entity = self._to_entity(doc)
            if search and search.lower() not in entity.name.lower():
                continue
            items.append(entity)
        return items

    async def get(self, item_id: str) -> Entity | None:
        doc = await self.db.collection("pantry_items").document(item_id).get()
        if not doc.exists:
            return None
        return self._to_entity(doc)

    async def get_by_name(self, name: str) -> Entity | None:
        async for doc in self.db.collection("pantry_items").stream():
            data = doc.to_dict()
            if data.get("name", "").lower() == name.lower():
                data["id"] = doc.id
                return Entity(data)
        return None

    async def get_by_barcode(self, barcode: str) -> Entity | None:
        query = self.db.collection("pantry_items").where("barcode", "==", barcode).limit(1)
        async for doc in query.stream():
            return self._to_entity(doc)
        return None

    async def create(self, data: PantryItemCreate) -> Entity:
        item_id = str(uuid.uuid4())
        doc_data = data.model_dump()
        doc_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.collection("pantry_items").document(item_id).set(doc_data)
        doc_data["id"] = item_id
        return Entity(doc_data)

    async def update(self, item_id: str, data: PantryItemCreate) -> Entity | None:
        doc_ref = self.db.collection("pantry_items").document(item_id)
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
        doc_ref = self.db.collection("pantry_items").document(item_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        await doc_ref.delete()
        return True
