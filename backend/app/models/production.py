"""생산계획 및 작업지시 관련 모델 모듈.

테이블:
- TB_PRODUCTION_PLAN: 생산계획
- TB_WORK_ORDER: 작업지시
- TB_WORK_ORDER_RESULT: 작업실적
- TB_QC_RECORD: QC 검사 기록
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class ProductionPlan(Base, TimestampMixin):
    """생산계획 모델 (TB_PRODUCTION_PLAN).

    수주 기반 또는 독립적인 생산 계획을 관리합니다.
    일간/주간 단위로 계획을 수립하고 실적을 추적합니다.
    """

    __tablename__ = "TB_PRODUCTION_PLAN"
    __table_args__ = {"comment": "생산계획 테이블"}

    plan_no: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        comment="계획번호 (PLAN-YYYYMMDD-NNN)",
    )
    plan_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="계획일",
    )
    order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_ORDER.id", ondelete="SET NULL"),
        nullable=True,
        comment="수주 ID (FK → TB_ORDER, 독립 계획 시 NULL)",
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PRODUCT.id", ondelete="RESTRICT"),
        nullable=False,
        comment="제품 ID (FK → TB_PRODUCT)",
    )
    bom_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_BOM.id", ondelete="SET NULL"),
        nullable=True,
        comment="BOM ID (FK → TB_BOM)",
    )
    planned_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="계획 수량",
    )
    actual_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="실적 수량",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
        comment="상태 (DRAFT/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED)",
    )
    plan_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="DAILY",
        comment="계획 유형 (DAILY/WEEKLY)",
    )
    start_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="계획 시작일시",
    )
    end_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="계획 종료일시",
    )
    remark: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )

    # 관계
    order: Mapped["Order"] = relationship(  # type: ignore[name-defined]
        "Order",
        back_populates="production_plans",
    )
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]
        "Product",
        lazy="joined",
    )
    bom: Mapped["BOM"] = relationship(  # type: ignore[name-defined]
        "BOM",
        lazy="joined",
    )
    work_orders: Mapped[list["WorkOrder"]] = relationship(
        "WorkOrder",
        back_populates="production_plan",
        cascade="all, delete-orphan",
    )


class WorkOrder(Base, TimestampMixin):
    """작업지시 모델 (TB_WORK_ORDER).

    생산계획에서 파생된 공정별 작업지시를 관리합니다.
    작업자, 설비, 공정을 연결하여 현장 작업을 지시하고 실적을 수집합니다.
    """

    __tablename__ = "TB_WORK_ORDER"
    __table_args__ = {"comment": "작업지시 테이블"}

    work_order_no: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        comment="작업지시번호 (WO-YYYYMMDD-NNN)",
    )
    production_plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PRODUCTION_PLAN.id", ondelete="CASCADE"),
        nullable=False,
        comment="생산계획 ID (FK → TB_PRODUCTION_PLAN)",
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PRODUCT.id", ondelete="RESTRICT"),
        nullable=False,
        comment="제품 ID (FK → TB_PRODUCT)",
    )
    bom_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_BOM.id", ondelete="SET NULL"),
        nullable=True,
        comment="BOM ID (FK → TB_BOM)",
    )
    process_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PROCESS.id", ondelete="SET NULL"),
        nullable=True,
        comment="공정 ID (FK → TB_PROCESS)",
    )
    equipment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_EQUIPMENT.id", ondelete="SET NULL"),
        nullable=True,
        comment="설비 ID (FK → TB_EQUIPMENT)",
    )
    assigned_user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_USER.id", ondelete="SET NULL"),
        nullable=True,
        comment="담당 작업자 ID (FK → TB_USER)",
    )
    work_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="작업일",
    )
    planned_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="계획 수량",
    )
    actual_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="실적 수량",
    )
    defect_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="불량 수량",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ISSUED",
        comment="상태 (ISSUED/IN_PROGRESS/PAUSED/COMPLETED/CANCELLED)",
    )
    start_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="실제 시작일시",
    )
    end_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="실제 종료일시",
    )
    planned_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="계획 시작일시",
    )
    planned_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="계획 종료일시",
    )
    lot_no: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="LOT 번호",
    )
    remark: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="비고",
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=True,
        comment="지시일시",
    )
    issued_by: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="지시자 (username)",
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="완료일시",
    )
    completed_by: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="완료 처리자 (username)",
    )

    # 관계
    production_plan: Mapped["ProductionPlan"] = relationship(
        "ProductionPlan",
        back_populates="work_orders",
    )
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]
        "Product",
        lazy="joined",
    )
    bom: Mapped["BOM"] = relationship(  # type: ignore[name-defined]
        "BOM",
        lazy="joined",
    )
    process: Mapped["Process"] = relationship(  # type: ignore[name-defined]
        "Process",
        lazy="joined",
    )
    equipment: Mapped["Equipment"] = relationship(  # type: ignore[name-defined]
        "Equipment",
        lazy="joined",
    )
    assigned_user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User",
        lazy="joined",
    )
    results: Mapped[list["WorkOrderResult"]] = relationship(
        "WorkOrderResult",
        back_populates="work_order",
        cascade="all, delete-orphan",
    )
    qc_records: Mapped[list["QCRecord"]] = relationship(
        "QCRecord",
        back_populates="work_order",
        cascade="all, delete-orphan",
    )


class WorkOrderResult(Base, TimestampMixin):
    """작업실적 모델 (TB_WORK_ORDER_RESULT).

    작업지시별 생산 실적(수량, 불량 등)을 기록합니다.
    한 작업지시에 복수의 실적 기록이 가능합니다 (중간 기록 지원).
    """

    __tablename__ = "TB_WORK_ORDER_RESULT"
    __table_args__ = {"comment": "작업실적 테이블"}

    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id", ondelete="CASCADE"),
        nullable=False,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    result_seq: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="실적 순번",
    )
    actual_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="실적 수량",
    )
    defect_qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="불량 수량",
    )
    defect_reason: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="불량 사유",
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="기록일시",
    )
    recorded_by: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="기록자 (username)",
    )
    notes: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="results")


class QCRecord(Base, TimestampMixin):
    """QC 검사 기록 모델 (TB_QC_RECORD).

    작업지시별 품질 검사(QC/HACCP CCP) 결과를 기록합니다.
    측정값, 합격 여부, 시정 조치 내용을 추적합니다.
    """

    __tablename__ = "TB_QC_RECORD"
    __table_args__ = {"comment": "QC 검사 기록 테이블"}

    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_WORK_ORDER.id", ondelete="CASCADE"),
        nullable=True,
        comment="작업지시 ID (FK → TB_WORK_ORDER)",
    )
    process_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_PROCESS.id", ondelete="RESTRICT"),
        nullable=False,
        comment="공정 ID (FK → TB_PROCESS)",
    )
    ccp_standard_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_CCP_STANDARD.id", ondelete="SET NULL"),
        nullable=True,
        comment="CCP 기준 ID (FK → TB_CCP_STANDARD)",
    )
    lot_no: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="LOT 번호",
    )
    measured_value: Mapped[float] = mapped_column(
        Numeric(10, 3),
        nullable=True,
        comment="측정값",
    )
    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="단위 (°C, %, pH 등)",
    )
    is_pass: Mapped[bool] = mapped_column(
        Integer,
        nullable=True,
        comment="합격 여부 (1=합격, 0=불합격)",
    )
    action_taken: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="시정 조치 내용",
    )
    inspected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="검사일시",
    )
    inspected_by: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="검사자 (username)",
    )
    notes: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="비고",
    )

    # 관계
    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="qc_records")
    process: Mapped["Process"] = relationship(  # type: ignore[name-defined]
        "Process",
        lazy="joined",
    )
