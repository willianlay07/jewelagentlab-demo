def chunk_document(
    pages: list[dict],
    chunk_size: int = 1000,
    overlap: int = 150,
) -> list[dict]:

    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("Invalid chunk overlap")

    chunks = []
    chunk_index = 0

    for page in pages:
        text = page["content"].strip()
        page_number = page.get("page_number")

        start = 0

        while start < len(text):
            end = min(start + chunk_size, len(text))

            # Prefer splitting at a word boundary.
            if end < len(text):
                space = text.rfind(" ", start, end)

                if space > start:
                    end = space

            content = text[start:end].strip()

            if content:
                chunks.append({
                    "chunk_index": chunk_index,
                    "page_number": page_number,
                    "content": content,
                })

                chunk_index += 1

            if end >= len(text):
                break

            start = max(start + 1, end - overlap)

    return chunks