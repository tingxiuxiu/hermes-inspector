from pydantic import BaseModel
from hermes.models.component import Point


class ScreenshotRequest(BaseModel):
    serial: str
    url: str
    filename: str


class OperationRequest(BaseModel):
    method: str
    position: Point | None = None
    start: Point | None = None
    end: Point | None = None


class OperationResult(BaseModel):
    pageContent: str
    pageFilename: str
    imageFilename: str


class ScreenModelResponse(BaseModel):
    success: bool
    code: int
    message: str
    result: OperationResult | None = None


class CheckSelectorRequest(BaseModel):
    resource_id: str | None = None
    text: str | None = None
    content_desc: str | None = None
    class_name: str | None = None
    xpath: str | None = None


class CheckSelectorResultModel(BaseModel):
    title: str | None = None
    description: str | None = None
    screenshot: str | None = None


class CheckSelectorResponse(BaseModel):
    success: bool
    code: int
    message: str
    result: list[CheckSelectorResultModel]
