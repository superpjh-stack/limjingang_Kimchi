"""사용자, 역할, 사용자-역할 매핑 모델 모듈.

테이블:
- TB_USER: 사용자 정보
- TB_ROLE: 역할 정의
- TB_USER_ROLE: 사용자-역할 매핑 (M:N)
"""

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Role(Base, TimestampMixin):
    """역할 모델 (TB_ROLE).

    시스템 내 역할(권한 그룹)을 정의합니다.
    예: ADMIN, PRODUCTION_MANAGER, WORKER, QUALITY_INSPECTOR
    """

    __tablename__ = "TB_ROLE"
    __table_args__ = {"comment": "역할 테이블"}

    role_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="역할 코드 (예: ADMIN, WORKER)",
    )
    role_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="역할 이름 (예: 관리자, 작업자)",
    )
    description: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="역할 설명",
    )

    # 관계
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="role",
    )


class User(Base, TimestampMixin):
    """사용자 모델 (TB_USER).

    MES 시스템 접근 사용자를 정의합니다.
    현장 작업자부터 관리자까지 모든 사용자를 포함합니다.
    """

    __tablename__ = "TB_USER"
    __table_args__ = {"comment": "사용자 테이블"}

    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="사용자 로그인 아이디",
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="bcrypt 해시된 비밀번호",
    )
    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="사용자 실명",
    )
    employee_id: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=True,
        comment="사원번호",
    )
    department: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="부서명",
    )
    position: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="직책",
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
        comment="이메일 주소",
    )
    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="연락처",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="활성 여부",
    )
    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="관리자 여부",
    )

    # 관계
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
    )


class UserRole(Base, TimestampMixin):
    """사용자-역할 매핑 모델 (TB_USER_ROLE).

    사용자와 역할의 다대다(M:N) 관계를 관리합니다.
    """

    __tablename__ = "TB_USER_ROLE"
    __table_args__ = {"comment": "사용자-역할 매핑 테이블"}

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_USER.id", ondelete="CASCADE"),
        nullable=False,
        comment="사용자 ID (FK → TB_USER)",
    )
    role_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("TB_ROLE.id", ondelete="CASCADE"),
        nullable=False,
        comment="역할 ID (FK → TB_ROLE)",
    )

    # 관계
    user: Mapped["User"] = relationship("User", back_populates="user_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="user_roles")
