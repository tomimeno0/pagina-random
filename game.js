// Mini-juego futurista de conducción escrito en JavaScript puro
// Mejora integral: estados claros, dificultad progresiva y puntuaciones persistentes

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const scoreValue = document.getElementById("scoreValue");
    const bestScoreValue = document.getElementById("bestScoreValue");
    const statusMessage = document.getElementById("statusMessage");
    const startButton = document.getElementById("startButton");
    const restartButton = document.getElementById("restartButton");

    const overlay = document.getElementById("gameOverlay");
    const overlayTitle = document.getElementById("overlayTitle");
    const overlaySubtext = document.getElementById("overlaySubtext");

    const road = {
        width: canvas.width,
        height: canvas.height,
        laneWidth: canvas.width / 3
    };

    const lanes = [road.laneWidth * 0.5, road.laneWidth * 1.5, road.laneWidth * 2.5];

    const car = {
        width: 56,
        height: 96,
        x: 0,
        y: road.height - 120,
        color: "#3c8dff",
        targetLane: 1
    };

    const colors = {
        obstacle: "#ff4d6d",
        coin: "#ffd166",
        road: "rgba(10, 12, 22, 0.9)",
        roadLines: "rgba(255, 255, 255, 0.18)",
        glow: "rgba(60, 141, 255, 0.45)",
        carReflection: "rgba(255, 255, 255, 0.3)"
    };

    let statusBaseText = "Estado: Listo";
    let statusTimeout = null;

    const gameState = {
        state: "ready",
        obstacles: [],
        coins: [],
        score: 0,
        bestScore: loadBestScore(),
        elapsed: 0,
        survivalAccumulator: 0,
        obstacleTimer: 0,
        coinTimer: 0,
        countdown: 3,
        goSignalTimer: 0,
        lastTimestamp: 0
    };

    positionCar(1);
    updateScoreDisplay();
    setState("ready");

    // --- Entradas de usuario ---
    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();

        if (key === "arrowleft" || key === "a") {
            queueLaneChange(-1);
            event.preventDefault();
        } else if (key === "arrowright" || key === "d") {
            queueLaneChange(1);
            event.preventDefault();
        } else if (event.code === "Space") {
            handlePrimaryAction();
            event.preventDefault();
        }
    });

    canvas.addEventListener("pointerdown", (event) => {
        if (gameState.state === "gameover") {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const relativeX = event.clientX - rect.left;
        const carCenter = car.x + car.width / 2;
        if (relativeX < carCenter) {
            queueLaneChange(-1);
        } else {
            queueLaneChange(1);
        }
    });

    startButton.addEventListener("click", () => {
        if (gameState.state === "ready") {
            startCountdown();
        }
    });

    restartButton.addEventListener("click", () => {
        resetGame();
    });

    function handlePrimaryAction() {
        if (gameState.state === "ready") {
            startCountdown();
        } else if (gameState.state === "gameover") {
            resetGame();
        }
    }

    function queueLaneChange(direction) {
        const nextLane = Math.min(2, Math.max(0, car.targetLane + direction));
        car.targetLane = nextLane;
    }

    function positionCar(laneIndex) {
        car.targetLane = laneIndex;
        car.x = lanes[laneIndex] - car.width / 2;
        car.y = road.height - car.height - 24;
    }

    // --- Gestión de estados ---
    function setState(newState) {
        gameState.state = newState;
        statusMessage.classList.remove("highlight", "alert");
        clearTimeout(statusTimeout);
        statusTimeout = null;

        switch (newState) {
            case "ready":
                statusBaseText = "Estado: Listo";
                statusMessage.textContent = statusBaseText;
                overlay.classList.remove("hidden");
                overlayTitle.textContent = "Preparado";
                overlaySubtext.textContent = "Presioná ESPACIO o tocá Comenzar para iniciar la carrera.";
                startButton.disabled = false;
                break;
            case "countdown":
                statusBaseText = "Estado: Cuenta regresiva";
                statusMessage.textContent = statusBaseText;
                overlay.classList.remove("hidden");
                startButton.disabled = true;
                break;
            case "playing":
                statusBaseText = "Estado: En juego";
                statusMessage.textContent = statusBaseText;
                overlay.classList.add("hidden");
                startButton.disabled = true;
                break;
            case "gameover":
                statusBaseText = "Estado: Game Over";
                statusMessage.textContent = statusBaseText;
                statusMessage.classList.add("alert");
                overlay.classList.remove("hidden");
                overlayTitle.textContent = "GAME OVER";
                overlaySubtext.textContent = `Puntuación final: ${gameState.score} • Mejor: ${gameState.bestScore}`;
                startButton.disabled = false;
                try {
                    restartButton.focus({ preventScroll: true });
                } catch (error) {
                    restartButton.focus();
                }
                break;
        }

        // Reiniciamos el delta para evitar saltos cuando cambia el estado
        gameState.lastTimestamp = 0;
    }

    function startCountdown() {
        if (gameState.state !== "ready") return;

        gameState.countdown = 3;
        gameState.goSignalTimer = 0;
        setState("countdown");
    }

    function resetGame() {
        gameState.obstacles = [];
        gameState.coins = [];
        gameState.score = 0;
        gameState.elapsed = 0;
        gameState.survivalAccumulator = 0;
        gameState.obstacleTimer = 0;
        gameState.coinTimer = 0;
        gameState.countdown = 3;
        gameState.goSignalTimer = 0;
        gameState.lastTimestamp = 0;
        positionCar(1);
        updateScoreDisplay();
        setState("ready");
    }

    function loadBestScore() {
        try {
            const stored = localStorage.getItem("ia-racer-best-score");
            return stored ? parseInt(stored, 10) || 0 : 0;
        } catch (error) {
            return 0;
        }
    }

    function saveBestScore() {
        try {
            localStorage.setItem("ia-racer-best-score", String(gameState.bestScore));
        } catch (error) {
            /* Ignorar si el almacenamiento no está disponible */
        }
    }

    function updateScoreDisplay() {
        scoreValue.textContent = Math.floor(gameState.score);
        bestScoreValue.textContent = Math.floor(gameState.bestScore);
    }

    function addScore(amount) {
        if (amount <= 0) return;
        gameState.score = Math.floor(gameState.score + amount);
        if (gameState.score > gameState.bestScore) {
            gameState.bestScore = gameState.score;
            saveBestScore();
            flashStatus("¡Nuevo récord personal!");
        }
        updateScoreDisplay();
    }

    function flashStatus(message) {
        statusMessage.textContent = message;
        statusMessage.classList.remove("alert");
        statusMessage.classList.add("highlight");
        clearTimeout(statusTimeout);
        statusTimeout = setTimeout(() => {
            statusMessage.classList.remove("highlight");
            statusMessage.textContent = statusBaseText;
        }, 750);
    }

    // --- Bucle principal ---
    function gameLoop(timestamp) {
        if (!gameState.lastTimestamp) {
            gameState.lastTimestamp = timestamp;
        }
        const delta = Math.min((timestamp - gameState.lastTimestamp) / 1000, 0.05);
        gameState.lastTimestamp = timestamp;

        if (gameState.state === "countdown") {
            updateCountdown(delta);
        } else if (gameState.state === "playing") {
            updatePlaying(delta);
        } else {
            smoothCar(delta);
        }

        drawScene();
        requestAnimationFrame(gameLoop);
    }

    function updateCountdown(delta) {
        smoothCar(delta);
        gameState.countdown -= delta;

        if (gameState.countdown > 0) {
            overlayTitle.textContent = Math.ceil(gameState.countdown).toString();
            overlaySubtext.textContent = "Prepará tu reacción y alineá el vehículo.";
        } else {
            if (gameState.goSignalTimer <= 0) {
                gameState.goSignalTimer = 0.6;
                overlayTitle.textContent = "¡GO!";
                overlaySubtext.textContent = "Acelerá y recolectá créditos cuánticos.";
            }
            gameState.goSignalTimer -= delta;
            if (gameState.goSignalTimer <= 0) {
                overlay.classList.add("hidden");
                setState("playing");
            }
        }
    }

    function updatePlaying(delta) {
        smoothCar(delta);

        gameState.elapsed += delta;
        gameState.survivalAccumulator += delta;

        if (gameState.survivalAccumulator >= 1) {
            const bonus = Math.floor(gameState.survivalAccumulator);
            addScore(bonus);
            gameState.survivalAccumulator -= bonus;
        }

        const difficulty = Math.min(3, 1 + gameState.elapsed * 0.08);

        const obstacleInterval = Math.max(0.45, 1.15 - difficulty * 0.18);
        gameState.obstacleTimer += delta;
        if (gameState.obstacleTimer >= obstacleInterval) {
            spawnObstacle(difficulty);
            gameState.obstacleTimer = 0;
        }

        const coinInterval = Math.max(0.7, 1.5 - difficulty * 0.12);
        gameState.coinTimer += delta;
        if (gameState.coinTimer >= coinInterval) {
            spawnCoin(difficulty);
            gameState.coinTimer = 0;
        }

        moveEntities(delta);
        detectCollisions();
    }

    function smoothCar(delta) {
        const targetX = lanes[car.targetLane] - car.width / 2;
        const smoothingFactor = Math.min(1, delta * 12);
        car.x += (targetX - car.x) * smoothingFactor;
    }

    function spawnObstacle(difficulty) {
        const lane = Math.floor(Math.random() * lanes.length);
        const obstacle = {
            x: lanes[lane] - 30,
            y: -180,
            width: 60,
            height: 130,
            speed: 200 + difficulty * 70
        };
        gameState.obstacles.push(obstacle);
    }

    function spawnCoin(difficulty) {
        const lane = Math.floor(Math.random() * lanes.length);
        const coin = {
            x: lanes[lane] - 16,
            y: -100,
            size: 32,
            speed: 190 + difficulty * 55
        };
        gameState.coins.push(coin);
    }

    function moveEntities(delta) {
        gameState.obstacles.forEach((obstacle) => {
            obstacle.y += obstacle.speed * delta;
        });
        gameState.coins.forEach((coin) => {
            coin.y += coin.speed * delta;
        });

        gameState.obstacles = gameState.obstacles.filter((obstacle) => obstacle.y < canvas.height + 200);
        gameState.coins = gameState.coins.filter((coin) => coin.y < canvas.height + 80);
    }

    function detectCollisions() {
        for (const obstacle of gameState.obstacles) {
            if (isColliding(car, obstacle)) {
                finalizeGame();
                return;
            }
        }

        let collected = false;
        gameState.coins = gameState.coins.filter((coin) => {
            if (isCoinCollected(car, coin)) {
                addScore(15);
                collected = true;
                return false;
            }
            return true;
        });

        if (collected) {
            flashStatus("Créditos +15");
        }
    }

    function finalizeGame() {
        updateBestFromScore();
        setState("gameover");
    }

    function updateBestFromScore() {
        if (gameState.score > gameState.bestScore) {
            gameState.bestScore = gameState.score;
            saveBestScore();
        }
        updateScoreDisplay();
    }

    function isColliding(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    function isCoinCollected(rect, coin) {
        const dx = rect.x + rect.width / 2 - (coin.x + coin.size / 2);
        const dy = rect.y + rect.height / 2 - (coin.y + coin.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < coin.size / 2 + Math.min(rect.width, rect.height) / 3;
    }

    // --- Renderizado ---
    function drawScene() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawRoad();
        drawCar();
        drawObstacles();
        drawCoins();
    }

    function drawRoad() {
        ctx.fillStyle = colors.road;
        ctx.fillRect(0, 0, road.width, road.height);

        ctx.strokeStyle = colors.roadLines;
        ctx.lineWidth = 4;
        ctx.setLineDash([26, 28]);
        ctx.beginPath();
        ctx.moveTo(road.laneWidth, 0);
        ctx.lineTo(road.laneWidth, road.height);
        ctx.moveTo(road.laneWidth * 2, 0);
        ctx.lineTo(road.laneWidth * 2, road.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawCar() {
        ctx.fillStyle = colors.carReflection;
        ctx.fillRect(car.x + 12, car.y + 14, car.width - 24, 28);

        ctx.fillStyle = car.color;
        ctx.shadowBlur = 18;
        ctx.shadowColor = colors.glow;
        ctx.fillRect(car.x, car.y, car.width, car.height);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
        ctx.fillRect(car.x + 10, car.y + car.height - 26, car.width - 20, 18);
    }

    function drawObstacles() {
        ctx.fillStyle = colors.obstacle;
        gameState.obstacles.forEach((obstacle) => {
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
    }

    function drawCoins() {
        ctx.fillStyle = colors.coin;
        gameState.coins.forEach((coin) => {
            ctx.beginPath();
            ctx.arc(coin.x + coin.size / 2, coin.y + coin.size / 2, coin.size / 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    updateScoreDisplay();
    requestAnimationFrame(gameLoop);
});
