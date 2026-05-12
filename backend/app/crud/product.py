"""제품 CRUD 모듈."""

from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    """제품 CRUD 클래스.

    제품 코드 검색, 유형별 필터링 등 제품 관련 특수 메서드를 제공합니다.
    """

    def get_by_code(self, db: Session, *, product_code: str) -> Optional[Product]:
        """제품 코드로 제품을 조회합니다.

        Args:
            db: 데이터베이스 세션
            product_code: 조회할 제품 코드

        Returns:
            제품 객체 또는 None
        """
        return (
            db.query(Product)
            .filter(
                Product.product_code == product_code,
                Product.is_deleted == False,
            )
            .first()
        )

    def get_multi_with_search(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        product_type: Optional[str] = None,
        channel_type: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Product], int]:
        """검색 조건으로 제품 목록을 조회합니다.

        Args:
            db: 데이터베이스 세션
            skip: 오프셋
            limit: 최대 반환 수
            search: 검색어 (코드 또는 이름)
            product_type: 김치 종류 필터
            channel_type: 판매 채널 필터
            is_active: 활성 여부 필터

        Returns:
            (제품 목록, 전체 개수) 튜플
        """
        query = db.query(Product).filter(Product.is_deleted == False)

        if search:
            query = query.filter(
                or_(
                    Product.product_code.ilike(f"%{search}%"),
                    Product.product_name.ilike(f"%{search}%"),
                )
            )

        if product_type:
            query = query.filter(Product.product_type == product_type)

        if channel_type:
            query = query.filter(Product.channel_type == channel_type)

        if is_active is not None:
            query = query.filter(Product.is_active == is_active)

        total = query.count()
        items = query.order_by(Product.product_code).offset(skip).limit(limit).all()
        return items, total


crud_product = CRUDProduct(Product)
