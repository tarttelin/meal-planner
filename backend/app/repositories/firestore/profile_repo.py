import uuid

from app.repositories.firestore.client import get_firestore_client
from app.repositories.firestore.entity import Entity
from app.schemas.profile import ProfileCreate, ProfileUpdate


class ProfileRepository:
    def __init__(self):
        self.db = get_firestore_client()

    def _to_entity(self, doc) -> Entity:
        data = doc.to_dict()
        data["id"] = doc.id
        return Entity(data)

    async def get_all(self) -> list[Entity]:
        profiles = []
        async for doc in self.db.collection("profiles").order_by("name").stream():
            profiles.append(self._to_entity(doc))
        return profiles

    async def get(self, profile_id: str) -> Entity | None:
        doc = await self.db.collection("profiles").document(profile_id).get()
        if not doc.exists:
            return None
        return self._to_entity(doc)

    async def create(self, data: ProfileCreate) -> Entity:
        profile_id = str(uuid.uuid4())
        doc_data = data.model_dump()
        await self.db.collection("profiles").document(profile_id).set(doc_data)
        doc_data["id"] = profile_id
        return Entity(doc_data)

    async def update(self, profile_id: str, data: ProfileUpdate) -> Entity | None:
        doc_ref = self.db.collection("profiles").document(profile_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
        update_data = data.model_dump()
        await doc_ref.update(update_data)
        merged = doc.to_dict()
        merged.update(update_data)
        merged["id"] = profile_id
        return Entity(merged)

    async def delete(self, profile_id: str) -> bool:
        doc_ref = self.db.collection("profiles").document(profile_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        await doc_ref.delete()
        return True
