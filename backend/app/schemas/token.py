"""JWT 토큰 관련 Pydantic 스키마."""

from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    """액세스 토큰 응답 스키마."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """JWT 토큰 페이로드 스키마."""

    username: Optional[str] = None
