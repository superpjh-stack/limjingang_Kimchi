"""공정별 특화 실적 모델 모듈 (Sprint 5).

테이블:
- TB_WASH_RECORD:       세척 실적 (CCP: 세척수 온도, pH)
- TB_SALTING_RECORD:    절임 실적 (CCP: 염수농도, 절임시간, 염도)
- TB_SEASONING_RECORD:  양념버무림 실적 (CCP: 혼합온도)
- TB_PACKAGING_RECORD:  포장 실적 (CCP: 금속검출, 포장중량)
- TB_PREPROCESS_RECORD: 입고전처리 실적
"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class WashRecord(Base, TimestampMixin):
    """세척 실적 모델 (TB_WASH_RECORD).

    HACCP CCP:
    - wash_water_temp: 1~15°C
    - wash_water_ph:   6.5~8.5
    """

    __tablename__ = "TB_WASH_RECORD"
    __table_args__ = {"comment": "세척실적"}

    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id"),
        nullable=False,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    wash_water_temp: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="세척수 온도(°C) CCP: 1~15",
    )
    wash_pressure: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="세척압력(kg/cm²)",
    )
    wash_duration: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="세척시간(분)",
    )
    wash_water_ph: Mapped[Optional[float]] = mapped_column(
        Numeric(4, 2),
        nullable=True,
        comment="세척수 pH CCP: 6.5~8.5",
    )
    input_weight: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="투입중량(kg)",
    )
    output_weight: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="세척후중량(kg)",
    )
    foreign_matter: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="이물질 발견여부",
    )
    foreign_detail: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="이물질 내용",
    )
    wash_result: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PASS",
        comment="PASS/FAIL/CONDITIONAL",
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="기록일시",
    )
    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="기록자",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    work_order: Mapped["WorkOrder"] = relationship(  # type: ignore[name-defined]
        "WorkOrder",
        lazy="joined",
    )


class SaltingRecord(Base, TimestampMixin):
    """절임 실적 모델 (TB_SALTING_RECORD).

    HACCP CCP:
    - brine_concentration: 15~20%
    - salting_duration:    360~1080분
    - salinity_result:     2.5~3.0%
    """

    __tablename__ = "TB_SALTING_RECORD"
    __table_args__ = {"comment": "절임실적"}

    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id"),
        nullable=False,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    brine_concentration: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="염수농도(%) CCP: 15~20",
    )
    salting_start_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="절임 시작일시",
    )
    salting_end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="절임 완료일시",
    )
    salting_duration: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="절임시간(분) CCP: 360~1080 (자동계산)",
    )
    input_weight: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="절임전 배추중량(kg)",
    )
    output_weight: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="절임후중량(kg)",
    )
    salinity_result: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="절임 후 염도(%) CCP: 2.5~3.0",
    )
    water_rinse_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=3,
        comment="탈수 세척 횟수",
    )
    salting_result: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PASS",
        comment="PASS/FAIL/REWORK",
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="기록일시",
    )
    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="기록자",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    work_order: Mapped["WorkOrder"] = relationship(  # type: ignore[name-defined]
        "WorkOrder",
        lazy="joined",
    )


class SeasoningRecord(Base, TimestampMixin):
    """양념버무림 실적 모델 (TB_SEASONING_RECORD).

    HACCP CCP:
    - mix_temperature: -2~10°C
    """

    __tablename__ = "TB_SEASONING_RECORD"
    __table_args__ = {"comment": "양념버무림실적"}

    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id"),
        nullable=False,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    seasoning_ratio: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="양념배합비(%) 양념/배추",
    )
    mix_temperature: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="혼합온도(°C) CCP: -2~10",
    )
    mix_duration: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="혼합시간(분)",
    )
    garlic_amount: Mapped[Optional[float]] = mapped_column(
        Numeric(8, 2),
        nullable=True,
        comment="마늘함량(g/kg)",
    )
    pepper_amount: Mapped[Optional[float]] = mapped_column(
        Numeric(8, 2),
        nullable=True,
        comment="고추가루함량(g/kg)",
    )
    ginger_amount: Mapped[Optional[float]] = mapped_column(
        Numeric(8, 2),
        nullable=True,
        comment="생강함량(g/kg)",
    )
    input_weight: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="투입중량(kg)",
    )
    output_weight: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="버무림후중량(kg)",
    )
    seasoning_result: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PASS",
        comment="PASS/FAIL/ADJUST",
    )
    lot_no: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        comment="생산 LOT 번호",
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="기록일시",
    )
    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="기록자",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    work_order: Mapped["WorkOrder"] = relationship(  # type: ignore[name-defined]
        "WorkOrder",
        lazy="joined",
    )


class PackagingRecord(Base, TimestampMixin):
    """포장 실적 모델 (TB_PACKAGING_RECORD).

    HACCP CCP:
    - metal_detect_result: PASS 필수
    - 포장중량 허용오차 ±weight_tolerance%
    """

    __tablename__ = "TB_PACKAGING_RECORD"
    __table_args__ = {"comment": "포장실적"}

    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id"),
        nullable=False,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    target_weight: Mapped[Optional[float]] = mapped_column(
        Numeric(8, 2),
        nullable=True,
        comment="목표 포장중량(g)",
    )
    actual_weight_avg: Mapped[Optional[float]] = mapped_column(
        Numeric(8, 2),
        nullable=True,
        comment="실측 평균중량(g)",
    )
    weight_tolerance: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=3.0,
        comment="허용오차(%)",
    )
    total_packages: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="총 포장수량(개/박스)",
    )
    defect_packages: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="불량 포장수(개)",
    )
    metal_detect_result: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PASS",
        comment="PASS/FAIL",
    )
    seal_quality: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="GOOD",
        comment="실링상태: GOOD/POOR/FAIL",
    )
    label_check: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="라벨 부착 확인",
    )
    expiry_date_set: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="유통기한 설정일",
    )
    lot_no: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        comment="생산 LOT 번호",
    )
    packaging_result: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PASS",
        comment="PASS/FAIL",
    )
    defect_rate: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="불량률(%) 자동계산",
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="기록일시",
    )
    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="기록자",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    work_order: Mapped["WorkOrder"] = relationship(  # type: ignore[name-defined]
        "WorkOrder",
        lazy="joined",
    )


class PreprocessRecord(Base, TimestampMixin):
    """입고전처리 실적 모델 (TB_PREPROCESS_RECORD).

    원재료 입고 시 세척·선별·이물질제거 전처리 기록.
    work_order_id는 독립 기록 시 NULL 가능.
    """

    __tablename__ = "TB_PREPROCESS_RECORD"
    __table_args__ = {"comment": "입고전처리실적"}

    work_order_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id"),
        nullable=True,
        comment="작업지시 ID (FK → TB_WORK_ORDER, 독립 기록 시 NULL)",
    )
    raw_material_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_RAW_MATERIAL.id"),
        nullable=False,
        comment="원재료 ID (FK → TB_RAW_MATERIAL)",
    )
    receive_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="입고일",
    )
    input_weight: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="투입중량(kg)",
    )
    reject_weight: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0,
        comment="불합격중량(kg)",
    )
    pass_weight: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="합격중량(kg) 자동계산",
    )
    storage_temp: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="보관온도(°C)",
    )
    foreign_matter_removed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="이물질제거여부",
    )
    pre_wash_done: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="세척여부",
    )
    reject_reason: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="불합격 사유",
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="기록일시",
    )
    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="기록자",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    work_order: Mapped[Optional["WorkOrder"]] = relationship(  # type: ignore[name-defined]
        "WorkOrder",
        lazy="joined",
        foreign_keys=[work_order_id],
    )
    raw_material: Mapped["RawMaterial"] = relationship(  # type: ignore[name-defined]
        "RawMaterial",
        lazy="joined",
    )
