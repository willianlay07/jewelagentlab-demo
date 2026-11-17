from fastapi import HTTPException
from sqlalchemy import select

from app.agents.email_draft_graph import email_draft_graph

from app.models.email_message import EmailMessage
from app.models.email_classification import EmailClassification
from app.models.email_draft import (
    EmailDraft,
    EmailDraftAudit,
    utcnow
)


def serialize(draft):
    return {
        "id": draft.id,
        "email_message_id": draft.email_message_id,
        "subject": draft.subject,
        "body": draft.body,
        "status": draft.status,
        "category": draft.category,
        "product_references": draft.product_references,
        "model_used": draft.model_used,
        "created_by": draft.created_by,
        "reviewed_by": draft.reviewed_by,
        "reviewed_at": draft.reviewed_at
    }


def audit(db, draft, user, action):
    db.add(
        EmailDraftAudit(
            draft_id=draft.id,
            user_id=user.id,
            action=action
        )
    )


def generate_draft(db, user, message_id):
    message = db.get(EmailMessage, message_id)

    if not message:
        raise HTTPException(404, "Email not found")

    existing = db.scalar(
        select(EmailDraft).where(
            EmailDraft.email_message_id == message_id
        )
    )

    if existing:
        raise HTTPException(
            409,
            "Draft already exists. Edit the existing draft."
        )

    classification = db.scalar(
        select(EmailClassification).where(
            EmailClassification.email_message_id == message_id
        )
    )

    if not classification:
        raise HTTPException(
            409,
            "Classify the email before generating a draft"
        )

    
    state = email_draft_graph.invoke(
        {
            "message_id": message.id,
            "subject": message.subject or "",
            "body": message.body_text or "",
            "classification": {
                "category": classification.category,
                "extracted_data": (
                    classification.extracted_data or {}
                )
            }
        },
        config={
            "configurable": {
                "db": db
            }
        }
    )

    product_codes = [
        p["code"] for p in state.get("products", [])
    ]

    body = state["draft_body"]

    if not body:
        raise HTTPException(502, "AI returned an empty draft")

    draft = EmailDraft(
        email_message_id=message_id,
        subject=state["draft_subject"][:500],
        body=body,
        status="pending_review",
        category=classification.category,
        product_references=product_codes,
        model_used=state.get("model_used"),
        created_by=user.id
    )

    db.add(draft)
    db.flush()

    audit(db, draft, user, "generated")

    db.commit()
    db.refresh(draft)

    return serialize(draft)


def get_draft(db, draft_id):
    draft = db.get(EmailDraft, draft_id)

    if not draft:
        raise HTTPException(404, "Draft not found")

    return draft


def update_draft(db, user, draft_id, data):
    draft = get_draft(db, draft_id)

    if draft.status != "pending_review":
        raise HTTPException(
            409,
            "Only pending drafts can be edited"
        )

    draft.subject = data.subject
    draft.body = data.body

    audit(db, draft, user, "edited")

    db.commit()
    db.refresh(draft)

    return serialize(draft)


def review_draft(db, user, draft_id, action):
    draft = get_draft(db, draft_id)

    if draft.status != "pending_review":
        raise HTTPException(
            409,
            "Draft has already been reviewed"
        )

    if action not in ("approved", "rejected"):
        raise HTTPException(422, "Invalid review action")

    draft.status = action
    draft.reviewed_by = user.id
    draft.reviewed_at = utcnow()

    audit(db, draft, user, action)

    db.commit()
    db.refresh(draft)

    return serialize(draft)