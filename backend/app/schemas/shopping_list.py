from pydantic import BaseModel
from datetime import date

class ShoppingListItemCreate(BaseModel):
    ingredient_name: str
    quantity: float | None = None
    unit: str | None = None
    category: str | None = None
    tesco_search_term: str | None = None

class ShoppingListItemUpdate(BaseModel):
    ingredient_name: str | None = None
    quantity: float | None = None
    unit: str | None = None
    tesco_search_term: str | None = None
    tesco_product_id: str | None = None
    added_to_basket: bool | None = None

class ShoppingListItemOut(BaseModel):
    id: str
    ingredient_name: str
    quantity: float | None = None
    unit: str | None = None
    category: str | None = None
    tesco_search_term: str | None = None
    tesco_product_id: str | None = None
    added_to_basket: bool
    model_config = {"from_attributes": True}

class GenerateRequest(BaseModel):
    start_date: date
    end_date: date
