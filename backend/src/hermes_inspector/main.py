import os
import sys
import time
import argparse
import socket
import webbrowser
import datetime

from contextlib import asynccontextmanager

import uvicorn
import psutil

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from .core import config
from .api.android import android_router
from .api.harmony import harmony_router
from .api.image_calculate import image_handler_router
from .api.static import static_router
from .api.system import system_router


l_config = {
    "handlers": [
        {
            "sink": sys.stdout,
            "level": config.LOG_LEVEL,
        },
        {
            "sink": config.LOG_DIR
            / f"{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}-inspector.log",
            "format": "{time} | version %s | {level} | {message}" % config.VERSION,
            "level": "INFO",
            "enqueue": True,
            "rotation": "5 MB",
            "encoding": "utf-8",
        },
    ]
}
logger.configure(**l_config)  # type: ignore


@asynccontextmanager
async def clean_env(web_app: FastAPI):
    for item in os.listdir(config.CACHE_DIR):
        _f = config.CACHE_DIR / item
        if _f.is_file():
            # 移除昨天的文件
            if _f.stat().st_mtime < time.time() - 24 * 60 * 60:
                os.remove(_f)
                logger.info(f"Remove cache file {_f}")
    # threading.Thread(target=open_browser, daemon=True).start()
    yield


def open_browser():
    if config.open_browser:
        for _ in range(30):
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                s.connect(("127.0.0.1", config.port))
                s.shutdown(2)
                webbrowser.open(f"http://127.0.0.1:{config.port}")
                return
            except Exception as e:
                logger.warning(f"Waiting for app start up: {e}")
            time.sleep(1)
        logger.error(f"Waiting for app start up timeout!")


def kill_app():
    try:
        if config.pid != -1:
            read_process = psutil.Process(config.pid)
            for item in read_process.cmdline():
                if "ta_editor" in item:
                    read_process.kill()
                    break
    except psutil.NoSuchProcess:
        logger.warning(f"Can not find PID {config.pid}")


app = FastAPI(
    lifespan=clean_env,
    openapi_url=f"/api/v1/openapi.json",
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境中应该限制特定域名
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有 HTTP 头
)

api_router_v1 = APIRouter()
api_router_v1.include_router(system_router)
api_router_v1.include_router(android_router)
api_router_v1.include_router(harmony_router)
api_router_v1.include_router(image_handler_router)

api_static_router = APIRouter()
api_static_router.include_router(static_router)

app.include_router(api_router_v1, prefix="/api/v1")
app.include_router(api_static_router)


def main():
    ap = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    ap.add_argument("-v", "--version", action="store_true", help="show version")
    ap.add_argument(
        "-q", "--quiet", action="store_true", help="quite mode, no open new browser"
    )
    ap.add_argument(
        "-p",
        "--port",
        type=int,
        default=13710,
        help="local listen port for inspector server",
    )
    ap.add_argument(
        "-f", "--force-quit", action="store_true", help="force quit before start"
    )
    ap.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="server host for inspector server",
    )
    args = ap.parse_args()
    config.port = args.port
    if args.version:
        return config.VERSION
    if args.quiet:
        config.open_browser = False
    if args.force_quit:
        kill_app()
    config.pid = os.getpid()
    uvicorn.run(app, workers=1, host=args.host, port=args.port)
