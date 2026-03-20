from datetime import date
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe
from app.schemas.meal_plan import MealPlanCreate

class MealPlanRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_week(self, start: date, end: date, profile_id: str | None = None) -> list[MealPlan]:
        stmt = (
            select(MealPlan)
            .options(selectinload(MealPlan.recipe).selectinload(Recipe.ingredients))
            .where(and_(MealPlan.date >= start, MealPlan.date <= end))
            .order_by(MealPlan.date, MealPlan.slot)
        )
        if profile_id is not None:
            stmt = stmt.where(or_(MealPlan.profile_id == profile_id, MealPlan.profile_id.is_(None)))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: MealPlanCreate) -> MealPlan:
        meal_plan = MealPlan(
            date=data.date, slot=data.slot,
            recipe_id=data.recipe_id, servings=data.servings,
            profile_id=data.profile_id,
        )
        self.session.add(meal_plan)
        await self.session.commit()
        await self.session.refresh(meal_plan, ["recipe"])
        return meal_plan

    async def delete(self, plan_id: str) -> bool:
        stmt = select(MealPlan).where(MealPlan.id == plan_id)
        result = await self.session.execute(stmt)
        plan = result.scalar_one_or_none()
        if not plan:
            return False
        await self.session.delete(plan)
        await self.session.commit()
        return True
