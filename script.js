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
            { level: 5, damage: 55, fireRate: 1300, special: 'Slow down threats' }
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
            { level: 5, damage: 50, fireRate: 1100, special: 'Reveal invisible threats' }
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
            { level: 2, range: 170, special: 'Attract threats in range' },
            { level: 3, damage: 10, fireRate: 700 },
            { level: 4, range: 190, special: 'Slow threats in range' },
            { level: 5, damage: 15, fireRate: 600, special: 'Confuse threats, making them attack each other' }
        ]
    }
};

const skillTree = {
    towerAttackSpeed: { cost: 100, level: 0, maxLevel: 5, effect: () => this.towers.forEach(t => t.fireRate *= 0.9) },
    towerRange: { cost: 150, level: 0, maxLevel: 5, effect: () => this.towers.forEach(t => t.range += 10) },
    towerDamage: { cost: 200, level: 0, maxLevel: 5, effect: () => this.towers.forEach(t => t.damage += 5) }
};

const game = {
    systemIntegrity: 100,
    resources: 500,
    threats: [],
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
    gridColor: '#0A3C59',
    backgroundColor: '#020E18',
    pathColor: '#00FFFF',
    state: 'menu', // Can be 'menu', 'playing', 'paused', 'gameOver'
    imageCache: {},
    gridMap: new Map(),
    threatTypes: threatTypes,
    defenseTypes: defenseTypes,
    
    preloadImages() {
        const imagesToLoad = [
            ...Object.values(this.threatTypes || {}).map(threat => threat.icon),
            ...Object.values(this.defenseTypes || {}).map(defense => defense.icon)
        ].filter(Boolean);  // Filter out any undefined values

        const loadPromises = imagesToLoad.map(src => {
            return new Promise((resolve, reject) => {
                if (!src) {
                    resolve();  // Resolve immediately if src is undefined
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    this.imageCache[src] = img;
                    resolve(img);
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${src}`);
                    resolve();  // Resolve even on error to continue loading other images
                };
                img.src = src;
            });
        });

        return Promise.all(loadPromises);
    },
    
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
        threatDeath: new Audio('./api/threat_death.mp3')
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
                const key = `${x},${y}`;
                this.gridMap.set(key, { x, y, occupied: false });
            }
        }
    },

    getGridCell(x, y) {
        const key = `${Math.floor(x / this.gridSize) * this.gridSize},${Math.floor(y / this.gridSize) * this.gridSize}`;
        return this.gridMap.get(key);
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
    
            // Synergy bonus logic
            this.applySynergyBonus(tower, cell);
    
            this.updateUI();
        }
    },
    
    applySynergyBonus(tower, cell) {
        const adjacentCells = [
            this.getGridCell(cell.x - this.gridSize, cell.y),
            this.getGridCell(cell.x + this.gridSize, cell.y),
            this.getGridCell(cell.x, cell.y - this.gridSize),
            this.getGridCell(cell.x, cell.y + this.gridSize)
        ];
    
        adjacentCells.forEach(adjacentCell => {
            if (adjacentCell && adjacentCell.occupied) {
                const adjacentTower = this.towers.find(t => t.x === adjacentCell.x && t.y === adjacentCell.y);
                if (adjacentTower && (adjacentTower.type === 'firewall' || adjacentTower.type === 'antivirus')) {
                    tower.damage += 5; // Example synergy bonus
                }
            }
        });
    },

    applySpecialAbilities(tower, threat) { // Changed threat to threat
        let damage = tower.damage;

        switch (tower.type.toLowerCase()) {
            case 'firewall':
                if (tower.applyBurnEffect) {
                    threat.burningDuration = 3; // Apply burn for 3 seconds
                    threat.burningDamage = tower.damage * 0.2; // 20% of tower's damage per second
                }
                break;

            case 'antivirus':
                if (tower.applyChainReaction) {
                    const nearbyThreats = this.threats.filter(e => 
                        e !== threat && Math.hypot(e.x - threat.x, e.y - threat.y) < 50
                    );
                    nearbyThreats.forEach(e => {
                        e.currentHealth -= tower.damage * 0.5; // 50% damage to nearby threats
                    });
                }
                break;

            case 'encryption':
                if (tower.applySlowEffect) {
                    threat.slowDuration = 3; // Slow for 3 seconds
                    threat.slowFactor = 0.5; // Reduce speed by 50%
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
                    threat.revealed = true; // Mark threat as revealed
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
                    threat.confusedDuration = 3; // Confuse for 3 seconds
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
                    tower.confuseChance = 0.3; // 30% chance to attack other threats
                    break;
            }
        }
    },
    
    updateThreats() { // Changed from updateThreats
        this.threats.forEach(threat => {
            // Apply burning effect
            if (threat.burningDuration > 0) {
                threat.currentHealth -= threat.burningDamage;
                threat.burningDuration--;
            }

            // Apply slow effect
            if (threat.slowDuration > 0) {
                threat.speed *= threat.slowFactor;
                threat.slowDuration--;
            } else {
                threat.speed = this.threatTypes[threat.type].speed; // Reset speed when slow effect ends
            }

            // Apply confusion effect
            if (threat.confusedDuration > 0) {
                if (Math.random() < 0.3) { // 30% chance to attack other threats
                    const nearbyThreat = this.threats.find(t => 
                        t !== threat && Math.hypot(t.x - threat.x, t.y - threat.y) < 50
                    );
                    if (nearbyThreat) {
                        nearbyThreat.currentHealth -= threat.damage;
                    }
                }
                threat.confusedDuration--;
            }

            // Move threat
            const reachedEnd = this.moveThreatAlongPath(threat);
            if (reachedEnd) {
                this.systemIntegrity -= threat.damage;
                this.threats = this.threats.filter(t => t !== threat);
                this.updateUI();
            }
        });
    },

    upgradeSkill(skill) {
        if (this.resources >= skillTree[skill].cost && skillTree[skill].level < skillTree[skill].maxLevel) {
            this.resources -= skillTree[skill].cost;
            skillTree[skill].level++;
            skillTree[skill].effect();
            this.updateUI();
        }
    },
    
    // Player abilities
    useAbility(ability) {
        if (ability === 'airstrike') {
            this.threats = this.threats.filter(threat => {
                if (Math.random() < 0.5) { // 50% chance to kill each threat
                    this.handleThreatDeath(threat);
                    return false;
                }
                return true;
            });
        } else if (ability === 'shield') {
            this.towers.forEach(tower => tower.shielded = true);
            setTimeout(() => this.towers.forEach(tower => tower.shielded = false), 5000); // 5 second shield
        }
    },
    
    selectThreatType() {
        const availableThreats = Object.keys(this.threatTypes);
        let possibleThreats;

        if (this.currentWave <= 5) {
            // Early game: Only basic threats
            possibleThreats = availableThreats.slice(0, 2);
        } else if (this.currentWave <= 10) {
            // Mid game: Introduce more complex threats
            possibleThreats = availableThreats.slice(0, 4);
        } else {
            // Late game: All threats possible
            possibleThreats = availableThreats;
        }

        // Randomly select a threat from the possible threats
        return possibleThreats[Math.floor(Math.random() * possibleThreats.length)];
    },

    spawnThreat(waveMultiplier) {
        const threatType = this.selectThreatType();
        const threat = this.threatTypes[threatType];
        const newThreat = {
            x: this.path[0].x,
            y: this.path[0].y,
            type: threatType,
            ...threat,
            currentHealth: threat.health * waveMultiplier,
            maxHealth: threat.health * waveMultiplier,
            damage: threat.damage * waveMultiplier,
            reward: threat.reward * waveMultiplier,
            image: this.imageCache[threat.icon],
            pathIndex: 0
        };
        this.threats.push(newThreat);
    },

    moveThreatAlongPath(threat) {
        const targetPoint = this.path[threat.pathIndex];
        const dx = targetPoint.x - threat.x;
        const dy = targetPoint.y - threat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
    
        if (distance < threat.speed) {
            threat.pathIndex++;
            if (threat.pathIndex >= this.path.length) {
                return true; // Threat reached the end
            }
        } else {
            threat.x += (dx / distance) * threat.speed;
            threat.y += (dy / distance) * threat.speed;
        }
    
        // Path influence logic
        this.applyPathInfluence(threat);
    
        return false;
    },
    
    applyPathInfluence(threat) {
        this.towers.forEach(tower => {
            if (tower.type === 'encryption' && Math.hypot(threat.x - tower.x, threat.y - tower.y) < tower.range) {
                threat.speed *= 0.9; // Slow down threats near Encryption towers
            }
        });
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
            if (timestamp - this.waveTimer > this.waveDuration || this.threats.length === 0) {
                this.endWave();
            }
        }
    },

    startNewWave() {
        this.currentWave++;
        this.isWaveActive = true;
        this.waveTimer = performance.now();
        
        const waveMultiplier = 1 + (this.currentWave - 1) * 0.1; // 10% increase per wave
        const threatsPerWave = Math.min(this.currentWave * 2, 50); // Cap at 50 threats per wave
    
        for (let i = 0; i < threatsPerWave; i++) {
            const delay = i * 1000 / waveMultiplier; // Stagger threat spawns
            setTimeout(() => this.spawnThreat(waveMultiplier), delay);
        }
    },

    startEndlessMode() {
        this.currentWave = 1;
        this.systemIntegrity = 100;
        this.resources = 500;
        this.endless = true;
        this.setState('playing');
    },
    
    endWave() {
        if (this.endless) {
            this.currentWave++;
            this.resources += 100 * this.currentWave; // Increase resource gain in endless mode
            this.updateUI();
            setTimeout(() => this.startNewWave(), 3000); // Auto-start next wave after a short break
        } else {
        this.isWaveActive = false;
        this.waveTimer = performance.now();
        const waveBonus = this.systemIntegrity / 100 * 100 * this.currentWave; // Bonus based on system integrity
        this.resources += waveBonus;
        this.updateUI();
    
        if (this.currentWave % 5 === 0) {
            this.resources += this.resources * 0.1; // 10% resource bonus every 5 waves
        }
    },

    // Add challenge modes
    startChallengeMode(challenge) {
        if (challenge === 'limitedResources') {
            this.resources = 300; // Start with fewer resources
        } else if (challenge === 'restrictedTowers') {
            this.unlockedDefenses = ['firewall', 'antivirus']; // Restrict available towers
        }
        this.startGame();
    },

    playSoundEffect(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log(`Failed to play sound: ${soundName}`, e));
        }
    },

    startBackgroundMusic() {
        this.sounds.backgroundMusic.loop = true;
        this.sounds.backgroundMusic.play();
    },

    showMenu() {
        // Clear the screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Display the title
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Cybersecurity Tower Defense', canvas.width / 2, 150);
    
        // Create and display buttons
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.style.position = 'absolute';
        startButton.style.left = `${canvas.width / 2 - 60}px`;
        startButton.style.top = '250px';
        startButton.addEventListener('click', () => {
            document.body.removeChild(startButton);
            this.startGame();
        });
        document.body.appendChild(startButton);
    
        const optionsButton = document.createElement('button');
        optionsButton.textContent = 'Options';
        optionsButton.style.position = 'absolute';
        optionsButton.style.left = `${canvas.width / 2 - 60}px`;
        optionsButton.style.top = '320px';
        optionsButton.addEventListener('click', () => {
            this.showOptions();
        });
        document.body.appendChild(optionsButton);
    
        const exitButton = document.createElement('button');
        exitButton.textContent = 'Exit';
        exitButton.style.position = 'absolute';
        exitButton.style.left = `${canvas.width / 2 - 60}px`;
        exitButton.style.top = '390px';
        exitButton.addEventListener('click', () => {
            window.close(); // Close the browser window or exit the game
        });
        document.body.appendChild(exitButton);
    },

    startGame() {
        this.isGamePaused = false;
        this.currentWave = 1;
        this.systemIntegrity = 100;
        this.resources = 500;
    
        // Clear any existing UI elements from the menu
        document.querySelectorAll('button').forEach(button => document.body.removeChild(button));
    
        // Initialize the grid, load the first wave, and start the game loop
        this.initializeGrid();
        this.startNewWave();
        requestAnimationFrame(this.boundUpdate); // Begin the game loop
    },

    pauseGame() {
        this.isGamePaused = true;
        cancelAnimationFrame(this.boundUpdate); // Stop the game loop
    
        // Display the pause menu
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.style.position = 'absolute';
        pauseMenu.style.left = `${canvas.width / 2 - 100}px`;
        pauseMenu.style.top = `${canvas.height / 2 - 50}px`;
        pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        pauseMenu.style.padding = '20px';
        pauseMenu.style.borderRadius = '10px';
        pauseMenu.style.textAlign = 'center';
        pauseMenu.style.color = 'white';
    
        const resumeButton = document.createElement('button');
        resumeButton.textContent = 'Resume';
        resumeButton.style.marginBottom = '10px';
        resumeButton.addEventListener('click', () => {
            document.body.removeChild(pauseMenu);
            this.isGamePaused = false;
            requestAnimationFrame(this.boundUpdate); // Resume the game loop
        });
        pauseMenu.appendChild(resumeButton);
    
        const quitButton = document.createElement('button');
        quitButton.textContent = 'Quit to Menu';
        quitButton.addEventListener('click', () => {
            document.body.removeChild(pauseMenu);
            this.showMenu();
        });
        pauseMenu.appendChild(quitButton);
    
        document.body.appendChild(pauseMenu);
    },

    endGame() {
        cancelAnimationFrame(this.boundUpdate); // Stop the game loop
    
        // Clear the game area
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Display the game over message
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, 150);
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${this.currentWave}`, canvas.width / 2, 200);
    
        // Create and display a button to return to the main menu
        const menuButton = document.createElement('button');
        menuButton.textContent = 'Return to Menu';
        menuButton.style.position = 'absolute';
        menuButton.style.left = `${canvas.width / 2 - 60}px`;
        menuButton.style.top = '300px';
        menuButton.addEventListener('click', () => {
            document.body.removeChild(menuButton);
            this.showMenu();
        });
        document.body.appendChild(menuButton);
    },

    saveGame() {
        const saveData = {
            currentWave: this.currentWave,
            systemIntegrity: this.systemIntegrity,
            resources: this.resources,
            towers: this.towers,
            threats: this.threats
        };
        localStorage.setItem('savedGame', JSON.stringify(saveData));
    },
    
    loadGame() {
        const savedGame = JSON.parse(localStorage.getItem('savedGame'));
        if (savedGame) {
            this.currentWave = savedGame.currentWave;
            this.systemIntegrity = savedGame.systemIntegrity;
            this.resources = savedGame.resources;
            this.towers = savedGame.towers;
            this.threats = savedGame.threats;
            this.updateUI();
            this.setState('playing');
        }
    },

    showOptions() {
        // Clear the screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Display the options title
        ctx.font = '36px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Options', canvas.width / 2, 150);
    
        // Create volume control slider
        const volumeLabel = document.createElement('label');
        volumeLabel.textContent = 'Volume:';
        volumeLabel.style.position = 'absolute';
        volumeLabel.style.left = `${canvas.width / 2 - 80}px`;
        volumeLabel.style.top = '220px';
        volumeLabel.style.color = 'white';
        document.body.appendChild(volumeLabel);
    
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = '0';
        volumeSlider.max = '100';
        volumeSlider.value = this.sounds.backgroundMusic.volume * 100;
        volumeSlider.style.position = 'absolute';
        volumeSlider.style.left = `${canvas.width / 2 - 10}px`;
        volumeSlider.style.top = '220px';
        volumeSlider.addEventListener('input', (event) => {
            const volume = event.target.value / 100;
            this.sounds.backgroundMusic.volume = volume;
            Object.keys(this.sounds).forEach(soundKey => {
                this.sounds[soundKey].volume = volume;
            });
        });
        document.body.appendChild(volumeSlider);
    
        // Create difficulty setting dropdown
        const difficultyLabel = document.createElement('label');
        difficultyLabel.textContent = 'Difficulty:';
        difficultyLabel.style.position = 'absolute';
        difficultyLabel.style.left = `${canvas.width / 2 - 80}px`;
        difficultyLabel.style.top = '270px';
        difficultyLabel.style.color = 'white';
        document.body.appendChild(difficultyLabel);
    
        const difficultySelect = document.createElement('select');
        difficultySelect.style.position = 'absolute';
        difficultySelect.style.left = `${canvas.width / 2 - 10}px`;
        difficultySelect.style.top = '270px';
        const difficulties = ['Easy', 'Normal', 'Hard'];
        difficulties.forEach(diff => {
            const option = document.createElement('option');
            option.value = diff.toLowerCase();
            option.textContent = diff;
            difficultySelect.appendChild(option);
        });
        difficultySelect.value = 'normal'; // Default to normal
        difficultySelect.addEventListener('change', (event) => {
            this.setDifficulty(event.target.value);
        });
        document.body.appendChild(difficultySelect);
    
        // Create graphics quality dropdown
        const graphicsLabel = document.createElement('label');
        graphicsLabel.textContent = 'Graphics Quality:';
        graphicsLabel.style.position = 'absolute';
        graphicsLabel.style.left = `${canvas.width / 2 - 140}px`;
        graphicsLabel.style.top = '320px';
        graphicsLabel.style.color = 'white';
        document.body.appendChild(graphicsLabel);
    
        const graphicsSelect = document.createElement('select');
        graphicsSelect.style.position = 'absolute';
        graphicsSelect.style.left = `${canvas.width / 2 - 10}px`;
        graphicsSelect.style.top = '320px';
        const graphicsOptions = ['Low', 'Medium', 'High'];
        graphicsOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.toLowerCase();
            opt.textContent = option;
            graphicsSelect.appendChild(opt);
        });
        graphicsSelect.value = 'high'; // Default to high
        graphicsSelect.addEventListener('change', (event) => {
            this.setGraphicsQuality(event.target.value);
        });
        document.body.appendChild(graphicsSelect);
    
        // Add a back button to return to the main menu
        const backButton = document.createElement('button');
        backButton.textContent = 'Back';
        backButton.style.position = 'absolute';
        backButton.style.left = `${canvas.width / 2 - 60}px`;
        backButton.style.top = '390px';
        backButton.addEventListener('click', () => {
            // Remove all option controls before returning to the menu
            document.body.removeChild(volumeLabel);
            document.body.removeChild(volumeSlider);
            document.body.removeChild(difficultyLabel);
            document.body.removeChild(difficultySelect);
            document.body.removeChild(graphicsLabel);
            document.body.removeChild(graphicsSelect);
            document.body.removeChild(backButton);
            this.showMenu();
        });
        document.body.appendChild(backButton);
    },
    
    // Supporting function to set graphics quality
    setGraphicsQuality(level) {
        switch (level) {
            case 'low':
                ctx.imageSmoothingEnabled = false;
                break;
            case 'medium':
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';
                break;
            case 'high':
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                break;
        }
    },
    
    // Difficulty settings
    setDifficulty(level) {
        switch (level) {
            case 'easy':
                this.threatTypes = this.scaleThreats(0.8);
                break;
            case 'normal':
                this.threatTypes = this.scaleThreats(1);
                break;
            case 'hard':
                this.threatTypes = this.scaleThreats(1.2);
                break;
        }
    },
    
    scaleThreats(multiplier) {
        return Object.keys(this.threatTypes).reduce((scaledThreats, type) => {
            const threat = this.threatTypes[type];
            scaledThreats[type] = {
                ...threat,
                health: threat.health * multiplier,
                damage: threat.damage * multiplier
            };
            return scaledThreats;
        }, {});
    },
    
    update(timestamp) {
        if (this.state !== 'playing') return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.drawBackground();
        this.drawGrid();
        this.drawPath();
        this.updateThreats();

        // Use object pooling for projectiles
        this.updateProjectiles(timestamp);

        // Update wave system
        this.updateWaveSystem(timestamp);

        // Spawn threats
        if (this.isWaveActive && timestamp - this.lastSpawnTime > 2000 && this.threats.length < this.currentWave * 5) {
            this.spawnThreat(1 + (this.currentWave - 1) * 0.1);
            this.lastSpawnTime = timestamp;
        }

    // Update and draw threats
    this.threats = this.threats.filter((threat) => {
        const reachedEnd = this.moveThreatAlongPath(threat);
        if (reachedEnd) {
            this.systemIntegrity -= threat.damage;
            this.updateUI();
            return false; // Remove this threat from the array
        } else {
            // Draw threat
            if (!threat.invisible || threat.revealed) {
                ctx.drawImage(threat.image, threat.x, threat.y, 30, 30);
                
                // Draw health bar
                const healthPercentage = threat.currentHealth / threat.maxHealth;
                const healthBarWidth = 30; // Same as threat width
                const healthBarHeight = 5;
                const healthBarY = threat.y - 10;
    
                // Health bar background
                ctx.fillStyle = 'black';
                ctx.fillRect(threat.x, healthBarY, healthBarWidth, healthBarHeight);
    
                // Health bar fill
                ctx.fillStyle = this.getHealthBarColor(healthPercentage);
                ctx.fillRect(threat.x, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
    
                // Optional: Add outline to health bar
                ctx.strokeStyle = 'white';
                ctx.strokeRect(threat.x, healthBarY, healthBarWidth, healthBarHeight);
            }
            return true; // Keep this threat in the array
        }
    });
        
        // Update and draw towers
        this.towers.forEach(tower => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0, 255, 255, 0.7)';
            ctx.drawImage(tower.image, tower.x, tower.y, this.gridSize, this.gridSize);
            ctx.shadowBlur = 0;

            if (timestamp - tower.lastFired > tower.fireRate) {
                const target = this.threats.find(threat => {
                    if (tower.applyRevealInvisible || !threat.invisible) {
                        const distance = Math.hypot(threat.x - tower.x, threat.y - tower.y);
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
                const targetThreat = this.threats.find(threat => 
                    Math.hypot(threat.x - projectile.targetX, threat.y - projectile.targetY) < 15
                );
                if (targetThreat) {
                    targetThreat.currentHealth -= projectile.damage;
                    this.addEffect(projectile.targetX, projectile.targetY, 'explosion');
                    if (targetThreat.currentHealth <= 0) {
                        this.resources += targetThreat.reward;
                        this.addExperienceToTower(projectile.tower, targetThreat.reward);
                        this.addPlayerExperience(targetThreat.reward);
                        this.threats = this.threats.filter(e => e !== targetThreat);
                        this.playSoundEffect('threatDeath');
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

        requestAnimationFrame(this.update.bind(this));
    },

    updateProjectiles(timestamp) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.hypot(dx, dy);

            if (distance < projectile.speed) {
                this.handleProjectileImpact(projectile);
                this.returnProjectileToPool(projectile);
                this.projectiles.splice(i, 1);
            } else {
                projectile.x += (dx / distance) * projectile.speed;
                projectile.y += (dy / distance) * projectile.speed;
                this.drawProjectile(projectile);
            }
        }
    },

    projectilePool: [],

    getProjectile() {
        return this.projectilePool.pop() || {};
    },

    returnProjectileToPool(projectile) {
        // Reset projectile properties
        projectile.x = projectile.y = projectile.targetX = projectile.targetY = 0;
        projectile.damage = projectile.speed = 0;
        projectile.color = '';
        projectile.tower = null;
        this.projectilePool.push(projectile);
    },

    fireProjectile(tower, target, damage) {
        const projectile = this.getProjectile();
        Object.assign(projectile, {
            x: tower.x,
            y: tower.y,
            targetX: target.x,
            targetY: target.y,
            damage: damage,
            speed: 5,
            color: tower.projectileColor,
            tower: tower
        });
        this.projectiles.push(projectile);
    },

    handleProjectileImpact(projectile) {
        const targetThreat = this.findThreatAtPosition(projectile.targetX, projectile.targetY);
        if (targetThreat) {
            targetThreat.currentHealth -= projectile.damage;
            this.addEffect(projectile.targetX, projectile.targetY, 'explosion');
            if (targetThreat.currentHealth <= 0) {
                this.handleThreatDeath(targetThreat, projectile.tower);
            }
        }
    },

    findThreatAtPosition(x, y) {
        return this.threats.find(threat => Math.hypot(threat.x - x, threat.y - y) < 15);
    },

    handleThreatDeath(threat, tower) {
        if (Math.random() < 0.2) { // 20% chance to drop a resource crate
            this.spawnResourceCrate(threat.x, threat.y);
        }
            this.resources += threat.reward;
            this.addExperienceToTower(tower, threat.reward);
            this.addPlayerExperience(threat.reward);
            this.threats = this.threats.filter(e => e !== threat);
            this.playSoundEffect('threatDeath');
    },

    spawnResourceCrate(x, y) {
        const resourceCrate = {
            x: x,
            y: y,
            amount: 50 + Math.floor(Math.random() * 50), // Random resource amount
        };
        this.resources += resourceCrate.amount; // Automatically collect for simplicity
        this.updateUI();
    },

    drawProjectile(projectile) {
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = projectile.color;
        ctx.fill();
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
    
        Object.keys(this.defenseTypes).forEach(defenseType => {
            const button = document.querySelector(`[data-tower="${defenseType}"]`);
            if (button) {
                const isUnlocked = this.unlockedDefenses.includes(defenseType);
                const isAffordable = this.resources >= this.defenseTypes[defenseType].cost;
                button.disabled = !isUnlocked || !isAffordable;
                button.classList.toggle('affordable', isAffordable);
                button.title = `Cost: ${this.defenseTypes[defenseType].cost} MB\nDamage: ${this.defenseTypes[defenseType].damage}\nRange: ${this.defenseTypes[defenseType].range}\nFire Rate: ${this.defenseTypes[defenseType].fireRate}ms\nSpecial: ${this.defenseTypes[defenseType].upgrades.map(u => u.special || '').filter(Boolean).join(', ')}`;
            }
        });
    
        // Display next wave information
        const nextWaveInfo = this.getNextWaveInfo();
        document.getElementById('nextWaveInfo').textContent = `Next Wave: ${nextWaveInfo.types.join(', ')}\nTotal Threats: ${nextWaveInfo.totalThreats}`;
    }
    
    getNextWaveInfo() {
        const possibleThreats = this.selectThreatType(this.currentWave + 1);
        return {
            types: possibleThreats,
            totalThreats: Math.min((this.currentWave + 1) * 2, 50)
        };
    },

    updateUIElement(id, value) {
        const element = document.getElementById(id);
        if (element && element.textContent !== value.toString()) {
            element.textContent = value;
        }
    },

    setState(newState) {
        this.state = newState;
        switch (newState) {
            case 'menu':
                this.showMenu();
                break;
            case 'playing':
                this.startGame();
                break;
            case 'paused':
                this.pauseGame();
                break;
            case 'gameOver':
                this.endGame();
                break;
        }
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

        this.preloadImages()
            .then(() => {
                this.initializeGrid();
                this.initializeEventListeners();
                this.updateUI();
                this.showMenu();  // Show the menu instead of setting state directly
            })
            .catch(error => {
                console.error("Failed to load game resources:", error);
                // Handle loading error (e.g., show error message to user)
            });

        // Bind the update method to the game object
        this.boundUpdate = this.update.bind(this);

        // Add a start button
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.addEventListener('click', () => {
            if (this.sounds && this.sounds.backgroundMusic) {
                this.sounds.backgroundMusic.play().catch(e => console.log("Audio play failed:", e));
            }
            this.setState('playing');  // Set state to 'playing' when starting the game
            startButton.remove();
        });
        document.body.appendChild(startButton);
    },

    setState(newState) {
        this.state = newState;
        switch (newState) {
            case 'menu':
                this.showMenu();
                break;
            case 'playing':
                this.startGame();
                break;
            case 'paused':
                this.pauseGame();
                break;
            case 'gameOver':
                this.endGame();
                break;
        }
    },

    startGame() {
        this.isGamePaused = false;
        this.startNewWave();
        requestAnimationFrame(this.boundUpdate);  // Start the update loop
    }
};

// Start the game
game.start();
