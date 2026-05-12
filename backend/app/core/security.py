"""JWT 인증 및 비밀번호 해시 보안 모듈."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt 비밀번호 해시 컨텍스트
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시된 비밀번호를 비교합니다.

    Args:
        plain_password: 사용자가 입력한 평문 비밀번호
        hashed_password: DB에 저장된 해시된 비밀번호

    Returns:
        비밀번호 일치 여부
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호를 bcrypt로 해시합니다.

    Args:
        password: 해시할 평문 비밀번호

    Returns:
        해시된 비밀번호 문자열
    """
    return pwd_context.hash(password)


def create_access_token(
    subject: Any,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """JWT 액세스 토큰을 생성합니다.

    Args:
        subject: 토큰 주체 (일반적으로 user_id 또는 username)
        expires_delta: 토큰 만료 시간 (None이면 기본값 사용)

    Returns:
        JWT 토큰 문자열
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_token(token: str) -> Optional[str]:
    """JWT 토큰을 디코딩하여 subject를 반환합니다.

    Args:
        token: 디코딩할 JWT 토큰

    Returns:
        토큰의 subject 값 (username), 유효하지 않으면 None
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        subject: str = payload.get("sub")
        return subject
    except JWTError:
        return None
