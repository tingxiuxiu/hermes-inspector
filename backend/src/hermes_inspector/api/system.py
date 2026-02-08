import cv2
from pathlib import Path

from asyncio import to_thread
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import FileResponse, Response
from loguru import logger
from hermes.models.component import Size

from ..core import config
from ..interface.system import (
    ConnectRequest,
    PageResourceResponse,
    ComponentResource,
)
from ..interface.common import DeviceType, DriverProfile
from ..core.isystem import IAndroidSystem, config
from ..utils.tools import (
    generate_png_filename,
    generate_jpeg_filename,
    generate_xml_filename,
    generate_json_filename,
)

system_router = APIRouter(prefix="/system")


def save_file(save_path: Path, contents: bytes):
    with open(save_path, "wb") as f:
        f.write(contents)


@system_router.post("/upload-parse-files")
async def upload_file(
    jsonXmlFile: UploadFile = File(...), imageFile: UploadFile = File(...)
) -> PageResourceResponse:
    if jsonXmlFile.filename and imageFile.filename:
        try:
            # 保存JSON/XML文件
            if jsonXmlFile.filename.endswith(".json"):
                page_filename = generate_json_filename(
                    jsonXmlFile.filename.split(".")[0]
                )
            else:
                page_filename = generate_xml_filename(
                    jsonXmlFile.filename.split(".")[0]
                )
            page_path = config.CACHE_DIR / page_filename
            if imageFile.filename.endswith(".png"):
                image_filename = generate_png_filename(imageFile.filename.split(".")[0])
            else:
                image_filename = generate_jpeg_filename(
                    imageFile.filename.split(".")[0]
                )
            image_path = config.CACHE_DIR / image_filename
            page_contents = await jsonXmlFile.read()
            image_contents = await imageFile.read()
            await to_thread(save_file, page_path, page_contents)
            await to_thread(save_file, image_path, image_contents)
            im_read = cv2.imread(str(image_path))
            height, width, _ = im_read.shape  # type: ignore
            size = Size(width=width, height=height)
            return PageResourceResponse(
                success=True,
                code=200,
                message="File saved successfully",
                result=ComponentResource(
                    pageContent=page_contents.decode("utf-8"),
                    pageFilename=page_path.name,
                    imageFilename=image_path.name,
                    size=size,
                ),
            )
        except Exception as e:
            return PageResourceResponse(
                success=False,
                code=500,
                message=f"File saved failed: {e}",
                result=None,
            )
    else:
        return PageResourceResponse(
            success=False,
            code=400,
            message=f"File {jsonXmlFile.filename or imageFile.filename} is empty",
            result=None,
        )


@system_router.post("/connect")
def connect_device(data: ConnectRequest) -> PageResourceResponse:
    try:
        if data.deviceType == DeviceType.ANDROID.value:
            config.driver_profile = DriverProfile(
                sn=data.serial,
                device_type=DeviceType.ANDROID,
            )
            android = IAndroidSystem(driver_profile=config.driver_profile)
            if config.sn != data.serial:
                config.sn = data.serial
                android.refresh_driver_profile(config.driver_profile)
            if android.connect():
                _, xml_file_name, xml_content = android.page_source()
                size = android.get_window_size()
                img_path = android.screenshot()
            else:
                return PageResourceResponse(
                    success=False,
                    code=400,
                    message="connect failed",
                    result=None,
                )
        else:
            return PageResourceResponse(
                success=False,
                code=400,
                message=f"Not support device type {data.deviceType}",
                result=None,
            )
        return PageResourceResponse(
            success=True,
            code=200,
            message="success",
            result=ComponentResource(
                pageContent=xml_content,
                pageFilename=xml_file_name,
                imageFilename=img_path.name,
                size=size,
            ),
        )
    except Exception as e:
        logger.exception(f"connect failed: {e}")
        return PageResourceResponse(
            success=False,
            code=500,
            message=f"connect failed: {e}",
            result=None,
        )


@system_router.post("/disconnect")
def disconnect_device(data: ConnectRequest) -> PageResourceResponse:
    try:
        if data.deviceType == DeviceType.ANDROID.value:
            config.driver_profile = DriverProfile(
                sn=data.serial,
                device_type=DeviceType.ANDROID,
            )
            android = IAndroidSystem(driver_profile=config.driver_profile)
            if config.sn != data.serial:
                config.sn = data.serial
                android.refresh_driver_profile(config.driver_profile)
            if android.disconnect():
                return PageResourceResponse(
                    success=True,
                    code=200,
                    message="success",
                    result=None,
                )
            else:
                return PageResourceResponse(
                    success=False,
                    code=400,
                    message="disconnect failed",
                    result=None,
                )
        else:
            return PageResourceResponse(
                success=False,
                code=400,
                message=f"Not support device type {data.deviceType}",
                result=None,
            )
    except Exception as e:
        logger.exception(f"disconnect failed: {e}")
        return PageResourceResponse(
            success=False,
            code=500,
            message=f"disconnect failed: {e}",
            result=None,
        )


@system_router.get("/resource/")
def get_screenshot_file(image: str):
    if image == "wait-data.png":
        asset_file = config.STATIC_DIR / image
    else:
        asset_file = config.CACHE_DIR / image

    if asset_file.is_file() and asset_file.exists():
        return FileResponse(asset_file, media_type="image")
    else:
        return Response(
            content=f"{image} not found!",
            status_code=410,
        )


@system_router.get("/version")
def get_version():
    return {
        "success": True,
        "code": 200,
        "message": "success",
        "result": {
            "version": config.VERSION,
        },
    }
