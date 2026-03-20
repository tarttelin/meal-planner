from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.shopping_list import ShoppingListItem
from app.schemas.shopping_list import ShoppingListItemCreate, ShoppingListItemUpdate

class ShoppingListRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self) -> list[ShoppingListItem]:
        stmt = select(ShoppingListItem).order_by(ShoppingListItem.ingredient_name)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: ShoppingListItemCreate) -> ShoppingListItem:
        item = ShoppingListItem(
            ingredient_name=data.ingredient_name,
            quantity=data.quantity, unit=data.unit,
            tesco_search_term=data.tesco_search_term,
        )
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def bulk_create(self, items: list[ShoppingListItemCreate]) -> list[ShoppingListItem]:
        db_items = []
        for data in items:
            item = ShoppingListItem(
                ingredient_name=data.ingredient_name,
                quantity=data.quantity, unit=data.unit,
                tesco_search_term=data.tesco_search_term,
            )
            self.session.add(item)
            db_items.append(item)
        await self.session.commit()
        for item in db_items:
            await self.session.refresh(item)
        return db_items

    async def update(self, item_id: str, data: ShoppingListItemUpdate) -> ShoppingListItem | None:
        stmt = select(ShoppingListItem).where(ShoppingListItem.id == item_id)
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def delete(self, item_id: str) -> bool:
        stmt = select(ShoppingListItem).where(ShoppingListItem.id == item_id)
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            return False
        await self.session.delete(item)
        await self.session.commit()
        return True

    async def clear(self):
        items = await self.get_all()
        for item in items:
            await self.session.delete(item)
        await self.session.commit()
