from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_profile_repo
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileOut

router = APIRouter(tags=["profiles"])


@router.get("/profiles", response_model=list[ProfileOut])
async def list_profiles(repo=Depends(get_profile_repo)):
    return await repo.get_all()


@router.get("/profiles/{profile_id}", response_model=ProfileOut)
async def get_profile(profile_id: str, repo=Depends(get_profile_repo)):
    profile = await repo.get(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/profiles", response_model=ProfileOut, status_code=201)
async def create_profile(data: ProfileCreate, repo=Depends(get_profile_repo)):
    return await repo.create(data)


@router.put("/profiles/{profile_id}", response_model=ProfileOut)
async def update_profile(profile_id: str, data: ProfileUpdate, repo=Depends(get_profile_repo)):
    profile = await repo.update(profile_id, data)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.delete("/profiles/{profile_id}", status_code=204)
async def delete_profile(profile_id: str, repo=Depends(get_profile_repo)):
    if not await repo.delete(profile_id):
        raise HTTPException(status_code=404, detail="Profile not found")
