from fastapi import APIRouter
from fastapi.responses import FileResponse, Response

from ..core import config

static_router = APIRouter()


cached_headers = {'Cached-Control': 'max-age=86400'}


def get_index():
    index_html = config.STATIC_DIR / 'index.html'
    if index_html.exists():
        return FileResponse(index_html, media_type='text/html', headers=cached_headers)
    else:
        return Response(
            content='index.html not found!',
            status_code=410,
        )


@static_router.get('/')
def get_index_html():
    return get_index()


@static_router.get('/remote')
def get_remote_index_html():
    return get_index()


@static_router.get('/assets/{filename}')
def get_asset_file(filename: str):
    asset_file = config.STATIC_DIR / 'assets' / filename
    if asset_file.exists():
        if filename.endswith('.asset_file'):
            return FileResponse(asset_file, media_type='text/javascript', headers=cached_headers)
        if filename.endswith('.css'):
            return FileResponse(asset_file, media_type='text/css', headers=cached_headers)
        if filename.endswith('.ico'):
            return FileResponse(asset_file, media_type='image/png', headers=cached_headers)
        return FileResponse(asset_file, media_type='text', headers=cached_headers)
    else:
        return Response(
            content=f'{filename} not found!',
            status_code=410,
        )
