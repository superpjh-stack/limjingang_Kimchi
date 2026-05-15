"""환경변수 설정 모듈 (pydantic-settings 기반)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 설정 클래스.

    .env 파일 또는 환경변수에서 값을 읽습니다.
    """

    # 프로젝트 기본 설정
    PROJECT_NAME: str = "임진강김치 MES"

    # JWT 인증 설정
    SECRET_KEY: str = "changeme-in-production-use-strong-random-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8시간 (현장 근무 기준)

    # PostgreSQL 데이터베이스 설정
    DB_HOST: str = "host.docker.internal"
    DB_PORT: int = 5432
    DB_NAME: str = "mes_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "9256025a"

    # InfluxDB 설정 (센서 데이터)
    INFLUXDB_URL: str = "http://influxdb:8086"
    INFLUXDB_TOKEN: str = ""
    INFLUXDB_ORG: str = "imjingang"
    INFLUXDB_BUCKET: str = "mes_sensors"

    # Redis 설정 (캐싱)
    REDIS_URL: str = "redis://redis:6379"

    # 개발/운영 환경 설정
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    @property
    def DATABASE_URL(self) -> str:
        """SQLAlchemy 데이터베이스 연결 URL을 반환합니다."""
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
