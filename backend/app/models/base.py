"""공통 베이스 모델 모듈.

모든 테이블에 공통으로 사용되는 컬럼을 정의하는 Mixin 클래스를 제공합니다.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """공통 타임스탬프 및 감사(Audit) 컬럼 Mixin.

    모든 테이블에 공통으로 사용되는 컬럼:
    - id: 기본키 (자동 증가)
    - created_at: 생성일시
    - updated_at: 수정일시
    - created_by: 생성자 (username)
    - updated_by: 수정자 (username)
    - is_deleted: 소프트 삭제 여부
    """

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="기본키",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )
    created_by: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="system",
        comment="생성자",
    )
    updated_by: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="system",
        comment="수정자",
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="소프트 삭제 여부",
    )
