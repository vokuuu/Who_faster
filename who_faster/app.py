from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
import os
import random


basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config["SECRET_KEY"] = "change-me-in-production"
# Используем абсолютный путь к game.db в папке проекта
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(basedir, "game.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


class Card(db.Model):
    __tablename__ = "cards"

    card_id = db.Column(db.Integer, primary_key=True)
    word_ru = db.Column(db.String, nullable=False)
    word_os = db.Column(db.String, nullable=False)
    image_path = db.Column(db.String, nullable=False)


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        p1 = request.form.get("player1_name", "").strip() or "Игрок 1"
        p2 = request.form.get("player2_name", "").strip() or "Игрок 2"

        session["player1_name"] = p1
        session["player2_name"] = p2
        session["max_rounds"] = 10

        return redirect(url_for("game"))

    return render_template("index.html")


@app.route("/game")
def game():
    if "player1_name" not in session or "player2_name" not in session:
        return redirect(url_for("index"))

    return render_template(
        "game.html",
        player1_name=session.get("player1_name"),
        player2_name=session.get("player2_name"),
        max_rounds=session.get("max_rounds", 10),
    )


def build_round_payload():
    total_cards = Card.query.count()
    if total_cards == 0:
        return None

    # Случайная карточка для картинки
    random_offset = random.randint(0, total_cards - 1)
    center_card = Card.query.offset(random_offset).limit(1).first()

    # Собираем все другие слова для отвлекающих вариантов
    other_words_query = Card.query.with_entities(Card.word_os).filter(
        Card.card_id != center_card.card_id
    )
    other_words = [row.word_os for row in other_words_query]

    # Гарантируем, что есть достаточно кандидатов для 4 позиций
    if len(other_words) < 4:
        other_words = (other_words * 4)[:4]

    # Одна общая таблица слов для обоих игроков:
    # 4 слова (могут включать правильное, а могут нет) + «Нет такого слова»
    # Если число меньше 0.95 (это 95% вероятности), то слово будет в таблице
    include_correct = random.random() < 0.95
    base_count = 4  # ровно 4 слова в таблице, без «Нет такого слова»

    # Отвлекающие (без правильного слова)
    distractor_source = [w for w in other_words if w != center_card.word_os] or other_words
    need_distractors = base_count - (1 if include_correct else 0)
    if len(distractor_source) < need_distractors:
        # При необходимости дублируем
        distractor_source = (distractor_source * need_distractors)[:need_distractors]

    distractors = random.sample(distractor_source, k=need_distractors)

    options_words = []
    if include_correct:
        correct_index = random.randint(0, base_count - 1)
        for i in range(base_count):
            if i == correct_index:
                options_words.append(
                    {"label": center_card.word_os, "is_correct": True, "type": "word"}
                )
            else:
                word = distractors.pop() if distractors else center_card.word_os
                options_words.append({"label": word, "is_correct": False, "type": "word"})
    else:
        for _ in range(base_count):
            word = distractors.pop() if distractors else center_card.word_os
            options_words.append({"label": word, "is_correct": False, "type": "word"})

    # Добавляем опцию «Нет такого слова» (правильная, если слова действительно нет)
    none_option = {
        "label": "Нет такого слова",
        "is_correct": not include_correct,
        "type": "none",
    }

    left_options = options_words + [none_option]
    right_options = [dict(opt) for opt in left_options]  # копия для второго игрока

    # В БД хранится путь относительно папки static (например "images/cat.png")
    image_url = url_for("static", filename=center_card.image_path)

    return {
        "image_url": image_url,
        "correct_word": center_card.word_os,
        "left_options": left_options,
        "right_options": right_options,
    }


@app.route("/api/round")
def api_round():
    payload = build_round_payload()
    if payload is None:
        return jsonify({"error": "Нет данных в базе cards"}), 500
    return jsonify(payload)


@app.route("/results", methods=["GET", "POST"])
def results():
    if request.method == "POST":
        data = request.get_json() or {}
        session["final_score_p1"] = data.get("score_p1", 0)
        session["final_score_p2"] = data.get("score_p2", 0)
        session["rounds_played"] = data.get("rounds_played", 0)
        return jsonify({"ok": True, "redirect_url": url_for("results")})

    p1 = session.get("player1_name", "Игрок 1")
    p2 = session.get("player2_name", "Игрок 2")
    score_p1 = session.get("final_score_p1", 0)
    score_p2 = session.get("final_score_p2", 0)
    rounds_played = session.get("rounds_played", 0)

    winner = None
    if score_p1 > score_p2:
        winner = p1
    elif score_p2 > score_p1:
        winner = p2

    return render_template(
        "results.html",
        player1_name=p1,
        player2_name=p2,
        score_p1=score_p1,
        score_p2=score_p2,
        rounds_played=rounds_played,
        winner=winner,
    )


if __name__ == "__main__":
    # Для локального запуска
    app.run(debug=True)


