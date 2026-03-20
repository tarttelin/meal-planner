from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_shopping_list_repo, get_meal_plan_repo, get_pantry_repo
from app.services.shopping_service import ShoppingService
from app.schemas.shopping_list import (
    ShoppingListItemCreate, ShoppingListItemUpdate,
    ShoppingListItemOut, GenerateRequest,
)

router = APIRouter(tags=["shopping-list"])


@router.get("/shopping-list", response_model=list[ShoppingListItemOut])
async def get_shopping_list(repo=Depends(get_shopping_list_repo)):
    items = await repo.get_all()
    return [ShoppingListItemOut.model_validate(i) for i in items]


@router.post("/shopping-list/generate", response_model=list[ShoppingListItemOut])
async def generate_shopping_list(data: GenerateRequest, shopping_repo=Depends(get_shopping_list_repo), meal_plan_repo=Depends(get_meal_plan_repo), pantry_repo=Depends(get_pantry_repo)):
    service = ShoppingService(meal_plan_repo, shopping_repo, pantry_repo)
    items = await service.generate_from_meal_plans(data.start_date, data.end_date)
    return [ShoppingListItemOut.model_validate(i) for i in items]


@router.post("/shopping-list/items", response_model=ShoppingListItemOut, status_code=201)
async def add_item(data: ShoppingListItemCreate, repo=Depends(get_shopping_list_repo)):
    item = await repo.create(data)
    return ShoppingListItemOut.model_validate(item)


@router.put("/shopping-list/items/{item_id}", response_model=ShoppingListItemOut)
async def update_item(item_id: str, data: ShoppingListItemUpdate, repo=Depends(get_shopping_list_repo)):
    item = await repo.update(item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return ShoppingListItemOut.model_validate(item)


@router.delete("/shopping-list/items/{item_id}", status_code=204)
async def delete_item(item_id: str, repo=Depends(get_shopping_list_repo)):
    if not await repo.delete(item_id):
        raise HTTPException(status_code=404, detail="Item not found")
