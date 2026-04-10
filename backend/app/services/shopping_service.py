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
        pantry_items = await self.pantry_repo.get_all()
        pantry_by_id = {p.id: p for p in pantry_items}
        category_by_name = {p.name.lower(): p.category for p in pantry_items if p.category}

        aggregated: dict = defaultdict(float)
        names: dict = {}
        units: dict = {}
        categories: dict = {}
        tesco_terms: dict = {}

        for plan in plans:
            if not plan.recipe:
                continue
            scale = (plan.planned_servings or plan.recipe.yield_servings) / plan.recipe.yield_servings
            for ing in plan.recipe.ingredients:
                pid = getattr(ing, 'pantry_item_id', None)
                pantry_item = pantry_by_id.get(pid) if pid else None

                if pantry_item:
                    key = pid
                    display_name = pantry_item.name
                    unit = ing.unit or "g"
                    category = pantry_item.category
                else:
                    key = (ing.name.lower(), ing.unit)
                    display_name = ing.name
                    unit = ing.unit
                    category = category_by_name.get(ing.name.lower())

                if key not in names:
                    names[key] = display_name
                    units[key] = unit
                    categories[key] = category
                if ing.quantity:
                    aggregated[key] += ing.quantity * scale
                else:
                    aggregated[key] = 0
                if hasattr(ing, 'tesco_search_term') and ing.tesco_search_term:
                    tesco_terms[key] = ing.tesco_search_term

        await self.shopping_repo.clear()

        items = []
        for key, qty in sorted(aggregated.items(), key=lambda kv: names[kv[0]].lower()):
            items.append(ShoppingListItemCreate(
                ingredient_name=names[key],
                quantity=round(qty, 1) if qty > 0 else None,
                unit=units[key],
                category=categories[key],
                tesco_search_term=tesco_terms.get(key),
            ))

        return await self.shopping_repo.bulk_create(items)
