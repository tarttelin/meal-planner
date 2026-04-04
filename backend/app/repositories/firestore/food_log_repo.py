import uuid
from datetime import date, datetime, timezone

from app.repositories.firestore.client import get_firestore_client
from app.repositories.firestore.entity import Entity
from app.schemas.food_log import FoodLogPersist


class FoodLogRepository:
    def __init__(self):
        self.db = get_firestore_client()

    def _to_entity(self, doc) -> Entity:
        data = doc.to_dict()
        data["id"] = doc.id
        if isinstance(data.get("date"), str):
            data["date"] = date.fromisoformat(data["date"])
        return Entity(data)

    async def get_by_date_range(self, start: date, end: date, profile_id: str | None = None) -> list[Entity]:
        query = (
            self.db.collection("food_log")
            .where("date", ">=", start.isoformat())
            .where("date", "<=", end.isoformat())
            .order_by("date")
        )
        entries = []
        async for doc in query.stream():
            entity = self._to_entity(doc)
            if profile_id is not None and getattr(entity, "profile_id", None) != profile_id:
                continue
            entries.append(entity)
        return entries

    async def create(self, data: FoodLogPersist) -> Entity:
        entry_id = str(uuid.uuid4())
        doc_data = data.model_dump()
        doc_data["date"] = data.date.isoformat()
        doc_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.collection("food_log").document(entry_id).set(doc_data)
        doc_data["id"] = entry_id
        doc_data["date"] = data.date
        return Entity(doc_data)

    async def delete(self, entry_id: str) -> bool:
        doc_ref = self.db.collection("food_log").document(entry_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        await doc_ref.delete()
        return True
