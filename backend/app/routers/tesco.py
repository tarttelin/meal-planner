from fastapi import APIRouter
from app.services.tesco_service import TescoService
from app.schemas.tesco import TescoStatus, TescoSearchRequest, TescoAddToBasketRequest

router = APIRouter(prefix="/tesco", tags=["tesco"])

@router.get("/status", response_model=TescoStatus)
async def get_status():
    svc = TescoService.get_instance()
    await svc.check_login()
    return TescoStatus(connected=svc.connected, logged_in=svc.logged_in)

@router.post("/login")
async def login():
    svc = TescoService.get_instance()
    return await svc.login()

@router.post("/search")
async def search(data: TescoSearchRequest):
    svc = TescoService.get_instance()
    return await svc.search(data.query)

@router.post("/add-to-basket")
async def add_to_basket(data: TescoAddToBasketRequest):
    svc = TescoService.get_instance()
    return await svc.add_to_basket(data.item_ids)

@router.get("/basket")
async def get_basket():
    svc = TescoService.get_instance()
    return await svc.get_basket()
