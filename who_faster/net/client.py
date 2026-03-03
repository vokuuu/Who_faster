"""
Интерфейс клиентской части игры.

Минимальный каркас без конкретной реализации сетевого протокола.
"""

from typing import Protocol


class GameClient(Protocol):
    async def run(self) -> None: 
        """Подключиться к серверу и начать игру."""
        ...

