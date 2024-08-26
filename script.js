const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

let systemIntegrity = 100;
let resources = 500;
let wave = 1;
let enemies = [];
let towers = [];
let projectiles = [];
let isGamePaused = false;
let lastSpawnTime = 0;

const defenseTypes = {
    firewall: { cost: 100, damage: 10, range: 100, fireRate: 1000, icon: './api/firewall.jpg', projectileColor: '#FF0000' },
    antivirus: { cost: 200, damage: 20, range: 150, fireRate: 1500, icon: './api/antivirus.jpg', projectileColor: '#00FF00' },
    encryption: { cost: 300, damage: 30, range: 200, fireRate: 2000, icon: './api/encryption.jpg', projectileColor: '#0000FF' },
    ai: { cost: 400, damage: 40, range: 250, fireRate: 2500, icon: './api/ai.jpg', projectileColor: '#FFFF00' },
    ids: { cost: 500, damage: 25, range: 180, fireRate: 1800, icon: './api/ids.jpg', projectileColor: '#800080' },
    soc: { cost: 600, damage: 35, range: 220, fireRate: 2200, icon: './api/soc.jpg', projectileColor: '#FFA500' },
    honeypot: { cost: 150, damage: 0, range: 150, fireRate: 1000, icon: './api/honeypot.jpg', projectileColor: '#FFD700' }
};

const threatTypes = {
    virus: { health: 50, speed: 2, damage: 5, reward: 20, icon: './api/virus.jpg' },
    trojan: { health: 80, speed: 1, damage: 10, reward: 30, icon: './api/trojan.jpg' },
    ransomware: { health: 120, speed: 0.5, damage: 20, reward: 50, icon: './api/ransomware.jpg' },
    worm: { health: 30, speed: 3, damage: 15, reward: 40, icon: './api/worm.jpg' },
    botnet: { health: 200, speed: 0.3, damage: 30, reward: 100, icon: './api/botnet.jpg' },
    phishing: { health: 20, speed: 4, damage: 3, reward: 10, icon: './api/phishing.jpg' },
    rootkit: { health: 100, speed: 0.8, damage: 15, reward: 50, icon: './api/rootkit.jpg', invisible: true },
    apt: { health: 150, speed: 1.5, damage: 25, reward: 75, icon: './api/apt.jpg', evolves: true }
};

function updateUI() {
    document.getElementById('scoreValue').textContent = systemIntegrity;
    document.getElementById('resourcesValue').textContent = resources;
    document.getElementById('waveValue').textContent = wave;
}

function placeTower(type) {
    const towerType = defenseTypes[type.toLowerCase()];
    if (resources >= towerType.cost) {
        resources -= towerType.cost;
        towers.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            type: type,
            ...towerType,
            lastFired: 0
        });
        updateUI();
    }
}

function spawnEnemy() {
    const threatType = Object.keys(threatTypes)[Math.floor(Math.random() * Object.keys(threatTypes).length)];
    const threat = threatTypes[threatType];
    enemies.push({
        x: 0,
        y: Math.random() * canvas.height,
        type: threatType,
        ...threat,
        currentHealth: threat.health
    });
}

function fireProjectile(tower, enemy) {
    projectiles.push({
        x: tower.x,
        y: tower.y,
        targetX: enemy.x,
        targetY: enemy.y,
        color: tower.projectileColor,
        damage: tower.damage,
        speed: 5
    });
}

function update(timestamp) {
    if (isGamePaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn enemies
    if (timestamp - lastSpawnTime > 2000 && enemies.length < wave * 5) {
        spawnEnemy();
        lastSpawnTime = timestamp;
    }

    // Move and draw enemies
    enemies.forEach((enemy, index) => {
        enemy.x += enemy.speed;
        if (!enemy.invisible || Math.random() < 0.1) {
            ctx.drawImage(new Image(), enemy.x, enemy.y, 30, 30);
            ctx.fillStyle = 'black';
            ctx.fillRect(enemy.x, enemy.y - 10, 30, 5);
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x, enemy.y - 10, (enemy.currentHealth / enemy.health) * 30, 5);
        }

        if (enemy.x > canvas.width) {
            systemIntegrity -= enemy.damage;
            enemies.splice(index, 1);
            updateUI();
        }
    });

    // Draw and activate towers
    towers.forEach(tower => {
        ctx.drawImage(new Image(), tower.x, tower.y, 40, 40);

        if (timestamp - tower.lastFired > tower.fireRate) {
            const target = enemies.find(enemy => {
                const distance = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
                return distance < tower.range;
            });

            if (target) {
                fireProjectile(tower, target);
                tower.lastFired = timestamp;
            }
        }
    });

    // Move and draw projectiles
    projectiles.forEach((projectile, index) => {
        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const distance = Math.hypot(dx, dy);

        if (distance < projectile.speed) {
            projectiles.splice(index, 1);
        } else {
            projectile.x += (dx / distance) * projectile.speed;
            projectile.y += (dy / distance) * projectile.speed;

            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = projectile.color;
            ctx.fill();
        }

        // Check for collision with enemies
        enemies.forEach((enemy, enemyIndex) => {
            if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) < 15) {
                enemy.currentHealth -= projectile.damage;
                projectiles.splice(index, 1);

                if (enemy.currentHealth <= 0) {
                    resources += enemy.reward;
                    enemies.splice(enemyIndex, 1);
                    updateUI();
                }
            }
        });
    });

    // Check for wave completion
    if (enemies.length === 0 && timestamp - lastSpawnTime > 5000) {
        wave++;
        updateUI();
    }

    requestAnimationFrame(update);
}

function togglePause() {
    isGamePaused = !isGamePaused;
    if (!isGamePaused) {
        requestAnimationFrame(update);
    }
}

// Load images
Object.values(defenseTypes).forEach(type => {
    const img = new Image();
    img.src = type.icon;
});

Object.values(threatTypes).forEach(type => {
    const img = new Image();
    img.src = type.icon;
});

requestAnimationFrame(update);
updateUI();
