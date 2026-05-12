"""공정별 특화 실적 엔드포인트 모듈 (Sprint 5).

세척·절임·양념버무림·포장·입고전처리 공정의 실적 입력/조회 및
공정별 집계·CCP 이탈 현황 API를 제공합니다.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.process_detail import (
    crud_packaging,
    crud_preprocess,
    crud_process_summary,
    crud_salting,
    crud_seasoning,
    crud_wash,
)
from app.models.user import User
from app.schemas.process_detail import (
    CCPViolationItem,
    CCPViolationResponse,
    PackagingRecordCreate,
    PackagingRecordResponse,
    PackagingRecordUpdate,
    PreprocessRecordCreate,
    PreprocessRecordResponse,
    PreprocessRecordUpdate,
    ProcessDetailAPIResponse,
    ProcessSummaryItem,
    ProcessSummaryResponse,
    SaltingRecordCreate,
    SaltingRecordResponse,
    SaltingRecordUpdate,
    SeasoningRecordCreate,
    SeasoningRecordResponse,
    SeasoningRecordUpdate,
    WashRecordCreate,
    WashRecordResponse,
    WashRecordUpdate,
)

router = APIRouter()


# ===========================================================================
# 세척 실적
# ===========================================================================

@router.post(
    "/wash",
    response_model=ProcessDetailAPIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="세척 실적 입력",
    description="세척 공정 실적을 입력합니다. CCP(온도 1~15°C, pH 6.5~8.5) 자동 판정.",
)
def create_wash_record(
    obj_in: WashRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    record = crud_wash.create(db, obj_in=obj_in, created_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="세척 실적이 등록되었습니다.",
        data=WashRecordResponse.from_orm_with_wo(record).model_dump(),
    )


@router.get(
    "/wash/{work_order_id}",
    response_model=ProcessDetailAPIResponse,
    summary="세척 실적 조회",
    description="작업지시 ID로 세척 실적 목록을 조회합니다.",
)
def get_wash_records(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    records = crud_wash.get_by_work_order(db, work_order_id=work_order_id)
    return ProcessDetailAPIResponse(
        success=True,
        message=f"세척 실적 {len(records)}건 조회 성공",
        data={
            "items": [WashRecordResponse.from_orm_with_wo(r).model_dump() for r in records],
            "total": len(records),
        },
    )


@router.patch(
    "/wash/record/{record_id}",
    response_model=ProcessDetailAPIResponse,
    summary="세척 실적 수정",
)
def update_wash_record(
    record_id: int,
    obj_in: WashRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    db_obj = crud_wash.get(db, record_id)
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="세척 실적을 찾을 수 없습니다.")
    record = crud_wash.update(db, db_obj=db_obj, obj_in=obj_in, updated_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="세척 실적이 수정되었습니다.",
        data=WashRecordResponse.from_orm_with_wo(record).model_dump(),
    )


# ===========================================================================
# 절임 실적
# ===========================================================================

@router.post(
    "/salting",
    response_model=ProcessDetailAPIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="절임 실적 입력",
    description="절임 공정 실적을 입력합니다. 절임시간 자동계산, CCP(염수농도 15~20%, 염도 2.5~3.0%) 자동 판정.",
)
def create_salting_record(
    obj_in: SaltingRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    record = crud_salting.create(db, obj_in=obj_in, created_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="절임 실적이 등록되었습니다.",
        data=SaltingRecordResponse.from_orm_with_wo(record).model_dump(),
    )


@router.get(
    "/salting/{work_order_id}",
    response_model=ProcessDetailAPIResponse,
    summary="절임 실적 조회",
)
def get_salting_records(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    records = crud_salting.get_by_work_order(db, work_order_id=work_order_id)
    return ProcessDetailAPIResponse(
        success=True,
        message=f"절임 실적 {len(records)}건 조회 성공",
        data={
            "items": [SaltingRecordResponse.from_orm_with_wo(r).model_dump() for r in records],
            "total": len(records),
        },
    )


@router.patch(
    "/salting/record/{record_id}",
    response_model=ProcessDetailAPIResponse,
    summary="절임 실적 수정",
)
def update_salting_record(
    record_id: int,
    obj_in: SaltingRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    db_obj = crud_salting.get(db, record_id)
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="절임 실적을 찾을 수 없습니다.")
    record = crud_salting.update(db, db_obj=db_obj, obj_in=obj_in, updated_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="절임 실적이 수정되었습니다.",
        data=SaltingRecordResponse.from_orm_with_wo(record).model_dump(),
    )


# ===========================================================================
# 양념버무림 실적
# ===========================================================================

@router.post(
    "/seasoning",
    response_model=ProcessDetailAPIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="양념버무림 실적 입력",
    description="양념버무림 공정 실적을 입력합니다. CCP(혼합온도 -2~10°C) 자동 판정.",
)
def create_seasoning_record(
    obj_in: SeasoningRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    record = crud_seasoning.create(db, obj_in=obj_in, created_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="양념버무림 실적이 등록되었습니다.",
        data=SeasoningRecordResponse.from_orm_with_wo(record).model_dump(),
    )


@router.get(
    "/seasoning/{work_order_id}",
    response_model=ProcessDetailAPIResponse,
    summary="양념버무림 실적 조회",
)
def get_seasoning_records(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    records = crud_seasoning.get_by_work_order(db, work_order_id=work_order_id)
    return ProcessDetailAPIResponse(
        success=True,
        message=f"양념버무림 실적 {len(records)}건 조회 성공",
        data={
            "items": [SeasoningRecordResponse.from_orm_with_wo(r).model_dump() for r in records],
            "total": len(records),
        },
    )


@router.patch(
    "/seasoning/record/{record_id}",
    response_model=ProcessDetailAPIResponse,
    summary="양념버무림 실적 수정",
)
def update_seasoning_record(
    record_id: int,
    obj_in: SeasoningRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    db_obj = crud_seasoning.get(db, record_id)
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="양념버무림 실적을 찾을 수 없습니다.")
    record = crud_seasoning.update(db, db_obj=db_obj, obj_in=obj_in, updated_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="양념버무림 실적이 수정되었습니다.",
        data=SeasoningRecordResponse.from_orm_with_wo(record).model_dump(),
    )


# ===========================================================================
# 포장 실적
# ===========================================================================

@router.post(
    "/packaging",
    response_model=ProcessDetailAPIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="포장 실적 입력",
    description="포장 공정 실적을 입력합니다. 불량률 자동계산, CCP(금속검출 FAIL 시 포장결과 FAIL) 자동 판정.",
)
def create_packaging_record(
    obj_in: PackagingRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    record = crud_packaging.create(db, obj_in=obj_in, created_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="포장 실적이 등록되었습니다.",
        data=PackagingRecordResponse.from_orm_with_wo(record).model_dump(),
    )


@router.get(
    "/packaging/{work_order_id}",
    response_model=ProcessDetailAPIResponse,
    summary="포장 실적 조회",
)
def get_packaging_records(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    records = crud_packaging.get_by_work_order(db, work_order_id=work_order_id)
    return ProcessDetailAPIResponse(
        success=True,
        message=f"포장 실적 {len(records)}건 조회 성공",
        data={
            "items": [PackagingRecordResponse.from_orm_with_wo(r).model_dump() for r in records],
            "total": len(records),
        },
    )


@router.patch(
    "/packaging/record/{record_id}",
    response_model=ProcessDetailAPIResponse,
    summary="포장 실적 수정",
)
def update_packaging_record(
    record_id: int,
    obj_in: PackagingRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    db_obj = crud_packaging.get(db, record_id)
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="포장 실적을 찾을 수 없습니다.")
    record = crud_packaging.update(db, db_obj=db_obj, obj_in=obj_in, updated_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="포장 실적이 수정되었습니다.",
        data=PackagingRecordResponse.from_orm_with_wo(record).model_dump(),
    )


# ===========================================================================
# 입고전처리 실적
# ===========================================================================

@router.post(
    "/preprocess",
    response_model=ProcessDetailAPIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="입고전처리 실적 입력",
    description="원재료 입고전처리 실적을 입력합니다. 합격중량(input - reject) 자동계산.",
)
def create_preprocess_record(
    obj_in: PreprocessRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    record = crud_preprocess.create(db, obj_in=obj_in, created_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="입고전처리 실적이 등록되었습니다.",
        data=PreprocessRecordResponse.from_orm_with_relations(record).model_dump(),
    )


@router.get(
    "/preprocess",
    response_model=ProcessDetailAPIResponse,
    summary="입고전처리 실적 목록 조회",
    description="원재료 ID, 날짜 범위로 입고전처리 실적을 조회합니다.",
)
def get_preprocess_records(
    raw_material_id: Optional[int] = Query(None, description="원재료 ID 필터"),
    date_from: Optional[date] = Query(None, description="조회 시작일 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="조회 종료일 (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    records, total = crud_preprocess.get_multi(
        db,
        raw_material_id=raw_material_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    return ProcessDetailAPIResponse(
        success=True,
        message=f"입고전처리 실적 {total}건 조회 성공",
        data={
            "items": [PreprocessRecordResponse.from_orm_with_relations(r).model_dump() for r in records],
            "total": total,
        },
    )


@router.patch(
    "/preprocess/record/{record_id}",
    response_model=ProcessDetailAPIResponse,
    summary="입고전처리 실적 수정",
)
def update_preprocess_record(
    record_id: int,
    obj_in: PreprocessRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessDetailAPIResponse:
    db_obj = crud_preprocess.get(db, record_id)
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="입고전처리 실적을 찾을 수 없습니다.")
    record = crud_preprocess.update(db, db_obj=db_obj, obj_in=obj_in, updated_by=current_user.username)
    return ProcessDetailAPIResponse(
        success=True,
        message="입고전처리 실적이 수정되었습니다.",
        data=PreprocessRecordResponse.from_orm_with_relations(record).model_dump(),
    )


# ===========================================================================
# 공정별 실적 집계 및 CCP 이탈 현황
# ===========================================================================

@router.get(
    "/summary",
    response_model=ProcessSummaryResponse,
    summary="공정별 실적 집계",
    description="날짜 범위별 공정 실적 집계 (투입량, 산출량, 수율, CCP 이탈건수).",
)
def get_process_summary(
    date_from: date = Query(..., description="조회 시작일 (YYYY-MM-DD)"),
    date_to: date = Query(..., description="조회 종료일 (YYYY-MM-DD)"),
    process_type: Optional[str] = Query(
        None,
        description="공정 유형 필터 (WASHING/SALTING/SEASONING/PACKAGING)",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ProcessSummaryResponse:
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from은 date_to보다 작거나 같아야 합니다.",
        )

    rows = crud_process_summary.get_process_summary(
        db,
        date_from=date_from,
        date_to=date_to,
        process_type=process_type,
    )
    items = [ProcessSummaryItem(**row) for row in rows]
    return ProcessSummaryResponse(
        success=True,
        message=f"공정 실적 집계 {len(items)}건 조회 성공",
        data=items,
        total=len(items),
    )


@router.get(
    "/ccp-violations",
    response_model=CCPViolationResponse,
    summary="CCP 이탈 현황",
    description="날짜 범위 내 HACCP CCP 기준값 이탈 실적 목록을 조회합니다.",
)
def get_ccp_violations(
    date_from: date = Query(..., description="조회 시작일 (YYYY-MM-DD)"),
    date_to: date = Query(..., description="조회 종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CCPViolationResponse:
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from은 date_to보다 작거나 같아야 합니다.",
        )

    rows = crud_process_summary.get_ccp_violations(db, date_from=date_from, date_to=date_to)
    items = [CCPViolationItem(**row) for row in rows]
    return CCPViolationResponse(
        success=True,
        message=f"CCP 이탈 {len(items)}건 조회 성공",
        data=items,
        total=len(items),
    )
