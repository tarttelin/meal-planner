from datetime import datetime

from pydantic import BaseModel, Field


class StravaConnectUrl(BaseModel):
    authorization_url: str


class StravaConnectionOut(BaseModel):
    connected: bool
    athlete_id: int | None = None
    athlete_name: str | None = None
    scope: str | None = None


class FitnessActivityOut(BaseModel):
    id: str
    provider: str = "strava"
    provider_activity_id: str
    name: str
    sport_type: str | None = None
    start_date: datetime
    timezone: str | None = None
    distance_m: float | None = None
    moving_time_s: int | None = None
    elapsed_time_s: int | None = None
    total_elevation_gain_m: float | None = None
    average_speed_mps: float | None = None
    max_speed_mps: float | None = None
    average_heartrate: float | None = None
    max_heartrate: float | None = None
    calories: float | None = None
    summary_polyline: str | None = None
    strava_url: str | None = None
    fit_file_path: str | None = None
    fit_download_status: str = "not_available"
    model_config = {"from_attributes": True}


class FitnessActivityDetail(FitnessActivityOut):
    streams: dict | None = None
    raw: dict | None = None


class FitnessSyncResult(BaseModel):
    synced: int
    activities: list[FitnessActivityOut] = Field(default_factory=list)
