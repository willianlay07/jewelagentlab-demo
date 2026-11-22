from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException

from app.models.product import ProductImage
from app.services.product_service import get

ROOT = Path("data/product_images")
MAX_SIZE = 5 * 1024 * 1024

FORMATS ={
    "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
    "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
    "image/webp": (b"RIFF", ".webp")
}


async def upload(
    db,
    user,
    pid,
    files
):
    p = get(db, user, pid)

    # Staff cannot upload images to another user's product.
    if user.role != "admin" and p.created_by != user.id:
        raise HTTPException(
            403,
            "You cannot modify another user's product images"
        )

    if user.role != "admin" and p.status not in ("draft","rejected"):
        raise HTTPException(
            409,
            "Cannot change submitted images"
        )

    if not files or len(p.images) + len(files) > 8:
        raise HTTPException(
            422,
            "Maximum 8 images"
        )

    validated = []

    for f in files:
        if f.content_type not in FORMATS:
            raise HTTPException(
                415,
                "Only JPEG PNG WebP"
            )

        raw = await f.read(MAX_SIZE + 1)

        magic, ext = FORMATS[f.content_type]

        if len(raw) > MAX_SIZE:
            raise HTTPException(
                413,
                "Maximum 5 MB per image"
            )

        if not raw.startswith(magic) or (ext == ".webp" and raw[8:12] != b"WEBP"): 
            raise HTTPException(415,"Invalid image bytes")

        validated.append(
            (raw, ext)
        )




    folder = ROOT/str(pid)
    
    folder.mkdir(
        parents=True,
        exist_ok=True
    )

    saved = []

    try:
        for i, (raw, ext) in enumerate(validated):
            path = folder / (uuid4().hex + ext)

            with path.open("xb") as out:
                out.write(raw)

            saved.append(path)

            db.add(
                ProductImage(
                    product_id=pid,
                    image_path=str(path),
                    sort_order=len(p.images) + i
                )
            )

        if p.status=="approved": 

            p.status="pending"
            p.reviewed_by=None
            p.reviewed_at=None
        
        db.commit()

    except Exception:
        db.rollback()
        for path in saved:
            path.unlink(
                missing_ok=True
            )
        raise

    return get(
        db,
        user,
        pid
    )