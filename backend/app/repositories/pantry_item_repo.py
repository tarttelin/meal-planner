from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pantry_item import PantryItem
from app.schemas.pantry_item import PantryItemCreate

class PantryItemRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self, search: str | None = None) -> list[PantryItem]:
        stmt = select(PantryItem).order_by(PantryItem.name)
        if search:
            stmt = stmt.where(PantryItem.name.ilike(f"%{search}%"))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get(self, item_id: str) -> PantryItem | None:
        stmt = select(PantryItem).where(PantryItem.id == item_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> PantryItem | None:
        stmt = select(PantryItem).where(PantryItem.name.ilike(name))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_barcode(self, barcode: str) -> PantryItem | None:
        stmt = select(PantryItem).where(PantryItem.barcode == barcode)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: PantryItemCreate) -> PantryItem:
        item = PantryItem(**data.model_dump())
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def update(self, item_id: str, data: PantryItemCreate) -> PantryItem | None:
        item = await self.get(item_id)
        if not item:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def delete(self, item_id: str) -> bool:
        item = await self.get(item_id)
        if not item:
            return False
        await self.session.delete(item)
        await self.session.commit()
        return True
