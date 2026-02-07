import os
import cv2

from fastapi import APIRouter, File, UploadFile, Form

from loguru import logger
from hermes.models.component import Bounds

from ..core import config
from ..utils.tools import generate_png_filename
from ..core.isystem import IAndroidSystem
from ..interface.image_calculate import CropImageRequest, CropImageResponse, OcrResponse

image_handler_router = APIRouter(prefix="/calculate")


@image_handler_router.post("/crop-image")
def crop_image(data: CropImageRequest) -> CropImageResponse:
    try:
        img_path = config.CACHE_DIR / data.imageFileName
        if os.path.exists(img_path) and data.bounds:
            save_path = config.CACHE_DIR / generate_png_filename("crop_image")
            im_read = cv2.imread(str(img_path))
            if im_read is None:
                return CropImageResponse(
                    success=False,
                    code=400,
                    message="Image read failed",
                    result=None,
                )
            cropped = im_read[
                data.bounds.top : data.bounds.bottom,
                data.bounds.left : data.bounds.right,
            ]
            cv2.imwrite(str(save_path), cropped)
            return CropImageResponse(
                success=True,
                code=200,
                message="Crop Image Success, save to {}".format(save_path),
                result=str(save_path.name),
            )
        else:
            return CropImageResponse(
                success=False,
                code=400,
                message="Image not exists or bounds not exists",
                result=None,
            )
    except Exception as e:
        logger.exception(f"Crop Image Failed, {e}")
        return CropImageResponse(
            success=False,
            code=500,
            message="Crop Image Failed, {}".format(str(e)),
            result=None,
        )


@image_handler_router.post("/ocr")
async def image_ocr(
    image: UploadFile | None = File(None, description="图片文件"),
    bounds: Bounds | None = Form(None),
) -> OcrResponse:
    try:
        if image is None:
            android = IAndroidSystem(config.driver_profile)
            img_path = android.screenshot()
        else:
            img_path = config.CACHE_DIR / generate_png_filename("ocr_image")
            contents = await image.read()
            with open(img_path, "wb") as f:
                f.write(contents)
        if bounds:
            im_read = cv2.imread(str(img_path))
            if im_read is None:
                return OcrResponse(
                    success=False,
                    code=400,
                    message="Image read failed",
                    result=None,
                )
            cropped = im_read[
                bounds.top : bounds.bottom,
                bounds.left : bounds.right,
            ]
            cv2.imwrite(str(img_path), cropped)
        return OcrResponse(
            success=True,
            code=200,
            message="OCR Success",
            result=str(img_path.name),
        )
    except Exception as e:
        logger.exception(f"OCR Failed, {e}")
        return OcrResponse(
            success=False,
            code=400,
            message=f"OCR Failed, {e}",
            result=None,
        )
