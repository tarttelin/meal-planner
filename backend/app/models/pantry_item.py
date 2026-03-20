import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.database import Base

class PantryItem(Base):
    __tablename__ = "pantry_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    calories_per_100g: Mapped[float | None] = mapped_column(Float, nullable=True)
    protein_per_100g: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_per_100g: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_per_100g: Mapped[float | None] = mapped_column(Float, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
