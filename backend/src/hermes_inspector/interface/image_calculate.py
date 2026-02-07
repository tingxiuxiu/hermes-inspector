from pydantic import BaseModel
from hermes.models.component import Bounds
from .common import CommonResponse


class CropImageRequest(BaseModel):
    imageFileName: str
    bounds: Bounds | None = None


class CropImageResponse(CommonResponse):
    result: str | None = None


class OcrRequest(BaseModel):
    imageFileName: str | None = None
    bounds: Bounds | None = None


class OcrResponse(CommonResponse):
    result: str | None = None
