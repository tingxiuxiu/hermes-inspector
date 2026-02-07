from enum import Enum
from pydantic import BaseModel


class CommonResponse(BaseModel):
    success: bool
    code: int
    message: str
    result: str | None = None


class DeviceType(Enum):
    ANDROID = "android"
    HARMONY = "harmony"
    IOS = "ios"


class DriverProfile(BaseModel):
    sn: str
    device_type: DeviceType
