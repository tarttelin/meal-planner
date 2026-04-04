import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.recipe import Recipe, Ingredient
from app.schemas.recipe import RecipeCreate, RecipeUpdate

class RecipeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self, search: str | None = None, tag: str | None = None) -> list[Recipe]:
        stmt = select(Recipe).options(selectinload(Recipe.ingredients)).order_by(Recipe.name)
        if search:
            stmt = stmt.where(Recipe.name.ilike(f"%{search}%"))
        if tag:
            stmt = stmt.where(Recipe.tags.ilike(f'%"{tag}"%'))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get(self, recipe_id: str) -> Recipe | None:
        stmt = select(Recipe).options(selectinload(Recipe.ingredients)).where(Recipe.id == recipe_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: RecipeCreate) -> Recipe:
        recipe = Recipe(
            name=data.name,
            description=data.description,
            yield_servings=data.yield_servings,
            prep_time_mins=data.prep_time_mins,
            cook_time_mins=data.cook_time_mins,
            instructions=json.dumps(data.instructions) if data.instructions else None,
            tags=json.dumps(data.tags) if data.tags else None,
        )
        for ing in data.ingredients:
            recipe.ingredients.append(Ingredient(
                name=ing.name, quantity=ing.quantity, unit=ing.unit,
                notes=ing.notes, tesco_search_term=ing.tesco_search_term,
                calories=ing.calories, protein=ing.protein,
                carbs=ing.carbs, fat=ing.fat,
                pantry_item_id=ing.pantry_item_id,
            ))
        self.session.add(recipe)
        await self.session.commit()
        await self.session.refresh(recipe, ["ingredients"])
        return recipe

    async def update(self, recipe_id: str, data: RecipeUpdate) -> Recipe | None:
        recipe = await self.get(recipe_id)
        if not recipe:
            return None
        recipe.name = data.name
        recipe.description = data.description
        recipe.yield_servings = data.yield_servings
        recipe.prep_time_mins = data.prep_time_mins
        recipe.cook_time_mins = data.cook_time_mins
        recipe.instructions = json.dumps(data.instructions) if data.instructions else None
        recipe.tags = json.dumps(data.tags) if data.tags else None
        recipe.ingredients.clear()
        for ing in data.ingredients:
            recipe.ingredients.append(Ingredient(
                name=ing.name, quantity=ing.quantity, unit=ing.unit,
                notes=ing.notes, tesco_search_term=ing.tesco_search_term,
                calories=ing.calories, protein=ing.protein,
                carbs=ing.carbs, fat=ing.fat,
                pantry_item_id=ing.pantry_item_id,
            ))
        await self.session.commit()
        await self.session.refresh(recipe, ["ingredients"])
        return recipe

    async def delete(self, recipe_id: str) -> bool:
        recipe = await self.get(recipe_id)
        if not recipe:
            return False
        await self.session.delete(recipe)
        await self.session.commit()
        return True
