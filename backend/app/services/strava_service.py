import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import UploadFile

from app.config import FIT_FILES_BUCKET, FIT_FILES_DIR, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET

STRAVA_API_BASE = "https://www.strava.com/api/v3"
STRAVA_OAUTH_BASE = "https://www.strava.com/oauth"
FIT_EXPORT_NOTE = "Strava only documents original activity export from the Strava website, not the OAuth API."


class StravaConfigurationError(RuntimeError):
    pass


class StravaService:
    def __init__(self, repo):
        self.repo = repo

    def build_authorization_url(self, redirect_uri: str) -> str:
        self._require_config()
        params = {
            "client_id": STRAVA_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "approval_prompt": "auto",
            "scope": "read,activity:read_all",
        }
        return f"{STRAVA_OAUTH_BASE}/authorize?{urlencode(params)}"

    async def exchange_code(self, code: str, scope: str | None = None):
        self._require_config()
        payload = {
            "client_id": STRAVA_CLIENT_ID,
            "client_secret": STRAVA_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
        }
        token = await self._request_json("POST", f"{STRAVA_OAUTH_BASE}/token", data=payload)
        athlete = token.get("athlete") or {}
        return await self.repo.save_connection({
            "athlete_id": athlete.get("id"),
            "athlete_name": " ".join(filter(None, [athlete.get("firstname"), athlete.get("lastname")])) or None,
            "access_token": token["access_token"],
            "refresh_token": token["refresh_token"],
            "expires_at": token["expires_at"],
            "scope": scope,
        })

    async def connection_status(self):
        return await self.repo.get_connection()

    async def list_activities(self, limit: int = 50):
        return await self.repo.list_activities(limit)

    async def get_activity_detail(self, activity_id: str):
        activity = await self.repo.get_activity(activity_id)
        if activity is None:
            return None
        if getattr(activity, "streams", None):
            return self._with_derived_metrics(activity)
        connection = await self._authorized_connection()
        detail = await self._get_activity_from_strava(connection.access_token, activity.provider_activity_id)
        streams = await self._get_streams(connection.access_token, activity.provider_activity_id)
        activity = await self.repo.upsert_activity(self._activity_payload(detail, streams=streams))
        return self._with_derived_metrics(activity)

    async def upload_fit_file(self, activity_id: str, file: UploadFile):
        activity = await self.repo.get_activity(activity_id)
        if activity is None:
            return None
        filename = file.filename or ""
        if not filename.lower().endswith(".fit"):
            raise ValueError("Upload a .fit file")
        content = await file.read()
        if not content:
            raise ValueError("Empty file")
        object_name = f"strava/{activity.provider_activity_id}.fit"
        if FIT_FILES_BUCKET:
            from google.cloud import storage

            client = storage.Client()
            bucket = client.bucket(FIT_FILES_BUCKET)
            blob = bucket.blob(object_name)
            await asyncio.to_thread(blob.upload_from_string, content, content_type="application/octet-stream")
            return await self.repo.update_fit_file(activity_id, f"gs://{FIT_FILES_BUCKET}/{object_name}")
        FIT_FILES_DIR.mkdir(parents=True, exist_ok=True)
        path = FIT_FILES_DIR / f"{activity.provider_activity_id}.fit"
        with open(path, "wb") as out:
            out.write(content)
        return await self.repo.update_fit_file(activity_id, str(path))

    async def sync_recent(self, days: int = 30, per_page: int = 50):
        connection = await self._authorized_connection()
        after = int(time.time()) - max(days, 1) * 86400
        params = {"after": after, "per_page": min(max(per_page, 1), 100), "page": 1}
        summaries = await self._request_json(
            "GET",
            f"{STRAVA_API_BASE}/athlete/activities?{urlencode(params)}",
            token=connection.access_token,
        )
        synced = []
        for summary in summaries:
            existing = await self.repo.get_activity_by_provider_id(str(summary["id"]))
            if existing and getattr(existing, "calories", None) is not None:
                synced.append(existing)
                continue
            detail = await self._get_activity_from_strava(connection.access_token, str(summary["id"]))
            synced.append(await self.repo.upsert_activity(self._activity_payload(detail)))
        return synced

    async def _authorized_connection(self):
        connection = await self.repo.get_connection()
        if connection is None:
            raise PermissionError("Strava is not connected")
        if connection.expires_at > int(time.time()) + 300:
            return connection
        self._require_config()
        payload = {
            "client_id": STRAVA_CLIENT_ID,
            "client_secret": STRAVA_CLIENT_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": connection.refresh_token,
        }
        token = await self._request_json("POST", f"{STRAVA_OAUTH_BASE}/token", data=payload)
        return await self.repo.save_connection({
            "athlete_id": connection.athlete_id,
            "athlete_name": connection.athlete_name,
            "access_token": token["access_token"],
            "refresh_token": token["refresh_token"],
            "expires_at": token["expires_at"],
            "scope": getattr(connection, "scope", None),
        })

    async def _get_activity_from_strava(self, token: str, activity_id: str) -> dict:
        return await self._request_json("GET", f"{STRAVA_API_BASE}/activities/{activity_id}", token=token)

    async def _get_streams(self, token: str, activity_id: str) -> dict | None:
        keys = "time,distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp"
        try:
            return await self._request_json(
                "GET",
                f"{STRAVA_API_BASE}/activities/{activity_id}/streams?{urlencode({'keys': keys, 'key_by_type': 'true'})}",
                token=token,
            )
        except RuntimeError:
            return None

    def _activity_payload(self, activity: dict, streams: dict | None = None) -> dict:
        provider_id = str(activity["id"])
        start_date = datetime.fromisoformat(activity["start_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        return {
            "provider": "strava",
            "provider_activity_id": provider_id,
            "name": activity.get("name") or "Strava activity",
            "sport_type": activity.get("sport_type") or activity.get("type"),
            "start_date": start_date,
            "timezone": activity.get("timezone"),
            "distance_m": activity.get("distance"),
            "moving_time_s": activity.get("moving_time"),
            "elapsed_time_s": activity.get("elapsed_time"),
            "total_elevation_gain_m": activity.get("total_elevation_gain"),
            "average_speed_mps": activity.get("average_speed"),
            "max_speed_mps": activity.get("max_speed"),
            "average_heartrate": activity.get("average_heartrate"),
            "max_heartrate": activity.get("max_heartrate"),
            "calories": activity.get("calories"),
            "summary_polyline": (activity.get("map") or {}).get("summary_polyline"),
            "strava_url": f"https://www.strava.com/activities/{provider_id}",
            "fit_file_path": None,
            "fit_download_status": "not_available",
            "streams": self._normalise_streams(streams),
            "raw": {**activity, "fit_export_note": FIT_EXPORT_NOTE},
        }

    def _normalise_streams(self, streams: dict | None) -> dict | None:
        if streams is None:
            return None
        normalised = {}
        for key, stream in streams.items():
            if key == "latlng" and isinstance(stream, dict):
                normalised[key] = {
                    **stream,
                    "data": self._normalise_latlng_data(stream.get("data")),
                }
            else:
                normalised[key] = self._firestore_safe_value(stream)
        return normalised

    def _normalise_latlng_data(self, data):
        if not isinstance(data, list):
            return self._firestore_safe_value(data)
        points = []
        for point in data:
            if isinstance(point, list) and len(point) == 2:
                points.append({"lat": point[0], "lng": point[1]})
            else:
                points.append(self._firestore_safe_value(point))
        return points

    def _firestore_safe_value(self, value):
        if isinstance(value, dict):
            return {key: self._firestore_safe_value(item) for key, item in value.items()}
        if isinstance(value, list):
            return [
                {"values": self._firestore_safe_value(item)} if isinstance(item, list) else self._firestore_safe_value(item)
                for item in value
            ]
        return value

    def _with_derived_metrics(self, activity):
        activity.derived_metrics = self._derive_metrics(activity)
        return activity

    def _derive_metrics(self, activity) -> dict:
        streams = getattr(activity, "streams", None) or {}
        splits = self._derive_kilometer_splits(streams)
        insights = self._derive_insights(activity, splits)
        moving_time = getattr(activity, "moving_time_s", None)
        elapsed_time = getattr(activity, "elapsed_time_s", None)
        stopped_time = elapsed_time - moving_time if elapsed_time is not None and moving_time is not None else None
        return {
            "splits": splits,
            "insights": insights,
            "stopped_time_s": stopped_time if stopped_time is not None and stopped_time > 0 else 0,
            "ai_analysis": {
                "status": "not_analyzed",
                "message": "No AI analysis has been saved for this activity yet.",
            },
        }

    def _derive_insights(self, activity, splits: list[dict]) -> list[dict]:
        insights = []
        full_splits = [split for split in splits if split.get("distance_m", 0) >= 900 and split.get("pace_s_per_km")]
        fastest = min(full_splits, key=lambda split: split["pace_s_per_km"], default=None)
        if fastest:
            insights.append({
                "kind": "pace",
                "title": "Fastest split",
                "value": f"Km {fastest['index']}",
                "detail": f"{self._format_pace(fastest['pace_s_per_km'])} over {fastest['distance_m'] / 1000:.1f} km.",
            })

        distance_m = getattr(activity, "distance_m", None)
        moving_time_s = getattr(activity, "moving_time_s", None)
        if distance_m and moving_time_s:
            average_pace = moving_time_s / (distance_m / 1000)
            final_split = splits[-1] if splits else None
            final_pace = final_split.get("pace_s_per_km") if final_split else None
            if final_pace:
                delta = round(final_pace - average_pace)
                direction = "slower" if delta > 0 else "faster"
                insights.append({
                    "kind": "pace",
                    "title": "Final split vs average",
                    "value": f"{abs(delta)} sec/km {direction}",
                    "detail": f"Final split pace {self._format_pace(final_pace)}; activity average {self._format_pace(average_pace)}.",
                })

        elapsed_time_s = getattr(activity, "elapsed_time_s", None)
        if elapsed_time_s is not None and moving_time_s is not None:
            stopped_time = max(elapsed_time_s - moving_time_s, 0)
            insights.append({
                "kind": "time",
                "title": "Stopped time",
                "value": self._format_duration(stopped_time),
                "detail": "Difference between elapsed time and moving time.",
            })

        calories = getattr(activity, "calories", None)
        if calories is not None:
            insights.append({
                "kind": "nutrition",
                "title": "Food log impact",
                "value": f"{round(calories)} kcal",
                "detail": "This is the activity calorie burn to surface on My Log.",
            })
        return insights

    def _derive_kilometer_splits(self, streams: dict) -> list[dict]:
        distance = self._stream_data(streams, "distance")
        time_data = self._stream_data(streams, "time")
        heartrate = self._stream_data(streams, "heartrate")
        altitude = self._stream_data(streams, "altitude")
        if not distance or not time_data or len(distance) != len(time_data):
            return []

        splits = []
        total_distance = distance[-1]
        if not isinstance(total_distance, int | float) or total_distance <= 0:
            return []

        split_count = int((total_distance + 999) // 1000)
        for split_index in range(1, split_count + 1):
            start_distance = (split_index - 1) * 1000
            end_distance = min(split_index * 1000, total_distance)
            distance_delta = end_distance - start_distance
            if distance_delta <= 0:
                continue

            start_time = self._interpolate_stream_at_distance(distance, time_data, start_distance)
            end_time = self._interpolate_stream_at_distance(distance, time_data, end_distance)
            if start_time is None or end_time is None:
                continue
            time_delta = end_time - start_time
            if time_delta <= 0:
                continue

            indexes = [
                index
                for index, meters in enumerate(distance)
                if isinstance(meters, int | float) and start_distance <= meters <= end_distance
            ]
            hr_values = [
                heartrate[index]
                for index in indexes
                if index < len(heartrate) and isinstance(heartrate[index], int | float)
            ]
            elevation_gain = 0
            previous_altitude = None
            for index in indexes:
                current_altitude = altitude[index] if index < len(altitude) else None
                if not isinstance(current_altitude, int | float):
                    continue
                if previous_altitude is not None and current_altitude > previous_altitude:
                    elevation_gain += current_altitude - previous_altitude
                previous_altitude = current_altitude
            splits.append({
                "index": split_index,
                "distance_m": round(distance_delta, 1),
                "moving_time_s": round(time_delta),
                "pace_s_per_km": round(time_delta / (distance_delta / 1000), 1),
                "average_heartrate": round(sum(hr_values) / len(hr_values), 1) if hr_values else None,
                "elevation_gain_m": round(elevation_gain, 1),
            })
        return splits

    def _interpolate_stream_at_distance(self, distance: list, values: list, target_distance: float):
        if not distance or not values:
            return None
        if target_distance <= distance[0]:
            return values[0]
        for index in range(1, min(len(distance), len(values))):
            previous_distance = distance[index - 1]
            current_distance = distance[index]
            if not isinstance(previous_distance, int | float) or not isinstance(current_distance, int | float):
                continue
            if current_distance < target_distance:
                continue
            previous_value = values[index - 1]
            current_value = values[index]
            if not isinstance(previous_value, int | float) or not isinstance(current_value, int | float):
                return None
            distance_delta = current_distance - previous_distance
            if distance_delta <= 0:
                return current_value
            ratio = (target_distance - previous_distance) / distance_delta
            return previous_value + (current_value - previous_value) * ratio
        final_value = values[-1]
        return final_value if isinstance(final_value, int | float) else None

    def _stream_data(self, streams: dict, key: str) -> list:
        stream = streams.get(key)
        if not isinstance(stream, dict):
            return []
        data = stream.get("data")
        return data if isinstance(data, list) else []

    def _format_pace(self, seconds_per_km: float) -> str:
        minutes = int(seconds_per_km // 60)
        seconds = round(seconds_per_km % 60)
        return f"{minutes}:{seconds:02d}/km"

    def _format_duration(self, seconds: int | float) -> str:
        seconds = round(seconds)
        minutes = seconds // 60
        remainder = seconds % 60
        return f"{minutes}:{remainder:02d}"

    def _require_config(self) -> None:
        if not STRAVA_CLIENT_ID or not STRAVA_CLIENT_SECRET:
            raise StravaConfigurationError("Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to connect Strava")

    async def _request_json(
        self,
        method: str,
        url: str,
        data: dict[str, Any] | None = None,
        token: str | None = None,
    ) -> Any:
        def run_request():
            body = urlencode(data).encode("utf-8") if data is not None else None
            headers = {"Accept": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            request = Request(url, data=body, headers=headers, method=method)
            with urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))

        try:
            return await asyncio.to_thread(run_request)
        except Exception as exc:
            raise RuntimeError(f"Strava request failed: {exc}") from exc
