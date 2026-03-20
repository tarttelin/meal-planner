import asyncio
import functools

from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_pantry_repo, get_recipe_repo
from app.routers.barcode import _fetch, OFF_URL
from app.schemas.pantry_item import PantryItemCreate, PantryItemOut, BarcodeScanRequest

router = APIRouter(tags=["pantry"])


@router.get("/pantry", response_model=list[PantryItemOut])
async def list_pantry_items(search: str | None = None, repo=Depends(get_pantry_repo)):
    return await repo.get_all(search=search)


@router.post("/pantry", response_model=PantryItemOut, status_code=201)
async def create_pantry_item(data: PantryItemCreate, repo=Depends(get_pantry_repo)):
    return await repo.create(data)


@router.post("/pantry/scan", response_model=PantryItemOut)
async def scan_barcode(body: BarcodeScanRequest, repo=Depends(get_pantry_repo)):
    existing = await repo.get_by_barcode(body.barcode)
    if existing:
        return existing

    url = OFF_URL.format(barcode=body.barcode)
    loop = asyncio.get_event_loop()
    try:
        data = await loop.run_in_executor(None, functools.partial(_fetch, url))
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to reach Open Food Facts")

    if data.get("status") != 1:
        raise HTTPException(status_code=404, detail="Product not found")

    product = data.get("product", {})
    nutrients = product.get("nutriments", {})

    item_data = PantryItemCreate(
        name=product.get("product_name", ""),
        brand=product.get("brands"),
        barcode=body.barcode,
        calories_per_100g=nutrients.get("energy-kcal_100g"),
        protein_per_100g=nutrients.get("proteins_100g"),
        carbs_per_100g=nutrients.get("carbohydrates_100g"),
        fat_per_100g=nutrients.get("fat_100g"),
        image_url=product.get("image_front_small_url"),
    )
    return await repo.create(item_data)


@router.put("/pantry/{item_id}", response_model=PantryItemOut)
async def update_pantry_item(item_id: str, data: PantryItemCreate, repo=Depends(get_pantry_repo)):
    item = await repo.update(item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    return item


@router.post("/pantry/import-recipe/{recipe_id}", response_model=list[PantryItemOut])
async def import_recipe_ingredients(recipe_id: str, pantry_repo=Depends(get_pantry_repo), recipe_repo=Depends(get_recipe_repo)):
    recipe = await recipe_repo.get(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    created = []
    for ing in recipe.ingredients:
        existing = await pantry_repo.get_by_name(ing.name)
        if existing:
            created.append(existing)
            continue
        item = await pantry_repo.create(PantryItemCreate(name=ing.name))
        created.append(item)
    return created


@router.post("/pantry/{item_id}/scan", response_model=PantryItemOut)
async def scan_to_update(item_id: str, body: BarcodeScanRequest, repo=Depends(get_pantry_repo)):
    item = await repo.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pantry item not found")

    already = await repo.get_by_barcode(body.barcode)
    if already and already.id != item_id:
        raise HTTPException(status_code=409, detail=f"Barcode already assigned to '{already.name}'")

    url = OFF_URL.format(barcode=body.barcode)
    loop = asyncio.get_event_loop()
    try:
        data = await loop.run_in_executor(None, functools.partial(_fetch, url))
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to reach Open Food Facts")

    if data.get("status") != 1:
        raise HTTPException(status_code=404, detail="Product not found for that barcode")

    product = data.get("product", {})
    nutrients = product.get("nutriments", {})

    update_data = PantryItemCreate(
        name=item.name,
        brand=product.get("brands") or item.brand,
        barcode=body.barcode,
        category=item.category,
        calories_per_100g=nutrients.get("energy-kcal_100g") or item.calories_per_100g,
        protein_per_100g=nutrients.get("proteins_100g") or item.protein_per_100g,
        carbs_per_100g=nutrients.get("carbohydrates_100g") or item.carbs_per_100g,
        fat_per_100g=nutrients.get("fat_100g") or item.fat_per_100g,
        image_url=product.get("image_front_small_url") or item.image_url,
    )
    return await repo.update(item_id, update_data)


@router.get("/pantry/{item_id}", response_model=PantryItemOut)
async def get_pantry_item(item_id: str, repo=Depends(get_pantry_repo)):
    item = await repo.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    return item


@router.delete("/pantry/{item_id}", status_code=204)
async def delete_pantry_item(item_id: str, repo=Depends(get_pantry_repo)):
    if not await repo.delete(item_id):
        raise HTTPException(status_code=404, detail="Pantry item not found")
