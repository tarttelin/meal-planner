from datetime import datetime, timezone

from app.repositories.firestore.client import get_firestore_client
from app.repositories.firestore.entity import Entity


class FitnessRepository:
    def __init__(self):
        self.db = get_firestore_client()

    def _to_entity(self, doc) -> Entity:
        data = doc.to_dict() or {}
        data["id"] = doc.id
        start_date = data.get("start_date")
        if isinstance(start_date, str):
            data["start_date"] = datetime.fromisoformat(start_date)
        return Entity(data)

    async def get_connection(self) -> Entity | None:
        doc = await self.db.collection("strava_connections").document("default").get()
        if not doc.exists:
            return None
        data = doc.to_dict() or {}
        data["id"] = "default"
        return Entity(data)

    async def save_connection(self, data: dict) -> Entity:
        payload = {**data, "updated_at": datetime.now(timezone.utc).isoformat()}
        await self.db.collection("strava_connections").document("default").set(payload)
        payload["id"] = "default"
        return Entity(payload)

    async def list_activities(self, limit: int = 50) -> list[Entity]:
        query = (
            self.db.collection("fitness_activities")
            .order_by("start_date", direction="DESCENDING")
            .limit(limit)
        )
        activities = []
        async for doc in query.stream():
            activities.append(self._to_entity(doc))
        return activities

    async def get_activity(self, activity_id: str) -> Entity | None:
        doc = await self.db.collection("fitness_activities").document(activity_id).get()
        if not doc.exists:
            return None
        return self._to_entity(doc)

    async def get_activity_by_provider_id(self, provider_activity_id: str) -> Entity | None:
        query = (
            self.db.collection("fitness_activities")
            .where("provider_activity_id", "==", provider_activity_id)
            .limit(1)
        )
        async for doc in query.stream():
            return self._to_entity(doc)
        return None

    async def upsert_activity(self, data: dict) -> Entity:
        existing = await self.get_activity_by_provider_id(data["provider_activity_id"])
        activity_id = existing.id if existing else data["provider_activity_id"]
        payload = {
            **data,
            "start_date": data["start_date"].isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.db.collection("fitness_activities").document(activity_id).set(payload)
        payload["id"] = activity_id
        payload["start_date"] = data["start_date"]
        return Entity(payload)

    async def update_fit_file(self, activity_id: str, fit_file_path: str) -> Entity | None:
        doc_ref = self.db.collection("fitness_activities").document(activity_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
        updates = {
            "fit_file_path": fit_file_path,
            "fit_download_status": "uploaded",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await doc_ref.update(updates)
        data = doc.to_dict() or {}
        data.update(updates)
        data["id"] = activity_id
        if isinstance(data.get("start_date"), str):
            data["start_date"] = datetime.fromisoformat(data["start_date"])
        return Entity(data)
