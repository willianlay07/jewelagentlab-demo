from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError

from app.core.dependencies import Admin
from app.db.session import Db
from app.models.knowledge import KnowledgeDocument

from sqlalchemy import select
from app.core.dependencies import CurrentUser
from app.services.knowledge_permissions import require_document_access
from datetime import date
from app.services.knowledge_version_service import validate_new_version

from app.schemas.knowledge import KnowledgeSearchRequest
from app.agents.knowledge_graph import build_knowledge_graph

from fastapi.responses import FileResponse
from urllib.parse import quote
from app.models.knowledge import KnowledgeChunk
from app.core.redis_config import get_knowledge_queue

router = APIRouter(
    prefix="/knowledge",
    tags=["Knowledge Base"],
)

UPLOAD_DIR = Path("data/knowledge_documents")
MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


@router.post(
    "/documents", 
    status_code=201
)
async def upload_document(
    db: Db,
    admin: Admin,
    file: UploadFile = File(...),
    title: str = Form(...),
    visibility: str = Form("all_users"),
    previous_document_id: int | None = Form(None),
    effective_from: date | None = Form(None),
):
    title = title.strip()

    if not title or len(title) > 255:
        raise HTTPException(
            status_code=422,
            detail="Document title must contain 1–255 characters",
        )

    if visibility not in ("all_users", "admin_only"):
        raise HTTPException(
            status_code=422,
            detail="Invalid document visibility",
        )

    previous = None

    if previous_document_id is not None:
        previous = validate_new_version(
            db,
            previous_document_id,
        )

        if effective_from is None:
            raise HTTPException(
                status_code=422,
                detail="Effective date is required for a new version",
            )

        if previous.visibility != visibility:
            raise HTTPException(
                status_code=422,
                detail="New version must use the same visibility as the previous version",
            )

    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Supported formats: PDF, DOCX, TXT, MD",
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=422,
            detail="Document is empty",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum document size is 10 MB",
        )

    # Basic file signature checks.
    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(422, "Invalid PDF file")

    if extension == ".docx" and not content.startswith(b"PK"):
        raise HTTPException(422, "Invalid DOCX file")

    if extension in (".txt", ".md"):
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                422,
                "Text documents must use UTF-8 encoding",
            )

    UPLOAD_DIR.mkdir(
        parents=True, 
        exist_ok=True
    )

    stored_filename = f"{uuid4().hex}{extension}"
    stored_path = UPLOAD_DIR / stored_filename

    try:
        stored_path.write_bytes(content)

        document = KnowledgeDocument(
            title=title,
            filename=filename,
            file_path=str(stored_path),
            file_type=extension.lstrip("."),
            visibility=visibility,
            version=previous.version + 1 if previous else 1,
            supersedes_document_id=previous.id if previous else None,
            effective_from=effective_from,
            status="processing",
            uploaded_by=admin.id,
        )

        db.add(document)
        db.commit()
        db.refresh(document)

    except (OSError, SQLAlchemyError):
        db.rollback()
        stored_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="Document upload failed",
        )

    try:
        queue = get_knowledge_queue()

        queue.enqueue(
            "app.workers.knowledge_indexing_worker.process_knowledge_document",
            document.id,
            job_timeout=600,
            result_ttl=600,
            job_id=f"knowledge-document-{document.id}",
        )

    except Exception:
        # The document is already saved in MySQL.
        # Keep it in processing status for recovery.
        raise HTTPException(
            status_code=503,
            detail=(
                "Document saved, but automatic indexing could not "
                "be queued. Please contact the administrator."
            ),
        )

    return {
        "id": document.id,
        "title": document.title,
        "filename": document.filename,
        "file_type": document.file_type,
        "visibility": document.visibility,
        "version": document.version,
        "status": document.status,
        "message": "Document uploaded. Automatic indexing queued.",
        "supersedes_document_id": document.supersedes_document_id,
        "effective_from": document.effective_from,
    }

@router.get(
    "/documents"
)
def list_documents(
    db: Db,
    user: CurrentUser,
):
    stmt = select(KnowledgeDocument).order_by(
        KnowledgeDocument.id.desc()
    )

    if user.role != "admin":
        stmt = stmt.where(
            KnowledgeDocument.visibility == "all_users"
        )

    documents = db.scalars(stmt).all()

    return [
        {
            "id": doc.id,
            "title": doc.title,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "visibility": doc.visibility,
            "version": doc.version,
            "status": doc.status,
            "effective_from": doc.effective_from,
            "effective_to": doc.effective_to,
            "supersedes_document_id": doc.supersedes_document_id,
            "created_at": doc.created_at,
        }
        for doc in documents
    ]

