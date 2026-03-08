import threading

from pathlib import Path
import cv2

from loguru import logger
from hermes import new_device
from hermes.models.device import AndroidDeviceModel
from hermes.models.component import Point, Size
from hermes.models.selector import Selector
from hermes.protocol.device_protocol import DeviceProtocol

from ..interface.common import DeviceType, DriverProfile
from ..core import config
from ..utils.tools import generate_png_filename, generate_xml_filename
from ..interface.andorid import CheckSelectorRequest, CheckSelectorResultModel


from typing import Dict, TypeVar, Any

T = TypeVar("T")


class SingletonMeta(type):
    """单例元类"""

    _instances: Dict[Any, Any] = {}
    _lock: threading.Lock = threading.Lock()

    def __call__(cls: Any, *args: Any, **kwargs: Any) -> Any:
        """类实例化时执行该方法"""
        with SingletonMeta._lock:
            if cls not in SingletonMeta._instances:
                # 创建类的实例（调用类的__new__和__init__）
                SingletonMeta._instances[cls] = super().__call__(*args, **kwargs)
        return SingletonMeta._instances[cls]


class IAndroidSystem(metaclass=SingletonMeta):
    # 线程安全的单例
    _lock = threading.Lock()
    _instance = None

    def __init__(self, driver_profile: DriverProfile):
        self.device_type: DeviceType = driver_profile.device_type
        self.sn: str = driver_profile.sn
        config.sn = self.sn
        self._device: DeviceProtocol | None = None
        logger.info(f"Create AndroidSystem instance, sn: {self.sn}")

    def refresh_driver_profile(self, driver_profile: DriverProfile):
        self.device_type = driver_profile.device_type
        self.sn = driver_profile.sn
        config.sn = self.sn

    def check_connection(self) -> bool:
        if self._device:
            try:
                return self._device.ping()
            except Exception as e:
                logger.error(f"Failed to ping device, {e}")
        self._device = None
        return False

    def connect(self) -> DeviceProtocol | None:
        if self.check_connection():
            return self._device
        if self._device is None:
            self._device = new_device(AndroidDeviceModel(serial=self.sn))
            try:
                self._device.connect()
            except Exception as e:
                logger.error(f"Failed to connect device, {e}")
                self._device = None
        return self._device

    def disconnect(self) -> bool:
        if self._device:
            try:
                self._device.disconnect()
                self._device = None
                return True
            except Exception as e:
                logger.error(f"Failed to close device, {e}")
        return False

    @property
    def device(self) -> DeviceProtocol | None:
        return self._device

    def get_window_size(self) -> Size:
        if self._device is None:
            logger.error("Device is not connected")
            raise RuntimeError("Device is not connected")
        return self._device.driver.get_window_size()

    def screenshot(self) -> Path:
        save_path = config.CACHE_DIR / generate_png_filename("screenshot")
        if self._device is None:
            logger.error("Device is not connected")
            raise RuntimeError("Device is not connected")
        self._device.driver.screenshot(save_path)
        return save_path

    def page_source(self, display_id: int = 0) -> tuple[Path, str, str]:
        if self._device is None:
            logger.error("Device is not connected")
            raise RuntimeError("Device is not connected")
        filename = generate_xml_filename("page_source")
        save_path = config.CACHE_DIR / filename
        content = self._device.driver.get_xml_tree(display_id)
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(content)
        return save_path, filename, content

    def tap(self, position: Point) -> bool:
        if self._device is None:
            logger.error("Device is not connected")
            return False
        self._device.adb.tap(position.x, position.y)
        return True

    def swipe(self, start: Point, end: Point, duration: int = 500) -> bool:
        if self._device is None:
            logger.error("Device is not connected")
            return False
        self._device.adb.swipe(start=start, end=end, duration=duration)
        return True

    def click_back(self) -> bool:
        if self._device is None:
            logger.error("Device is not connected")
            return False
        self._device.adb.click_back()
        return True

    def click_home(self) -> bool:
        if self._device is None:
            logger.error("Device is not connected")
            return False
        self._device.adb.click_home()
        return True

    def click_menu(self) -> bool:
        if self._device is None:
            logger.error("Device is not connected")
            return False
        self._device.adb.click_menu()
        return True

    def click_power(self) -> bool:
        if self._device is None:
            logger.error("Device is not connected")
            return False
        self._device.adb.click_power()
        return True

    def click_recent_apps(self) -> bool:
        if self._device is None:
            logger.error("Device is not connected")
            return False
        self._device.adb.click_recent_task()
        return True

    def reboot(self) -> bool:
        if self._device is None:
            logger.error("Device is not connected")
            return False
        self._device.adb.reboot()
        return True

    def check_selector(
        self, selector: CheckSelectorRequest
    ) -> list[CheckSelectorResultModel]:
        if self._device is None:
            logger.error("Device is not connected")
            raise RuntimeError("Device is not connected")
        results: list[CheckSelectorResultModel] = []
        filepath = self.screenshot()
        results = []
        if selector.resource_id:
            try:
                element = self._device.driver.locator(
                    Selector(
                        id=selector.resource_id,
                    )
                )
                if element is not None:
                    bounds = element.bounds()
                    check_filename = generate_png_filename("check_selector_resource_id")
                    img = cv2.imread(str(filepath))
                    # 绘制红色方框
                    if img is not None:
                        cv2.rectangle(
                            img,
                            (bounds.left, bounds.top),
                            (bounds.right, bounds.bottom),
                            (0, 0, 255),
                            5,
                        )
                        cv2.imwrite(str(config.CACHE_DIR / check_filename), img)
                    results.append(
                        CheckSelectorResultModel(
                            title="resource_id",
                            description=selector.resource_id,
                            screenshot=check_filename,
                        )
                    )
            except:
                results.append(
                    CheckSelectorResultModel(
                        title="resource_id",
                        description=selector.resource_id,
                        screenshot=None,
                    )
                )

        if selector.text:
            try:
                element = self._device.driver.locator(
                    Selector(
                        text=selector.text,
                    )
                )
                if element is not None:
                    bounds = element.bounds()
                    check_filename = generate_png_filename("check_selector_text")
                    img = cv2.imread(str(filepath))
                    # 绘制红色方框
                    if img is not None:
                        cv2.rectangle(
                            img,
                            (bounds.left, bounds.top),
                            (bounds.right, bounds.bottom),
                            (0, 0, 255),
                            5,
                        )
                        cv2.imwrite(str(config.CACHE_DIR / check_filename), img)
                        results.append(
                            CheckSelectorResultModel(
                                title="text",
                                description=selector.text,
                                screenshot=check_filename,
                            )
                        )
            except:
                results.append(
                    CheckSelectorResultModel(
                        title="text",
                        description=selector.text,
                        screenshot=None,
                    )
                )
        if selector.content_desc:
            try:
                element = self._device.driver.locator(
                    Selector(
                        description=selector.content_desc,
                    )
                )
                if element is not None:
                    bounds = element.bounds()
                    check_filename = generate_png_filename(
                        "check_selector_content_desc"
                    )
                    img = cv2.imread(str(filepath))
                    # 绘制红色方框
                    if img is not None:
                        cv2.rectangle(
                            img,
                            (bounds.left, bounds.top),
                            (bounds.right, bounds.bottom),
                            (0, 0, 255),
                            5,
                        )
                        cv2.imwrite(str(config.CACHE_DIR / check_filename), img)
                        results.append(
                            CheckSelectorResultModel(
                                title="content_desc",
                                description=selector.content_desc,
                                screenshot=check_filename,
                            )
                        )
            except:
                results.append(
                    CheckSelectorResultModel(
                        title="content_desc",
                        description=selector.content_desc,
                        screenshot=None,
                    )
                )
        if selector.xpath:
            try:
                element = self._device.driver.locator(
                    Selector(
                        xpath=selector.xpath,
                    )
                )
                if element is not None:
                    bounds = element.bounds()
                    check_filename = generate_png_filename("check_selector_xpath")
                    img = cv2.imread(str(filepath))
                    # 绘制红色方框
                    if img is not None:
                        cv2.rectangle(
                            img,
                            (bounds.left, bounds.top),
                            (bounds.right, bounds.bottom),
                            (0, 0, 255),
                            5,
                        )
                        cv2.imwrite(str(config.CACHE_DIR / check_filename), img)
                        results.append(
                            CheckSelectorResultModel(
                                title="xpath",
                                description=selector.xpath,
                                screenshot=check_filename,
                            )
                        )
            except:
                results.append(
                    CheckSelectorResultModel(
                        title="xpath",
                        description=selector.xpath,
                        screenshot=None,
                    )
                )

        if selector.class_name:
            try:
                element = self._device.driver.locator(
                    Selector(
                        class_name=selector.class_name,
                    )
                )
                if element is not None:
                    bounds = element.bounds()
                    check_filename = generate_png_filename("check_selector_class_name")
                    img = cv2.imread(str(filepath))
                    # 绘制红色方框
                    if img is not None:
                        cv2.rectangle(
                            img,
                            (bounds.left, bounds.top),
                            (bounds.right, bounds.bottom),
                            (0, 0, 255),
                            5,
                        )
                        cv2.imwrite(str(config.CACHE_DIR / check_filename), img)
                        results.append(
                            CheckSelectorResultModel(
                                title="class_name",
                                description=selector.class_name,
                                screenshot=check_filename,
                            )
                        )
            except:
                results.append(
                    CheckSelectorResultModel(
                        title="class_name",
                        description=selector.class_name,
                        screenshot=None,
                    )
                )

        return results
