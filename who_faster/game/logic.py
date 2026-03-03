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

    def handle_answer():
    data = request.json
    player = data.get('player') # 1 или 2
    card_id = data.get('card_id') # ID выбранного слова или None для "Нет такого"
    
    with game_state.lock:
        # Проверка блокировки
        if game_state.is_locked:
            if time.time() < game_state.lock_end_time:
                # Если игрок пытается ответить во время штрафа соперника
                if player != game_state.locked_player:
                    return jsonify({'status': 'locked', 'message': 'Ждите окончания таймера соперника!'})
        
        target_id = game_state.current_target_card.card_id
        is_correct = (card_id == target_id)
        
        points = 0
        message = ""
        next_round = False

        if is_correct:
            # Логика начисления очков
            if not game_state.is_locked:
                # Ответил первым (или единственный активный)
                points = 100
                message = "Верно! +100 баллов."
                
                # Блокируем соперника на 5 секунд
                game_state.is_locked = True
                game_state.locked_player = player
                game_state.lock_end_time = time.time() + 5.0
                
            else:
                # Ответил вторым (в период штрафа)
                time_left = game_state.lock_end_time - time.time()
                if time_left > 0:
                    # Формула: 100 * (остаток времени / 5)
                    points = int(100 * (time_left / 5.0))
                    message = f"Верно, но поздно! +{points} баллов."
                else:
                    points = 0
                    message = "Время вышло. 0 баллов."
                    game_state.is_locked = False # Сброс блокировки, так как время истекло
            
            # Обновляем счет
            if player == 1: game_state.p1_score += points
            else: game_state.p2_score += points
            
            # Переход к следующему раунду (упрощенно: сразу после ответа)
            # В реальной игре лучше ждать нажатия кнопки "Дальше"
            if game_state.round < game_state.max_rounds:
                 game_state.round += 1
                 start_round()
            else:
                next_round = True # Игра окончена

        else:
            # Ошибка
            points = 0
            message = "Ошибка! 0 баллов."
            # При ошибке блокировка не снимается автоматически, если она была, 
            # но обычно в таких играх ошибка просто обнуляет попытку.
            # Здесь мы просто не даем очков.
