"""작업자 Pydantic 스키마."""

from datetime import date, datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class WorkerCreate(BaseModel):
    """작업자 등록 요청."""

    emp_no: str = Field(..., max_length=30, description="사원번호")
    name: str = Field(..., max_length=100, description="이름")
    department: str = Field(..., max_length=50, description="부서(공정)")
    position: str = Field(..., max_length=50, description="직급")
    shift: str = Field("1조", max_length=20, description="교대조")
    phone: Optional[str] = Field(None, max_length=30, description="연락처")
    hire_date: date = Field(..., description="입사일")
    status: str = Field("재직", max_length=20, description="재직/휴직/퇴직")
    user_id: Optional[int] = Field(None, description="시스템 사용자 ID(선택)")
    note: Optional[str] = Field(None, max_length=500, description="비고")


class WorkerUpdate(BaseModel):
    """작업자 수정 요청."""

    name: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=50)
    position: Optional[str] = Field(None, max_length=50)
    shift: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=30)
    hire_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=20)
    user_id: Optional[int] = None
    note: Optional[str] = Field(None, max_length=500)


class WorkerResponse(BaseModel):
    """작업자 응답."""

    id: int
    emp_no: str
    name: str
    department: str
    position: str
    shift: str
    phone: Optional[str] = None
    hire_date: date
    status: str
    user_id: Optional[int] = None
    note: Optional[str] = None
    is_active: bool
    created_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)


class WorkerListResponse(BaseModel):
    """작업자 목록 응답."""

    success: bool = True
    message: str = "작업자 목록 조회 성공"
    data: List[WorkerResponse]
    total: int


class WorkerAPIResponse(BaseModel):
    """단건 API 응답."""

    success: bool = True
    message: str = ""
    data: Optional[Any] = None
