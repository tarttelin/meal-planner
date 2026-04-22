from pydantic import BaseModel
from datetime import date

from app.schemas.nutrition import Nutrition


class FoodLogCreate(BaseModel):
    date: date
    slot: str | None = None
    name: str
    pantry_item_id: str | None = None
    recipe_id: str | None = None
    meal_plan_id: str | None = None
    consumed_servings: float | None = None
    quantity_g: float | None = None
    profile_id: str | None = None


class FoodLogUpdate(BaseModel):
    consumed_servings: float | None = None
    quantity_g: float | None = None


class FoodLogPersist(FoodLogCreate):
    nutrition: Nutrition = Nutrition()
    recipe_yield_servings_snapshot: int | None = None
    recipe_total_nutrition_snapshot: Nutrition | None = None
    recipe_per_serving_nutrition_snapshot: Nutrition | None = None


class FoodLogOut(BaseModel):
    id: str
    date: date
    slot: str | None = None
    name: str
    pantry_item_id: str | None = None
    recipe_id: str | None = None
    meal_plan_id: str | None = None
    consumed_servings: float | None = None
    quantity_g: float | None = None
    profile_id: str | None = None
    nutrition: Nutrition = Nutrition()
    recipe_yield_servings_snapshot: int | None = None
    recipe_total_nutrition_snapshot: Nutrition | None = None
    recipe_per_serving_nutrition_snapshot: Nutrition | None = None
    model_config = {"from_attributes": True}
