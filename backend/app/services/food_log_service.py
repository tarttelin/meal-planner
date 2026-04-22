from app.schemas.food_log import FoodLogCreate, FoodLogPersist, FoodLogUpdate
from app.schemas.nutrition import Nutrition


def _recipe_nutrition_totals(recipe) -> tuple[Nutrition, Nutrition]:
    total = Nutrition.sum_of([
        Nutrition(
            calories=i.calories or 0,
            protein=i.protein or 0,
            carbs=i.carbs or 0,
            fat=i.fat or 0,
        )
        for i in recipe.ingredients
    ])
    yield_servings = getattr(recipe, "yield_servings", 0) or 0
    per_serving = total.divide(yield_servings) if yield_servings else Nutrition()
    return total, per_serving


def _pantry_nutrition(pantry_item, quantity_g: float) -> Nutrition:
    scale = (quantity_g or 0) / 100.0
    nutriments = getattr(pantry_item, "nutriments", None) or {}
    return Nutrition(
        calories=(getattr(pantry_item, "calories_per_100g", None) or 0) * scale,
        protein=(getattr(pantry_item, "protein_per_100g", None) or 0) * scale,
        carbs=(getattr(pantry_item, "carbs_per_100g", None) or 0) * scale,
        fat=(getattr(pantry_item, "fat_per_100g", None) or 0) * scale,
        nutriments={
            k: (v * scale if isinstance(v, (int, float)) else v)
            for k, v in nutriments.items()
        },
    )


class FoodLogService:
    def __init__(self, food_log_repo, recipe_repo, pantry_repo):
        self.food_log_repo = food_log_repo
        self.recipe_repo = recipe_repo
        self.pantry_repo = pantry_repo

    async def build_snapshot(self, data: FoodLogCreate) -> FoodLogPersist:
        persist = FoodLogPersist(**data.model_dump())
        if data.recipe_id:
            recipe = await self.recipe_repo.get(data.recipe_id)
            if recipe is not None:
                total, per_serving = _recipe_nutrition_totals(recipe)
                persist.recipe_yield_servings_snapshot = getattr(recipe, "yield_servings", None)
                persist.recipe_total_nutrition_snapshot = total
                persist.recipe_per_serving_nutrition_snapshot = per_serving
                servings = data.consumed_servings if data.consumed_servings is not None else 1
                persist.nutrition = per_serving.scale(servings)
        elif data.pantry_item_id:
            pantry = await self.pantry_repo.get(data.pantry_item_id)
            if pantry is not None:
                persist.nutrition = _pantry_nutrition(pantry, data.quantity_g or 0)
        return persist

    async def create(self, data: FoodLogCreate):
        persist = await self.build_snapshot(data)
        return await self.food_log_repo.create(persist)

    async def update(self, entry_id: str, data: FoodLogUpdate):
        existing = await self.food_log_repo.get(entry_id)
        if existing is None:
            return None

        fields_set = data.model_fields_set
        merged = FoodLogCreate(
            date=existing.date,
            slot=getattr(existing, "slot", None),
            name=existing.name,
            pantry_item_id=getattr(existing, "pantry_item_id", None),
            recipe_id=getattr(existing, "recipe_id", None),
            meal_plan_id=getattr(existing, "meal_plan_id", None),
            consumed_servings=(
                data.consumed_servings
                if "consumed_servings" in fields_set
                else getattr(existing, "consumed_servings", None)
            ),
            quantity_g=(
                data.quantity_g
                if "quantity_g" in fields_set
                else getattr(existing, "quantity_g", None)
            ),
            profile_id=getattr(existing, "profile_id", None),
        )
        persist = await self.build_snapshot(merged)
        return await self.food_log_repo.update(entry_id, persist)
