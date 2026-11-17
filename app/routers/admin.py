from fastapi import APIRouter, Query

from app.core.dependencies import Admin
from app.db.session import Db

from app.schemas.user import StaffCreate, StaffUpdate, PasswordReset, UserOut
from app.services import staff_service


router = APIRouter(
    prefix="/admin/staff",
    tags=["Admin - Staff"],
    dependencies=[]
)

@router.post(
    "/",
    response_model=UserOut,
    status_code=201
)
def add_staff(
    data: StaffCreate,
    db: Db,
    admin: Admin
):
    return staff_service.create_staff(db, data)

@router.get(
    "/",
    response_model=list[UserOut]
)
def get_staff_list(
    db: Db, 
    admin: Admin, 
    limit: int = Query(50, ge=1, le=100), 
    offset: int = Query(0, ge=0)
):
    return staff_service.list_staff(db, limit, offset)

@router.get(
    "/{staff_id}",
    response_model=UserOut
)
def get_staff(
    staff_id: int,
    db: Db,
    admin: Admin
):
    return staff_service.find_staff(
        db,
        staff_id
    )

@router.patch(
    "/{staff_id}", 
    response_model=UserOut
)
def edit_staff(
    staff_id: int, 
    data: StaffUpdate, 
    db: Db, 
    admin: Admin
):
    return staff_service.update_staff(db, staff_id, data)

@router.put(
    "/{staff_id}/password", 
    status_code=204
)
def reset_password(
    staff_id: int, 
    data: PasswordReset, 
    db: Db, 
    admin: Admin
):
    staff_service.reset_staff_password(db, staff_id, data.password)
