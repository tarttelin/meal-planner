import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.database import Base


class StravaConnection(Base):
    __tablename__ = "strava_connections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    athlete_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    athlete_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    access_token: Mapped[str] = mapped_column(Text)
    refresh_token: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[int] = mapped_column(Integer)
    scope: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class FitnessActivity(Base):
    __tablename__ = "fitness_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider: Mapped[str] = mapped_column(String(40), default="strava")
    provider_activity_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    sport_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime)
    timezone: Mapped[str | None] = mapped_column(String(120), nullable=True)
    distance_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    moving_time_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    elapsed_time_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_elevation_gain_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_speed_mps: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_speed_mps: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_heartrate: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_heartrate: Mapped[float | None] = mapped_column(Float, nullable=True)
    calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary_polyline: Mapped[str | None] = mapped_column(Text, nullable=True)
    strava_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fit_file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    fit_download_status: Mapped[str] = mapped_column(String(40), default="not_available")
    streams: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    raw: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
