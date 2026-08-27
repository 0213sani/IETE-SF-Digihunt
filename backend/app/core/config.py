from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str
    jwt_secret: str
    upload_directory: str = "../uploads"
    ppt_directory: str = "../ppts"
    cors_origins: list[str] = ["http://localhost:3000"]
    access_token_expire_minutes: int = 480


settings = Settings()
