// UIManager.js
import { GAME_STATES, defenseTypes } from './constants.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.initializeUI();
    }

    initializeUI() {
        this.createMenuButtons();
        this.createTowerButtons();
        this.setupEventListeners();
    }

    createMenuButtons() {
        const menuContainer = document.getElementById('menuContainer');
        if (!menuContainer) {
            console.error('Menu container not found');
            return;
        }

        const buttons = [
            { text: 'Start New Game', action: () => this.game.startGame() },
            { text: 'Load Game', action: () => this.loadGame() },
            { text: 'Options', action: () => this.game.showOptions() }
        ];

        buttons.forEach(({ text, action }) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.addEventListener('click', action);
            menuContainer.appendChild(button);
        });
    }

    createTowerButtons() {
        const towerSelection = document.getElementById('towerSelection');
        if (!towerSelection) {
            console.error('Tower selection container not found');
            return;
        }

        Object.keys(defenseTypes).forEach(towerType => {
            const button = document.createElement('button');
            button.textContent = towerType;
            button.classList.add('towerButton');
            button.dataset.tower = towerType;
            towerSelection.appendChild(button);
        });
    }

    setupEventListeners() {
        document.querySelectorAll('.towerButton').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.dataset.tower;
                this.game.selectedTowerType = towerType;
                this.updateTowerSelection();
            });
        });

        if (this.game.canvas) {
            this.game.canvas.addEventListener('click', (event) => {
                if (this.game.state === GAME_STATES.PLAYING) {
                    const rect = this.game.canvas.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    
                    const clickedTower = this.game.towers.find(tower => 
                        x >= tower.x && x <= tower.x + 40 && y >= tower.y && y <= tower.y + 40
                    );

                    if (clickedTower) {
                        this.showTowerUpgradeMenu(clickedTower);
                    } else {
                        this.game.placeTower(this.game.selectedTowerType, x, y);
                        this.removeTowerUpgradeMenu();
                    }
                }
            });
        } else {
            console.error('Game canvas not found');
        }

        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                this.game.togglePause();
            });
        } else {
            console.error('Pause button not found');
        }

        // Close upgrade menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest('#towerUpgradeMenu') && !event.target.closest('.towerButton')) {
                this.removeTowerUpgradeMenu();
            }
        });
    }

    showTowerUpgradeMenu(tower) {
        this.removeTowerUpgradeMenu(); // Remove existing menu if any
        const upgradeMenu = document.createElement('div');
        upgradeMenu.id = 'towerUpgradeMenu';
        upgradeMenu.classList.add('tower-upgrade-menu');

        const upgradeCost = tower.getUpgradeCost();

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
            this.removeTowerUpgradeMenu();
        });
    }

    removeTowerUpgradeMenu() {
        const existingMenu = document.getElementById('towerUpgradeMenu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    updateUI() {
        this.updateScore();
        this.updateResources();
        this.updateWaveInfo();
        this.updateTowerButtons();
        this.updateNextWaveInfo();
        this.updatePlayerInfo();
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
            const isUnlocked = this.game.isDefenseUnlocked(towerType);
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
        const menuContainer = document.getElementById('menuContainer');
        const gameOverContainer = document.getElementById('gameOverContainer');
        
        if (menuContainer) menuContainer.style.display = 'flex';
        if (gameOverContainer) gameOverContainer.style.display = 'none';
    }

    hideMenu() {
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) menuContainer.style.display = 'none';
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
        setTimeout(() => errorDiv.remove(), 3000);
    }

    updatePlayerInfo() {
        document.getElementById('playerLevel').textContent = this.game.playerLevel;
        document.getElementById('playerExperience').textContent = this.game.playerExperience;
    }

    showLevelUpMessage(level) {
        this.showTemporaryMessage(`Level Up! You are now level ${level}`, 'levelUpMessage');
    }

    showUnlockMessage(defense) {
        this.showTemporaryMessage(`New defense unlocked: ${defense}`, 'unlockMessage');
    }

    showTemporaryMessage(text, className) {
        const message = document.createElement('div');
        message.textContent = text;
        message.className = className;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
    }

    loadGame() {
        if (this.game.loadGame()) {
            this.game.setState(GAME_STATES.PLAYING);
            this.hideMenu();
            return true;
        } else {
            this.showErrorMessage('No saved game found!');
            return false;
        }
    }
}
