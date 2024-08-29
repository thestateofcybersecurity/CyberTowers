// UIManager.js
import { GAME_STATES, defenseTypes } from './constants.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.initializeUI();
    }

    initializeUI() {
        this.createMenuButtons(); // Add this line to create menu buttons
        this.createTowerButtons();
        this.addEventListeners();
    }

    createMenuButtons() {
        const menuContainer = document.getElementById('menuContainer');
        menuContainer.innerHTML = ''; // Clear existing content

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

addEventListeners() {
        document.querySelectorAll('.towerButton').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.dataset.tower;
                this.game.selectedTowerType = towerType;
                this.updateTowerSelection();
            });
        });

        this.game.canvas.addEventListener('click', (event) => {
            const rect = this.game.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            if (this.game.state === GAME_STATES.PLAYING) {
                const clickedTower = this.game.towers.find(tower => 
                    x >= tower.x && x <= tower.x + 40 && y >= tower.y && y <= tower.y + 40
                );

                if (clickedTower) {
                    this.showTowerUpgradeMenu(clickedTower);
                } else {
                    this.game.placeTower(this.game.selectedTowerType, x, y);
                }
            }
        });

        document.getElementById('pauseButton').addEventListener('click', () => {
            this.game.togglePause();
        });
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
