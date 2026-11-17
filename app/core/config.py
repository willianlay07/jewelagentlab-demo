from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    admin_email: str
    admin_password: str
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )
    openai_api_key: str
    vision_model: str

settings = Settings()

if len(settings.jwt_secret) < 32:
    raise RuntimeError("JWT secret must be at least 32 characters")