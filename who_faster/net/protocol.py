"""
Определение формата сообщений между клиентом и сервером.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional


class MessageType(str, Enum):
    JOIN = "join"
    START = "start"
    WORD = "word"
    INPUT = "input"
    RESULT = "result"
    SCORE_UPDATE = "score_update"
    GAME_OVER = "game_over"


@dataclass
class Message:
    type: MessageType
    payload: Dict[str, Any]


def encode_message(msg: Message) -> Dict[str, Any]:
    return {"type": msg.type.value, "payload": msg.payload}


def decode_message(data: Dict[str, Any]) -> Optional[Message]:
    try:
        msg_type = MessageType(data["type"])
        payload = data.get("payload", {}) or {}
        return Message(type=msg_type, payload=payload)
    except Exception:
        return None

