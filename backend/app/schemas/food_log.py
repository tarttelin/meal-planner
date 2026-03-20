from pydantic import BaseModel
from datetime import date


class FoodLogCreate(BaseModel):
    date: date
    slot: str | None = None
    name: str
    pantry_item_id: str | None = None
    recipe_id: str | None = None
    recipe_servings: int | None = None
    quantity_g: float | None = None
    calories: float | None = None
    protein: float | None = None
    carbs: float | None = None
    fat: float | None = None
    profile_id: str | None = None


class FoodLogOut(FoodLogCreate):
    id: str
    model_config = {"from_attributes": True}
