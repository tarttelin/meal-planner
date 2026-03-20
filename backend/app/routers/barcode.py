import asyncio
import functools
import json
import urllib.error
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["barcode"])

OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
HEADERS = {"User-Agent": "MealPlanner/1.0 (local app)"}


def _fetch(url: str, timeout: int = 10) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"status": 0}
        raise


@router.get("/barcode/{barcode}")
async def lookup_barcode(barcode: str):
    url = OFF_URL.format(barcode=barcode)
    loop = asyncio.get_event_loop()
    try:
        data = await loop.run_in_executor(None, functools.partial(_fetch, url))
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to reach Open Food Facts")

    if data.get("status") != 1:
        raise HTTPException(status_code=404, detail="Product not found")

    product = data.get("product", {})
    nutrients = product.get("nutriments", {})

    return {
        "barcode": barcode,
        "name": product.get("product_name", ""),
        "brand": product.get("brands", ""),
        "quantity": product.get("quantity", ""),
        "image_url": product.get("image_front_small_url"),
        "per_100g": {
            "calories": nutrients.get("energy-kcal_100g"),
            "protein": nutrients.get("proteins_100g"),
            "carbs": nutrients.get("carbohydrates_100g"),
            "fat": nutrients.get("fat_100g"),
            "fibre": nutrients.get("fiber_100g"),
            "sugar": nutrients.get("sugars_100g"),
            "salt": nutrients.get("salt_100g"),
        },
    }


def _format_product(product: dict) -> dict:
    nutrients = product.get("nutriments", {})
    return {
        "barcode": product.get("code", ""),
        "name": product.get("product_name", ""),
        "brand": product.get("brands", ""),
        "quantity": product.get("quantity", ""),
        "image_url": product.get("image_front_small_url"),
        "per_100g": {
            "calories": nutrients.get("energy-kcal_100g"),
            "protein": nutrients.get("proteins_100g"),
            "carbs": nutrients.get("carbohydrates_100g"),
            "fat": nutrients.get("fat_100g"),
        },
    }


@router.get("/food-search")
async def search_food(q: str, page: int = 1):
    params = urllib.parse.urlencode({
        "search_terms": q,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": 10,
        "page": page,
        "countries_tags_en": "united-kingdom",
    })
    url = f"{OFF_SEARCH_URL}?{params}"
    loop = asyncio.get_event_loop()
    try:
        data = await loop.run_in_executor(None, functools.partial(_fetch, url, 30))
    except Exception:
        raise HTTPException(status_code=502, detail="Search timed out — Open Food Facts may be slow. Try again.")

    products = data.get("products", [])
    return [_format_product(p) for p in products if p.get("product_name")]
