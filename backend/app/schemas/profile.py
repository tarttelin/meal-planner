from pydantic import BaseModel

class ProfileCreate(BaseModel):
    name: str
    calorie_target: float | None = None
    protein_target: float | None = None
    carbs_target: float | None = None
    fat_target: float | None = None

class ProfileUpdate(ProfileCreate):
    pass

class ProfileOut(ProfileCreate):
    id: str
    model_config = {"from_attributes": True}
