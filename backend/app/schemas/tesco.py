from pydantic import BaseModel

class TescoStatus(BaseModel):
    connected: bool
    logged_in: bool

class TescoSearchRequest(BaseModel):
    query: str

class TescoProduct(BaseModel):
    id: str
    name: str
    price: float | None = None
    image_url: str | None = None

class TescoAddToBasketRequest(BaseModel):
    item_ids: list[str] | None = None
