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

    # MySQL 데이터베이스 설정
    DB_HOST: str = "mysql"
    DB_PORT: int = 3306
    DB_NAME: str = "mes_db"
    DB_USER: str = "mes_user"
    DB_PASSWORD: str = "mes_password"

    # InfluxDB 설정 (센서 데이터)
    INFLUXDB_URL: str = "http://influxdb:8086"
    INFLUXDB_TOKEN: str = ""
    INFLUXDB_ORG: str = "imjingang"
    INFLUXDB_BUCKET: str = "mes_sensors"

    # Redis 설정 (캐싱)
    REDIS_URL: str = "redis://redis:6379"

    @property
    def DATABASE_URL(self) -> str:
        """SQLAlchemy 데이터베이스 연결 URL을 반환합니다."""
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
