import asyncio
import functools
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException, UploadFile, File

logger = logging.getLogger(__name__)

router = APIRouter(tags=["barcode"])

OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
HEADERS = {"User-Agent": "MealPlanner/1.0 (local app)"}

MAX_RETRIES = 3
BACKOFF_BASE = 0.5


def _fetch(url: str, timeout: int = 10) -> dict:
    last_exc = None
    for attempt in range(MAX_RETRIES):
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return {"status": 0}
            body = ""
            try:
                body = e.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                pass
            logger.warning(
                "Open Food Facts returned HTTP %d (attempt %d/%d) url=%s body=%s",
                e.code, attempt + 1, MAX_RETRIES, url, body,
            )
            last_exc = e
        except urllib.error.URLError as e:
            logger.warning(
                "Open Food Facts connection error (attempt %d/%d) url=%s reason=%s",
                attempt + 1, MAX_RETRIES, url, e.reason,
            )
            last_exc = e

        if attempt < MAX_RETRIES - 1:
            delay = BACKOFF_BASE * (2 ** attempt)
            time.sleep(delay)

    raise last_exc


@router.get("/barcode/{barcode}")
async def lookup_barcode(barcode: str):
    url = OFF_URL.format(barcode=barcode)
    loop = asyncio.get_event_loop()
    try:
        data = await loop.run_in_executor(None, functools.partial(_fetch, url))
    except Exception as e:
        logger.error("Barcode lookup failed after %d retries: barcode=%s error=%s", MAX_RETRIES, barcode, e)
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
        "nutriments": nutrients,
        "per_100g": {
            "calories": nutrients.get("energy-kcal_100g"),
            "protein": nutrients.get("proteins_100g"),
            "carbs": nutrients.get("carbohydrates_100g"),
            "fat": nutrients.get("fat_100g"),
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
        "nutriments": nutrients,
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
    except Exception as e:
        logger.error("Food search failed after %d retries: query=%s error=%s", MAX_RETRIES, q, e)
        raise HTTPException(status_code=502, detail="Search failed — Open Food Facts may be slow. Try again.")

    products = data.get("products", [])
    return [_format_product(p) for p in products if p.get("product_name")]


def _decode_barcode_image(image_bytes: bytes) -> str | None:
    import cv2
    import numpy as np
    from PIL import Image
    from pyzbar.pyzbar import decode
    import io

    img = Image.open(io.BytesIO(image_bytes))
    arr = np.array(img)

    # Convert to grayscale
    if len(arr.shape) == 3:
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    else:
        gray = arr

    # Try decoding at multiple processing levels
    for processed in _preprocess_variants(gray):
        results = decode(processed)
        if results:
            return results[0].data.decode("utf-8")

    return None


def _preprocess_variants(gray):
    import cv2

    # 1. Raw grayscale
    yield gray

    # 2. Contrast boost (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    yield enhanced

    # 3. Enhanced + slight blur to reduce noise
    blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
    yield blurred

    # 4. Sharpened
    sharp = cv2.addWeighted(enhanced, 1.5, blurred, -0.5, 0)
    yield sharp

    # 5. Binary threshold
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    yield binary


@router.post("/barcode/decode")
async def decode_barcode_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _decode_barcode_image, image_bytes)

    if not result:
        raise HTTPException(status_code=404, detail="No barcode found in image")

    return {"barcode": result}
