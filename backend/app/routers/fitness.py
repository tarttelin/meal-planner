from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import RedirectResponse

from app.dependencies import get_fitness_repo
from app.schemas.fitness import (
    FitnessActivityDetail,
    FitnessActivityOut,
    FitnessSyncResult,
    StravaConnectionOut,
    StravaConnectUrl,
)
from app.services.strava_service import StravaConfigurationError, StravaService

router = APIRouter(tags=["fitness"])


def get_strava_service(repo=Depends(get_fitness_repo)) -> StravaService:
    return StravaService(repo)


@router.get("/fitness/strava/status", response_model=StravaConnectionOut)
async def strava_status(service: StravaService = Depends(get_strava_service)):
    connection = await service.connection_status()
    if connection is None:
        return StravaConnectionOut(connected=False)
    return StravaConnectionOut(
        connected=True,
        athlete_id=connection.athlete_id,
        athlete_name=connection.athlete_name,
        scope=getattr(connection, "scope", None),
    )


@router.get("/fitness/strava/connect-url", response_model=StravaConnectUrl)
async def strava_connect_url(request: Request, service: StravaService = Depends(get_strava_service)):
    try:
        redirect_uri = str(request.url_for("strava_callback"))
        return StravaConnectUrl(authorization_url=service.build_authorization_url(redirect_uri))
    except StravaConfigurationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/fitness/strava/callback", name="strava_callback")
async def strava_callback(
    code: str,
    scope: str | None = None,
    service: StravaService = Depends(get_strava_service),
):
    try:
        await service.exchange_code(code, scope=scope)
    except (RuntimeError, StravaConfigurationError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return RedirectResponse(url="/training")


@router.post("/fitness/strava/sync", response_model=FitnessSyncResult)
async def sync_strava(
    days: int = Query(30, ge=1, le=365),
    service: StravaService = Depends(get_strava_service),
):
    try:
        activities = await service.sync_recent(days=days)
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except (RuntimeError, StravaConfigurationError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return FitnessSyncResult(synced=len(activities), activities=activities)


@router.get("/fitness/activities", response_model=list[FitnessActivityOut])
async def list_fitness_activities(
    limit: int = Query(50, ge=1, le=200),
    service: StravaService = Depends(get_strava_service),
):
    return await service.list_activities(limit=limit)


@router.get("/fitness/activities/{activity_id}", response_model=FitnessActivityDetail)
async def get_fitness_activity(activity_id: str, service: StravaService = Depends(get_strava_service)):
    try:
        activity = await service.get_activity_detail(activity_id)
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if activity is None:
        raise HTTPException(status_code=404, detail="Fitness activity not found")
    return activity


@router.post("/fitness/activities/{activity_id}/fit-file", response_model=FitnessActivityOut)
async def upload_fit_file(
    activity_id: str,
    file: UploadFile = File(...),
    service: StravaService = Depends(get_strava_service),
):
    try:
        activity = await service.upload_fit_file(activity_id, file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if activity is None:
        raise HTTPException(status_code=404, detail="Fitness activity not found")
    return activity
