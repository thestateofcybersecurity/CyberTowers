// Game.js
import { GAME_STATES, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { Threat } from './Threat.js';
import { Tower } from './Tower.js';
import { Projectile } from './Projectile.js';
import { UIManager } from './UIManager.js';
import { AssetLoader } from './AssetLoader.js';
import { GridManager } from './GridManager.js';

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
        this.systemIntegrity = 100;
        this.resources = 500;
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
    }

    async start() {
        try {
            await this.assetLoader.loadAssets();
            this.initializeEventListeners();
            this.resetGameLogic();
            this.setState(GAME_STATES.MENU);
            requestAnimationFrame(this.boundUpdate);
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
        this.selectedTowerType = 'firewall';
        this.gridManager.resetGrid();
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
        this.updateAndDrawTowers(timestamp);
        this.updateAndDrawEffects();

        this.uiManager.updateUI();

        requestAnimationFrame(this.boundUpdate);
    }

    drawBackground() {
        this.ctx.fillStyle = '#020E18';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawPath() {
        // Implementation of drawPath method
    }

    updateThreats(timestamp) {
        this.threats.forEach((threat, index) => {
            const reachedEnd = threat.move(this.path);
            if (reachedEnd) {
                this.systemIntegrity -= threat.damage;
                this.threats.splice(index, 1);
                this.checkGameOver();
            }
        });
    }

    updateProjectiles(timestamp) {
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.move();
            const hitThreat = projectile.checkCollision(this.threats);
            if (hitThreat) {
                this.handleProjectileImpact(projectile, hitThreat);
                return false;
            }
            projectile.draw(this.ctx);
            return true;
        });
    }

    handleProjectileImpact(projectile, threat) {
        threat.currentHealth -= projectile.damage;
        this.addEffect(threat.x, threat.y, 'explosion');
        if (threat.currentHealth <= 0) {
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

    startNewWave() {
        this.currentWave++;
        this.isWaveActive = true;
        this.waveTimer = performance.now();
        // Implement wave spawning logic
    }

    endWave() {
        this.isWaveActive = false;
        this.waveTimer = performance.now();
        // Implement end of wave logic
    }

    spawnThreat(waveMultiplier) {
        const threatType = this.selectThreatType();
        const newThreat = new Threat(threatType, this.path[0].x, this.path[0].y, waveMultiplier);
        this.threats.push(newThreat);
    }

    selectThreatType() {
        // Implementation of threat type selection logic
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
            tower.draw(this.ctx);
        });
    }

    addEffect(x, y, type) {
        this.effects.push({ x, y, type, frame: 0 });
    }

    updateAndDrawEffects() {
        this.effects = this.effects.filter(effect => {
            effect.frame++;
            // Implement effect drawing logic
            return effect.frame < 20;
        });
    }

    checkGameOver() {
        if (this.systemIntegrity <= 0) {
            this.systemIntegrity = 0;
            this.setState(GAME_STATES.GAME_OVER);
            // Implement game over logic
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
        // Implement player leveling logic
    }

    // Add other necessary game methods
}
