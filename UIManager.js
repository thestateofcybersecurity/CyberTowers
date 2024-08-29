// UIManager.js
import { GAME_STATES, defenseTypes } from './constants.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.initializeUI();
    }

    initializeUI() {
        this.createTowerButtons();
        this.addEventListeners();
    }

    createTowerButtons() {
        const towerSelection = document.getElementById('towerSelection');
        Object.keys(defenseTypes).forEach(towerType => {
            const button = document.createElement('button');
            button.textContent = towerType;
            button.classList.add('towerButton');
            button.dataset.tower = towerType;
            towerSelection.appendChild(button);
        });
    }

    showTowerUpgradeMenu(tower) {
        const upgradeMenu = document.createElement('div');
        upgradeMenu.id = 'towerUpgradeMenu';
        upgradeMenu.style.position = 'absolute';
        upgradeMenu.style.left = `${tower.x + 50}px`;
        upgradeMenu.style.top = `${tower.y}px`;
        upgradeMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        upgradeMenu.style.padding = '10px';
        upgradeMenu.style.borderRadius = '5px';

        const upgradeCost = Math.pow(tower.level, 2) * 50; // Example cost calculation

        upgradeMenu.innerHTML = `
            <h3>${tower.type} Tower (Level ${tower.level})</h3>
            <p>Damage: ${tower.damage}</p>
            <p>Range: ${tower.range}</p>
            <p>Fire Rate: ${tower.fireRate}ms</p>
            <button id="upgradeTowerBtn">Upgrade (${upgradeCost} MB)</button>
            <button id="closeTowerMenuBtn">Close</button>
        `;

        document.body.appendChild(upgradeMenu);

        document.getElementById('upgradeTowerBtn').addEventListener('click', () => {
            if (this.game.resources >= upgradeCost) {
                this.game.resources -= upgradeCost;
                tower.levelUp();
                this.showTowerUpgradeMenu(tower); // Refresh the menu
                this.updateUI();
            } else {
                alert('Not enough resources!');
            }
        });

        document.getElementById('closeTowerMenuBtn').addEventListener('click', () => {
            document.body.removeChild(upgradeMenu);
        });
    }

    addEventListeners() {
        document.querySelectorAll('.towerButton').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.dataset.tower;
                this.game.selectedTowerType = towerType;
                this.updateTowerSelection();
            this.game.canvas.addEventListener('click', (event) => {
                const rect = this.game.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                const clickedTower = this.game.towers.find(tower => 
                    x >= tower.x && x <= tower.x + 40 && y >= tower.y && y <= tower.y + 40
                );
    
                if (clickedTower) {
                    this.showTowerUpgradeMenu(clickedTower);
                }
            });
        }
    }

    createMenuButtons() {
        const menuContainer = document.getElementById('menuContainer');
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start New Game';
        startButton.addEventListener('click', () => this.game.startGame());
        
        const loadButton = document.createElement('button');
        loadButton.textContent = 'Load Game';
        loadButton.addEventListener('click', () => {
            if (this.game.loadGame()) {
                this.game.setState(GAME_STATES.PLAYING);
                this.hideMenu();
            } else {
                alert('No saved game found!');
            }
        });
        
        const optionsButton = document.createElement('button');
        optionsButton.textContent = 'Options';
        optionsButton.addEventListener('click', () => this.game.showOptions());
        
        menuContainer.appendChild(startButton);
        menuContainer.appendChild(loadButton);
        menuContainer.appendChild(optionsButton);
    }
                                                          
    setupEventListeners() {
        document.querySelectorAll('.towerButton').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.getAttribute('data-tower');
                this.game.selectTower(towerType);
            });
        });
    
        canvas.addEventListener('click', (event) => {
            if (this.game.state === GAME_STATES.PLAYING) {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                this.game.placeTower(this.game.selectedTowerType, x, y);
            }
        });
    
        document.getElementById('pauseButton').addEventListener('click', () => {
            this.game.togglePause();
        });
    }

    updateUI() {
        this.updateScore();
        this.updateResources();
        this.updateWaveInfo();
        this.updateTowerButtons();
        this.updateNextWaveInfo();
    }

    updateScore() {
        document.getElementById('scoreValue').textContent = Math.floor(this.game.systemIntegrity);
    }

    updateResources() {
        document.getElementById('resourcesValue').textContent = Math.floor(this.game.resources);
    }

    updateWaveInfo() {
        document.getElementById('waveValue').textContent = this.game.currentWave;
    }

    updateTowerButtons() {
        document.querySelectorAll('.towerButton').forEach(button => {
            const towerType = button.dataset.tower;
            const isUnlocked = true; // Implement unlock logic if needed
            const isAffordable = this.game.resources >= defenseTypes[towerType].cost;
            button.disabled = !isUnlocked || !isAffordable;
            button.classList.toggle('affordable', isAffordable);
        });
    }

    updateTowerSelection() {
        document.querySelectorAll('.towerButton').forEach(button => {
            button.classList.toggle('selected', button.dataset.tower === this.game.selectedTowerType);
        });
    }

    updateNextWaveInfo() {
        const nextWaveInfo = document.getElementById('nextWaveInfo');
        if (this.game.nextWaveInfo) {
            nextWaveInfo.textContent = `Next Wave: ${this.game.nextWaveInfo.types.join(', ')} - Total Threats: ${this.game.nextWaveInfo.totalThreats}`;
        } else {
            nextWaveInfo.textContent = '';
        }
    }

    showMenu() {
        document.getElementById('menuContainer').style.display = 'flex';
        document.getElementById('gameOverContainer').style.display = 'none';
    }

    hideMenu() {
        document.getElementById('menuContainer').style.display = 'none';
    }

    showGameOver() {
        document.getElementById('gameOverContainer').style.display = 'flex';
        document.getElementById('finalScore').textContent = this.game.currentWave;
        document.getElementById('highScore').textContent = this.game.highScore;
    }

    updatePauseButton() {
        const pauseButton = document.getElementById('pauseButton');
        pauseButton.textContent = this.game.state === GAME_STATES.PAUSED ? 'Resume' : 'Pause';
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
    }

    updatePlayerInfo() {
        document.getElementById('playerLevel').textContent = this.game.playerLevel;
        document.getElementById('playerExperience').textContent = this.game.playerExperience;
    }

    showLevelUpMessage(level) {
        const message = document.createElement('div');
        message.textContent = `Level Up! You are now level ${level}`;
        message.className = 'levelUpMessage';
        document.body.appendChild(message);
        setTimeout(() => document.body.removeChild(message), 3000);
    }

    showUnlockMessage(defense) {
        const message = document.createElement('div');
        message.textContent = `New defense unlocked: ${defense}`;
        message.className = 'unlockMessage';
        document.body.appendChild(message);
        setTimeout(() => document.body.removeChild(message), 3000);
    }

    updateNextWaveInfo() {
        const nextWaveInfo = document.getElementById('nextWaveInfo');
        if (this.game.nextWaveInfo) {
            nextWaveInfo.textContent = `Next Wave: ${this.game.nextWaveInfo.types.join(', ')} - Total Threats: ${this.game.nextWaveInfo.totalThreats}`;
        } else {
            nextWaveInfo.textContent = '';
        }
    }
}
