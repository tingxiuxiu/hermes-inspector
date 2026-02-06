from fastapi import APIRouter
from loguru import logger

from ..core.isystem import IAndroidSystem
from ..core import config
from ..interface.andorid import (
    OperationRequest,
    ScreenModelResponse,
    OperationResult,
    CheckSelectorRequest,
    CheckSelectorResponse,
)

android_router = APIRouter(prefix="/android")


@android_router.get("/screenshot")
def take_screenshot():
    try:
        android = IAndroidSystem(config.driver_profile)
        img_path = android.screenshot()
        return {
            "success": True,
            "code": 200,
            "message": "Take Screenshot Success, save to {}".format(img_path),
            "result": str(img_path.name),
        }
    except Exception as e:
        return {
            "success": False,
            "code": 500,
            "message": "Take Screenshot Failed, {}".format(str(e)),
            "result": None,
        }


@android_router.get("/dump-screen")
def dump_resource() -> ScreenModelResponse:
    try:
        android = IAndroidSystem(config.driver_profile)
        driver = android.connect()
        if driver is None:
            return ScreenModelResponse(
                success=False,
                code=500,
                message="Connect Android Failed, {}".format(android.sn),
                result=None,
            )
        img_path = android.screenshot()
        _, xml_filename, xml_content = android.page_source()
        return ScreenModelResponse(
            success=True,
            code=200,
            message="Dump Screen Success",
            result=OperationResult(
                pageContent=xml_content,
                pageFileName=xml_filename,
                imageFileName=str(img_path.name),
            ),
        )
    except Exception as e:
        logger.exception("Failed to dump resource, {}".format(str(e)))
        return ScreenModelResponse(
            success=False,
            code=500,
            message="Dump Screen Failed, {}".format(str(e)),
            result=None,
        )


@android_router.post("/operation")
def operator_action(data: OperationRequest) -> ScreenModelResponse:
    try:
        android = IAndroidSystem(config.driver_profile)
        driver = android.connect()
        if driver is None:
            return ScreenModelResponse(
                success=False,
                code=500,
                message="Connect Android Failed, {}".format(android.sn),
                result=None,
            )
        if data.method == "tap":
            if data.position is None:
                return ScreenModelResponse(
                    success=False,
                    code=400,
                    message="Position is None",
                    result=None,
                )
            android.tap(data.position)
        elif data.method == "swipe":
            if data.start is None or data.end is None:
                return ScreenModelResponse(
                    success=False,
                    code=400,
                    message="Start or End is None",
                    result=None,
                )
            android.swipe(data.start, data.end)
        elif data.method == "back":
            android.click_back()
        elif data.method == "home":
            android.click_home()
        elif data.method == "recent-apps":
            android.click_recent_apps()
        elif data.method == "reboot":
            android.reboot()
            return ScreenModelResponse(
                success=True,
                code=200,
                message="Reboot Success, Please wait for 10 seconds to boot up",
                result=None,
            )
        else:
            return ScreenModelResponse(
                success=False,
                code=400,
                message=f"Invalid Method {data.method}",
                result=None,
            )
        _, xml_filename, xml_content = android.page_source()
        save_path = android.screenshot()
        return ScreenModelResponse(
            success=True,
            code=200,
            message="Click Success",
            result=OperationResult(
                pageContent=xml_content,
                pageFileName=xml_filename,
                imageFileName=str(save_path.name),
            ),
        )
    except Exception as e:
        return ScreenModelResponse(
            success=False,
            code=500,
            message=f"Execute {data.method} Failed, {e}",
            result=None,
        )


@android_router.post("/check")
def check_selector(data: CheckSelectorRequest) -> CheckSelectorResponse:
    try:
        android = IAndroidSystem(config.driver_profile)
        driver = android.connect()
        if driver is None:
            return CheckSelectorResponse(
                success=False,
                code=500,
                message="Connect Android Failed, {}".format(android.sn),
                result=[],
            )
        result = android.check_selector(data)
        return CheckSelectorResponse(
            success=True,
            code=200,
            message="Check Selector Success",
            result=result,
        )
    except Exception as e:
        return CheckSelectorResponse(
            success=False,
            code=500,
            message=f"Check Selector Failed, {e}",
            result=[],
        )
