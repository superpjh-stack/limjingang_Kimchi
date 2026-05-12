"""인증 엔드포인트 모듈.

JWT 기반 로그인, 토큰 갱신, 현재 사용자 조회 API를 제공합니다.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.security import create_access_token
from app.crud.user import crud_user
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import APIResponse, UserResponse

router = APIRouter()


@router.post(
    "/login",
    response_model=Token,
    summary="로그인",
    description="사용자명과 비밀번호로 로그인하여 JWT 액세스 토큰을 발급받습니다.",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    """사용자 로그인 및 JWT 토큰 발급.

    Args:
        form_data: OAuth2 폼 데이터 (username, password)
        db: 데이터베이스 세션

    Returns:
        액세스 토큰 및 토큰 타입

    Raises:
        HTTPException: 인증 실패 시 401 반환
    """
    user = crud_user.authenticate(
        db,
        username=form_data.username,
        password=form_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자명 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다. 관리자에게 문의하세요.",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username,
        expires_delta=access_token_expires,
    )

    return Token(access_token=access_token, token_type="bearer")


@router.post(
    "/refresh",
    response_model=Token,
    summary="토큰 갱신",
    description="현재 유효한 토큰으로 새 액세스 토큰을 발급받습니다.",
)
def refresh_token(
    current_user: User = Depends(get_current_active_user),
) -> Token:
    """JWT 토큰 갱신.

    현재 인증된 사용자에 대해 새 토큰을 발급합니다.

    Args:
        current_user: 현재 인증된 사용자

    Returns:
        새 액세스 토큰 및 토큰 타입
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=current_user.username,
        expires_delta=access_token_expires,
    )

    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=APIResponse,
    summary="현재 사용자 정보",
    description="현재 로그인된 사용자의 정보를 반환합니다.",
)
def read_current_user(
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """현재 사용자 정보 조회.

    Args:
        current_user: 현재 인증된 사용자

    Returns:
        현재 사용자 정보
    """
    return APIResponse(
        success=True,
        message="사용자 정보 조회 성공",
        data=UserResponse.model_validate(current_user),
    )
