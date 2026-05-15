"""품질관리 ORM 모델 모듈.

금속검출 기록(CCP4)과 품질 이슈 관리 테이블을 정의합니다.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MetalDetectLog(Base):
    """TB_METAL_DETECT_LOG - 금속검출 기록 (CCP4)."""

    __tablename__ = "TB_METAL_DETECT_LOG"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    detector_id: Mapped[str] = mapped_column(
        String(10), nullable=False, comment="검출기 ID (MD-01, MD-02, MD-03)"
    )
    product_code: Mapped[str] = mapped_column(String(20), nullable=False)
    product_name: Mapped[str] = mapped_column(String(100), nullable=False)
    batch_no: Mapped[str] = mapped_column(String(30), nullable=False)
    result: Mapped[str] = mapped_column(
        String(10), nullable=False, comment="PASS / FAIL"
    )
    detection_type: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, comment="Fe/Sus/Non-Fe (FAIL시)"
    )
    detection_size_mm: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, comment="검출 크기 mm (FAIL시)"
    )
    action_taken: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="조치사항"
    )
    inspector: Mapped[str] = mapped_column(String(50), nullable=False)
    inspected_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class QualityIssue(Base):
    """TB_QUALITY_ISSUE - 품질 이슈 관리."""

    __tablename__ = "TB_QUALITY_ISSUE"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    issue_no: Mapped[str] = mapped_column(
        String(30), nullable=False, unique=True, comment="ISS-YYYYMMDD-NNN"
    )
    issue_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="CCP이탈/이물질/금속검출FAIL/불량률초과/관능검사이상/기타",
    )
    severity: Mapped[str] = mapped_column(
        String(10), nullable=False, comment="CRITICAL/HIGH/MEDIUM/LOW"
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="OPEN",
        server_default="OPEN",
        comment="OPEN/IN_PROGRESS/RESOLVED/CLOSED",
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    detected_by: Mapped[str] = mapped_column(String(50), nullable=False)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    related_batch: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
