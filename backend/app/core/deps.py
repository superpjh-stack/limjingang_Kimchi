"""FastAPI 의존성 주입 모듈."""

from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

# OAuth2 토큰 스킴 (로그인 엔드포인트 URL 지정)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """현재 인증된 사용자를 반환합니다.

    JWT 토큰을 검증하고 사용자를 조회합니다.

    Args:
        db: 데이터베이스 세션
        token: Bearer 토큰

    Returns:
        현재 사용자 객체

    Raises:
        HTTPException: 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="자격 증명을 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    username = decode_token(token)
    if username is None:
        raise credentials_exception

    user = db.query(User).filter(
        User.username == username,
        User.is_deleted == False,
    ).first()

    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """현재 활성화된 사용자를 반환합니다.

    Args:
        current_user: 현재 인증된 사용자

    Returns:
        활성화된 사용자 객체

    Raises:
        HTTPException: 사용자가 비활성화된 경우
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 사용자입니다.",
        )
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """관리자 권한을 가진 현재 사용자를 반환합니다.

    Args:
        current_user: 현재 활성화된 사용자

    Returns:
        관리자 사용자 객체

    Raises:
        HTTPException: 사용자가 관리자 권한이 없는 경우
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )
    return current_user
