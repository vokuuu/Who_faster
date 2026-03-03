"""
Интерфейс серверной части игры.

Минимальный каркас без конкретной реализации сетевого протокола.
"""

from typing import Protocol


class GameServer(Protocol):
    async def run(self) -> None: 
        """Запустить сервер и начать принимать подключения."""
        ...

