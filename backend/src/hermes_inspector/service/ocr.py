import httpx
import base64

from ..core import config


from typing import Dict, Any


class OcrService:
    def __init__(self, api_key: str, api_secret: str):
        self._ocr_url = "https://aip.baidubce.com/rest/2.0/ocr/v1/accurate"
        self._client = httpx.Client(timeout=30)
        if config.ocr_access_token == "":
            self.access_token(api_key, api_secret)

    def baidu_recognize(self, image: bytes) -> Dict[str, Any]:
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "image": base64.b64encode(image).decode("utf-8"),
            "probability": "true",
        }
        params = {
            "access_token": config.ocr_access_token,
        }
        response = self._client.post(
            self._ocr_url,
            params=params,
            data=data,
            headers=headers,
        )
        response.raise_for_status()
        return response.json()

    def access_token(self, api_key: str, api_secret: str):
        url = "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={}&client_secret={}".format(
            api_key, api_secret
        )
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        response = self._client.post(
            url,
            headers=headers,
        )
        response.raise_for_status()
        config.ocr_access_token = response.json()["access_token"]
