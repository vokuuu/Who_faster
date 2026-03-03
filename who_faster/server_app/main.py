"""
Запуск сервера игры.
"""

import asyncio

from who_faster.net.server import GameServer


def run_server() -> None:
    asyncio.run(GameServer().run())


if __name__ == "__main__":
    run_server()

