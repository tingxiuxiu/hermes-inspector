from pydantic import BaseModel

from hermes.models.component import Size


class ConnectRequest(BaseModel):
    deviceType: str
    serial: str
    baiduOCRKey: str | None = None
    aliOCRKey: str | None = None
    tencentOCRKey: str | None = None


class ResponseModel(BaseModel):
    success: bool
    code: int
    message: str


class ComponentResource(BaseModel):
    pageContent: str
    pageFilename: str
    imageFilename: str
    size: Size


class PageResourceResponse(ResponseModel):
    result: ComponentResource | None = None
