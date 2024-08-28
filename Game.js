// Game.js
import { Threat } from './Threat.js';
import { Tower } from './Tower.js';
import { Projectile } from './Projectile.js';
import { UIManager } from './UIManager.js';
import { AssetLoader } from './AssetLoader.js';
import { GridManager } from './GridManager.js';
import { threatTypes } from './constants.js';
import { 
    CANVAS_WIDTH, 
    CANVAS_HEIGHT, 
    GAME_STATES, 
    WAVE_DURATION, 
    BREAK_DURATION, 
    STARTING_RESOURCES, 
    STARTING_SYSTEM_INTEGRITY,
    PATH,
    PLAYER_LEVEL_THRESHOLDS
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
        this.gridManager = new GridManager(CANVAS_WIDTH, CANVAS_HEIGHT);
        this.boundUpdate = this.update.bind(this);
        this.highScore = 0;
        this.waveDuration = WAVE_DURATION;
        this.breakDuration = BREAK_DURATION;
        this.path = PATH;
    }
    initialize() {
        this.assetLoader.loadAssets().then(() => {
            this.gridManager.initializeGrid();
            this.uiManager.initializeUI();
            this.setState(GAME_STATES.MENU);
        }).catch(error => {
            console.error("Failed to load game resources:", error);
            this.uiManager.showErrorMessage("Failed to load game resources. Please refresh the page.");
        });
    
        this.boundUpdate = this.update.bind(this);
    }

    async start() {
        try {
            await this.assetLoader.loadAssets();
            this.initializeEventListeners();
            this.resetGameLogic();
            this.setState(GAME_STATES.MENU);
            this.uiManager.showMenu();
        } catch (error) {
            console.error("Failed to load game resources:", error);
            this.uiManager.showErrorMessage("Failed to load game resources. Please refresh the page.");
        }
    }

    initializeEventListeners() {
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    handleCanvasClick(event) {
        if (this.state === GAME_STATES.PLAYING) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
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
        this.gridManager.resetGrid();
    }

    startGame() {
        this.resetGameLogic();
        this.setState(GAME_STATES.PLAYING);
        this.uiManager.hideMenu();
        requestAnimationFrame(this.boundUpdate);
    }

    showOptions() {
        // Implement options menu logic
    }

    restartGame() {
        this.resetGameLogic();
        this.startGame();
    }

    showMenu() {
        this.setState(GAME_STATES.MENU);
        this.uiManager.showMenu();
    }

    togglePause() {
        if (this.state === GAME_STATES.PLAYING) {
            this.setState(GAME_STATES.PAUSED);
        } else if (this.state === GAME_STATES.PAUSED) {
            this.setState(GAME_STATES.PLAYING);
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

    drawBackground() {
        this.ctx.fillStyle = '#020E18';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawPath() {
        this.ctx.strokeStyle = '#00FFFF';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        this.ctx.stroke();
    }

    updateThreats(timestamp) {
        this.threats = this.threats.filter(threat => {
            const reachedEnd = threat.move(this.path);
            if (reachedEnd) {
                this.systemIntegrity -= threat.damage;
                this.checkGameOver();
                return false;
            }
            return true;
        });
    }

    updateTowers(timestamp) {
        this.towers.forEach(tower => {
            const newProjectile = tower.update(timestamp, this.threats);
            if (newProjectile) {
                this.projectiles.push(newProjectile);
            }
        });
    }
        
    // Update the updateProjectiles method:
    updateProjectiles(timestamp) {
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.move();
            const hitThreat = projectile.checkCollision(this.threats);
            if (hitThreat) {
                this.handleProjectileImpact(projectile, hitThreat);
                return false;
            }
            return true;
        });
    }
    
    handleProjectileImpact(projectile, threat) {
        const destroyed = threat.takeDamage(projectile.damage);
        this.addEffect(threat.x, threat.y, 'explosion');
        if (destroyed) {
            this.handleThreatDeath(threat, projectile.tower);
        }
    }

    handleThreatDeath(threat, tower) {
        this.resources += threat.reward;
        tower.addExperience(threat.reward);
        this.addPlayerExperience(threat.reward);
        this.threats = this.threats.filter(t => t !== threat);
        // Play sound effect
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
        const cell = this.gridManager.getGridCell(x, y);
        if (cell && !cell.occupied && this.canAffordTower(type)) {
            const newTower = new Tower(type, cell.x, cell.y);
            this.towers.push(newTower);
            this.resources -= newTower.cost;
            cell.occupied = true;
            this.uiManager.updateUI();
        }
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
        this.towers.forEach(tower => {
            tower.draw(this.ctx);
        });
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
        if (this.state === GAME_STATES.PLAYING) {
            this.setState(GAME_STATES.PAUSED);
        } else if (this.state === GAME_STATES.PAUSED) {
            this.setState(GAME_STATES.PLAYING);
        }
    }

    addPlayerExperience(amount) {
        this.playerExperience += amount;
        const expForNextLevel = Math.pow(this.playerLevel, 2) * 100;

        while (this.playerLevel < PLAYER_LEVEL_THRESHOLDS.length && 
            this.playerExperience >= PLAYER_LEVEL_THRESHOLDS[this.playerLevel]) {
            this.playerLevel++;
            this.unlockNewDefense();
            this.uiManager.showLevelUpMessage(this.playerLevel);
        }

        this.uiManager.updatePlayerInfo();
    }

    unlockNewDefense() {
        const unlockedDefenses = Object.keys(defenseTypes);
        if (this.playerLevel <= unlockedDefenses.length) {
            const newDefense = unlockedDefenses[this.playerLevel - 1];
            this.unlockedDefenses.push(newDefense);
            this.uiManager.showUnlockMessage(newDefense);
        }
    }

    calculateNextWaveInfo() {
        const nextWave = this.currentWave + 1;
        const possibleThreats = this.getThreatsForWave(nextWave);
        const threatsPerWave = Math.min(nextWave * 2, 50); // Cap at 50 threats per wave

        this.nextWaveInfo = {
            types: possibleThreats,
            totalThreats: threatsPerWave
        };
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
        const threatData = threatTypes[threatType];
        const newThreat = new Threat(
            threatType,
            this.path[0].x,
            this.path[0].y,
            threatData.health * waveMultiplier,
            threatData.speed,
            threatData.damage * waveMultiplier,
            threatData.reward * waveMultiplier
        );
        this.threats.push(newThreat);
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

    drawProjectiles() {
        this.projectiles.forEach(projectile => {
            projectile.draw(this.ctx);
        });
    }
}
