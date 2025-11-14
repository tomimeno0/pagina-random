// Juego de conducción minimalista escrito en JavaScript puro
// El automóvil se desplaza lateralmente para esquivar obstáculos y recolectar monedas

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const scoreValue = document.getElementById("scoreValue");
    const statusMessage = document.getElementById("statusMessage");
    const restartButton = document.getElementById("restartButton");

    const road = {
        width: canvas.width,
        height: canvas.height,
        laneWidth: canvas.width / 3
    };

    const car = {
        width: 60,
        height: 100,
        x: canvas.width / 2 - 30,
        y: canvas.height - 140,
        speed: 6,
        targetLane: 1,
        color: "#3c8dff"
    };

    const gameState = {
        obstacles: [],
        coins: [],
        frame: 0,
        score: 0,
        playing: true
    };

    const colors = {
        obstacle: "#ff4d6d",
        coin: "#ffd166",
        road: "rgba(10, 12, 22, 0.85)",
        roadLines: "rgba(255, 255, 255, 0.2)",
        glow: "rgba(60, 141, 255, 0.35)"
    };

    const lanes = [road.laneWidth / 2, road.laneWidth * 1.5, road.laneWidth * 2.5];

    let keys = {};

    // Manejo de teclas para movimiento lateral
    document.addEventListener("keydown", (event) => {
        keys[event.key.toLowerCase()] = true;
    });

    document.addEventListener("keyup", (event) => {
        keys[event.key.toLowerCase()] = false;
    });

    restartButton.addEventListener("click", () => {
        resetGame();
    });

    function resetGame() {
        gameState.obstacles = [];
        gameState.coins = [];
        gameState.frame = 0;
        gameState.score = 0;
        gameState.playing = true;
        car.x = lanes[1] - car.width / 2;
        car.targetLane = 1;
        statusMessage.textContent = "En juego";
        statusMessage.classList.remove("alert", "highlight");
        updateScore(0);
    }

    function update() {
        if (!gameState.playing) {
            draw();
            return;
        }

        gameState.frame++;
        handleInput();
        spawnEntities();
        moveEntities();
        detectCollisions();
        updateScore(0);
        draw();
        requestAnimationFrame(update);
    }

    function handleInput() {
        if (keys["arrowleft"] || keys["a"]) {
            car.targetLane = Math.max(0, car.targetLane - 1);
            keys["arrowleft"] = keys["a"] = false;
        }
        if (keys["arrowright"] || keys["d"]) {
            car.targetLane = Math.min(2, car.targetLane + 1);
            keys["arrowright"] = keys["d"] = false;
        }

        const targetX = lanes[car.targetLane] - car.width / 2;
        car.x += (targetX - car.x) * 0.2;
    }

    function spawnEntities() {
        if (gameState.frame % 70 === 0) {
            const lane = Math.floor(Math.random() * 3);
            const obstacle = {
                x: lanes[lane] - 30,
                y: -120,
                width: 60,
                height: 120,
                speed: 4 + Math.random() * 1.5
            };
            gameState.obstacles.push(obstacle);
        }

        if (gameState.frame % 90 === 45) {
            const lane = Math.floor(Math.random() * 3);
            const coin = {
                x: lanes[lane] - 15,
                y: -40,
                size: 30,
                speed: 4.5
            };
            gameState.coins.push(coin);
        }
    }

    function moveEntities() {
        gameState.obstacles.forEach((obstacle) => {
            obstacle.y += obstacle.speed;
        });
        gameState.coins.forEach((coin) => {
            coin.y += coin.speed;
        });
        gameState.obstacles = gameState.obstacles.filter((obstacle) => obstacle.y < canvas.height + 150);
        gameState.coins = gameState.coins.filter((coin) => coin.y < canvas.height + 60);
    }

    function detectCollisions() {
        gameState.obstacles.forEach((obstacle) => {
            if (isColliding(car, obstacle)) {
                gameState.playing = false;
                statusMessage.textContent = "Colisión detectada";
                statusMessage.classList.add("alert");
                gameOver();
            }
        });

        gameState.coins = gameState.coins.filter((coin) => {
            if (isCoinCollected(car, coin)) {
                gameState.score += 10;
                statusMessage.textContent = "Créditos +10";
                flashStatus();
                return false;
            }
            return true;
        });
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
        return distance < (coin.size / 2 + Math.min(rect.width, rect.height) / 3);
    }

    function updateScore(amount) {
        gameState.score += amount;
        scoreValue.textContent = gameState.score;
    }

    function flashStatus() {
        statusMessage.classList.add("highlight");
        setTimeout(() => {
            statusMessage.classList.remove("highlight");
            statusMessage.textContent = gameState.playing ? "En juego" : statusMessage.textContent;
        }, 600);
    }

    function gameOver() {
        statusMessage.textContent = "Fin del juego";
        statusMessage.classList.remove("highlight");
        statusMessage.classList.add("alert");
        restartButton.focus();
    }

    function draw() {
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
        ctx.setLineDash([24, 24]);
        ctx.beginPath();
        ctx.moveTo(road.laneWidth, 0);
        ctx.lineTo(road.laneWidth, road.height);
        ctx.moveTo(road.laneWidth * 2, 0);
        ctx.lineTo(road.laneWidth * 2, road.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawCar() {
        ctx.fillStyle = car.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = colors.glow;
        ctx.fillRect(car.x, car.y, car.width, car.height);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(car.x + 12, car.y + 15, car.width - 24, 30);
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

    // Inicializar partida
    resetGame();
    update();
});
