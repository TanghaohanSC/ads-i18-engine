from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.models import User
from app.security.jwt import InvalidTokenError, decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    if token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
    try:
        payload = decode_token(token, expected_type="access")
    except InvalidTokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=f"invalid token: {e}") from e

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="malformed subject") from e

    # Eager-load memberships so UserOut serialization never triggers a lazy
    # load outside the request-scoped session.
    result = await session.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.memberships))
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="user not found / inactive")
    return user
