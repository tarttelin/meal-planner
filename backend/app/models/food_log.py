import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, Float, Integer, Date, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.database import Base


class FoodLogEntry(Base):
    __tablename__ = "food_log"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    date: Mapped[date] = mapped_column(Date)
    slot: Mapped[str | None] = mapped_column(String(20), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    pantry_item_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("pantry_items.id"), nullable=True)
    recipe_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("recipes.id"), nullable=True)
    meal_plan_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    consumed_servings: Mapped[float | None] = mapped_column("consumed_servings", Float, nullable=True)
    quantity_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    nutrition: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recipe_yield_servings_snapshot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recipe_total_nutrition_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recipe_per_serving_nutrition_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    profile_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
