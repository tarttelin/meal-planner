from pydantic import BaseModel

class PantryItemCreate(BaseModel):
    name: str
    brand: str | None = None
    barcode: str | None = None
    calories_per_100g: float | None = None
    protein_per_100g: float | None = None
    carbs_per_100g: float | None = None
    fat_per_100g: float | None = None
    category: str | None = None
    image_url: str | None = None
    nutriments: dict | None = None

class PantryItemOut(PantryItemCreate):
    id: str
    model_config = {"from_attributes": True}

class BarcodeScanRequest(BaseModel):
    barcode: str
