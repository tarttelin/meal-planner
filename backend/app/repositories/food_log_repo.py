from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.food_log import FoodLogEntry
from app.schemas.food_log import FoodLogPersist

class FoodLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_date_range(self, start: date, end: date, profile_id: str | None = None) -> list[FoodLogEntry]:
        stmt = (
            select(FoodLogEntry)
            .where(FoodLogEntry.date >= start, FoodLogEntry.date <= end)
            .order_by(FoodLogEntry.date, FoodLogEntry.created_at)
        )
        if profile_id is not None:
            stmt = stmt.where(FoodLogEntry.profile_id == profile_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: FoodLogPersist) -> FoodLogEntry:
        entry = FoodLogEntry(**data.model_dump())
        self.session.add(entry)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def get(self, entry_id: str) -> FoodLogEntry | None:
        stmt = select(FoodLogEntry).where(FoodLogEntry.id == entry_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, entry_id: str, data: FoodLogPersist) -> FoodLogEntry | None:
        entry = await self.get(entry_id)
        if not entry:
            return None
        for field, value in data.model_dump().items():
            setattr(entry, field, value)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def delete(self, entry_id: str) -> bool:
        entry = await self.get(entry_id)
        if not entry:
            return False
        await self.session.delete(entry)
        await self.session.commit()
        return True