@router.get(
    "/documents/{document_id}"
)
def get_document(
    document_id: int,
    db: Db,
    user: CurrentUser,
):
    document = db.get(KnowledgeDocument, document_id)

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    require_document_access(user, document)

    return {
        "id": document.id,
        "title": document.title,
        "filename": document.filename,
        "file_type": document.file_type,
        "visibility": document.visibility,
        "version": document.version,
        "status": document.status,
        "effective_from": document.effective_from,
        "effective_to": document.effective_to,
        "supersedes_document_id": document.supersedes_document_id,
        "uploaded_by": document.uploaded_by,
        "created_at": document.created_at,
    }


knowledge_graph = build_knowledge_graph()

@router.post(
    "/search"
)
def search_knowledge(
    data: KnowledgeSearchRequest,
    db: Db,
    user: CurrentUser,
):
    result = knowledge_graph.invoke({
        "question": data.question,
        "mode": data.mode,
        "as_of_date": data.as_of_date,
        "limit": data.limit,
        "db": db,
        "user": user,
    })

    return {
        "answer": result.get("answer", ""),
        "intent": result.get("intent", "document_search"),
        "model_used": result.get("model_used"),
        "search_method": (
            "hybrid"
            if result.get("intent") == "document_search"
            else None
        ),
        "mode": data.mode,
        "sources": [
            {
                "document_id": source["document_id"],
                "document_title": source["document_title"],
                "filename": source["filename"],
                "version": source["version"],
                "status": source["status"],
                "page_number": source["page_number"],
                "chunk_id": source["chunk_id"],
                "content": source["content"],
                "effective_from": source["effective_from"],
                "effective_to": source["effective_to"],
            }
            for source in result.get("sources", [])
        ],
        "citation_verified": result.get(
            "citation_verified", False
        ),
        "citations": result.get("citations", []),
    }

@router.get(
    "/documents/{document_id}/preview"
)
def preview_document(
    document_id: int,
    db: Db,
    user: CurrentUser,
):
    document = db.get(KnowledgeDocument, document_id)

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    require_document_access(user, document)

    file_path = Path(document.file_path).resolve()
    allowed_dir = UPLOAD_DIR.resolve()

    if not file_path.is_relative_to(allowed_dir):
        raise HTTPException(
            status_code=403,
            detail="Invalid document path",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Document file not found",
        )

    return FileResponse(
        path=str(file_path),
        media_type=ALLOWED_TYPES.get(
            f".{document.file_type}",
            "application/octet-stream",
        ),
        headers={
            "Content-Disposition": (
                f"inline; filename*=UTF-8''{quote(document.filename, safe='')}"
            ),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox",
        },
    )

@router.get(
    "/documents/{document_id}/download"
)
def download_document(
    document_id: int,
    db: Db,
    user: CurrentUser,
):
    document = db.get(KnowledgeDocument, document_id)

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # Enforce Admin / Staff visibility permissions.
    require_document_access(user, document)

    file_path = Path(document.file_path).resolve()
    allowed_dir = UPLOAD_DIR.resolve()

    if not file_path.is_relative_to(allowed_dir):
        raise HTTPException(
            status_code=403,
            detail="Invalid document path",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Document file not found",
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/octet-stream",
        filename=document.filename,
        content_disposition_type="attachment",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )

@router.get(
    "/sources/{chunk_id}"
)
def get_knowledge_source(
    chunk_id: int,
    db: Db,
    user: CurrentUser,
):
    chunk = db.get(KnowledgeChunk, chunk_id)

    if chunk is None:
        raise HTTPException(
            status_code=404,
            detail="Source not found",
        )

    document = db.get(
        KnowledgeDocument,
        chunk.document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # Enforce document visibility.
    require_document_access(user, document)

    return {
        "source_id": chunk.id,
        "document_id": document.id,
        "document_title": document.title,
        "filename": document.filename,
        "version": document.version,
        "status": document.status,
        "page_number": chunk.page_number,
        "chunk_index": chunk.chunk_index,
        "content": chunk.content,
        "effective_from": document.effective_from,
        "effective_to": document.effective_to,
    }