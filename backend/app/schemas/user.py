"""사용자 관련 Pydantic 스키마."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """사용자 공통 기본 스키마."""

    username: str = Field(..., min_length=3, max_length=50, description="로그인 아이디")
    full_name: str = Field(..., max_length=100, description="실명")
    employee_id: Optional[str] = Field(None, max_length=20, description="사원번호")
    department: Optional[str] = Field(None, max_length=100, description="부서명")
    position: Optional[str] = Field(None, max_length=100, description="직책")
    email: Optional[str] = Field(None, max_length=255, description="이메일")
    phone: Optional[str] = Field(None, max_length=20, description="연락처")
    is_active: bool = Field(True, description="활성 여부")
    is_admin: bool = Field(False, description="관리자 여부")


class UserCreate(UserBase):
    """사용자 생성 스키마."""

    password: str = Field(..., min_length=8, max_length=100, description="비밀번호")


class UserUpdate(BaseModel):
    """사용자 수정 스키마 (모든 필드 선택적)."""

    full_name: Optional[str] = Field(None, max_length=100)
    employee_id: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserResponse(UserBase):
    """사용자 응답 스키마."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """사용자 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[UserResponse]
    total: int


class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None
