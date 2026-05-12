"""제네릭 CRUD 베이스 클래스.

모든 모델에 공통으로 사용되는 CRUD 메서드를 제공하는
Generic 기반의 베이스 클래스입니다.
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import Base

# 제네릭 타입 변수 정의
ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """제네릭 CRUD 베이스 클래스.

    제네릭 타입:
    - ModelType: SQLAlchemy 모델 클래스
    - CreateSchemaType: 생성 Pydantic 스키마
    - UpdateSchemaType: 수정 Pydantic 스키마
    """

    def __init__(self, model: Type[ModelType]) -> None:
        """CRUD 객체를 초기화합니다.

        Args:
            model: SQLAlchemy 모델 클래스
        """
        self.model = model

    def get(self, db: Session, id: int) -> Optional[ModelType]:
        """ID로 단일 레코드를 조회합니다 (소프트 삭제 제외).

        Args:
            db: 데이터베이스 세션
            id: 조회할 레코드 ID

        Returns:
            조회된 모델 객체 또는 None
        """
        return (
            db.query(self.model)
            .filter(self.model.id == id, self.model.is_deleted == False)
            .first()
        )

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[List[ModelType], int]:
        """다중 레코드를 페이지네이션으로 조회합니다.

        Args:
            db: 데이터베이스 세션
            skip: 건너뛸 레코드 수 (오프셋)
            limit: 최대 반환 레코드 수

        Returns:
            (레코드 목록, 전체 개수) 튜플
        """
        query = db.query(self.model).filter(self.model.is_deleted == False)
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def create(
        self,
        db: Session,
        *,
        obj_in: CreateSchemaType,
        created_by: str = "system",
    ) -> ModelType:
        """새 레코드를 생성합니다.

        Args:
            db: 데이터베이스 세션
            obj_in: 생성 데이터 스키마
            created_by: 생성자 (username)

        Returns:
            생성된 모델 객체
        """
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)
        db_obj.created_by = created_by
        db_obj.updated_by = created_by
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]],
        updated_by: str = "system",
    ) -> ModelType:
        """기존 레코드를 수정합니다.

        Args:
            db: 데이터베이스 세션
            db_obj: 수정할 기존 모델 객체
            obj_in: 수정 데이터 (스키마 또는 딕셔너리)
            updated_by: 수정자 (username)

        Returns:
            수정된 모델 객체
        """
        obj_data = jsonable_encoder(db_obj)

        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])

        db_obj.updated_by = updated_by
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int, deleted_by: str = "system") -> ModelType:
        """레코드를 소프트 삭제합니다 (is_deleted = True).

        실제 DB에서 삭제하지 않고 is_deleted 플래그만 변경합니다.

        Args:
            db: 데이터베이스 세션
            id: 삭제할 레코드 ID
            deleted_by: 삭제자 (username)

        Returns:
            소프트 삭제된 모델 객체
        """
        obj = db.query(self.model).get(id)
        obj.is_deleted = True
        obj.updated_by = deleted_by
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def hard_remove(self, db: Session, *, id: int) -> ModelType:
        """레코드를 물리적으로 삭제합니다.

        주의: 실제 데이터가 삭제됩니다. 일반적으로 soft delete를 권장합니다.

        Args:
            db: 데이터베이스 세션
            id: 삭제할 레코드 ID

        Returns:
            삭제된 모델 객체
        """
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj
