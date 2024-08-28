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
        fireRate: 100, 
        icon: './api/firewall.jpg', 
        projectileColor: '#FF0000',
        maxLevel: 5,
        upgrades: [
            { level: 2, damage: 18, range: 130 },
            { level: 3, damage: 22, fireRate: 90 },
            { level: 4, damage: 26, range: 140 },
            { level: 5, damage: 30, fireRate: 80, special: 'Burn damage over time' }
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

const game = {
    systemIntegrity: 100,
    resources: 500,
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
    isGamePaused: false,
    gridColor: '#0A3C59',
    backgroundColor: '#020E18',
    pathColor: '#00FFFF',

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

    togglePause() {
        this.isGamePaused = !this.isGamePaused;
        if (this.isGamePaused) {
            // Optionally, you can add code here to show a "Paused" message on the screen
            console.log("Game Paused");
        } else {
            console.log("Game Resumed");
            // If the game was paused, we need to restart the game loop
            requestAnimationFrame(this.update.bind(this));
        }
    },

    drawBackground() {
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    drawGrid() {
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 0.5;
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
    },

    drawPath() {
        ctx.strokeStyle = this.pathColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        ctx.stroke();
    },  
    
    fireProjectile(tower, target, damage) {
        this.projectiles.push({
            x: tower.x,
            y: tower.y,
            targetX: target.x,
            targetY: target.y,
            damage: damage,
            speed: 5,
            color: tower.projectileColor,
            tower: tower
        });
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

    applySpecialAbilities(tower, enemy) {
        let damage = tower.damage;

        switch (tower.type.toLowerCase()) {
            case 'firewall':
                if (tower.applyBurnEffect) {
                    enemy.burningDuration = 3; // Apply burn for 3 seconds
                    enemy.burningDamage = tower.damage * 0.2; // 20% of tower's damage per second
                }
                break;

            case 'antivirus':
                if (tower.applyChainReaction) {
                    const nearbyEnemies = this.enemies.filter(e => 
                        e !== enemy && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 50
                    );
                    nearbyEnemies.forEach(e => {
                        e.currentHealth -= tower.damage * 0.5; // 50% damage to nearby enemies
                    });
                }
                break;

            case 'encryption':
                if (tower.applySlowEffect) {
                    enemy.slowDuration = 3; // Slow for 3 seconds
                    enemy.slowFactor = 0.5; // Reduce speed by 50%
                }
                break;

            case 'ai':
                if (tower.applyAdaptiveDamage) {
                    tower.adaptiveDamageCounter = (tower.adaptiveDamageCounter || 0) + 1;
                    damage *= (1 + tower.adaptiveDamageCounter * 0.1); // 10% increase per hit
                }
                break;

            case 'ids':
                if (tower.applyRevealInvisible) {
                    enemy.revealed = true; // Mark enemy as revealed
                }
                break;

            case 'soc':
                if (tower.applyCoordinatedBoost) {
                    const nearbyTowers = this.towers.filter(t => 
                        t !== tower && Math.hypot(t.x - tower.x, t.y - tower.y) < 100
                    );
                    nearbyTowers.forEach(t => {
                        t.coordinatedBoost = 1.2; // 20% damage boost to nearby towers
                    });
                }
                break;

            case 'honeypot':
                if (tower.applyConfuseEffect) {
                    enemy.confusedDuration = 3; // Confuse for 3 seconds
                }
                break;
        }

        return damage;
    },

    addExperienceToTower(tower, amount) {
        tower.experience += amount;
        const expForNextLevel = Math.pow(tower.level, 2) * 100;
        
        if (tower.experience >= expForNextLevel && tower.level < this.defenseTypes[tower.type.toLowerCase()].maxLevel) {
            tower.level++;
            tower.experience -= expForNextLevel;
            this.updateTowerStats(tower);
    
            // Reward player with additional resources when a tower levels up
            this.resources += 50 * tower.level; // Scale reward based on tower level
            this.updateUI();
        }
    },

    playerProgressionLevels: [
        { level: 1, expRequired: 0, unlock: 'firewall' },
        { level: 2, expRequired: 100, unlock: 'antivirus' },
        { level: 3, expRequired: 300, unlock: 'encryption' },
        { level: 4, expRequired: 600, unlock: 'ids' },
        { level: 5, expRequired: 1000, unlock: 'ai' },
        { level: 6, expRequired: 1500, unlock: 'soc' },
        { level: 7, expRequired: 2100, unlock: 'honeypot' }
    ],

    addPlayerExperience(amount) {
        this.playerExperience += amount;
        const nextLevel = this.playerProgressionLevels.find(level => level.level === this.playerLevel + 1);
        
        if (nextLevel && this.playerExperience >= nextLevel.expRequired) {
            this.playerLevel++;
            this.unlockedDefenses.push(nextLevel.unlock);
            this.updateUI();
        }
    },
    
    updateTowerStats(tower) {
        const baseStats = this.defenseTypes[tower.type.toLowerCase()];
        const upgradeStats = baseStats.upgrades.find(upgrade => upgrade.level === tower.level) || {};
        
        // Update basic stats
        Object.keys(upgradeStats).forEach(stat => {
            if (stat !== 'level' && stat !== 'special') {
                tower[stat] = upgradeStats[stat];
            }
        });

        // Reset all special abilities
        tower.applyBurnEffect = false;
        tower.applyChainReaction = false;
        tower.applySlowEffect = false;
        tower.applyAdaptiveDamage = false;
        tower.applyRevealInvisible = false;
        tower.applyCoordinatedBoost = false;
        tower.applyConfuseEffect = false;

        // Handle special abilities at level 5
        if (tower.level === 5) {
            switch (tower.type.toLowerCase()) {
                case 'firewall':
                    tower.applyBurnEffect = true;
                    tower.burnDamage = tower.damage * 0.2; // 20% of tower's damage per second
                    tower.burnDuration = 3; // 3 seconds
                    break;
                case 'antivirus':
                    tower.applyChainReaction = true;
                    tower.chainReactionRange = 50; // 50 pixel radius
                    tower.chainReactionDamage = tower.damage * 0.5; // 50% of tower's damage
                    break;
                case 'encryption':
                    tower.applySlowEffect = true;
                    tower.slowFactor = 0.5; // Reduce speed by 50%
                    tower.slowDuration = 3; // 3 seconds
                    break;
                case 'ai':
                    tower.applyAdaptiveDamage = true;
                    tower.adaptiveDamageIncrease = 0.1; // 10% increase per hit
                    tower.adaptiveDamageCounter = 0;
                    break;
                case 'ids':
                    tower.applyRevealInvisible = true;
                    tower.revealDuration = 5; // 5 seconds
                    break;
                case 'soc':
                    tower.applyCoordinatedBoost = true;
                    tower.coordinatedBoostRange = 100; // 100 pixel radius
                    tower.coordinatedBoostFactor = 1.2; // 20% damage boost
                    break;
                case 'honeypot':
                    tower.applyConfuseEffect = true;
                    tower.confuseDuration = 3; // 3 seconds
                    tower.confuseChance = 0.3; // 30% chance to attack other enemies
                    break;
            }
        }

        // Update tower's appearance or any other relevant properties
        this.updateTowerAppearance(tower);
    },

    updateEnemies() {
        this.enemies.forEach(enemy => {
            // Apply burning effect
            if (enemy.burningDuration > 0) {
                enemy.currentHealth -= enemy.burningDamage;
                enemy.burningDuration--;
            }

            // Apply slow effect
            if (enemy.slowDuration > 0) {
                enemy.speed *= enemy.slowFactor;
                enemy.slowDuration--;
            } else {
                enemy.speed = this.threatTypes[enemy.type].speed; // Reset speed when slow effect ends
            }

            // Apply confusion effect
            if (enemy.confusedDuration > 0) {
                if (Math.random() < 0.3) { // 30% chance to attack other enemies
                    const nearbyEnemy = this.enemies.find(e => 
                        e !== enemy && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 50
                    );
                    if (nearbyEnemy) {
                        nearbyEnemy.currentHealth -= enemy.damage;
                    }
                }
                enemy.confusedDuration--;
            }

            // Move enemy
            const reachedEnd = this.moveEnemyAlongPath(enemy);
            if (reachedEnd) {
                this.systemIntegrity -= enemy.damage;
                this.enemies = this.enemies.filter(e => e !== enemy);
                this.updateUI();
            }
        });
    },
    
    spawnEnemy(waveMultiplier) {
        const threatTypes = Object.keys(this.threatTypes);
        
        let threatType;
        if (this.currentWave <= 5) {
            // Early game threats
            threatType = threatTypes[Math.floor(Math.random() * 2)]; // Virus, Worm
        } else if (this.currentWave <= 10) {
            // Mid game threats
            threatType = threatTypes[Math.floor(Math.random() * 4)]; // Add Trojan, Ransomware
        } else {
            // Late game threats
            threatType = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        }
    
        const threat = this.threatTypes[threatType];
        const enemy = {
            x: this.path[0].x,
            y: this.path[0].y,
            type: threatType,
            ...threat,
            currentHealth: threat.health * waveMultiplier,
            maxHealth: threat.health * waveMultiplier, // Store the max health
            damage: threat.damage * waveMultiplier,
            reward: threat.reward * waveMultiplier,
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
        
        const waveMultiplier = 1 + (this.currentWave - 1) * 0.1; // 10% increase per wave
        const enemiesPerWave = Math.min(this.currentWave * 2, 50); // Cap at 50 enemies per wave
    
        for (let i = 0; i < enemiesPerWave; i++) {
            const delay = i * 1000 / waveMultiplier; // Stagger enemy spawns
            setTimeout(() => this.spawnEnemy(waveMultiplier), delay);
        }
    },

    endWave() {
        this.isWaveActive = false;
        this.waveTimer = performance.now();
        this.resources += 100 * this.currentWave; // Wave completion bonus
        this.updateUI();
    
        // Introduce resource bonuses or tower upgrades based on wave completion
        if (this.currentWave % 5 === 0) {
            this.resources += this.resources * 0.1; // 10% resource bonus every 5 waves
            // Optionally unlock a special upgrade or give a bonus
            // e.g., Automatically level up a random tower
        }
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

        this.drawBackground();
        this.drawGrid();
        this.drawPath();

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
            return false; // Remove this enemy from the array
        } else {
            // Draw enemy
            if (!enemy.invisible || enemy.revealed) {
                ctx.drawImage(enemy.image, enemy.x, enemy.y, 30, 30);
                
                // Draw health bar
                const healthPercentage = enemy.currentHealth / enemy.maxHealth;
                const healthBarWidth = 30; // Same as enemy width
                const healthBarHeight = 5;
                const healthBarY = enemy.y - 10;
    
                // Health bar background
                ctx.fillStyle = 'black';
                ctx.fillRect(enemy.x, healthBarY, healthBarWidth, healthBarHeight);
    
                // Health bar fill
                ctx.fillStyle = this.getHealthBarColor(healthPercentage);
                ctx.fillRect(enemy.x, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
    
                // Optional: Add outline to health bar
                ctx.strokeStyle = 'white';
                ctx.strokeRect(enemy.x, healthBarY, healthBarWidth, healthBarHeight);
            }
            return true; // Keep this enemy in the array
        }
    });
        
        // Update and draw towers
        this.towers.forEach(tower => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0, 255, 255, 0.7)';
            ctx.drawImage(tower.image, tower.x, tower.y, this.gridSize, this.gridSize);
            ctx.shadowBlur = 0;

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
            requestAnimationFrame(this.update.bind(this));
        });

        // Update and draw effects
        this.updateAndDrawEffects();

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

    // Update UI method to reflect wave, resources, and difficulty
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

    getHealthBarColor(percentage) {
        if (percentage > 0.6) return 'green';
        if (percentage > 0.3) return 'yellow';
        return 'red';
    },

    initializeEventListeners() {
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
        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                this.togglePause();
            });
        } else {
            console.warn('Pause button not found in the DOM');
        }
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

         if (!this.playerProgressionLevels) {
            console.error('playerProgressionLevels is not defined!');
        }

        this.initializeEventListeners();

        // Bind the update method to the game object
        this.boundUpdate = this.update.bind(this);

        this.updateUI();

        // Add a start button
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.addEventListener('click', () => {
            if (this.sounds && this.sounds.backgroundMusic) {
                this.sounds.backgroundMusic.play().catch(e => console.log("Audio play failed:", e));
            }
            this.startNewWave();
            requestAnimationFrame(this.boundUpdate);
            startButton.remove();
        });
        document.body.appendChild(startButton);
    }
};

// Start the game
game.start();
