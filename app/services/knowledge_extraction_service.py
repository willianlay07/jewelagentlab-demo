from pathlib import Path

from docx import Document
from pypdf import PdfReader

def extract_document(
    file_path: str
) -> list[dict]:
    
    path = Path(file_path)
    extension = path.suffix.lower()

    if extension == ".pdf":
        reader = PdfReader(str(path))

        return [
            {
                "page_number": page_number,
                "content": text,
            }
            for page_number, page in enumerate(reader.pages, start=1)
            if (text := page.extract_text().strip())
        ]

    if extension == ".docx":
        document = Document(str(path))

        text = "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        )

        return [{
            "page_number": None,
            "content": text,
        }] if text.strip() else []

    if extension in (".txt", ".md"):
        text = path.read_text(encoding="utf-8")

        return [{
            "page_number": None,
            "content": text,
        }] if text.strip() else []

    raise ValueError(
        f"Unsupported document format: {extension}"
    )