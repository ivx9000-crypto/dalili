from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Dalili API"
    app_env: str = "development"
    database_url: str = "sqlite:///./dalili_dev.db"
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005"
    auto_create_tables: bool = True
    upload_storage_dir: str = "app/storage/uploads"
    max_upload_mb: int = 50
    public_base_url: str = "http://127.0.0.1:8000"
    frontend_base_url: str = "http://localhost:3000"
    password_reset_mode: str = "local_dev_token"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_engine_name(self) -> str:
        if self.database_url.startswith("sqlite"):
            return "sqlite"
        if self.database_url.startswith("postgresql"):
            return "postgresql"
        return "external"

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
