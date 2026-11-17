from fastapi import HTTPException
from sqlalchemy import select

from app.models.email_message import EmailMessage
from app.models.email_classification import EmailClassification

from app.agents.email_graph import email_graph


def serialize_classification(
    record
):
    return {
        "id": record.id,
        "email_message_id": record.email_message_id,
        "category": record.category,
        "confidence": record.confidence,
        "summary": record.summary,
        "requires_review": record.requires_review,
        "extracted_data": record.extracted_data,
        "model_used": record.model_used
    }


def classify_email(
    db,
    message_id: int, 
    force=False
):
    
    message = db.get(EmailMessage, message_id)

    if message is None:
        raise HTTPException(
            status_code=404,
            detail="Email message not found"
        )

    existing = db.scalar(
        select(EmailClassification).where(
            EmailClassification.email_message_id == message_id
        )
    )

    # Avoid unnecessary LLM calls.
    if existing and not force:
        return serialize_classification(existing)

    state = email_graph.invoke(
        {
            "subject": message.subject or "",
            "body": message.body_text or ""
        }
    )

    result = state["classification"]

    extracted_data = {
        "product_category": result.get("product_category"),
        "metal": result.get("metal"),
        "max_price": result.get("max_price"),
        "order_number": result.get("order_number")
    }

    if existing is None:
        existing = EmailClassification(
            email_message_id=message_id,
            category=result["category"],
            confidence=result["confidence"],
            summary=result["summary"],
            requires_review=result["requires_review"],
            extracted_data=extracted_data,
            model_used=state["model_used"]
        )

        db.add(existing)

    else:
        existing.category = result["category"]
        existing.confidence = result["confidence"]
        existing.summary = result["summary"]
        existing.requires_review = result["requires_review"]
        existing.extracted_data = extracted_data
        existing.model_used = state["model_used"]

    db.commit()
    db.refresh(existing)

    return serialize_classification(existing)


def get_classification(
    db, 
    message_id: int
):
    record = db.scalar(
        select(EmailClassification).where(
            EmailClassification.email_message_id == message_id
        )
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Email classification not found"
        )

    return serialize_classification(record)
