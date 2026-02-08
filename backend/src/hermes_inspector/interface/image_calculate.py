from typing import Sequence

from pydantic import BaseModel
from hermes.models.component import Bounds
from .common import CommonResponse


class CropImageRequest(BaseModel):
    imageFilename: str
    bounds: Bounds | None = None


class CropImageResponse(CommonResponse):
    result: str | None = None


class OcrRequest(BaseModel):
    imageFilename: str | None = None
    bounds: Bounds | None = None


class MatchImageRequest(BaseModel):
    targetImageFilename: str
    templateImageFilename: str


class MatchImagePoint(BaseModel):
    x: int | None = None
    y: int | None = None
    w: int | None = None
    h: int | None = None
    confidence: float | None = None


class MatchImageResult(BaseModel):
    imageFilename: str
    points: Sequence[MatchImagePoint] = []


class MatchImageResponse(BaseModel):
    success: bool
    code: int
    message: str
    result: MatchImageResult | None = None


class OcrLocation(BaseModel):
    top: int | None = None
    left: int | None = None
    width: int | None = None
    height: int | None = None


class ProbabilityItems(BaseModel):
    average: float
    min: float
    variance: float


class WordItem(BaseModel):
    probability: ProbabilityItems
    words: str
    location: OcrLocation | None = None


class OcrResult(BaseModel):
    imageFilename: str
    words_result: Sequence[WordItem] = []


class OcrResponse(BaseModel):
    success: bool
    code: int
    message: str
    result: OcrResult | None = None
