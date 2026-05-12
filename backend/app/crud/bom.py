"""BOM CRUD 모듈."""

from typing import List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from app.crud.base import CRUDBase
from app.models.bom import BOM, BOMDetail
from app.schemas.bom import BOMCreate, BOMDetailCreate, BOMDetailUpdate, BOMUpdate


class CRUDBOMDetail(CRUDBase[BOMDetail, BOMDetailCreate, BOMDetailUpdate]):
    """BOM 상세 CRUD 클래스."""

    def get_by_bom(self, db: Session, *, bom_id: int) -> List[BOMDetail]:
        """BOM ID로 BOM 상세 목록을 조회합니다.

        Args:
            db: 데이터베이스 세션
            bom_id: BOM ID

        Returns:
            BOM 상세 목록 (순서 기준 정렬)
        """
        return (
            db.query(BOMDetail)
            .filter(
                BOMDetail.bom_id == bom_id,
                BOMDetail.is_deleted == False,
            )
            .order_by(BOMDetail.sequence)
            .all()
        )


class CRUDBOM(CRUDBase[BOM, BOMCreate, BOMUpdate]):
    """BOM CRUD 클래스.

    BOM 헤더와 상세를 함께 관리하는 메서드를 제공합니다.
    """

    def get_with_details(self, db: Session, *, id: int) -> Optional[BOM]:
        """ID로 BOM을 상세(details) 포함하여 조회합니다.

        Args:
            db: 데이터베이스 세션
            id: BOM ID

        Returns:
            BOM 객체 (details 포함) 또는 None
        """
        return (
            db.query(BOM)
            .options(joinedload(BOM.details))
            .filter(BOM.id == id, BOM.is_deleted == False)
            .first()
        )

    def get_by_product(
        self,
        db: Session,
        *,
        product_id: int,
        active_only: bool = True,
    ) -> List[BOM]:
        """제품 ID로 해당 제품의 BOM 목록을 조회합니다.

        Args:
            db: 데이터베이스 세션
            product_id: 제품 ID
            active_only: 활성 BOM만 조회 여부

        Returns:
            BOM 목록
        """
        query = db.query(BOM).filter(
            BOM.product_id == product_id,
            BOM.is_deleted == False,
        )

        if active_only:
            query = query.filter(BOM.is_active == True)

        return query.order_by(BOM.version.desc()).all()

    def create_with_details(
        self,
        db: Session,
        *,
        obj_in: BOMCreate,
        created_by: str = "system",
    ) -> BOM:
        """BOM 헤더와 상세를 함께 생성합니다.

        Args:
            db: 데이터베이스 세션
            obj_in: BOM 생성 스키마 (details 포함)
            created_by: 생성자

        Returns:
            생성된 BOM 객체 (details 포함)
        """
        # BOM 헤더 생성
        bom_data = obj_in.model_dump(exclude={"details"})
        db_bom = BOM(**bom_data, created_by=created_by, updated_by=created_by)
        db.add(db_bom)
        db.flush()  # ID 확보 (commit 없이)

        # BOM 상세 생성
        if obj_in.details:
            for detail_in in obj_in.details:
                db_detail = BOMDetail(
                    **detail_in.model_dump(),
                    bom_id=db_bom.id,
                    created_by=created_by,
                    updated_by=created_by,
                )
                db.add(db_detail)

        db.commit()
        db.refresh(db_bom)
        return db_bom

    def get_multi_with_filter(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        product_id: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[BOM], int]:
        """필터 조건으로 BOM 목록을 조회합니다.

        Args:
            db: 데이터베이스 세션
            skip: 오프셋
            limit: 최대 반환 수
            product_id: 제품 ID 필터
            is_active: 활성 여부 필터

        Returns:
            (BOM 목록, 전체 개수) 튜플
        """
        query = db.query(BOM).filter(BOM.is_deleted == False)

        if product_id is not None:
            query = query.filter(BOM.product_id == product_id)

        if is_active is not None:
            query = query.filter(BOM.is_active == is_active)

        total = query.count()
        items = (
            query.options(joinedload(BOM.details))
            .order_by(BOM.bom_code)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total


crud_bom = CRUDBOM(BOM)
crud_bom_detail = CRUDBOMDetail(BOMDetail)
