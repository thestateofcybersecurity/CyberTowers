const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const threatTypes = {
    virus: { health: 50, speed: 1.5, damage: 5, reward: 20, icon: './api/virus.jpg' },
    trojan: { health: 80, speed: 1, damage: 8, reward: 30, icon: './api/trojan.jpg' },
    ransomware: { health: 120, speed: 0.7, damage: 15, reward: 50, icon: './api/ransomware.jpg' },
    worm: { health: 30, speed: 2, damage: 10, reward: 25, icon: './api/worm.jpg' },
    botnet: { health: 200, speed: 0.5, damage: 20, reward: 80, icon: './api/botnet.jpg' },
    phishing: { health: 20, speed: 2.5, damage: 3, reward: 15, icon: './api/phishing.jpg' },
    rootkit: { health: 100, speed: 0.8, damage: 12, reward: 40, icon: './api/rootkit.jpg', invisible: true },
    apt: { health: 150, speed: 1.2, damage: 18, reward: 60, icon: './api/apt.jpg', evolves: true }
};

const defenseTypes = {
    firewall: { 
        cost: 100, 
        damage: 15, 
        range: 120, 
        fireRate: 1000, 
        icon: './api/firewall.jpg', 
        projectileColor: '#FF0000',
        maxLevel: 5,
        upgrades: [
            { level: 2, damage: 18, range: 130 },
            { level: 3, damage: 22, fireRate: 900 },
            { level: 4, damage: 26, range: 140 },
            { level: 5, damage: 30, fireRate: 800, special: 'Burn damage over time' }
        ]
    },
    antivirus: { 
        cost: 200, 
        damage: 25, 
        range: 150, 
        fireRate: 1200, 
        icon: './api/antivirus.jpg', 
        projectileColor: '#00FF00',
        maxLevel: 5,
        upgrades: [
            { level: 2, damage: 30, range: 160 },
            { level: 3, damage: 35, fireRate: 1100 },
            { level: 4, damage: 40, range: 170 },
            { level: 5, damage: 45, fireRate: 1000, special: 'Chain reaction damage' }
        ]
    },
    encryption: { 
        cost: 300, 
        damage: 35, 
        range: 180, 
        fireRate: 1500, 
        icon: './api/encryption.jpg', 
        projectileColor: '#0000FF',
        maxLevel: 5,
        upgrades: [
            { level: 2, damage: 40, range: 190 },
            { level: 3, damage: 45, fireRate: 1400 },
            { level: 4, damage: 50, range: 200 },
            { level: 5, damage: 55, fireRate: 1300, special: 'Slow down enemies' }
        ]
    },
    ai: { 
        cost: 450, 
        damage: 50, 
        range: 200, 
        fireRate: 2000, 
        icon: './api/ai.jpg', 
        projectileColor: '#FFFF00',
        maxLevel: 5,
        upgrades: [
            { level: 2, damage: 60, range: 220 },
            { level: 3, damage: 70, fireRate: 1800 },
            { level: 4, damage: 80, range: 240 },
            { level: 5, damage: 90, fireRate: 1600, special: 'Adaptive damage increase' }
        ]
    },
    ids: { 
        cost: 350, 
        damage: 30, 
        range: 220, 
        fireRate: 1300, 
        icon: './api/ids.jpg', 
        projectileColor: '#800080',
        maxLevel: 5,
        upgrades: [
            { level: 2, damage: 35, range: 240 },
            { level: 3, damage: 40, fireRate: 1200 },
            { level: 4, damage: 45, range: 260 },
            { level: 5, damage: 50, fireRate: 1100, special: 'Reveal invisible enemies' }
        ]
    },
    soc: { 
        cost: 550, 
        damage: 45, 
        range: 250, 
        fireRate: 1800, 
        icon: './api/soc.jpg', 
        projectileColor: '#FFA500',
        maxLevel: 5,
        upgrades: [
            { level: 2, damage: 55, range: 270 },
            { level: 3, damage: 65, fireRate: 1700 },
            { level: 4, damage: 75, range: 290 },
            { level: 5, damage: 85, fireRate: 1600, special: 'Coordinated attack boost' }
        ]
    },
    honeypot: { 
        cost: 150, 
        damage: 5, 
        range: 150, 
        fireRate: 800, 
        icon: './api/honeypot.jpg', 
        projectileColor: '#FFD700',
        maxLevel: 5,
        upgrades: [
            { level: 2, range: 170, special: 'Attract enemies in range' },
            { level: 3, damage: 10, fireRate: 700 },
            { level: 4, range: 190, special: 'Slow enemies in range' },
            { level: 5, damage: 15, fireRate: 600, special: 'Confuse enemies, making them attack each other' }
        ]
    }
};

