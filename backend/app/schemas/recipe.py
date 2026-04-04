from pydantic import BaseModel

from app.schemas.nutrition import Nutrition


class IngredientIn(BaseModel):
    name: str
    quantity: float | None = None
    unit: str | None = None
    notes: str | None = None
    tesco_search_term: str | None = None
    calories: float | None = None
    protein: float | None = None
    carbs: float | None = None
    fat: float | None = None
    pantry_item_id: str | None = None

class IngredientOut(IngredientIn):
    id: str
    pantry_item_id: str | None = None
    model_config = {"from_attributes": True}

class RecipeCreate(BaseModel):
    name: str
    description: str | None = None
    yield_servings: int = 4
    prep_time_mins: int | None = None
    cook_time_mins: int | None = None
    instructions: list[str] | None = None
    tags: list[str] | None = None
    ingredients: list[IngredientIn] = []

class RecipeUpdate(RecipeCreate):
    pass

class RecipeOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    yield_servings: int
    prep_time_mins: int | None = None
    cook_time_mins: int | None = None
    instructions: list[str] | None = None
    tags: list[str] | None = None
    ingredients: list[IngredientOut] = []
    total: Nutrition = Nutrition()
    per_serving: Nutrition = Nutrition()
    model_config = {"from_attributes": True}
