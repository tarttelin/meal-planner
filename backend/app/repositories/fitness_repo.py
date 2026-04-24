from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fitness import FitnessActivity, StravaConnection


class FitnessRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_connection(self) -> StravaConnection | None:
        return await self.session.get(StravaConnection, "default")

    async def save_connection(self, data: dict) -> StravaConnection:
        connection = await self.get_connection()
        if connection is None:
            connection = StravaConnection(id="default", **data)
            self.session.add(connection)
        else:
            for field, value in data.items():
                setattr(connection, field, value)
            connection.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(connection)
        return connection

    async def list_activities(self, limit: int = 50) -> list[FitnessActivity]:
        stmt = select(FitnessActivity).order_by(desc(FitnessActivity.start_date)).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_activity(self, activity_id: str) -> FitnessActivity | None:
        return await self.session.get(FitnessActivity, activity_id)

    async def get_activity_by_provider_id(self, provider_activity_id: str) -> FitnessActivity | None:
        stmt = select(FitnessActivity).where(FitnessActivity.provider_activity_id == provider_activity_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_activity(self, data: dict) -> FitnessActivity:
        activity = await self.get_activity_by_provider_id(data["provider_activity_id"])
        if activity is None:
            activity = FitnessActivity(**data)
            self.session.add(activity)
        else:
            for field, value in data.items():
                setattr(activity, field, value)
            activity.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(activity)
        return activity

    async def update_fit_file(self, activity_id: str, fit_file_path: str) -> FitnessActivity | None:
        activity = await self.get_activity(activity_id)
        if activity is None:
            return None
        activity.fit_file_path = fit_file_path
        activity.fit_download_status = "uploaded"
        activity.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(activity)
        return activity
