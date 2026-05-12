"""API v1 라우터 - 모든 엔드포인트를 통합합니다."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    products,
    bom,
    raw_materials,
    processes,
    equipment,
    customers,
    common_codes,
)

api_router = APIRouter()

# 인증 엔드포인트 (prefix 없음 - /auth/login 형태)
api_router.include_router(auth.router, prefix="/auth", tags=["인증"])

# 마스터 데이터 엔드포인트
api_router.include_router(products.router, prefix="/products", tags=["제품 관리"])
api_router.include_router(bom.router, prefix="/boms", tags=["BOM 관리"])
api_router.include_router(raw_materials.router, prefix="/raw-materials", tags=["원재료 관리"])
api_router.include_router(processes.router, prefix="/processes", tags=["공정 관리"])
api_router.include_router(equipment.router, prefix="/equipment", tags=["설비 관리"])
api_router.include_router(customers.router, prefix="/customers", tags=["고객 관리"])
api_router.include_router(common_codes.router, prefix="/common-codes", tags=["공통 코드"])
