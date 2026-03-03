"""
Базовые структуры данных для игры.
"""

from dataclasses import dataclass
from enum import Enum, auto
from typing import Dict, List, Optional


class GameStatus(Enum):
    WAITING_FOR_PLAYERS = auto()
    IN_PROGRESS = auto()
    FINISHED = auto()


@dataclass
class Player:
    id: str
    name: str
    score: int = 0


@dataclass
class RoundResult:
    word: str
    winner_player_id: Optional[str]
    times: Dict[str, float]  # player_id -> time_seconds


@dataclass
class GameState:
    players: List[Player]
    current_word: Optional[str]
    round_index: int
    status: GameStatus

