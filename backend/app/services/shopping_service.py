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

        names: dict[str, str] = {}
        units: dict[str, str | None] = {}

        for plan in plans:
            if not plan.recipe:
                continue
            scale = (plan.planned_servings or plan.recipe.yield_servings) / plan.recipe.yield_servings
            for ing in plan.recipe.ingredients:
                pid = getattr(ing, 'pantry_item_id', None)
                key = pid if pid else (ing.name.lower(), ing.unit)
                if key not in names:
                    names[key] = ing.name.lower()
                    units[key] = ing.unit if not pid else "g"
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
        for key, qty in sorted(aggregated.items(), key=lambda kv: names[kv[0]]):
            name = names[key]
            unit = units[key]
            items.append(ShoppingListItemCreate(
                ingredient_name=name,
                quantity=round(qty, 1) if qty > 0 else None,
                unit=unit,
                category=category_map.get(name),
                tesco_search_term=tesco_terms.get(name),
            ))

        return await self.shopping_repo.bulk_create(items)
