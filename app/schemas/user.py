from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    ConfigDict
)

class StaffCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(
        min_length=1,
        max_length=120
    )
    password: str = Field(
        min_length=1,
        max_length=128
    )

class StaffUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=120
    )
    is_active: bool | None = None

class PasswordReset(BaseModel):
    password: str = Field(
        min_length=12,
        max_length=128
    )

class UserOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    