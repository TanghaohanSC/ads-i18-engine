from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.projects import _ensure_brand_access
from app.db import get_session
from app.deps import get_current_user
from app.models import Project, SourceAsset, User
from app.schemas.source_asset import SourceAssetListItem, SourceAssetOut
from app.services.source_asset import create_source_asset
from app.tasks import parse_source_asset


class TextUploadIn(BaseModel):
    project_id: uuid.UUID
    content: str = Field(min_length=1, max_length=200_000)
    filename: str | None = Field(default=None, max_length=200)
    format: str = Field(default="txt", pattern=r"^(txt|md|csv)$")
    tags: list[str] = Field(default_factory=list)

router = APIRouter()

MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB hard cap in V1


@router.post("/upload", response_model=SourceAssetOut, status_code=201)
async def upload_asset(
    project_id: uuid.UUID = Form(...),
    tags: str | None = Form(default=None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SourceAsset:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project not found")
    await _ensure_brand_access(session, user, project.brand_id)

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="file too large")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="empty file")

    try:
        asset = await create_source_asset(
            session,
            brand_id=project.brand_id,
            project_id=project_id,
            uploaded_by=user.id,
            original_filename=file.filename or "unnamed",
            data=data,
            tags=[t.strip() for t in (tags or "").split(",") if t.strip()],
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    await session.commit()

    # enqueue async parse; returns immediately
    await parse_source_asset.defer_async(source_asset_id=str(asset.id))
    return asset


@router.post("/upload-text", response_model=SourceAssetOut, status_code=201)
async def upload_text(
    payload: TextUploadIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SourceAsset:
    project = await session.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project not found")
    await _ensure_brand_access(session, user, project.brand_id)

    ext = {"txt": ".txt", "md": ".md", "csv": ".csv"}[payload.format]
    filename = payload.filename or f"pasted-{uuid.uuid4().hex[:8]}{ext}"
    if not filename.lower().endswith(ext):
        filename = filename + ext
    data = payload.content.encode("utf-8")

    try:
        asset = await create_source_asset(
            session,
            brand_id=project.brand_id,
            project_id=payload.project_id,
            uploaded_by=user.id,
            original_filename=filename,
            data=data,
            tags=payload.tags,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    await session.commit()
    await parse_source_asset.defer_async(source_asset_id=str(asset.id))
    return asset


@router.get("", response_model=list[SourceAssetListItem])
async def list_assets(
    project_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
) -> list[SourceAsset]:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project not found")
    await _ensure_brand_access(session, user, project.brand_id)

    result = await session.execute(
        select(SourceAsset)
        .where(SourceAsset.project_id == project_id)
        .order_by(SourceAsset.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get("/{asset_id}", response_model=SourceAssetOut)
async def get_asset(
    asset_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SourceAsset:
    asset = await session.get(SourceAsset, asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="asset not found")
    await _ensure_brand_access(session, user, asset.brand_id)
    return asset
