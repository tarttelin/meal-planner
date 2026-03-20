import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.database import Base
from app.models.pantry_item import PantryItem  # noqa: F401

class Recipe(Base):
    __tablename__ = "recipes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    servings: Mapped[int] = mapped_column(Integer, default=4)
    prep_time_mins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cook_time_mins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    ingredients: Mapped[list["Ingredient"]] = relationship(back_populates="recipe", cascade="all, delete-orphan")

class Ingredient(Base):
    __tablename__ = "ingredients"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipe_id: Mapped[str] = mapped_column(String(36), ForeignKey("recipes.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tesco_search_term: Mapped[str | None] = mapped_column(String(255), nullable=True)
    calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    protein: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat: Mapped[float | None] = mapped_column(Float, nullable=True)
    pantry_item_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("pantry_items.id"), nullable=True)
    recipe: Mapped["Recipe"] = relationship(back_populates="ingredients")
    pantry_item: Mapped[Optional["PantryItem"]] = relationship()
