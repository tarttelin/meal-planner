import uuid
from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.models.database import Base

class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    calorie_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    protein_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_target: Mapped[float | None] = mapped_column(Float, nullable=True)
