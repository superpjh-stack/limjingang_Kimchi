"""설비 확장(점검·고장·상태변경) 엔드포인트 모듈.

Sprint 4 신규 API:
- 점검 계획 등록/조회/결과 입력
- 고장 등록/수정/복구 완료
- 설비 상태 변경
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.crud.base import CRUDBase
from app.crud.equipment_ext import crud_failure, crud_inspection
from app.models.equipment import Equipment
from app.models.equipment_ext import EquipmentFailure, EquipmentInspection
from app.models.user import User
from app.schemas.equipment import EquipmentResponse
from app.schemas.equipment_ext import (
    APIResponse,
    EquipmentStatusUpdate,
    FailureCreate,
    FailureListResponse,
    FailureResolveRequest,
    FailureResponse,
    FailureUpdate,
    InspectionCreate,
    InspectionListResponse,
    InspectionResponse,
    InspectionUpdate,
)

router = APIRouter()

crud_equipment = CRUDBase[Equipment, EquipmentResponse, EquipmentResponse](Equipment)


# ============================================================
# 점검 관리
# ============================================================

@router.get(
    "/{equipment_id}/inspections",
    response_model=InspectionListResponse,
    summary="설비별 점검 이력 조회",
)
def get_inspections_by_equipment(
    equipment_id: int,
    status_filter: Optional[str] = Query(None, alias="status", description="상태 필터"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> InspectionListResponse:
    """설비별 점검 이력을 조회합니다."""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.is_deleted == False,
    ).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {equipment_id}인 설비를 찾을 수 없습니다.",
        )

    items, total = crud_inspection.get_by_equipment(
        db,
        equipment_id=equipment_id,
        status=status_filter,
        skip=skip,
        limit=limit,
    )

    return InspectionListResponse(
        success=True,
        message="점검 이력 조회 성공",
        data=[InspectionResponse.from_orm_with_equipment(i) for i in items],
        total=total,
    )


@router.post(
    "/{equipment_id}/inspections",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="점검 계획 등록",
)
def create_inspection(
    equipment_id: int,
    inspection_in: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """설비 점검 계획을 등록합니다."""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.is_deleted == False,
    ).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {equipment_id}인 설비를 찾을 수 없습니다.",
        )

    # equipment_id를 path에서 강제 설정
    inspection_in_data = inspection_in.model_copy(update={"equipment_id": equipment_id})

    db_obj = EquipmentInspection(
        equipment_id=equipment_id,
        inspection_type=inspection_in_data.inspection_type,
        scheduled_date=inspection_in_data.scheduled_date,
        inspector=inspection_in_data.inspector,
        notes=inspection_in_data.notes,
        status="SCHEDULED",
        created_by=current_user.username,
        updated_by=current_user.username,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    return APIResponse(
        success=True,
        message="점검 계획 등록 성공",
        data=InspectionResponse.from_orm_with_equipment(db_obj),
    )


@router.put(
    "/inspections/{inspection_id}",
    response_model=APIResponse,
    summary="점검 결과 입력",
)
def update_inspection(
    inspection_id: int,
    inspection_in: InspectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """점검 결과를 입력합니다."""
    insp = crud_inspection.get(db, id=inspection_id)
    if not insp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {inspection_id}인 점검을 찾을 수 없습니다.",
        )

    updated = crud_inspection.update(
        db,
        db_obj=insp,
        obj_in=inspection_in,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="점검 결과 입력 성공",
        data=InspectionResponse.from_orm_with_equipment(updated),
    )


@router.get(
    "/inspections/overdue",
    response_model=InspectionListResponse,
    summary="미완료(지연) 점검 목록 조회",
)
def get_overdue_inspections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> InspectionListResponse:
    """예정일이 지났으나 미완료인 점검 목록을 반환합니다."""
    items = crud_inspection.get_overdue(db)
    return InspectionListResponse(
        success=True,
        message="미완료 점검 목록 조회 성공",
        data=[InspectionResponse.from_orm_with_equipment(i) for i in items],
        total=len(items),
    )


@router.get(
    "/inspections/upcoming",
    response_model=InspectionListResponse,
    summary="7일 이내 예정 점검 목록 조회",
)
def get_upcoming_inspections(
    days: int = Query(7, ge=1, le=90, description="조회 기간(일)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> InspectionListResponse:
    """N일 이내 예정된 점검 목록을 반환합니다."""
    items = crud_inspection.get_upcoming(db, days=days)
    return InspectionListResponse(
        success=True,
        message=f"{days}일 이내 예정 점검 목록 조회 성공",
        data=[InspectionResponse.from_orm_with_equipment(i) for i in items],
        total=len(items),
    )


# ============================================================
# 고장 관리
# ============================================================

@router.get(
    "/{equipment_id}/failures",
    response_model=FailureListResponse,
    summary="설비별 고장 이력 조회",
)
def get_failures_by_equipment(
    equipment_id: int,
    status_filter: Optional[str] = Query(None, alias="status", description="상태 필터"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> FailureListResponse:
    """설비별 고장 이력을 조회합니다."""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.is_deleted == False,
    ).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {equipment_id}인 설비를 찾을 수 없습니다.",
        )

    items, total = crud_failure.get_by_equipment(
        db,
        equipment_id=equipment_id,
        status=status_filter,
        skip=skip,
        limit=limit,
    )

    return FailureListResponse(
        success=True,
        message="고장 이력 조회 성공",
        data=[FailureResponse.from_orm_with_equipment(f) for f in items],
        total=total,
    )


@router.post(
    "/{equipment_id}/failures",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="고장 등록",
)
def create_failure(
    equipment_id: int,
    failure_in: FailureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """설비 고장을 등록합니다. 등록 시 해당 설비의 상태가 BREAKDOWN으로 변경됩니다."""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.is_deleted == False,
    ).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {equipment_id}인 설비를 찾을 수 없습니다.",
        )

    # equipment_id를 path 파라미터로 강제
    failure_in_final = failure_in.model_copy(update={"equipment_id": equipment_id})

    db_obj = crud_failure.create_with_no(
        db,
        obj_in=failure_in_final,
        created_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message=f"고장 등록 성공 (고장번호: {db_obj.failure_no}). 설비 상태가 BREAKDOWN으로 변경되었습니다.",
        data=FailureResponse.from_orm_with_equipment(db_obj),
    )


@router.put(
    "/failures/{failure_id}",
    response_model=APIResponse,
    summary="고장 정보 수정",
)
def update_failure(
    failure_id: int,
    failure_in: FailureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """고장 정보를 수정합니다."""
    failure = crud_failure.get(db, id=failure_id)
    if not failure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {failure_id}인 고장 기록을 찾을 수 없습니다.",
        )

    updated = crud_failure.update(
        db,
        db_obj=failure,
        obj_in=failure_in,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="고장 정보 수정 성공",
        data=FailureResponse.from_orm_with_equipment(updated),
    )


@router.post(
    "/failures/{failure_id}/resolve",
    response_model=APIResponse,
    summary="고장 복구 완료",
)
def resolve_failure(
    failure_id: int,
    resolve_in: FailureResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """고장을 복구 완료 처리합니다. 설비 상태가 IDLE로 변경됩니다."""
    failure = crud_failure.get(db, id=failure_id)
    if not failure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {failure_id}인 고장 기록을 찾을 수 없습니다.",
        )

    if failure.status == "RESOLVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 복구 완료된 고장입니다.",
        )

    updated = crud_failure.resolve_failure(
        db,
        failure_id=failure_id,
        repair_notes=resolve_in.repair_notes,
        downtime_hours=resolve_in.downtime_hours,
        repaired_by=resolve_in.repaired_by,
        updated_by=current_user.username,
    )

    return APIResponse(
        success=True,
        message="고장 복구 완료. 설비 상태가 IDLE로 변경되었습니다.",
        data=FailureResponse.from_orm_with_equipment(updated),
    )


@router.get(
    "/failures/open",
    response_model=FailureListResponse,
    summary="미해결 고장 목록 조회",
)
def get_open_failures(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> FailureListResponse:
    """상태가 OPEN 또는 IN_REPAIR인 미해결 고장 목록을 반환합니다."""
    items = crud_failure.get_open_failures(db)
    return FailureListResponse(
        success=True,
        message="미해결 고장 목록 조회 성공",
        data=[FailureResponse.from_orm_with_equipment(f) for f in items],
        total=len(items),
    )


# ============================================================
# 설비 상태 변경
# ============================================================

@router.put(
    "/{equipment_id}/status",
    response_model=APIResponse,
    summary="설비 상태 변경",
)
def update_equipment_status(
    equipment_id: int,
    status_in: EquipmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> APIResponse:
    """설비 상태를 변경합니다 (RUNNING/IDLE/MAINTENANCE/BREAKDOWN)."""
    valid_statuses = {"RUNNING", "IDLE", "MAINTENANCE", "BREAKDOWN"}
    if status_in.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"유효하지 않은 상태입니다. 허용 값: {sorted(valid_statuses)}",
        )

    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.is_deleted == False,
    ).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {equipment_id}인 설비를 찾을 수 없습니다.",
        )

    prev_status = equipment.status
    equipment.status = status_in.status
    equipment.updated_by = current_user.username
    db.add(equipment)
    db.commit()
    db.refresh(equipment)

    reason_msg = f" (사유: {status_in.reason})" if status_in.reason else ""
    return APIResponse(
        success=True,
        message=f"설비 상태 변경 성공: {prev_status} → {status_in.status}{reason_msg}",
        data={
            "equipment_id": equipment.id,
            "equipment_code": equipment.equipment_code,
            "equipment_name": equipment.equipment_name,
            "previous_status": prev_status,
            "current_status": equipment.status,
        },
    )
