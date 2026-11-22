from fastapi import HTTPException, status

def can_access_document(
    user, document
) -> bool:
    if user.role == "admin":
        return True

    return (
        user.role == "staff"
        and document.visibility == "all_users"
    )


def require_admin(
    user
):
    if not user.is_active or user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


def require_document_access(
    user, 
    document
):
    
    if not user.is_active or not can_access_document(
        user, document
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Document access denied",
        )