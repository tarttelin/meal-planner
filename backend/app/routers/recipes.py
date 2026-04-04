import json
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_recipe_repo
from app.schemas.nutrition import Nutrition
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeOut, IngredientOut

router = APIRouter(tags=["recipes"])


def _ingredient_nutrition(ingredient) -> Nutrition:
    return Nutrition(
        calories=ingredient.calories or 0,
        protein=ingredient.protein or 0,
        carbs=ingredient.carbs or 0,
        fat=ingredient.fat or 0,
    )


def _to_out(recipe) -> RecipeOut:
    instructions = recipe.instructions
    tags = recipe.tags
    if isinstance(instructions, str):
        instructions = json.loads(instructions)
    if isinstance(tags, str):
        tags = json.loads(tags)
    total = Nutrition.sum_of([_ingredient_nutrition(i) for i in recipe.ingredients])
    per_serving = total.divide(recipe.yield_servings) if recipe.yield_servings else Nutrition()
    return RecipeOut(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        yield_servings=recipe.yield_servings,
        prep_time_mins=recipe.prep_time_mins,
        cook_time_mins=recipe.cook_time_mins,
        instructions=instructions,
        tags=tags,
        ingredients=[IngredientOut.model_validate(i) for i in recipe.ingredients],
        total=total,
        per_serving=per_serving,
    )


@router.get("/recipes", response_model=list[RecipeOut])
async def list_recipes(search: str | None = None, tag: str | None = None, repo=Depends(get_recipe_repo)):
    recipes = await repo.get_all(search=search, tag=tag)
    return [_to_out(r) for r in recipes]


@router.get("/recipes/{recipe_id}", response_model=RecipeOut)
async def get_recipe(recipe_id: str, repo=Depends(get_recipe_repo)):
    recipe = await repo.get(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _to_out(recipe)


@router.post("/recipes", response_model=RecipeOut, status_code=201)
async def create_recipe(data: RecipeCreate, repo=Depends(get_recipe_repo)):
    recipe = await repo.create(data)
    return _to_out(recipe)


@router.put("/recipes/{recipe_id}", response_model=RecipeOut)
async def update_recipe(recipe_id: str, data: RecipeUpdate, repo=Depends(get_recipe_repo)):
    recipe = await repo.update(recipe_id, data)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _to_out(recipe)


@router.delete("/recipes/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: str, repo=Depends(get_recipe_repo)):
    if not await repo.delete(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
