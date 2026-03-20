from collections import defaultdict
from datetime import date
from app.schemas.shopping_list import ShoppingListItemCreate


class ShoppingService:
    def __init__(self, meal_plan_repo, shopping_repo, pantry_repo):
        self.meal_plan_repo = meal_plan_repo
        self.shopping_repo = shopping_repo
        self.pantry_repo = pantry_repo

    async def generate_from_meal_plans(self, start: date, end: date) -> list:
        plans = await self.meal_plan_repo.get_week(start, end)
        aggregated: dict[tuple[str, str | None], float] = defaultdict(float)
        tesco_terms: dict[str, str | None] = {}

        for plan in plans:
            if not plan.recipe:
                continue
            scale = (plan.servings or plan.recipe.servings) / plan.recipe.servings
            for ing in plan.recipe.ingredients:
                key = (ing.name.lower(), ing.unit)
                if ing.quantity:
                    aggregated[key] += ing.quantity * scale
                else:
                    aggregated[key] = 0
                if hasattr(ing, 'tesco_search_term') and ing.tesco_search_term:
                    tesco_terms[ing.name.lower()] = ing.tesco_search_term

        pantry_items = await self.pantry_repo.get_all()
        category_map = {p.name.lower(): p.category for p in pantry_items if p.category}

        await self.shopping_repo.clear()

        items = []
        for (name, unit), qty in sorted(aggregated.items()):
            items.append(ShoppingListItemCreate(
                ingredient_name=name,
                quantity=qty if qty > 0 else None,
                unit=unit,
                category=category_map.get(name),
                tesco_search_term=tesco_terms.get(name),
            ))

        return await self.shopping_repo.bulk_create(items)
