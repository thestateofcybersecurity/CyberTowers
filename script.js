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
    wave: 1,
    enemies: [],
    towers: [],
    projectiles: [],
    isGamePaused: false,
    lastSpawnTime: 0,
    playerLevel: 1,
    playerExperience: 0,
    unlockedDefenses: ['firewall'], // Start with only firewall unlocked

    placeTower(type) {
        const towerType = this.defenseTypes[type.toLowerCase()];
        if (this.resources >= towerType.cost && this.unlockedDefenses.includes(type.toLowerCase())) {
            this.resources -= towerType.cost;
            const tower = {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                type: type,
                ...towerType,
                lastFired: 0,
                level: 1,
                experience: 0,
                image: new Image()
            };
            tower.image.src = towerType.icon;
            this.towers.push(tower);
            this.updateUI();
        }
    },

    togglePause() {
        this.isGamePaused = !this.isGamePaused;
        if (!this.isGamePaused) {
            requestAnimationFrame(this.update.bind(this));
        }
    },

    updateUI() {
        document.getElementById('scoreValue').textContent = this.systemIntegrity;
        document.getElementById('resourcesValue').textContent = this.resources;
        document.getElementById('waveValue').textContent = this.wave;
        document.getElementById('playerLevel').textContent = this.playerLevel;
        document.getElementById('playerExperience').textContent = this.playerExperience;

        // Update defense buttons based on unlocked defenses
        Object.keys(defenseTypes).forEach(defenseType => {
            const button = document.getElementById(`${defenseType}Button`);
            if (button) {
                button.disabled = !this.unlockedDefenses.includes(defenseType);
            }
        });
    },

    updateTowerStats(tower) {
        const baseStats = defenseTypes[tower.type.toLowerCase()];
        const upgradeStats = baseStats.upgrades.find(upgrade => upgrade.level === tower.level) || {};

        Object.keys(upgradeStats).forEach(stat => {
            if (stat !== 'level' && stat !== 'special') {
                tower[stat] = upgradeStats[stat];
            }
        });

        // Reset special abilities
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
                    break;
                case 'antivirus':
                    tower.applyChainReaction = true;
                    break;
                case 'encryption':
                    tower.applySlowEffect = true;
                    break;
                case 'ai':
                    tower.applyAdaptiveDamage = true;
                    tower.adaptiveDamageCounter = 0;
                    break;
                case 'ids':
                    tower.applyRevealInvisible = true;
                    break;
                case 'soc':
                    tower.applyCoordinatedBoost = true;
                    break;
                case 'honeypot':
                    tower.applyConfuseEffect = true;
                    break;
            }
        }
    },

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

        if (tower.applySlowEffect) {
            enemy.slowDuration = 3; // Slow for 3 seconds
            enemy.slowFactor = 0.5; // Reduce speed by 50%
        }

        if (tower.applyAdaptiveDamage) {
            tower.adaptiveDamageCounter++;
            damage *= (1 + tower.adaptiveDamageCounter * 0.1); // 10% increase per hit
        }

        if (tower.applyRevealInvisible) {
            enemy.revealed = true; // Mark enemy as revealed
        }

        if (tower.applyCoordinatedBoost) {
            const nearbyTowers = this.towers.filter(t => 
                t !== tower && Math.hypot(t.x - tower.x, t.y - tower.y) < 100
            );
            nearbyTowers.forEach(t => {
                t.coordinatedBoost = 1.2; // 20% damage boost to nearby towers
            });
        }

        if (tower.applyConfuseEffect) {
            enemy.confusedDuration = 3; // Confuse for 3 seconds
        }

        return damage;
    },

    updateEnemies() {
        this.enemies.forEach(enemy => {
            if (enemy.burningDuration > 0) {
                enemy.currentHealth -= enemy.burningDamage;
                enemy.burningDuration--;
            }

            if (enemy.slowDuration > 0) {
                enemy.speed *= enemy.slowFactor;
                enemy.slowDuration--;
            }

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
            if (enemy.slowDuration === 0) {
                enemy.x += enemy.speed;
            } else {
                enemy.x += enemy.speed * enemy.slowFactor;
            }
        });
    },

    addExperienceToTower(tower, amount) {
        tower.experience += amount;
        const expForNextLevel = Math.pow(tower.level, 2) * 100;

        if (tower.experience >= expForNextLevel && tower.level < defenseTypes[tower.type.toLowerCase()].maxLevel) {
            tower.level++;
            tower.experience -= expForNextLevel;
            this.updateTowerStats(tower);
        }
    },

    addPlayerExperience(amount) {
        this.playerExperience += amount;
        const nextLevel = playerProgressionLevels.find(level => level.level === this.playerLevel + 1);

        if (nextLevel && this.playerExperience >= nextLevel.expRequired) {
            this.playerLevel++;
            this.unlockedDefenses.push(nextLevel.unlock);
            this.updateUI();
        }
    },

    spawnEnemy() {
        const threatTypes = Object.keys(this.threatTypes);
        const threatType = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        const threat = this.threatTypes[threatType];
        const waveMultiplier = 1 + (this.wave - 1) * 0.1; // 10% increase per wave
        const enemy = {
            x: 0,
            y: Math.random() * canvas.height,
            type: threatType,
            ...threat,
            currentHealth: threat.health * waveMultiplier,
            health: threat.health * waveMultiplier,
            damage: threat.damage * waveMultiplier,
            image: new Image()
        };
        enemy.image.src = threat.icon;
        this.enemies.push(enemy);
    },

    fireProjectile(tower, target, damage) {
        this.projectiles.push({
            x: tower.x,
            y: tower.y,
            targetX: target.x,
            targetY: target.y,
            color: tower.projectileColor,
            damage: damage,
            speed: 5,
            tower: tower
        });
    },

    update(timestamp) {
        if (this.isGamePaused) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Spawn enemies
        const maxEnemies = Math.min(5 + this.wave * 2, 30); // Cap at 30 enemies per wave
        if (timestamp - this.lastSpawnTime > 2000 && this.enemies.length < maxEnemies) {
            this.spawnEnemy();
            this.lastSpawnTime = timestamp;
        }

        // Update and draw enemies
        this.updateEnemies();
        this.enemies.forEach((enemy, index) => {
            if (!enemy.invisible || enemy.revealed || Math.random() < 0.1) {
                ctx.drawImage(enemy.image, enemy.x, enemy.y, 30, 30);
                // Health bar
                ctx.fillStyle = 'black';
                ctx.fillRect(enemy.x, enemy.y - 10, 30, 5);
                ctx.fillStyle = 'red';
                ctx.fillRect(enemy.x, enemy.y - 10, (enemy.currentHealth / enemy.health) * 30, 5);
            }

            if (enemy.x > canvas.width) {
                this.systemIntegrity -= enemy.damage;
                this.enemies.splice(index, 1);
                this.updateUI();
            }
        });

        // Update and draw towers
        this.towers.forEach(tower => {
            if (tower.coordinatedBoost) {
                tower.damage *= tower.coordinatedBoost;
                delete tower.coordinatedBoost;
            }

            ctx.drawImage(tower.image, tower.x, tower.y, 40, 40);

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
                }
            }
        });

        // Update and draw projectiles
        this.projectiles.forEach((projectile, index) => {
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.hypot(dx, dy);

            if (distance < projectile.speed) {
                this.projectiles.splice(index, 1);
            } else {
                projectile.x += (dx / distance) * projectile.speed;
                projectile.y += (dy / distance) * projectile.speed;

                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = projectile.color;
                ctx.fill();
            }

                                             // Check for collision with enemies
            this.enemies.forEach((enemy, enemyIndex) => {
                if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) < 15) {
                    enemy.currentHealth -= projectile.damage;
                    this.projectiles.splice(index, 1);

                    if (enemy.currentHealth <= 0) {
                        this.resources += enemy.reward;
                        this.addExperienceToTower(projectile.tower, enemy.reward);
                        this.addPlayerExperience(enemy.reward);
                        this.enemies.splice(enemyIndex, 1);
                        this.updateUI();
                    }
                }
            });
        });

        // Check for wave completion
        if (this.enemies.length === 0 && timestamp - this.lastSpawnTime > 5000) {
            this.wave++;
            this.updateUI();
        }

        requestAnimationFrame(this.update.bind(this));
    },

    start() {
        this.threatTypes = threatTypes;
        this.defenseTypes = defenseTypes;

        // Load images
        Object.values(this.defenseTypes).forEach(type => {
            const img = new Image();
            img.src = type.icon;
        });

        Object.values(this.threatTypes).forEach(type => {
            const img = new Image();
            img.src = type.icon;
        });

        this.updateUI();
        requestAnimationFrame(this.update.bind(this));
    }
};

// Start the game
game.start();
