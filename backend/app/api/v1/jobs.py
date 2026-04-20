from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.projects import _ensure_brand_access
from app.db import get_session
from app.deps import get_current_user
from app.models import LocalizationJob, LocalizedAsset, SourceAsset, User
from app.models.enums import JobStatus
from app.schemas.job import JobCreate, JobOut, MatrixCellUpdate, MatrixView
from app.schemas.localized import LocalizedAssetDetail, LocalizedAssetSummary
from app.services.job import build_matrix_view, create_job_with_defaults, update_cell
from app.services.strategy_resolver import LocalizationTarget
from app.tasks import run_localization_job

router = APIRouter()


@router.post("", response_model=JobOut, status_code=201)
async def create_job(
    payload: JobCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> LocalizationJob:
    asset = await session.get(SourceAsset, payload.source_asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="source asset not found")
    await _ensure_brand_access(session, user, asset.brand_id)

    try:
        job = await create_job_with_defaults(
            session,
            source_asset_id=payload.source_asset_id,
            requested_by=user.id,
            targets=[
                LocalizationTarget(market=t.market.value, sub_market=t.sub_market)
                for t in payload.targets
            ],
            localization_modes=payload.modes.model_dump(),
        )
    except LookupError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    await session.commit()
    await session.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> LocalizationJob:
    job = await session.get(LocalizationJob, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="job not found")
    asset = await session.get(SourceAsset, job.source_asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="source asset not found")
    await _ensure_brand_access(session, user, asset.brand_id)
    return job


@router.get("/{job_id}/matrix", response_model=MatrixView)
async def get_matrix(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> dict:
    job = await session.get(LocalizationJob, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="job not found")
    asset = await session.get(SourceAsset, job.source_asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="source asset not found")
    await _ensure_brand_access(session, user, asset.brand_id)
    try:
        return await build_matrix_view(session, job)
    except LookupError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.patch("/{job_id}/matrix/cell", response_model=MatrixView)
async def patch_cell(
    job_id: uuid.UUID,
    payload: MatrixCellUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> dict:
    job = await session.get(LocalizationJob, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="job not found")
    if job.status not in (JobStatus.draft, JobStatus.failed):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"job is {job.status.value}")

    asset = await session.get(SourceAsset, job.source_asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="source asset not found")
    await _ensure_brand_access(session, user, asset.brand_id)

    try:
        update_cell(
            job,
            lu_id=payload.lu_id,
            target=payload.target,
            strategy=payload.strategy,
            user_instructions=payload.user_instructions,
            user_provided_content=payload.user_provided_content,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    await session.commit()
    return await build_matrix_view(session, job)


@router.get("/{job_id}/localized", response_model=list[LocalizedAssetSummary])
async def list_localized(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[LocalizedAsset]:
    job = await session.get(LocalizationJob, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="job not found")
    asset = await session.get(SourceAsset, job.source_asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="source asset missing")
    await _ensure_brand_access(session, user, asset.brand_id)
    result = await session.execute(
        select(LocalizedAsset)
        .where(LocalizedAsset.localization_job_id == job_id)
        .order_by(LocalizedAsset.target_market, LocalizedAsset.target_sub_market)
    )
    return list(result.scalars().all())


@router.get("/localized/{localized_id}", response_model=LocalizedAssetDetail)
async def get_localized(
    localized_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> LocalizedAsset:
    asset = await session.get(LocalizedAsset, localized_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="localized asset not found")
    source = await session.get(SourceAsset, asset.source_asset_id)
    if source is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="orphaned asset")
    await _ensure_brand_access(session, user, source.brand_id)
    return asset


@router.post("/{job_id}/submit", response_model=JobOut)
async def submit_job(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> LocalizationJob:
    job = await session.get(LocalizationJob, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="job not found")
    if job.status not in (JobStatus.draft, JobStatus.failed):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"job is {job.status.value}")
    asset = await session.get(SourceAsset, job.source_asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="source asset not found")
    await _ensure_brand_access(session, user, asset.brand_id)

    job.status = JobStatus.queued
    await session.commit()
    await run_localization_job.defer_async(job_id=str(job.id))
    await session.refresh(job)
    return job
