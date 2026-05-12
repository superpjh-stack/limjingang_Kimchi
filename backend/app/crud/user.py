"""사용자 CRUD 모듈."""

from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """사용자 CRUD 클래스.

    사용자 인증, 비밀번호 처리 등 사용자 관련 특수 메서드를 제공합니다.
    """

    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        """사용자명으로 사용자를 조회합니다.

        Args:
            db: 데이터베이스 세션
            username: 조회할 사용자명

        Returns:
            사용자 객체 또는 None
        """
        return (
            db.query(User)
            .filter(User.username == username, User.is_deleted == False)
            .first()
        )

    def create(
        self,
        db: Session,
        *,
        obj_in: UserCreate,
        created_by: str = "system",
    ) -> User:
        """사용자를 생성합니다.

        비밀번호를 bcrypt로 해시하여 저장합니다.

        Args:
            db: 데이터베이스 세션
            obj_in: 사용자 생성 스키마
            created_by: 생성자

        Returns:
            생성된 사용자 객체
        """
        db_obj = User(
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            employee_id=obj_in.employee_id,
            department=obj_in.department,
            position=obj_in.position,
            email=obj_in.email,
            phone=obj_in.phone,
            is_active=obj_in.is_active,
            is_admin=obj_in.is_admin,
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: User,
        obj_in: UserUpdate,
        updated_by: str = "system",
    ) -> User:
        """사용자 정보를 수정합니다.

        비밀번호가 포함된 경우 해시하여 저장합니다.

        Args:
            db: 데이터베이스 세션
            db_obj: 기존 사용자 객체
            obj_in: 수정 데이터 스키마
            updated_by: 수정자

        Returns:
            수정된 사용자 객체
        """
        update_data = obj_in.model_dump(exclude_unset=True)

        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db_obj.updated_by = updated_by
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def authenticate(
        self,
        db: Session,
        *,
        username: str,
        password: str,
    ) -> Optional[User]:
        """사용자 인증을 수행합니다.

        Args:
            db: 데이터베이스 세션
            username: 사용자명
            password: 평문 비밀번호

        Returns:
            인증 성공 시 사용자 객체, 실패 시 None
        """
        user = self.get_by_username(db, username=username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def is_active(self, user: User) -> bool:
        """사용자 활성 여부를 반환합니다."""
        return user.is_active

    def is_admin(self, user: User) -> bool:
        """사용자 관리자 여부를 반환합니다."""
        return user.is_admin


crud_user = CRUDUser(User)
