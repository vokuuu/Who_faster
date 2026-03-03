"""
Простейший CLI-клиент для игры.

Пока что это просто каркас: подключается к серверу и шлёт JOIN.
"""

import asyncio

from who_faster.net.client import GameClient
from who_faster.net.protocol import Message


def print_message(msg: Message) -> None:
    print(f"[SERVER] {msg.type.value}: {msg.payload}")


def run_client(player_id: str) -> None:
    client = GameClient(player_id=player_id, on_message=print_message)
    asyncio.run(client.run())


if __name__ == "__main__":
    name = input("Введите ваше имя: ").strip() or "player"
    run_client(name)

