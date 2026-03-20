import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.database import Base

class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ingredient_name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tesco_search_term: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tesco_product_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    added_to_basket: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
