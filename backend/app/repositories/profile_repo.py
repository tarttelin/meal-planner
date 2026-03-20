from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.profile import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate


class ProfileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self) -> list[Profile]:
        result = await self.session.execute(select(Profile).order_by(Profile.name))
        return list(result.scalars().all())

    async def get(self, profile_id: str) -> Profile | None:
        result = await self.session.execute(select(Profile).where(Profile.id == profile_id))
        return result.scalar_one_or_none()

    async def create(self, data: ProfileCreate) -> Profile:
        profile = Profile(**data.model_dump())
        self.session.add(profile)
        await self.session.commit()
        await self.session.refresh(profile)
        return profile

    async def update(self, profile_id: str, data: ProfileUpdate) -> Profile | None:
        profile = await self.get(profile_id)
        if not profile:
            return None
        for key, value in data.model_dump().items():
            setattr(profile, key, value)
        await self.session.commit()
        await self.session.refresh(profile)
        return profile

    async def delete(self, profile_id: str) -> bool:
        profile = await self.get(profile_id)
        if not profile:
            return False
        await self.session.delete(profile)
        await self.session.commit()
        return True