const playerProgressionLevels = [
    { level: 1, expRequired: 0, unlock: 'firewall' },
    { level: 2, expRequired: 100, unlock: 'antivirus' },
    { level: 3, expRequired: 300, unlock: 'encryption' },
    { level: 4, expRequired: 600, unlock: 'ids' },
    { level: 5, expRequired: 1000, unlock: 'ai' },
    { level: 6, expRequired: 1500, unlock: 'soc' },
    { level: 7, expRequired: 2100, unlock: 'honeypot' }
];

const game = {
    systemIntegrity: 100,
    resources: 300,
    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    isGamePaused: false,
    lastSpawnTime: 0,
    playerLevel: 1,
    playerExperience: 0,
    unlockedDefenses: ['firewall'],
    selectedTowerType: 'firewall',
    gridSize: 40,
    grid: [],
    currentWave: 0,
    waveTimer: 0,
    waveDuration: 30000,
    breakDuration: 10000,
    isWaveActive: false,

    path: [
        {x: 0, y: 300},
        {x: 200, y: 300},
        {x: 200, y: 100},
        {x: 600, y: 100},
        {x: 600, y: 500},
        {x: 800, y: 500}
    ],

    sounds: {
        backgroundMusic: new Audio('./api/background_music.mp3'),
        towerShoot: new Audio('./api/tower_shoot.mp3'),
        enemyDeath: new Audio('./api/enemy_death.mp3')
    },

        startBackgroundMusic() {
        // Remove automatic play
        this.sounds.backgroundMusic.loop = true;
    },

    initializeGrid() {
        for (let y = 0; y < canvas.height; y += this.gridSize) {
            for (let x = 0; x < canvas.width; x += this.gridSize) {
                this.grid.push({x, y, occupied: false});
            }
        }
    },

    getGridCell(x, y) {
        return this.grid.find(cell => 
            x >= cell.x && x < cell.x + this.gridSize &&
            y >= cell.y && y < cell.y + this.gridSize
        );
    },

    placeTower(type, x, y) {
        const towerType = this.defenseTypes[type.toLowerCase()];
        const cell = this.getGridCell(x, y);
        if (this.resources >= towerType.cost && this.unlockedDefenses.includes(type.toLowerCase()) && cell && !cell.occupied) {
            this.resources -= towerType.cost;
            const tower = {
                x: cell.x,
                y: cell.y,
                type: type,
                ...towerType,
                lastFired: 0,
                level: 1,
                experience: 0,
                image: new Image()
            };
            tower.image.src = towerType.icon;
            this.towers.push(tower);
            cell.occupied = true;
            this.updateUI();
        }
    },

    spawnEnemy() {
        const threatTypes = Object.keys(this.threatTypes);
        const threatType = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        const threat = this.threatTypes[threatType];
        const waveMultiplier = 1 + (this.currentWave - 1) * 0.1; // 10% increase per wave
        const enemy = {
            x: this.path[0].x,
            y: this.path[0].y,
            type: threatType,
            ...threat,
            currentHealth: threat.health * waveMultiplier,
            health: threat.health * waveMultiplier,
            damage: threat.damage * waveMultiplier,
            image: new Image(),
            pathIndex: 0
        };
        enemy.image.src = threat.icon;
        this.enemies.push(enemy);
    },

    moveEnemyAlongPath(enemy) {
        const targetPoint = this.path[enemy.pathIndex];
        const dx = targetPoint.x - enemy.x;
        const dy = targetPoint.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < enemy.speed) {
            enemy.pathIndex++;
            if (enemy.pathIndex >= this.path.length) {
                return true; // Enemy reached the end
            }
        } else {
            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;
        }
        return false;
    },

    addEffect(x, y, type) {
        this.effects.push({x, y, type, frame: 0});
    },

    updateAndDrawEffects() {
        this.effects = this.effects.filter(effect => {
            effect.frame++;
            if (effect.type === 'explosion') {
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.frame, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 0, 0, ${1 - effect.frame / 20})`;
                ctx.fill();
            }
            return effect.frame < 20;
        });
    },

    updateWaveSystem(timestamp) {
        if (!this.isWaveActive) {
            if (timestamp - this.waveTimer > this.breakDuration) {
                this.startNewWave();
            }
        } else {
            if (timestamp - this.waveTimer > this.waveDuration || this.enemies.length === 0) {
                this.endWave();
            }
        }
    },

    startNewWave() {
        this.currentWave++;
        this.isWaveActive = true;
        this.waveTimer = performance.now();
        for (let i = 0; i < this.currentWave * 2; i++) {
            this.spawnEnemy();
        }
    },

    endWave() {
        this.isWaveActive = false;
        this.waveTimer = performance.now();
        this.resources += 100 * this.currentWave;
        this.updateUI();
    },

    playSoundEffect(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play();
        }
    },

    startBackgroundMusic() {
        this.sounds.backgroundMusic.loop = true;
        this.sounds.backgroundMusic.play();
    },

    update(timestamp) {
        if (this.isGamePaused) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update wave system
        this.updateWaveSystem(timestamp);

        // Spawn enemies
        if (this.isWaveActive && timestamp - this.lastSpawnTime > 2000 && this.enemies.length < this.currentWave * 5) {
            this.spawnEnemy();
            this.lastSpawnTime = timestamp;
        }

        // Update and draw enemies
        this.enemies = this.enemies.filter((enemy) => {
            const reachedEnd = this.moveEnemyAlongPath(enemy);
            if (reachedEnd) {
                this.systemIntegrity -= enemy.damage;
                this.updateUI();
                return false;
            }

            if (!enemy.invisible || enemy.revealed) {
                ctx.drawImage(enemy.image, enemy.x, enemy.y, 30, 30);
                // Health bar
                ctx.fillStyle = 'black';
                ctx.fillRect(enemy.x, enemy.y - 10, 30, 5);
                ctx.fillStyle = 'red';
                ctx.fillRect(enemy.x, enemy.y - 10, (enemy.currentHealth / enemy.health) * 30, 5);
            }

            return true;
        });

        // Update and draw towers
        this.towers.forEach(tower => {
            ctx.drawImage(tower.image, tower.x, tower.y, this.gridSize, this.gridSize);

            if (timestamp - tower.lastFired > tower.fireRate) {
                const target = this.enemies.find(enemy => {
                    if (tower.applyRevealInvisible || !enemy.invisible) {
                        const distance = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
                        return distance < tower.range;
                    }
                    return false;
                });

                if (target) {
                    const damage = this.applySpecialAbilities(tower, target);
                    this.fireProjectile(tower, target, damage);
                    tower.lastFired = timestamp;
                    this.playSoundEffect('towerShoot');
                }
            }
        });

            applySpecialAbilities(tower, enemy) {
        let damage = tower.damage;

        if (tower.applyBurnEffect) {
            enemy.burningDuration = 3; // Apply burn for 3 seconds
            enemy.burningDamage = tower.damage * 0.2; // 20% of tower's damage per second
        }

        if (tower.applyChainReaction) {
            const nearbyEnemies = this.enemies.filter(e => 
                e !== enemy && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 50
            );
            nearbyEnemies.forEach(e => {
                e.currentHealth -= tower.damage * 0.5; // 50% damage to nearby enemies
            });
        }

        // Update and draw projectiles
        this.projectiles = this.projectiles.filter((projectile) => {
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.hypot(dx, dy);

            if (distance < projectile.speed) {
                const targetEnemy = this.enemies.find(enemy => 
                    Math.hypot(enemy.x - projectile.targetX, enemy.y - projectile.targetY) < 15
                );
                if (targetEnemy) {
                    targetEnemy.currentHealth -= projectile.damage;
                    this.addEffect(projectile.targetX, projectile.targetY, 'explosion');
                    if (targetEnemy.currentHealth <= 0) {
                        this.resources += targetEnemy.reward;
                        this.addExperienceToTower(projectile.tower, targetEnemy.reward);
                        this.addPlayerExperience(targetEnemy.reward);
                        this.enemies = this.enemies.filter(e => e !== targetEnemy);
                        this.playSoundEffect('enemyDeath');
                    }
                }
                return false;
            }

            projectile.x += (dx / distance) * projectile.speed;
            projectile.y += (dy / distance) * projectile.speed;

            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = projectile.color;
            ctx.fill();

            return true;
        });

        // Update and draw effects
        this.updateAndDrawEffects();

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        for (let x = 0; x < canvas.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        requestAnimationFrame(this.update.bind(this));
    },

        selectTower(towerType) {
        this.selectedTowerType = towerType;
        // Update UI to show selected tower
        document.querySelectorAll('.towerButton').forEach(button => {
            button.classList.remove('selected');
        });
        document.querySelector(`[data-tower="${towerType}"]`).classList.add('selected');
    },

    updateUI() {
        document.getElementById('scoreValue').textContent = this.systemIntegrity;
        document.getElementById('resourcesValue').textContent = this.resources;
        document.getElementById('waveValue').textContent = this.currentWave;
        document.getElementById('playerLevel').textContent = this.playerLevel;
        document.getElementById('playerExperience').textContent = this.playerExperience;

        // Update tower buttons based on unlocked defenses and available resources
        Object.keys(this.defenseTypes).forEach(defenseType => {
            const button = document.querySelector(`[data-tower="${defenseType}"]`);
            if (button) {
                const isUnlocked = this.unlockedDefenses.includes(defenseType);
                const isAffordable = this.resources >= this.defenseTypes[defenseType].cost;
                button.disabled = !isUnlocked || !isAffordable;
                button.classList.toggle('affordable', isAffordable);
            }
        });
    },

    start() {
        this.threatTypes = threatTypes;
        this.defenseTypes = defenseTypes;
        this.initializeGrid();
        this.startBackgroundMusic();

        // Load images
        Object.values(this.defenseTypes).forEach(type => {
            const img = new Image();
            img.src = type.icon;
        });

        Object.values(this.threatTypes).forEach(type => {
            const img = new Image();
            img.src = type.icon;
        });

        // Add event listeners for tower selection
        document.querySelectorAll('.towerButton').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.getAttribute('data-tower');
                this.selectTower(towerType);
            });
        });

        // Add event listener for tower placement
        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            this.placeTower(this.selectedTowerType, x, y);
        });

        // Add event listener for pause button
        document.getElementById('pauseButton').addEventListener('click', () => {
            this.togglePause();
        });

        this.updateUI();
        // Add a start button
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.addEventListener('click', () => {
            this.sounds.backgroundMusic.play().catch(e => console.log("Audio play failed:", e));
            this.startNewWave();
            requestAnimationFrame(this.update.bind(this));
            startButton.remove();
        });
        document.body.appendChild(startButton);
    }
};

// Start the game
game.start();
