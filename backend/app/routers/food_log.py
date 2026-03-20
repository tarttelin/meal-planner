from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_food_log_repo
from app.schemas.food_log import FoodLogCreate, FoodLogOut

router = APIRouter(tags=["food-log"])


@router.get("/food-log", response_model=list[FoodLogOut])
async def get_food_log(
    start_date: date = Query(...),
    end_date: date = Query(...),
    profile_id: str | None = Query(None),
    repo=Depends(get_food_log_repo),
):
    return await repo.get_by_date_range(start_date, end_date, profile_id=profile_id)


@router.post("/food-log", response_model=FoodLogOut, status_code=201)
async def create_food_log_entry(data: FoodLogCreate, repo=Depends(get_food_log_repo)):
    return await repo.create(data)


@router.delete("/food-log/{entry_id}", status_code=204)
async def delete_food_log_entry(entry_id: str, repo=Depends(get_food_log_repo)):
    if not await repo.delete(entry_id):
        raise HTTPException(status_code=404, detail="Food log entry not found")
