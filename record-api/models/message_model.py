from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Message:
    sender_id: int
    message: str
    id: Optional[int] = None
    receiver_id: Optional[int] = None
