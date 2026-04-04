from fastapi import Depends
from app.config import REPO_TYPE
from app.services.food_log_service import FoodLogService


if REPO_TYPE == "firestore":
    from app.repositories.firestore.recipe_repo import RecipeRepository
    from app.repositories.firestore.pantry_item_repo import PantryItemRepository
    from app.repositories.firestore.meal_plan_repo import MealPlanRepository
    from app.repositories.firestore.food_log_repo import FoodLogRepository
    from app.repositories.firestore.shopping_list_repo import ShoppingListRepository
    from app.repositories.firestore.profile_repo import ProfileRepository

    async def get_recipe_repo():
        return RecipeRepository()

    async def get_pantry_repo():
        return PantryItemRepository()

    async def get_meal_plan_repo():
        return MealPlanRepository()

    async def get_food_log_repo():
        return FoodLogRepository()

    async def get_shopping_list_repo():
        return ShoppingListRepository()

    async def get_profile_repo():
        return ProfileRepository()

    async def get_food_log_service(
        food_log_repo=Depends(get_food_log_repo),
        recipe_repo=Depends(get_recipe_repo),
        pantry_repo=Depends(get_pantry_repo),
    ):
        return FoodLogService(food_log_repo, recipe_repo, pantry_repo)

else:
    from app.models.database import get_session
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.repositories.recipe_repo import RecipeRepository
    from app.repositories.pantry_item_repo import PantryItemRepository
    from app.repositories.meal_plan_repo import MealPlanRepository
    from app.repositories.food_log_repo import FoodLogRepository
    from app.repositories.shopping_list_repo import ShoppingListRepository

    async def get_recipe_repo(session: AsyncSession = Depends(get_session)):
        return RecipeRepository(session)

    async def get_pantry_repo(session: AsyncSession = Depends(get_session)):
        return PantryItemRepository(session)

    async def get_meal_plan_repo(session: AsyncSession = Depends(get_session)):
        return MealPlanRepository(session)

    async def get_food_log_repo(session: AsyncSession = Depends(get_session)):
        return FoodLogRepository(session)

    async def get_shopping_list_repo(session: AsyncSession = Depends(get_session)):
        return ShoppingListRepository(session)

    async def get_profile_repo(session: AsyncSession = Depends(get_session)):
        # SQLite profiles don't have a separate repo — create a thin wrapper
        from app.repositories.profile_repo import ProfileRepository
        return ProfileRepository(session)

    async def get_food_log_service(
        food_log_repo=Depends(get_food_log_repo),
        recipe_repo=Depends(get_recipe_repo),
        pantry_repo=Depends(get_pantry_repo),
    ):
        return FoodLogService(food_log_repo, recipe_repo, pantry_repo)
