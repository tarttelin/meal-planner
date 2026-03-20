"""Migrate data from local SQLite to the hosted API.

Usage:
    cd backend
    uv run python ../scripts/migrate_to_cloud.py <API_BASE_URL> <API_KEY>

This reads from the local SQLite database and creates all records
via the REST API on the target server.
"""

import asyncio
import json
import sys
import urllib.request

if len(sys.argv) < 3:
    print("Usage: uv run python ../scripts/migrate_to_cloud.py <API_BASE_URL> <API_KEY>")
    print("Example: uv run python ../scripts/migrate_to_cloud.py https://meal-planner-xxxxx.run.app my-secret-key")
    sys.exit(1)

API_BASE = sys.argv[1].rstrip("/")
API_KEY = sys.argv[2]
HEADERS = {"Content-Type": "application/json", "X-API-Key": API_KEY}


def post(path: str, data: dict) -> dict:
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{API_BASE}{path}", data=body, headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def get(path: str) -> list | dict:
    req = urllib.request.Request(f"{API_BASE}{path}", headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


async def main():
    from app.models.database import async_session
    from sqlalchemy import text

    async with async_session() as s:
        # 1. Profiles
        print("Migrating profiles...")
        result = await s.execute(text("SELECT id, name, calorie_target, protein_target, carbs_target, fat_target FROM profiles"))
        profiles = result.fetchall()
        profile_map = {}
        for row in profiles:
            data = {"name": row[1], "calorie_target": row[2], "protein_target": row[3], "carbs_target": row[4], "fat_target": row[5]}
            created = post("/api/profiles", data)
            profile_map[row[0]] = created["id"]
            print(f"  Profile: {row[1]} -> {created['id']}")

        # 2. Pantry items
        print("Migrating pantry items...")
        result = await s.execute(text("SELECT id, name, brand, barcode, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, image_url FROM pantry_items"))
        pantry_items = result.fetchall()
        pantry_map = {}
        for row in pantry_items:
            data = {
                "name": row[1], "brand": row[2], "barcode": row[3], "category": row[4],
                "calories_per_100g": row[5], "protein_per_100g": row[6],
                "carbs_per_100g": row[7], "fat_per_100g": row[8], "image_url": row[9],
            }
            created = post("/api/pantry", data)
            pantry_map[row[0]] = created["id"]
            print(f"  Pantry: {row[1]} -> {created['id']}")

        # 3. Recipes with ingredients
        print("Migrating recipes...")
        result = await s.execute(text("SELECT id, name, description, servings, prep_time_mins, cook_time_mins, instructions, tags FROM recipes"))
        recipes = result.fetchall()
        recipe_map = {}
        for row in recipes:
            instructions = json.loads(row[6]) if row[6] else None
            tags = json.loads(row[7]) if row[7] else None

            ing_result = await s.execute(text(
                "SELECT name, quantity, unit, notes, tesco_search_term, calories, protein, carbs, fat, pantry_item_id FROM ingredients WHERE recipe_id = :rid"
            ), {"rid": row[0]})
            ingredients = []
            for ing in ing_result:
                ingredients.append({
                    "name": ing[0], "quantity": ing[1], "unit": ing[2],
                    "notes": ing[3], "tesco_search_term": ing[4],
                    "calories": ing[5], "protein": ing[6], "carbs": ing[7], "fat": ing[8],
                    "pantry_item_id": pantry_map.get(ing[9]) if ing[9] else None,
                })

            data = {
                "name": row[1], "description": row[2], "servings": row[3],
                "prep_time_mins": row[4], "cook_time_mins": row[5],
                "instructions": instructions, "tags": tags,
                "ingredients": ingredients,
            }
            created = post("/api/recipes", data)
            recipe_map[row[0]] = created["id"]
            print(f"  Recipe: {row[1]} -> {created['id']}")

        # 4. Meal plans
        print("Migrating meal plans...")
        result = await s.execute(text("SELECT id, date, slot, recipe_id, servings, profile_id FROM meal_plans"))
        for row in result:
            new_recipe_id = recipe_map.get(row[3])
            if not new_recipe_id:
                print(f"  Skipping meal plan {row[0]} — recipe not found")
                continue
            data = {
                "date": str(row[1]), "slot": row[2],
                "recipe_id": new_recipe_id, "servings": row[4],
                "profile_id": profile_map.get(row[5]) if row[5] else None,
            }
            post("/api/meal-plans", data)
            print(f"  Meal plan: {row[1]} {row[2]}")

        # 5. Food log
        print("Migrating food log...")
        result = await s.execute(text(
            "SELECT date, slot, name, pantry_item_id, recipe_id, recipe_servings, quantity_g, calories, protein, carbs, fat, profile_id FROM food_log"
        ))
        for row in result:
            data = {
                "date": str(row[0]), "slot": row[1], "name": row[2],
                "pantry_item_id": pantry_map.get(row[3]) if row[3] else None,
                "recipe_id": recipe_map.get(row[4]) if row[4] else None,
                "recipe_servings": row[5], "quantity_g": row[6],
                "calories": row[7], "protein": row[8], "carbs": row[9], "fat": row[10],
                "profile_id": profile_map.get(row[11]) if row[11] else None,
            }
            post("/api/food-log", data)
            print(f"  Food log: {row[0]} {row[1] or 'snack'} - {row[2]}")

        # 6. Shopping list
        print("Migrating shopping list...")
        result = await s.execute(text(
            "SELECT ingredient_name, quantity, unit, category, tesco_search_term, added_to_basket FROM shopping_list_items"
        ))
        for row in result:
            data = {
                "ingredient_name": row[0], "quantity": row[1], "unit": row[2],
                "category": row[3], "tesco_search_term": row[4],
            }
            item = post("/api/shopping-list/items", data)
            if row[5]:
                put_data = json.dumps({"added_to_basket": True}).encode()
                req = urllib.request.Request(
                    f"{API_BASE}/api/shopping-list/items/{item['id']}",
                    data=put_data, headers=HEADERS, method="PUT"
                )
                urllib.request.urlopen(req, timeout=30)
            print(f"  Shopping: {row[0]}")

    print("\nMigration complete!")

asyncio.run(main())
