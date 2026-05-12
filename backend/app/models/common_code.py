"""공통 코드 모델 모듈.

테이블:
- TB_COMMON_CODE: 공통 코드 마스터 정보
"""

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class CommonCode(Base, TimestampMixin):
    """공통 코드 모델 (TB_COMMON_CODE).

    시스템 전반에서 사용되는 공통 코드(드롭다운 선택값 등)를 관리합니다.
    코드 그룹 + 코드 값으로 계층 구조를 형성합니다.

    예시:
    - 그룹: PRODUCT_TYPE → 코드: BAECHU(배추김치), CHONGGAK(총각김치)
    - 그룹: EQUIPMENT_STATUS → 코드: RUNNING(가동중), IDLE(대기)
    """

    __tablename__ = "TB_COMMON_CODE"
    __table_args__ = {"comment": "공통 코드 마스터 테이블"}

    code_group: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="코드 그룹 (예: PRODUCT_TYPE, EQUIPMENT_STATUS)",
    )
    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="코드 값 (예: BAECHU, RUNNING)",
    )
    code_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="코드 이름 (한글 표시명, 예: 배추김치, 가동중)",
    )
    code_name_en: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="코드 이름 (영문)",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="정렬 순서",
    )
    description: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="코드 설명",
    )
    extra_value1: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        comment="추가 값 1 (범용 확장 필드)",
    )
    extra_value2: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        comment="추가 값 2 (범용 확장 필드)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="활성 여부",
    )
