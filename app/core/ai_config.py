from pydantic_settings import BaseSettings, SettingsConfigDict

class AISettings(BaseSettings):
    openai_api_key: str
    small_model: str = "gpt-4o-mini"
    strong_model: str = "gpt-6.1-terra"
    embedding_model: str = "text-embedding-3-small"

    # Local ChromaDB
    chroma_path: str = "data/chroma"

    # Docker ChromaDB Server
    chroma_mode: str = "persistent"
    chroma_host: str = "chroma"
    chroma_port: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


ai_settings = AISettings()
