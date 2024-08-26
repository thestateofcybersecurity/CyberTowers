const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

let systemIntegrity = 100;
let resources = 500;
let wave = 1;
let enemies = [];
let towers = [];
let isGamePaused = false;

function updateUI() {
    document.getElementById('scoreValue').textContent = systemIntegrity;
    document.getElementById('resourcesValue').textContent = resources;
    document.getElementById('waveValue').textContent = wave;
}

function placeTower(type) {
    const costs = {
        'Firewall': 100,
        'Antivirus': 200,
        'Encryption': 300,
        'AI Defense': 400,
        'IDS': 500,
        'SOC': 600,
        'Honey Pot': 150
    };

    if (resources >= costs[type]) {
        resources -= costs[type];
        towers.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            type: type,
            damage: 10,
            range: 100
        });
        updateUI();
    }
}

function spawnEnemy() {
    enemies.push({
        x: 0,
        y: Math.random() * canvas.height,
        health: 100,
        speed: 1
    });
}

function update() {
    if (isGamePaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move and draw enemies
    enemies.forEach((enemy, index) => {
        enemy.x += enemy.speed;
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x, enemy.y, 20, 20);

        if (enemy.x > canvas.width) {
            systemIntegrity -= 10;
            enemies.splice(index, 1);
            updateUI();
        }
    });

    // Draw and activate towers
    towers.forEach(tower => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(tower.x, tower.y, 30, 30);

        enemies.forEach((enemy, index) => {
            const distance = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
            if (distance < tower.range) {
                enemy.health -= tower.damage;
                if (enemy.health <= 0) {
                    enemies.splice(index, 1);
                    resources += 50;
                    updateUI();
                }
            }
        });
    });

    // Spawn new enemies
    if (enemies.length === 0) {
        wave++;
        for (let i = 0; i < wave * 5; i++) {
            spawnEnemy();
        }
        updateUI();
    }

    requestAnimationFrame(update);
}

function togglePause() {
    isGamePaused = !isGamePaused;
    if (!isGamePaused) {
        update();
    }
}

update();
updateUI();
