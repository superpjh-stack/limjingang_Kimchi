"""공통 코드 관련 Pydantic 스키마."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class CommonCodeBase(BaseModel):
    """공통 코드 공통 기본 스키마."""

    code_group: str = Field(..., max_length=50, description="코드 그룹")
    code: str = Field(..., max_length=50, description="코드 값")
    code_name: str = Field(..., max_length=100, description="코드 이름 (한글)")
    code_name_en: Optional[str] = Field(None, max_length=100, description="코드 이름 (영문)")
    sort_order: int = Field(0, ge=0, description="정렬 순서")
    description: Optional[str] = Field(None, max_length=500, description="코드 설명")
    extra_value1: Optional[str] = Field(None, max_length=200, description="추가 값 1")
    extra_value2: Optional[str] = Field(None, max_length=200, description="추가 값 2")
    is_active: bool = Field(True, description="활성 여부")


class CommonCodeCreate(CommonCodeBase):
    """공통 코드 생성 스키마."""
    pass


class CommonCodeUpdate(BaseModel):
    """공통 코드 수정 스키마 (모든 필드 선택적)."""

    code_name: Optional[str] = Field(None, max_length=100)
    code_name_en: Optional[str] = Field(None, max_length=100)
    sort_order: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    extra_value1: Optional[str] = Field(None, max_length=200)
    extra_value2: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None


class CommonCodeResponse(CommonCodeBase):
    """공통 코드 응답 스키마."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommonCodeListResponse(BaseModel):
    """공통 코드 목록 응답 스키마."""

    success: bool = True
    message: str = "조회 성공"
    data: list[CommonCodeResponse]
    total: int


class APIResponse(BaseModel):
    """공통 API 응답 스키마."""

    success: bool
    message: str
    data: Optional[Any] = None
    total: Optional[int] = None
