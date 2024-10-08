const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const threatTypes = {
    virus: { health: 45, speed: 1.5, damage: 5, reward: 20, icon: './api/virus.jpg' },
    trojan: { health: 75, speed: 1, damage: 8, reward: 30, icon: './api/trojan.jpg' },
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
        fireRate: 500, 
        icon: './api/firewall.jpg', 
        projectileColor: '#FF0000',
        maxLevel: 5,
        upgrades: [
            { level: 2, damage: 18, range: 130 },
            { level: 3, damage: 22, fireRate: 450 },
            { level: 4, damage: 26, range: 140 },
            { level: 5, damage: 30, fireRate: 400, special: 'Burn damage over time' }
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

const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
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
    endless: false,
    gameContainer: null,
    menuContainer: null,
    optionsContainer: null,
    highScore: 0,
    nextWaveInfo: null,
    state: GAME_STATES.MENU,

    initializeDOM() {
        this.gameContainer = document.getElementById('gameContainer');
        if (!this.gameContainer) {
            this.gameContainer = document.createElement('div');
            this.gameContainer.id = 'gameContainer';
            document.body.appendChild(this.gameContainer);
        }

        this.menuContainer = document.getElementById('menuContainer') || document.createElement('div');
        this.menuContainer.id = 'menuContainer';
        this.gameContainer.appendChild(this.menuContainer);

        this.optionsContainer = document.getElementById('optionsContainer') || document.createElement('div');
        this.optionsContainer.id = 'optionsContainer';
        this.gameContainer.appendChild(this.optionsContainer);

        if (!this.gameContainer.contains(canvas)) {
            this.gameContainer.appendChild(canvas);
        }

        // Initially hide the options container
        this.optionsContainer.style.display = 'none';
    },
    
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

    updateHighScore() {
        if (this.currentWave > this.highScore) {
            this.highScore = this.currentWave;
            localStorage.setItem('highScore', this.highScore);
        }
    },

    loadHighScore() {
        const savedHighScore = localStorage.getItem('highScore');
        if (savedHighScore) {
            this.highScore = parseInt(savedHighScore, 10);
        }
    },

    skillTree: {
        towerAttackSpeed: { 
            cost: 100, 
            level: 0, 
            maxLevel: 5, 
            effect: () => game.towers.forEach(t => t.fireRate *= 0.9) 
        },
        towerRange: { 
            cost: 150, 
            level: 0, 
            maxLevel: 5, 
            effect: () => game.towers.forEach(t => t.range += 10) 
        },
        towerDamage: { 
            cost: 200, 
            level: 0, 
            maxLevel: 5, 
            effect: () => game.towers.forEach(t => t.damage += 5) 
        }
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

    audioManager: {
        muted: false,
        volume: 1,
        mute() {
            this.muted = true;
            // Mute all audio
        },
        unmute() {
            this.muted = false;
            // Unmute all audio
        },
        setVolume(volume) {
            this.volume = volume;
            // Set volume for all audio
        }
    },

    startBackgroundMusic() {
        // Remove automatic play
        this.sounds.backgroundMusic.loop = true;
    },

    togglePause() {
        this.isGamePaused = !this.isGamePaused;
        if (this.isGamePaused) {
            console.log("Game Paused");
            this.pauseGame();
        } else {
            console.log("Game Resumed");
            this.resumeGame();
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
        ctx.lineWidth = 40; // Make the path visibly wide
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        ctx.stroke();

        // Draw a border around the path
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 42;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
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

    isPositionOnPath(x, y) {
        const tolerance = 20; // Adjust this value to change how close to the path is considered "on" the path
        for (let i = 1; i < this.path.length; i++) {
            const start = this.path[i - 1];
            const end = this.path[i];
            
            // Check if (x, y) is close to the line segment from start to end
            const distanceToSegment = this.distanceToLineSegment(x, y, start.x, start.y, end.x, end.y);
            if (distanceToSegment < tolerance) {
                return true;
            }
        }
        return false;
    },

    distanceToLineSegment(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) // in case of 0 length line
            param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        }
        else if (param > 1) {
            xx = x2;
            yy = y2;
        }
        else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    placeTower(type, x, y) {
        const towerType = this.defenseTypes[type.toLowerCase()];
        const cell = this.getGridCell(x, y);

        if (this.resources >= towerType.cost && 
            this.unlockedDefenses.includes(type.toLowerCase()) && 
            cell && 
            !cell.occupied && 
            !this.isPositionOnPath(cell.x + this.gridSize / 2, cell.y + this.gridSize / 2)) {
            
            this.resources -= towerType.cost;
            const tower = {
                x: cell.x,
                y: cell.y,
                type: type,
                ...towerType,
                lastFired: 0,
                level: 1,
                experience: 0,
                image: this.imageCache[towerType.icon]
            };
            this.towers.push(tower);
            cell.occupied = true;
            this.applySynergyBonus(tower, cell);
            this.updateUI();
        } else if (this.isPositionOnPath(cell.x + this.gridSize / 2, cell.y + this.gridSize / 2)) {
            console.log("Cannot place tower on the path!");
            // Optionally, display a message to the player
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

    applySpecialAbilities(tower, threat) {
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
    
    updateThreats() {
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
                this.checkGameOver(); // Check for game over after each threat reaches the end
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
        const availableThreats = this.getThreatsForWave(this.currentWave);
        const threatType = availableThreats[Math.floor(Math.random() * availableThreats.length)];
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

        // Calculate info for the next wave
        this.calculateNextWaveInfo();
        this.updateUI();
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

            // Calculate info for the next wave
            this.calculateNextWaveInfo();
            this.updateUI();
            }
    },

    startEndlessMode() {
        this.currentWave = 1;
        this.systemIntegrity = 100;
        this.resources = 500;
        this.endless = true;
        this.setState('playing');
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

      showMenu() {
        this.resetGameLogic();
        this.clearContainer(this.menuContainer);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Cybersecurity Tower Defense', canvas.width / 2, 150);

        this.createButton('Start Game', canvas.width / 2 - 60, 250, () => this.startGame(), this.menuContainer);
        this.createButton('Options', canvas.width / 2 - 60, 320, () => this.showOptions(), this.menuContainer);
        this.createButton('Exit', canvas.width / 2 - 60, 390, () => window.close(), this.menuContainer);

        this.menuContainer.style.display = 'block';
        this.optionsContainer.style.display = 'none';
    },

    // Function to reset game logic
    resetGameLogic() {
        this.currentWave = 1;
        this.systemIntegrity = 100;
        this.resources = 500;
        this.towers = [];
        this.threats = [];
        this.projectiles = [];
        this.effects = [];
        this.isGamePaused = false;
        this.isWaveActive = false;
        this.lastSpawnTime = 0;
        this.nextWaveInfo = null;
        this.calculateNextWaveInfo();
        this.updateUI();
    },

    resetGrid() {
        this.grid = [];  // Assuming `this.grid` is used to store the grid data
        for (let i = 0; i < this.gridRows; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridColumns; j++) {
                this.grid[i][j] = {
                    x: j * this.gridSize,
                    y: i * this.gridSize,
                    occupied: false,
                    path: false
                };
            }
        }
    },
        
    createButton(text, x, y, onClick, container) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.position = 'absolute';
        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        button.addEventListener('click', onClick);
        container.appendChild(button);
        return button;
    },


    startGame() {
        this.resetGameLogic();
        this.state = 'playing';
        this.menuContainer.style.display = 'none';
        this.optionsContainer.style.display = 'none';
        this.initializeGrid();
        this.startNewWave();
        requestAnimationFrame(this.boundUpdate);
    },
    
    pauseGame() {
        this.isGamePaused = true;
        cancelAnimationFrame(this.boundUpdate);

        const pauseMenu = this.createPauseMenu();
        document.body.appendChild(pauseMenu);
    },

    createPauseMenu() {
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
        resumeButton.addEventListener('click', () => this.resumeGame());
        pauseMenu.appendChild(resumeButton);

        const quitButton = document.createElement('button');
        quitButton.textContent = 'Quit to Menu';
        quitButton.addEventListener('click', () => this.quitToMenu());
        pauseMenu.appendChild(quitButton);

        return pauseMenu;
    },

    resumeGame() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) document.body.removeChild(pauseMenu);
        this.isGamePaused = false;
        requestAnimationFrame(this.boundUpdate);
    },

    quitToMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) document.body.removeChild(pauseMenu);
        this.showMenu();
    },

    checkGameOver() {
        if (this.systemIntegrity <= 0) {
            this.systemIntegrity = 0; // Ensure it doesn't go below 0
            this.state = 'gameOver';
            this.endGame();
        }
    },

    resetGame() {
        this.systemIntegrity = 100;
        this.resources = 500;
        this.currentWave = 0;
        this.threats = [];
        this.towers = [];
        this.projectiles = [];
        this.effects = [];
        this.isWaveActive = false;
        this.lastSpawnTime = 0;
        this.playerLevel = 1;
        this.playerExperience = 0;
        this.unlockedDefenses = ['firewall'];
        this.selectedTowerType = 'firewall';
        this.state = 'playing';
    },
    
    endGame() {
        this.updateHighScore();
        cancelAnimationFrame(this.boundUpdate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = 'rgba(2, 14, 24, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Game Over text
        ctx.font = '48px Orbitron';
        ctx.fillStyle = '#FF0000';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 100);

        // Scores
        ctx.font = '24px Orbitron';
        ctx.fillStyle = '#00FFFF';
        ctx.fillText(`Final Score: Wave ${this.currentWave}`, canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillText(`High Score: Wave ${this.highScore}`, canvas.width / 2, canvas.height / 2 + 10);

        // New high score notification
        if (this.currentWave === this.highScore) {
            ctx.fillStyle = '#FFFF00';
            ctx.fillText('New High Score!', canvas.width / 2, canvas.height / 2 + 20);
        }

        // Create buttons after drawing the text
        const buttonStyle = `
            position: absolute;
            width: 150px;
            padding: 10px;
            font-family: Orbitron, sans-serif;
            font-size: 16px;
            color: #00FFFF;
            background-color: #0A3C59;
            border: 2px solid #00FFFF;
            cursor: pointer;
        `;

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Game';
        restartButton.style.cssText = buttonStyle;
        restartButton.style.left = `${canvas.width / 2 - 160}px`;
        restartButton.style.top = `${canvas.height / 2 + 50}px`;
        restartButton.addEventListener('click', () => {
            this.gameContainer.removeChild(restartButton);
            this.gameContainer.removeChild(menuButton);
            this.resetGame();
            this.startGame();
        });

        const menuButton = document.createElement('button');
        menuButton.textContent = 'Return to Menu';
        menuButton.style.cssText = buttonStyle;
        menuButton.style.left = `${canvas.width / 2 + 10}px`;
        menuButton.style.top = `${canvas.height / 2 + 50}px`;
        menuButton.addEventListener('click', () => {
            this.gameContainer.removeChild(restartButton);
            this.gameContainer.removeChild(menuButton);
            this.showMenu();
        });

        this.gameContainer.appendChild(restartButton);
        this.gameContainer.appendChild(menuButton);
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
            Object.assign(this, savedGame);
            this.updateUI();
            this.setState('playing');
        }
    },

    clearContainer(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    },

    showOptions() {
        this.clearContainer(this.optionsContainer);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '36px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Options', canvas.width / 2, 150);

        const createLabel = (text, x, y) => {
            const label = document.createElement('label');
            label.textContent = text;
            label.style.position = 'absolute';
            label.style.left = `${x}px`;
            label.style.top = `${y}px`;
            label.style.color = 'white';
            this.optionsContainer.appendChild(label);
            return label;
        };

        createLabel('Volume:', canvas.width / 2 - 80, 220);
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
            Object.values(this.sounds).forEach(sound => sound.volume = volume);
        });
        this.optionsContainer.appendChild(volumeSlider);

        createLabel('Difficulty:', canvas.width / 2 - 80, 270);
        const difficultySelect = document.createElement('select');
        difficultySelect.style.position = 'absolute';
        difficultySelect.style.left = `${canvas.width / 2 - 10}px`;
        difficultySelect.style.top = '270px';
        ['Easy', 'Normal', 'Hard'].forEach(diff => {
            const option = document.createElement('option');
            option.value = diff.toLowerCase();
            option.textContent = diff;
            difficultySelect.appendChild(option);
        });
        difficultySelect.value = 'normal';
        difficultySelect.addEventListener('change', (event) => this.setDifficulty(event.target.value));
        this.optionsContainer.appendChild(difficultySelect);

        this.createButton('Back', canvas.width / 2 - 60, 390, () => this.showMenu(), this.optionsContainer);

        this.menuContainer.style.display = 'none';
        this.optionsContainer.style.display = 'block';
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
        this.threatTypes = this.scaleThreats(level === 'easy' ? 0.8 : level === 'hard' ? 1.2 : 1);
    },
    
    scaleThreats(multiplier) {
        return Object.fromEntries(
            Object.entries(this.threatTypes).map(([type, threat]) => [
                type,
                {
                    ...threat,
                    health: threat.health * multiplier,
                    damage: threat.damage * multiplier
                }
            ])
        );
    },

    updateProjectiles(timestamp) {
        this.projectiles = this.projectiles.filter(projectile => {
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.hypot(dx, dy);

            if (distance < projectile.speed) {
                this.handleProjectileImpact(projectile);
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
    
    update(timestamp) {
        if (this.state !== GAME_STATES.PLAYING) return;

        this.checkGameOver();
        if (this.state === 'gameOver') return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.drawBackground();
        this.drawGrid();
        this.drawPath();
        this.updateThreats();
        this.updateProjectiles(timestamp);
        this.updateWaveSystem(timestamp);

        if (this.isWaveActive && timestamp - this.lastSpawnTime > 2000 && this.threats.length < this.currentWave * 5) {
            this.spawnThreat(1 + (this.currentWave - 1) * 0.1);
            this.lastSpawnTime = timestamp;
        }

        this.drawThreats();
        this.updateAndDrawTowers(timestamp);
        this.updateAndDrawEffects();

        this.updateUI();

        requestAnimationFrame(this.boundUpdate);
    },

    drawThreats() {
        this.threats.forEach(threat => {
            if (!threat.invisible || threat.revealed) {
                ctx.drawImage(threat.image, threat.x, threat.y, 30, 30);
                this.drawHealthBar(threat);
            }
        });
    },

    drawHealthBar(threat) {
        const healthPercentage = threat.currentHealth / threat.maxHealth;
        const healthBarWidth = 25; // Slightly smaller than the threat width
        const healthBarHeight = 3; // Smaller height
        const healthBarY = threat.y - 5; // Position it closer to the threat
    
        ctx.fillStyle = 'black';
        ctx.fillRect(threat.x, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = this.getHealthBarColor(healthPercentage);
        ctx.fillRect(threat.x, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(threat.x, healthBarY, healthBarWidth, healthBarHeight);
    },

    updateAndDrawTowers(timestamp) {
        this.towers.forEach(tower => {
            ctx.drawImage(tower.image, tower.x, tower.y, this.gridSize, this.gridSize);

            if (timestamp - tower.lastFired > tower.fireRate) {
                const target = this.findTarget(tower);
                if (target) {
                    const damage = this.applySpecialAbilities(tower, target);
                    this.fireProjectile(tower, target, damage);
                    tower.lastFired = timestamp;
                    this.playSoundEffect('towerShoot');
                }
            }
        });
    },

    findTarget(tower) {
        return this.threats.find(threat => {
            if (tower.applyRevealInvisible || !threat.invisible) {
                const distance = Math.hypot(threat.x - tower.x, threat.y - tower.y);
                return distance < tower.range;
            }
            return false;
        });
    },

    updateAndDrawProjectiles() {
        this.projectiles = this.projectiles.filter(projectile => {
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.hypot(dx, dy);

            if (distance < projectile.speed) {
                this.handleProjectileImpact(projectile);
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

    handleThreatDeath(threat, tower) {
        this.resources += threat.reward;
        this.addExperienceToTower(tower, threat.reward);
        this.addPlayerExperience(threat.reward);
        this.threats = this.threats.filter(t => t !== threat);
        this.playSoundEffect('threatDeath');

        if (Math.random() < 0.2) { // 20% chance to drop a resource crate
            this.spawnResourceCrate(threat.x, threat.y);
        }
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

    findThreatAtPosition(x, y) {
        return this.threats.find(threat => Math.hypot(threat.x - x, threat.y - y) < 15);
    },

    selectTower(towerType) {
        this.selectedTowerType = towerType;
        document.querySelectorAll('.towerButton').forEach(button => {
            button.classList.remove('selected');
        });
        const selectedButton = document.querySelector(`[data-tower="${towerType}"]`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }
    },

    updateUI() {
        document.getElementById('scoreValue').textContent = Math.floor(this.systemIntegrity);  // Ensuring whole number display
        document.getElementById('resourcesValue').textContent = Math.floor(this.resources);   // Ensuring whole number display
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

        if (this.nextWaveInfo) {
            this.updateUIElement('nextWaveInfo', `Next Wave: ${this.nextWaveInfo.types.join(', ')}\nTotal Threats: ${this.nextWaveInfo.totalThreats}`);
        }
    },

    getTowerTooltip(defenseType) {
        const tower = this.defenseTypes[defenseType];
        return `Cost: ${tower.cost} MB
                Damage: ${tower.damage}
                Range: ${tower.range}
                Fire Rate: ${tower.fireRate}ms
                Special: ${tower.upgrades.map(u => u.special || '').filter(Boolean).join(', ')}`;
    },

    calculateNextWaveInfo() {
        const nextWave = this.currentWave + 1;
        const possibleThreats = this.getThreatsForWave(nextWave);
        const threatsPerWave = Math.min(nextWave * 2, 50); // Cap at 50 threats per wave
        
        this.nextWaveInfo = {
            types: possibleThreats,
            totalThreats: threatsPerWave
        };
    },

    getThreatsForWave(wave) {
        const availableThreats = Object.keys(this.threatTypes);
        let possibleThreats;

        if (wave <= 5) {
            possibleThreats = availableThreats.slice(0, 2);
        } else if (wave <= 10) {
            possibleThreats = availableThreats.slice(0, 4);
        } else {
            possibleThreats = availableThreats;
        }

        // Randomly select up to 3 threat types for variety
        return possibleThreats
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.min(3, possibleThreats.length));
    },
    
    getNextWaveInfo() {
        const possibleThreats = this.selectThreatType();
        return {
            types: Array.isArray(possibleThreats) ? possibleThreats : [possibleThreats],
            totalThreats: Math.min((this.currentWave + 1) * 2, 50)
        };
    },

    updateUIElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toString();
        }
    },

    setState(newState) {
        if (!Object.values(GAME_STATES).includes(newState)) {
            console.error(`Invalid game state: ${newState}`);
            return;
        }
        this.state = newState;
        this.handleStateChange();
    },

    handleStateChange() {
        switch (this.state) {
            case GAME_STATES.MENU:
                this.showMenu();
                break;
            case GAME_STATES.PLAYING:
                this.startGame();
                break;
            case GAME_STATES.PAUSED:
                this.pauseGame();
                break;
            case GAME_STATES.GAME_OVER:
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
        document.querySelectorAll('.towerButton').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.getAttribute('data-tower');
                this.selectTower(towerType);
            });
        });

        canvas.addEventListener('click', (event) => {
            if (this.state === 'playing') {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                this.placeTower(this.selectedTowerType, x, y);
            }
        });

        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.togglePause());
        } else {
            console.warn('Pause button not found in the DOM');
        }
    },
    
    start() {
        this.initializeDOM();
        this.loadHighScore();
        this.preloadImages()
            .then(() => {
                this.initializeGrid();
                this.initializeEventListeners();
                this.resetGameLogic();
                this.setState(GAME_STATES.MENU);
            })
            .catch(error => {
                console.error("Failed to load game resources:", error);
                this.showErrorMessage("Failed to load game resources. Please refresh the page.");
            });

        this.boundUpdate = this.update.bind(this);
    },

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = message;
        errorDiv.style.color = 'red';
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        this.gameContainer.appendChild(errorDiv);
    }
};

// Start the game
game.start();
