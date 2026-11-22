import re


CITATION_PATTERN = re.compile(r"\[Source\s+(\d+)\]")


def verify_citations(answer: str, sources: list[dict]) -> dict:
    valid_numbers = set(range(1, len(sources) + 1))

    cited_numbers = {
        int(number)
        for number in CITATION_PATTERN.findall(answer)
    }

    invalid_numbers = cited_numbers - valid_numbers

    cleaned_answer = CITATION_PATTERN.sub(
        lambda match: (
            match.group(0)
            if int(match.group(1)) in valid_numbers
            else ""
        ),
        answer,
    )

    valid_citations = []

    for number in sorted(cited_numbers & valid_numbers):
        source = sources[number - 1]

        valid_citations.append({
            "source_number": number,
            "document_id": source["document_id"],
            "chunk_id": source["chunk_id"],
            "document_title": source["document_title"],
            "version": source["version"],
            "page_number": source["page_number"],
        })

    return {
        "answer": cleaned_answer.strip(),
        "citations": valid_citations,
        "invalid_citations": sorted(invalid_numbers),
    }