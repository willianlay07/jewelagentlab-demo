from pydantic import BaseModel, Field

class EmailDraftUpdate(BaseModel):
    subject: str = Field(
        min_length=1,
        max_length=500
    )
    body: str = Field(
        min_length=1,
        max_length=20000
    )
