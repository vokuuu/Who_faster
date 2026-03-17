(() => {
    const apiRoundUrl = GAME_CONFIG.apiRoundUrl;
    const resultsUrl = GAME_CONFIG.resultsUrl;
    const maxRounds = GAME_CONFIG.maxRounds || 10;

    const centerImageEl = document.getElementById("center-image");
    const optionsLeftEl = document.getElementById("options-left");
    const optionsRightEl = document.getElementById("options-right");
    const scoreP1El = document.getElementById("score-p1");
    const scoreP2El = document.getElementById("score-p2");
    const roundEl = document.getElementById("current-round");
    const timerBarEl = document.getElementById("timer-bar");

    let currentRound = 1;
    let scoreP1 = 0;
    let scoreP2 = 0;

    let state = {
        roundActive: false,
        firstResponder: null, // "p1" | "p2"
        firstAnswerCorrect: null,
        p1Locked: false,
        p2Locked: false,
        timerActive: false,
        timerOwner: null, // "p1" | "p2"
        timerStart: 0,
        timerDurationMs: 5000,
        timerRemainingMs: 0,
        timerRafId: null,
        optionsLeft: [],
        optionsRight: [],
    };

    function updateScoresUI() {
        scoreP1El.textContent = String(scoreP1);
        scoreP2El.textContent = String(scoreP2);
    }

    function resetTimerBar() {
        timerBarEl.style.width = "0%";
    }

    function startTimer(owner) {
        state.timerOwner = owner;
        state.timerActive = true;
        state.timerStart = performance.now();
        state.timerRemainingMs = state.timerDurationMs;
        runTimerLoop();
    }

    function stopTimer() {
        state.timerActive = false;
        state.timerOwner = null;
        if (state.timerRafId !== null) {
            cancelAnimationFrame(state.timerRafId);
            state.timerRafId = null;
        }
        resetTimerBar();
    }

    function runTimerLoop() {
        if (!state.timerActive) return;

        const now = performance.now();
        const elapsed = now - state.timerStart;
        const remaining = Math.max(0, state.timerDurationMs - elapsed);
        state.timerRemainingMs = remaining;

        const progress = 1 - remaining / state.timerDurationMs;
        timerBarEl.style.width = `${(progress * 100).toFixed(1)}%`;

        if (remaining <= 0) {
            stopTimer();
            // Время вышло — игрок, который отвечал вторым не получает ничего
            endRound();
            return;
        }

        state.timerRafId = requestAnimationFrame(runTimerLoop);
    }

    function renderOptions(container, options, side) {
        container.innerHTML = "";
        options.forEach((opt, index) => {
            const li = document.createElement("li");
            li.className = `option-item option-item--${side}`;
            li.dataset.index = String(index);
            li.dataset.side = side;
            li.dataset.correct = opt.is_correct ? "1" : "0";
            li.dataset.type = opt.type;

            const textSpan = document.createElement("span");
            textSpan.textContent = opt.label;

            const keySpan = document.createElement("span");
            keySpan.className = "option-key";

            // Левый игрок (Игрок 1): W/S + Пробел|Shift
            // Правый игрок (Игрок 2): стрелки + Enter
            if (side === "left") {
                keySpan.textContent = "W/S, Space|Shift";
            } else {
                keySpan.textContent = "↑/↓, Enter";
            }

            li.appendChild(textSpan);
            li.appendChild(keySpan);
            container.appendChild(li);
        });
    }

    function highlightFocus(side, index) {
        const listEl = side === "left" ? optionsLeftEl : optionsRightEl;
        listEl.querySelectorAll(".option-item").forEach((el) => {
            el.classList.remove("option-item--focused");
        });
        const target = listEl.querySelector(`.option-item[data-index="${index}"]`);
        if (target) target.classList.add("option-item--focused");
    }

    function lockSide(side) {
        if (side === "left") {
            state.p1Locked = true;
        } else {
            state.p2Locked = true;
        }
        const listEl = side === "left" ? optionsLeftEl : optionsRightEl;
        listEl.querySelectorAll(".option-item").forEach((el) => {
            el.classList.add("option-item--disabled");
        });
    }

    function revealCorrectness(side, chosenIndex) {
        const listEl = side === "left" ? optionsLeftEl : optionsRightEl;
        listEl.querySelectorAll(".option-item").forEach((el) => {
            const isCorrect = el.dataset.correct === "1";
            if (isCorrect) el.classList.add("option-item--correct");
        });

        const chosenEl = listEl.querySelector(`.option-item[data-index="${chosenIndex}"]`);
        if (chosenEl && chosenEl.dataset.correct !== "1") {
            chosenEl.classList.add("option-item--wrong");
        }
        if (chosenEl) {
            chosenEl.classList.add("option-item--selected");
        }
    }

    function handleAnswer(side, index) {
        if (!state.roundActive) return;

        const isP1 = side === "left";
        if (isP1 && state.p1Locked) return;
        if (!isP1 && state.p2Locked) return;

        const listEl = isP1 ? optionsLeftEl : optionsRightEl;
        const chosenEl = listEl.querySelector(`.option-item[data-index="${index}"]`);
        if (!chosenEl) return;

        const isCorrect = chosenEl.dataset.correct === "1";
        //revealCorrectness(side, index);
        //chosenEl.classList.add("option-item--selected");
        chosenEl.classList.add("option-item--selected");
        chosenEl.classList.add("option-item--hidden-selection");
        lockSide(side);

        const responder = isP1 ? "p1" : "p2";
        const other = isP1 ? "p2" : "p1";

        // Если первый ответ в раунде
        if (!state.firstResponder) {
            state.firstResponder = responder;
            state.firstAnswerCorrect = isCorrect;

            if (isCorrect) {
                // Первый ответил верно — получает 100, у второго запускается 5-секундный таймер
                if (responder === "p1") {
                    scoreP1 += 100;
                } else {
                    scoreP2 += 100;
                }
                updateScoresUI();

                // Запуск таймера для второго (если он ещё не ответил)
                const secondSide = other === "p1" ? "left" : "right";
                const secondLocked = other === "p1" ? state.p1Locked : state.p2Locked;
                if (!secondLocked) {
                    startTimer(other);
                } else {
                    // Второй уже успел ответить (очень редкий случай) — можно завершать раунд
                    endRoundIfBothDone();
                }
            } else {
                // Первый ошибся — у второго 5 секунд, но при правильном ответе он получает полные 100
                const secondSide = other === "p1" ? "left" : "right";
                const secondLocked = other === "p1" ? state.p1Locked : state.p2Locked;
                if (!secondLocked) {
                    startTimer(other);
                } else {
                    endRoundIfBothDone();
                }
            }
        } else {
            // Второй ответ
            if (!state.timerActive || state.timerOwner !== responder) {
                // Не его таймер / вышло время
                endRoundIfBothDone();
                return;
            }

            const ratio = state.timerRemainingMs / state.timerDurationMs;

            if (state.firstAnswerCorrect) {
                // Первый был прав; второй при верном ответе получает 100 * (t_remaining / 5)
                if (isCorrect) {
                    const bonus = Math.round(100 * ratio);
                    if (responder === "p1") {
                        scoreP1 += bonus;
                    } else {
                        scoreP2 += bonus;
                    }
                    updateScoresUI();
                }
            } else {
                // Первый ошибся; при правильном ответе второй получает полные 100
                if (isCorrect) {
                    if (responder === "p1") {
                        scoreP1 += 100;
                    } else {
                        scoreP2 += 100;
                    }
                    updateScoresUI();
                }
            }

            stopTimer();
            endRoundIfBothDone();
        }
    }

    function endRoundIfBothDone() {
        if (state.p1Locked && state.p2Locked) {
            endRound();
        }
    }

    function endRound() {
        state.roundActive = false;
        stopTimer();
        const sides = ["left", "right"];
        sides.forEach(side => {
            const listEl = side === "left" ? optionsLeftEl : optionsRightEl;
            listEl.querySelectorAll(".option-item").forEach((el) => {
                el.classList.remove("option-item--hidden-selection");
                const isCorrect = el.dataset.correct === "1";
                const isSelected = el.classList.contains("option-item--selected");

                if (isCorrect) {
                    el.classList.add("option-item--correct"); // Всегда подсвечиваем верный
                }
                if (isSelected && !isCorrect) {
                    el.classList.add("option-item--wrong"); // Если выбрал неверный — красным
                }
            });
        });

        if (currentRound >= maxRounds) {
            // Завершили игру — отправляем результаты на сервер и переходим к экрану итогов
            fetch(resultsUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    score_p1: scoreP1,
                    score_p2: scoreP2,
                    rounds_played: maxRounds,
                }),
            })
                .then((r) => r.json())
                .then((data) => {
                    if (data && data.redirect_url) {
                        window.location.href = data.redirect_url;
                    } else {
                        window.location.href = resultsUrl;
                    }
                })
                .catch(() => {
                    window.location.href = resultsUrl;
                });
        } else {
            currentRound += 1;
            roundEl.textContent = String(currentRound);
            setTimeout(() => {
                loadRound();
            }, 900);
        }
    }

    function resetRoundState() {
        state.roundActive = true;
        state.firstResponder = null;
        state.firstAnswerCorrect = null;
        state.p1Locked = false;
        state.p2Locked = false;
        state.timerActive = false;
        state.timerOwner = null;
        state.timerStart = 0;
        state.timerRemainingMs = 0;
        state.optionsLeft = [];
        state.optionsRight = [];
        resetTimerBar();
        focusIndexLeft = 0;
        focusIndexRight = 0;
    }

    function loadRound() {
        resetRoundState();
        fetch(apiRoundUrl)
            .then((r) => r.json())
            .then((data) => {
                if (!data || data.error) {
                    alert(data && data.error ? data.error : "Ошибка загрузки раунда");
                    return;
                }

                centerImageEl.src = data.image_url;
                centerImageEl.alt = data.correct_word || "Слово";

                state.optionsLeft = data.left_options || [];
                state.optionsRight = data.right_options || [];

                renderOptions(optionsLeftEl, state.optionsLeft, "left");
                renderOptions(optionsRightEl, state.optionsRight, "right");

                // Начальные фокусы
                highlightFocus("left", 0);
                highlightFocus("right", 0);
            })
            .catch((err) => {
                console.error(err);
                alert("Не удалось загрузить раунд");
            });
    }

    // Управление с клавиатуры
    let focusIndexLeft = 0;
    let focusIndexRight = 0;

    function moveFocus(side, delta) {
        const list = side === "left" ? state.optionsLeft : state.optionsRight;
        if (!list || list.length === 0) return;

        if (side === "left" && state.p1Locked) return;
        if (side === "right" && state.p2Locked) return;

        if (side === "left") {
            focusIndexLeft = (focusIndexLeft + delta + list.length) % list.length;
            highlightFocus("left", focusIndexLeft);
        } else {
            focusIndexRight = (focusIndexRight + delta + list.length) % list.length;
            highlightFocus("right", focusIndexRight);
        }
    }

    function selectFocused(side) {
        if (!state.roundActive) return;
        const list = side === "left" ? state.optionsLeft : state.optionsRight;
        if (!list || list.length === 0) return;

        const index = side === "left" ? focusIndexLeft : focusIndexRight;
        handleAnswer(side, index);
    }

    // Касания 
    const handlePointerDown = (e) => {
        // Ищем, на какой элемент списка нажал пользователь
        const li = e.target.closest(".option-item");
        if (!li) return;

        const side = li.dataset.side; // "left" или "right"
        const index = parseInt(li.dataset.index);

        if (!state.roundActive) return;

        // Определяем, какую сторону обрабатывать
        if (side === "left" && !state.p1Locked) {
            // Обновляем визуальный фокус при клике, чтобы игрок видел, что выбрал
            focusIndexLeft = index;
            highlightFocus("left", index);
            handleAnswer("left", index);
        } else if (side === "right" && !state.p2Locked) {
            focusIndexRight = index;
            highlightFocus("right", index);
            handleAnswer("right", index);
        }
    };

    // Слушаем клики мышкой
    optionsLeftEl.addEventListener("mousedown", handlePointerDown);
    optionsRightEl.addEventListener("mousedown", handlePointerDown);

    // Слушаем касания пальцем (для мобилок)
    optionsLeftEl.addEventListener("touchstart", (e) => {
        // Проверяем, активен ли раунд, чтобы не блокировать прокрутку страницы зря
        if (state.roundActive) {
            e.preventDefault(); 
            handlePointerDown(e);
        }
    }, { passive: false });

    optionsRightEl.addEventListener("touchstart", (e) => {
        if (state.roundActive) {
            e.preventDefault();
            handlePointerDown(e);
        }
    }, { passive: false });
    // --- КОНЕЦ НОВОГО БЛОКА ---

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            window.location.href = "/";
            return;
        }
    
        // Используем e.code, чтобы игнорировать раскладку языка
        switch (e.code) {
            // Игрок 1 (слева)
            case "KeyW": // Физическая клавиша W (хоть там 'ц', хоть 'w')
                e.preventDefault();
                moveFocus("left", -1);
                break;
            case "KeyS": // Физическая клавиша S
                e.preventDefault();
                moveFocus("left", 1);
                break;
            case "Space": // Пробел
            case "ShiftLeft": // Левый Shift (теперь точно для 1-го игрока)
                e.preventDefault();
                selectFocused("left");
                break;
    
            // Игрок 2 (справа)
            case "ArrowUp":
                e.preventDefault();
                moveFocus("right", -1);
                break;
            case "ArrowDown":
                e.preventDefault();
                moveFocus("right", 1);
                break;
            case "Enter":
            case "NumpadEnter": // На случай, если у кого-то Enter на цифровой панели
                e.preventDefault();
                selectFocused("right");
                break;
        }
    });

    // Старт
    loadRound();
})();

