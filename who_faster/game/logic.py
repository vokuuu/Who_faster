"""
Высокоуровневая логика игры (без сетевого кода).

Здесь только минимальные сигнатуры без реализации.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Protocol

from who_faster.models import GameState, Player


class GameLogic(Protocol):
    def __init__(self, words: Iterable[str]) -> None:
        """Создать игру на основе списка слов."""
        ...

    @classmethod
    def from_file(cls, path: Path) -> "GameLogic":
        """Создать игру, загрузив слова из файла."""
        ...

    def start_game(self, players: List[Player]) -> GameState:  
        """Подготовить начальное состояние игры."""
        ...

    def next_word(self) -> str: 
        """Получить следующее слово для раунда."""
        ...

