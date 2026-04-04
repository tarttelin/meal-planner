import uuid
from sqlalchemy import String, Float, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.database import Base
from app.models.recipe import Recipe
import datetime as dt

class MealPlan(Base):
    __tablename__ = "meal_plans"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    date: Mapped[dt.date] = mapped_column(Date)
    slot: Mapped[str] = mapped_column(String(20))
    recipe_id: Mapped[str] = mapped_column(String(36), ForeignKey("recipes.id", ondelete="CASCADE"))
    planned_servings: Mapped[float | None] = mapped_column("planned_servings", Float, nullable=True)
    profile_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=True)
    recipe: Mapped["Recipe"] = relationship()
