import { Threat } from './Threat.js';
import { Tower } from './Tower.js';
import { Projectile } from './Projectile.js';
import { UIManager } from './UIManager.js';
import { AssetLoader } from './AssetLoader.js';
import { GridManager } from './GridManager.js';
import { threatTypes, defenseTypes } from './constants.js';
import { 
    CANVAS_WIDTH, 
    CANVAS_HEIGHT, 
    GAME_STATES, 
    WAVE_DURATION, 
    BREAK_DURATION, 
    STARTING_RESOURCES, 
    STARTING_SYSTEM_INTEGRITY,
    PATH,
    PLAYER_LEVEL_THRESHOLDS,
    GRID_SIZE
} from './constants.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameBoard');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.threats = [];
        this.towers = [];
        this.projectiles = [];
        this.effects = [];
        this.state = GAME_STATES.MENU;
        this.systemIntegrity = STARTING_SYSTEM_INTEGRITY;
        this.resources = STARTING_RESOURCES;
        this.currentWave = 0;
        this.isWaveActive = false;
        this.waveTimer = 0;
        this.lastSpawnTime = 0;
        this.playerLevel = 1;
        this.playerExperience = 0;
        this.selectedTowerType = 'firewall';
        this.uiManager = new UIManager(this);
        this.assetLoader = new AssetLoader();
        this.gridManager = new GridManager(this);
        this.boundUpdate = this.update.bind(this);
        this.highScore = localStorage.getItem('highScore') || 0;
        this.waveDuration = WAVE_DURATION;
        this.breakDuration = BREAK_DURATION;
        this.path = PATH;
        this.autosaveInterval = null;
        this.unlockedDefenses = ['firewall'];
        this.nextWaveInfo = null;
        this.imageCache = {};
        this.gridSize = GRID_SIZE;
    }

    async initialize() {
        try {
            await this.assetLoader.loadAssets();
            this.gridManager.initializeGrid();
            this.uiManager.initializeUI();
            this.initializeEventListeners();
            this.setState(GAME_STATES.MENU);
        } catch (error) {
            console.error("Failed to load game resources:", error);
            this.uiManager.showErrorMessage("Failed to load game resources. Please refresh the page.");
        }
    }

    saveGame() {
        const gameState = {
            systemIntegrity: this.systemIntegrity,
            resources: this.resources,
            currentWave: this.currentWave,
            playerLevel: this.playerLevel,
            playerExperience: this.playerExperience,
            towers: this.towers.map(tower => ({
                type: tower.type,
                x: tower.x,
                y: tower.y,
                level: tower.level,
                experience: tower.experience
            })),
            highScore: this.highScore,
            unlockedDefenses: this.unlockedDefenses
        };

        localStorage.setItem('gameState', JSON.stringify(gameState));
    }

    loadGame() {
        const savedState = localStorage.getItem('gameState');
        if (savedState) {
            const gameState = JSON.parse(savedState);

            this.systemIntegrity = gameState.systemIntegrity;
            this.resources = gameState.resources;
            this.currentWave = gameState.currentWave;
            this.playerLevel = gameState.playerLevel;
            this.playerExperience = gameState.playerExperience;

            this.towers = gameState.towers.map(towerData => 
                new Tower(towerData.type, towerData.x, towerData.y, towerData.level, this)
            );
            this.towers.forEach(tower => {
                tower.experience = gameState.towers.find(t => t.x === tower.x && t.y === tower.y).experience;
            });

            this.highScore = gameState.highScore;
            this.unlockedDefenses = gameState.unlockedDefenses;

            this.uiManager.updateUI();
            return true;
        }
        return false;
    }

    startAutosave() {
        this.autosaveInterval = setInterval(() => this.saveGame(), 60000); // Autosave every minute
    }

    stopAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }
    }

    initializeEventListeners() {
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    }

    handleCanvasClick(event) {
        if (this.state === GAME_STATES.PLAYING) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            console.log(`Click coordinates: (${x}, ${y})`);
            this.placeTower(this.selectedTowerType, x, y);
        }
    }

    handleKeyPress(event) {
        if (event.key === 'p' || event.key === 'P') {
            this.togglePause();
        }
    }

    setState(newState) {
        this.state = newState;
        this.uiManager.updateUI();
        if (newState === GAME_STATES.PLAYING) {
            this.uiManager.hideMenu();
        } else if (newState === GAME_STATES.MENU) {
            this.uiManager.showMenu();
        } else if (newState === GAME_STATES.GAME_OVER) {
            this.stopAutosave();
            this.uiManager.showGameOver();
        }
    }

    resetGameLogic() {
        this.systemIntegrity = STARTING_SYSTEM_INTEGRITY;
        this.resources = STARTING_RESOURCES;
        this.currentWave = 0;
        this.threats = [];
        this.towers = [];
        this.projectiles = [];
        this.effects = [];
        this.isWaveActive = false;
        this.lastSpawnTime = 0;
        this.playerLevel = 1;
        this.playerExperience = 0;
        this.selectedTowerType = 'firewall';
        this.unlockedDefenses = ['firewall'];
        this.gridManager.resetGrid();
    }

    startGame() {
        this.resetGameLogic();
        console.log('Starting new game');
        this.uiManager.hideMenu();
        this.uiManager.hideGameOver();
        this.setState(GAME_STATES.PLAYING);
        this.startAutosave();
        this.gameLoop();
    }

    gameLoop(timestamp) {
        if (this.state !== GAME_STATES.PLAYING) {
            console.log('Game is paused, not updating');
            return;
        }

        console.log('--- New Frame ---');
        this.updateThreats(timestamp);
        this.updateTowers(timestamp);
        this.updateProjectiles(timestamp);
    
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
        // Update game entities
        this.updateThreats(timestamp);
        this.updateTowers(timestamp);
        this.updateProjectiles(timestamp);
    
        // Draw game entities
        this.drawBackground();
        this.gridManager.drawGrid(this.ctx);
        this.drawPath();
        this.drawThreats();
        this.drawTowers();
        this.drawProjectiles();
    
        // Update and draw UI
        this.uiManager.draw(this.ctx);
    
        // Handle wave system
        this.updateWaveSystem(timestamp);

        if (timestamp % 1000 < 16) { // Log roughly every second
            this.logThreatHealth();
        }
    
        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    logThreatHealth() {
        this.threats.forEach((threat, index) => {
            console.log(`Threat ${index} (${threat.type}): Health ${threat.currentHealth}/${threat.maxHealth}`);
        });
    }

    showOptions() {
        // Implement options menu logic
    }

    restartGame() {
        console.log('Restarting game...');
        this.setState(GAME_STATES.PLAYING);
        this.stopAutosave();
        this.resetGameLogic();
        this.startGame();
    }

    showMenu() {
        this.setState(GAME_STATES.MENU);
    }

    isDefenseUnlocked(defenseType) {
        return this.unlockedDefenses.includes(defenseType);
    }

    togglePause() {
        if (this.state === GAME_STATES.PLAYING) {
            this.setState(GAME_STATES.PAUSED);
            this.stopAutosave();
        } else if (this.state === GAME_STATES.PAUSED) {
            this.setState(GAME_STATES.PLAYING);
            this.startAutosave();
        }
        this.uiManager.updatePauseButton();
    }

    update(timestamp) {
        if (this.state !== GAME_STATES.PLAYING) return;

        this.checkGameOver();
        if (this.state === GAME_STATES.GAME_OVER) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBackground();
        this.gridManager.drawGrid(this.ctx);
        this.drawPath();
        this.updateThreats(timestamp);
        this.updateProjectiles(timestamp);
        this.updateWaveSystem(timestamp);
        this.updateTowers(timestamp);

        if (this.isWaveActive && timestamp - this.lastSpawnTime > 2000 && this.threats.length < this.currentWave * 5) {
            this.spawnThreat(1 + (this.currentWave - 1) * 0.1);
            this.lastSpawnTime = timestamp;
        }

        this.drawThreats();
        this.drawTowers();
        this.drawProjectiles();
        this.updateAndDrawEffects();

        this.uiManager.updateUI();

        requestAnimationFrame(this.boundUpdate);
    }

    drawProjectiles() {
        this.projectiles.forEach(projectile => {
            if (projectile && typeof projectile.draw === 'function') {
                projectile.draw(this.ctx);
            }
        });
    }

    drawBackground() {
        this.ctx.fillStyle = '#020E18';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawPath() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        this.ctx.stroke();

        // Draw points on the path
        this.ctx.fillStyle = 'red';
        this.path.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    updateThreats(timestamp) {
        this.threats = this.threats.filter(threat => {
            const reachedEnd = threat.move(this.path);
            if (reachedEnd) {
                this.addVisualEffect('systemDamage');
                this.checkGameOver();
                return false;
            }
            return true;
        });
    }

    updateTowers(timestamp) {
        console.log(`Updating ${this.towers.length} towers at timestamp ${timestamp}`);
        this.towers.forEach(tower => {
            tower.update(timestamp);
        });
    }

    updateProjectiles(timestamp) {
        this.projectiles = this.projectiles.filter(projectile => {
            if (projectile.toRemove) {
                return false; // Remove the projectile
            }

            projectile.move();
            const hitThreat = projectile.checkCollision(this.threats);
            if (hitThreat) {
                this.handleProjectileImpact(projectile, hitThreat);
                return false; // Remove the projectile after impact
            }
            return true; // Keep the projectile
        });
    }

    addVisualEffect(type, x, y) {
        switch (type) {
            case 'explosion':
                this.addExplosionEffect(x, y);
                break;
            case 'levelUp':
                this.addLevelUpEffect(x, y);
                break;
            case 'systemDamage':
                this.addSystemDamageEffect();
                break;
        }
    }

    addExplosionEffect(x, y) {
        const effect = {
            x, y, 
            radius: 1,
            maxRadius: 30,
            growthRate: 2,
            alpha: 1
        };

        const animate = () => {
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 0, 0, ${effect.alpha})`;
            this.ctx.fill();

            effect.radius += effect.growthRate;
            effect.alpha -= 0.05;

            if (effect.radius < effect.maxRadius && effect.alpha > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    addLevelUpEffect(x, y) {
        const text = 'LEVEL UP!';
        let fontSize = 20;
        let alpha = 1;

        const animate = () => {
            this.ctx.font = `${fontSize}px Arial`;
            this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            this.ctx.fillText(text, x, y);

            fontSize++;
            alpha -= 0.02;
            y -= 1;

            if (alpha > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    addSystemDamageEffect() {
        let alpha = 0.5;

        const animate = () => {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            alpha -= 0.05;

            if (alpha > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    handleProjectileImpact(projectile, threat) {
        console.log(`Projectile hit ${threat.type}. Current health: ${threat.currentHealth}/${threat.maxHealth}`);
        console.log(`Projectile damage: ${projectile.damage}`);

        if (threat.invisible && !threat.revealed) {
            if (projectile.towerType === 'ids' && projectile.towerLevel === 5) {
                threat.reveal();
            }
        }

        const destroyed = threat.takeDamage(projectile.damage);
        console.log(`After damage, ${threat.type} health: ${threat.currentHealth}/${threat.maxHealth}`);

        this.addVisualEffect('explosion', threat.x, threat.y);

        if (destroyed) {
            console.log(`${threat.type} destroyed!`);
            this.handleThreatDeath(threat, projectile.tower);
        }
    }

    handleThreatDeath(threat, tower) {
        this.resources += threat.reward;
        tower.addExperience(threat.reward);
        this.addPlayerExperience(threat.reward);
        this.threats = this.threats.filter(t => t !== threat);
        console.log(`Threat destroyed. Remaining threats: ${this.threats.length}`);
    }

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

        this.calculateNextWaveInfo();
        this.uiManager.updateUI();
    }

    endWave() {
        this.isWaveActive = false;
        this.waveTimer = performance.now();
        const waveBonus = Math.floor(this.systemIntegrity / 100 * 100 * this.currentWave); // Bonus based on system integrity
        this.resources += waveBonus;

        if (this.currentWave % 5 === 0) {
            this.resources += Math.floor(this.resources * 0.1); // 10% resource bonus every 5 waves
        }

        this.calculateNextWaveInfo();
        this.uiManager.updateUI();
        
        // Start next wave after a delay
        setTimeout(() => this.startNewWave(), 10000); // 10 seconds break between waves
    }

    selectThreatType() {
        const availableThreats = Object.keys(threatTypes);
        let possibleThreats;

        if (this.currentWave <= 5) {
            possibleThreats = availableThreats.slice(0, 2);
        } else if (this.currentWave <= 10) {
            possibleThreats = availableThreats.slice(0, 4);
        } else {
            possibleThreats = availableThreats;
        }

        return possibleThreats[Math.floor(Math.random() * possibleThreats.length)];
    }

    placeTower(type, x, y) {
       console.log(`Attempting to place tower of type ${type} at mouse position (${x}, ${y})`);
        const cell = this.gridManager.getGridCell(mouseX, mouseY);
        if (!cell) {
            console.error("Invalid grid location");
            this.uiManager.showErrorMessage("Invalid grid location");
            return;
        }

        const towerCost = Tower.getCost(type);
    
        console.log(`Corresponding grid cell: (${cell.x}, ${cell.y})`);
        console.log(`Cell found: ${JSON.stringify(cell)}`);
    
        if (cell.occupied) {
            this.uiManager.showErrorMessage("Cell already occupied");
            return;
        }
    
        if (this.gridManager.isCellOnPath(cell)) {
            this.uiManager.showErrorMessage("Cannot place tower on the path");
            return;
        }
    
        if (!this.isDefenseUnlocked(type)) {
            this.uiManager.showErrorMessage("Defense not unlocked yet");
            return;
        }
    
        if (this.resources < towerCost) {
            this.uiManager.showErrorMessage("Not enough resources");
            return;
        }
    
        const newTower = new Tower(type, towerX, towerY, 1, this);
        this.towers.push(newTower);
        this.resources -= towerCost;
        cell.occupied = true;
        this.gridManager.updateGrid(cell.x, cell.y, true);
        this.uiManager.updateUI();
    
        console.log(`Tower placed at position (${newTower.x}, ${newTower.y})`);
        console.log(`Tower type: ${type}, Range: ${newTower.range}`);
    }
    
    canAffordTower(type) {
        return this.resources >= Tower.getCost(type);
    }

    updateAndDrawTowers(timestamp) {
        this.towers.forEach(tower => {
            tower.update(timestamp, this.threats);
        });
    }

    drawTowers() {
        this.towers.forEach(tower => tower.draw(this.ctx));
    }

    drawThreats() {
        this.threats.forEach(threat => {
            threat.draw(this.ctx);
        });
    }

    updateAndDrawEffects() {
        this.effects = this.effects.filter(effect => {
            effect.frame++;
            if (effect.type === 'explosion') {
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, effect.frame, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 0, 0, ${1 - effect.frame / 20})`;
                this.ctx.fill();
            }
            return effect.frame < 20;
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.drawBackground();

        // Draw grid
        this.gridManager.drawGrid(this.ctx);

        // Draw path
        this.drawPath();

        this.drawTowerRanges();

        // Draw towers
        this.towers.forEach(tower => tower.draw(this.ctx));

        // Draw threats
        this.threats.forEach(threat => threat.draw(this.ctx));

        // Draw projectiles
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));

        // Draw UI
        this.uiManager.draw(this.ctx);
    }

    drawTowerRanges() {
        this.ctx.globalAlpha = 0.1;
        this.towers.forEach(tower => {
            this.ctx.beginPath();
            this.ctx.arc(
                tower.x,
                tower.y,
                tower.range,
                0,
                Math.PI * 2
            );
            this.ctx.fillStyle = 'yellow';
            this.ctx.fill();
    
            // Draw range circle outline
            this.ctx.globalAlpha = 0.5;
            this.ctx.strokeStyle = 'orange';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
    
            // Reset global alpha for next iteration
            this.ctx.globalAlpha = 0.1;
        });
        this.ctx.globalAlpha = 1;
    }

    checkGameOver() {
        if (this.systemIntegrity <= 0) {
            this.systemIntegrity = 0;
            this.setState(GAME_STATES.GAME_OVER);
            this.updateHighScore();
            this.uiManager.showGameOver();
        }
    }

    updateHighScore() {
        if (this.currentWave > this.highScore) {
            this.highScore = this.currentWave;
            localStorage.setItem('highScore', this.highScore);
        }
    }

    togglePause() {
        console.log('Toggle pause called. Current state:', this.state);
        if (this.state === GAME_STATES.PLAYING) {
            this.setState(GAME_STATES.PAUSED);
            this.stopAutosave();
        } else if (this.state === GAME_STATES.PAUSED) {
            this.setState(GAME_STATES.PLAYING);
            this.startAutosave();
            requestAnimationFrame(this.gameLoop.bind(this)); // Restart the game loop
        }
        console.log('New state:', this.state);
        this.uiManager.updatePauseButton();
    }

    addPlayerExperience(amount) {
        this.playerExperience += amount;
        const nextLevelThreshold = PLAYER_LEVEL_THRESHOLDS[this.playerLevel];

        while (this.playerExperience >= nextLevelThreshold && this.playerLevel < PLAYER_LEVEL_THRESHOLDS.length) {
            this.playerLevel++;
            this.playerExperience -= nextLevelThreshold;
            this.unlockNewDefense();
            this.uiManager.showLevelUpMessage(this.playerLevel);
        }

        this.uiManager.updatePlayerInfo();
    }

    unlockNewDefense() {
        const unlockedDefenses = Object.keys(defenseTypes);
        if (this.playerLevel <= unlockedDefenses.length) {
            const newDefense = unlockedDefenses[this.playerLevel - 1];
            if (!this.unlockedDefenses.includes(newDefense)) {
                this.unlockedDefenses.push(newDefense);
                this.uiManager.showUnlockMessage(newDefense);
            }
        }
    }

    calculateNextWaveInfo() {
        const nextWave = this.currentWave + 1;
        const possibleThreats = this.getThreatsForWave(nextWave);
        const threatsPerWave = Math.min(nextWave * 2, 50);

        if (possibleThreats.length > 0) {
            this.nextWaveInfo = {
                types: possibleThreats,
                totalThreats: threatsPerWave
            };
        } else {
            this.nextWaveInfo = {
                types: ['No threats available'],
                totalThreats: 0
            };
        }
    }

    getThreatsForWave(wave) {
        const availableThreats = Object.keys(threatTypes);
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
    }

    spawnThreat(waveMultiplier) {
        const threatType = this.selectThreatType();
        if (threatTypes[threatType]) {
            const threatData = threatTypes[threatType];
            const health = Math.round(threatData.health * waveMultiplier);
            const newThreat = new Threat(
                threatType,
                this.path[0].x,
                this.path[0].y,
                health,
                threatData.speed,
                Math.round(threatData.damage * waveMultiplier),
                Math.round(threatData.reward * waveMultiplier),
                this
            );
            this.threats.push(newThreat);
            console.log(`Spawned ${threatType} threat with ${health} health at (${newThreat.x}, ${newThreat.y})`);
        } else {
            console.error(`Invalid threat type: ${threatType}`);
        }
    }
    
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
    }

    addEffect(x, y, type) {
        this.effects.push({x, y, type, frame: 0});
    }
}

// Initialize the game when the script is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.initialize().then(() => {
        console.log('Game initialized successfully');
    }).catch(error => {
        console.error('Failed to initialize game:', error);
    });
});
