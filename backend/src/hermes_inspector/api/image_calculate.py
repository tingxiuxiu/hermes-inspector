import os
import cv2
import json
from typing import Dict, Any, List

from fastapi import APIRouter, File, UploadFile, Form

from loguru import logger

from ..core import config
from ..utils.tools import generate_png_filename
from ..core.isystem import IAndroidSystem
from ..service.ocr import OcrService
from ..service.image_calculate import ImageCalculateService
from ..interface.image_calculate import (
    CropImageRequest,
    CropImageResponse,
    OcrResponse,
    OcrResult,
    MatchImageResponse,
    MatchImagePoint,
    MatchImageResult,
)

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
    imageFile: UploadFile | None = File(None, description="图片文件"),
    api_key: str = Form(..., description="api_key"),
    secret_key: str = Form(..., description="secret_key"),
) -> OcrResponse:
    try:
        if imageFile is None:
            android = IAndroidSystem(config.driver_profile)
            img_path = android.screenshot()
        else:
            img_path = config.CACHE_DIR / generate_png_filename("ocr_image")
            contents = await imageFile.read()
            with open(img_path, "wb") as f:
                f.write(contents)
        ocr_service = OcrService(api_key, secret_key)
        with open(img_path, "rb") as f:
            image_bytes = f.read()
        result: Dict[str, Any] = ocr_service.baidu_recognize(image_bytes)
        # 根据结果在图片上绘制矩形框, 右上角用圆角方框红色背景,白色字体标记置信度
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_color = (255, 255, 255)
        font_thickness = 1
        im_read = cv2.imread(str(img_path))
        if im_read is None:
            return OcrResponse(
                success=False,
                code=400,
                message="Image read failed",
                result=None,
            )

        # 绘制矩形框和置信度标记
        words_result: List[Dict[str, Any]] = result.get("words_result", [])
        for item in words_result:
            location: Dict[str, int] = item.get("location", {})
            left: int = location.get("left", 0)
            top: int = location.get("top", 0)
            width: int = location.get("width", 0)
            height: int = location.get("height", 0)

            # 绘制矩形框
            cv2.rectangle(
                im_read,
                (left, top),
                (left + width, top + height),
                (0, 255, 0),
                2,
            )

            # 绘制置信度标记
            if "probability" in item:
                probability: Dict[str, float] = item.get("probability", {})
                confidence: float = probability.get("average", 0.0)
                confidence_text: str = f"{confidence:.2f}"

                # 计算文本大小
                (text_width, text_height), _ = cv2.getTextSize(
                    confidence_text, font, font_scale, font_thickness
                )

                # 设置标记位置（右上角）
                padding: int = 5
                rect_width: int = text_width + 2 * padding
                rect_height: int = text_height + 2 * padding
                rect_x: int = left + width - rect_width
                rect_y: int = top

                # 确保标记在图片范围内
                if rect_x < 0:
                    rect_x = left
                if rect_y < 0:
                    rect_y = top + height - rect_height

                # 绘制红色圆角背景
                cv2.rectangle(
                    im_read,
                    (rect_x, rect_y),
                    (rect_x + rect_width, rect_y + rect_height),
                    (0, 0, 255),
                    -1,
                )

                # 绘制白色文本
                text_x: int = rect_x + padding
                text_y: int = rect_y + text_height + padding
                cv2.putText(
                    im_read,
                    confidence_text,
                    (text_x, text_y),
                    font,
                    font_scale,
                    font_color,
                    font_thickness,
                    cv2.LINE_AA,
                )

        # 保存带有标记的图片
        marked_image_path = config.CACHE_DIR / generate_png_filename("ocr_marked")
        cv2.imwrite(str(marked_image_path), im_read)
        # 更新结果，添加标记图片路径
        result["imageFileName"] = marked_image_path.name
        return OcrResponse(
            success=True, code=200, message="OCR Success", result=OcrResult(**result)
        )
    except Exception as e:
        logger.exception(f"OCR Failed, {e}")
        return OcrResponse(
            success=False,
            code=400,
            message=f"OCR Failed, {e}",
            result=None,
        )


@image_handler_router.post("/match")
async def image_match(
    targetImage: UploadFile | None = File(None, description="目标图片文件"),
    resourceImage: UploadFile | None = File(None, description="资源图片文件"),
) -> MatchImageResponse:
    if not targetImage:
        return MatchImageResponse(
            success=False,
            code=400,
            message="Target image is None",
            result=None,
        )
    template_path = config.CACHE_DIR / generate_png_filename("template")
    with open(template_path, "wb") as f:
        f.write(await targetImage.read())
    if resourceImage is None:
        android = IAndroidSystem(config.driver_profile)
        source_path = android.screenshot()
    else:
        source_path = config.CACHE_DIR / generate_png_filename("source_path")
        with open(source_path, "wb") as f:
            f.write(await resourceImage.read())
    image_calculate_service = ImageCalculateService()
    results = image_calculate_service.match(str(source_path), str(template_path))
    logger.info(f"Match results: {results}")
    # 根据结果在图片上绘制红色方框,右上角用圆角方框红色背景白色字体标记置信度
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.5
    font_color = (255, 255, 255)
    font_thickness = 1
    im_read = cv2.imread(str(source_path))
    if im_read is not None:
        # 绘制矩形框和置信度标记
        for item in results:
            x: int = item.get("x", 0)
            y: int = item.get("y", 0)
            w: int = item.get("w", 0)
            h: int = item.get("h", 0)
            confidence: float = item.get("confidence", 0.0)

            # 绘制红色矩形框
            cv2.rectangle(
                im_read,
                (x, y),
                (x + w, y + h),
                (0, 0, 255),  # 红色
                2,
            )

            # 绘制置信度标记
            confidence_text: str = f"{confidence:.2f}"

            # 计算文本大小
            (text_width, text_height), _ = cv2.getTextSize(
                confidence_text, font, font_scale, font_thickness
            )

            # 设置标记位置（右上角）
            padding: int = 5
            rect_width: int = text_width + 2 * padding
            rect_height: int = text_height + 2 * padding
            rect_x: int = x + w - rect_width
            rect_y: int = y

            # 确保标记在图片范围内
            if rect_x < 0:
                rect_x = x
            if rect_y < 0:
                rect_y = y + h - rect_height

            # 绘制红色圆角背景
            cv2.rectangle(
                im_read,
                (rect_x, rect_y),
                (rect_x + rect_width, rect_y + rect_height),
                (0, 0, 255),  # 红色
                -1,
            )

            # 绘制白色文本
            text_x: int = rect_x + padding
            text_y: int = rect_y + text_height + padding
            cv2.putText(
                im_read,
                confidence_text,
                (text_x, text_y),
                font,
                font_scale,
                font_color,
                font_thickness,
                cv2.LINE_AA,
            )

        # 保存带有标记的图片
        marked_image_path = config.CACHE_DIR / generate_png_filename("marked_match")
        cv2.imwrite(str(marked_image_path), im_read)
        # 使用标记后的图片路径
        source_path = marked_image_path

    return MatchImageResponse(
        success=True,
        code=200,
        message="Match Success",
        result=MatchImageResult(
            imageFileName=source_path.name,
            points=[MatchImagePoint(**item) for item in results],
        ),
    )
