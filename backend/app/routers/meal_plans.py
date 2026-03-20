from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_meal_plan_repo
from app.schemas.meal_plan import MealPlanCreate, MealPlanOut

router = APIRouter(tags=["meal-plans"])


def _parse_week(week_str: str) -> tuple[date, date]:
    year, week_num = week_str.split("-W")
    start = date.fromisocalendar(int(year), int(week_num), 1)
    end = start + timedelta(days=6)
    return start, end


@router.get("/meal-plans", response_model=list[MealPlanOut])
async def get_meal_plans(week: str = Query(..., pattern=r"^\d{4}-W\d{2}$"), profile_id: str | None = Query(None), repo=Depends(get_meal_plan_repo)):
    start, end = _parse_week(week)
    plans = await repo.get_week(start, end, profile_id=profile_id)
    return [MealPlanOut.model_validate(p) for p in plans]


@router.post("/meal-plans", response_model=MealPlanOut, status_code=201)
async def create_meal_plan(data: MealPlanCreate, repo=Depends(get_meal_plan_repo)):
    plan = await repo.create(data)
    return MealPlanOut.model_validate(plan)


@router.delete("/meal-plans/{plan_id}", status_code=204)
async def delete_meal_plan(plan_id: str, repo=Depends(get_meal_plan_repo)):
    if not await repo.delete(plan_id):
        raise HTTPException(status_code=404, detail="Meal plan not found")
