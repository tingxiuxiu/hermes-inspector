from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings

from ..interface.common import DriverProfile, DeviceType


class Config(BaseSettings):
    VERSION: str = "0.0.1"
    BASE_DIR: Path = Path(__file__).parent.parent
    STATIC_DIR: Path = BASE_DIR / "static"
    CACHE_DIR: Path = Path().home() / "ta-inspector"

    @field_validator("CACHE_DIR", mode="after")
    def check_cache_dir(cls, v: Path) -> Path:
        v.mkdir(exist_ok=True)
        return v

    LOG_DIR: Path = CACHE_DIR / "log"

    @field_validator("LOG_DIR", mode="after")
    def check_log_dir(cls, v: Path) -> Path:
        v.mkdir(exist_ok=True)
        return v

    LOG_LEVEL: str = "DEBUG"

    open_browser: bool = True
    port: int = 13710
    pid: int = -1
    sn: str = ""
    driver_profile: DriverProfile = DriverProfile(
        sn="",
        device_type=DeviceType.ANDROID,
    )
