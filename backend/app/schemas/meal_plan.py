from pydantic import BaseModel
from datetime import date

class MealPlanCreate(BaseModel):
    date: date
    slot: str
    recipe_id: str
    planned_servings: float | None = None
    profile_id: str | None = None

class MealPlanOut(BaseModel):
    id: str
    date: date
    slot: str
    recipe_id: str
    planned_servings: float | None = None
    profile_id: str | None = None
    recipe: "RecipeOutBrief | None" = None
    model_config = {"from_attributes": True}

class RecipeOutBrief(BaseModel):
    id: str
    name: str
    yield_servings: int
    model_config = {"from_attributes": True}

MealPlanOut.model_rebuild()
