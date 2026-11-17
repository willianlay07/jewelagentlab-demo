from openai import OpenAI

from app.core.ai_config import ai_settings

def embed(
    texts: list[str]
) -> list[list[float]]:

    if not ai_settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for embeddings")

    client = OpenAI(
        api_key=ai_settings.openai_api_key,
        timeout=30,
        max_retries=1
    )

    result = client.embeddings.create(
        model=ai_settings.embedding_model,
        input=texts
    )

    return [
        item.embedding 
        for item in sorted(
            result.data, 
            key=lambda x:x.index
        )
    ]