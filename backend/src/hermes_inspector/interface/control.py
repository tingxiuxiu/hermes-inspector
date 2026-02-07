from typing import Tuple

from pydantic import BaseModel


class Control(BaseModel):
    sn: str
    method: str
    target_position: Tuple[int, int] | None = None
    start_position: Tuple[int, int] | None = None
    end_position: Tuple[int, int] | None = None
