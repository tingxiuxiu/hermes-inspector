import datetime
from uuid import uuid4


def generate_png_filename(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}_{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.png"


def generate_jpeg_filename(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}_{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.jpeg"


def generate_xml_filename(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}_{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.xml"


def generate_json_filename(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}_{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.json"
