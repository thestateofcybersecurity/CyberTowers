import { GAME_STATES, defenseTypes } from './constants.js';
import { Tower } from './Tower.js';

export class UIManager {
    constructor(game) {
        this.game = game;
    }

    initializeUI() {
        this.createMenuButtons();
        this.createTowerButtons();
        this.setupEventListeners();
        this.createErrorMessageElement();
    }

    draw(ctx) {
        // Draw UI elements here
        // For example:
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
    }

    createMenuButtons() {
        const menuContainer = document.getElementById('menuContainer');
        if (!menuContainer) {
            console.error('Menu container not found');
            return;
        }

        const buttons = [
            { text: 'Start New Game', action: () => this.game.startGame() },
            //{ text: 'Load Game', action: () => this.loadGame() },
            //{ text: 'Options', action: () => this.game.showOptions() }
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
        Object.entries(defenseTypes).forEach(([towerType, towerData]) => {
            const button = document.createElement('button');
            button.textContent = `${towerType} (${towerData.cost})`;
            button.classList.add('towerButton');
            button.dataset.tower = towerType;
            button.addEventListener('click', () => {
                this.game.selectedTowerType = towerType;
                this.updateTowerSelection();
            });
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

        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                this.game.togglePause();
            });
        } else {
            console.error('Pause button not found');
        }

        document.addEventListener('click', (event) => {
            if (!event.target.closest('#towerUpgradeMenu') && !event.target.closest('.towerButton')) {
                this.removeTowerUpgradeMenu();
            }
        });
    }

    showTowerUpgradeMenu(tower) {
        this.removeTowerUpgradeMenu();
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
                this.showTowerUpgradeMenu(tower);
                this.updateUI();
            } else {
                this.showErrorMessage('Not enough resources!');
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
        this.updatePlayerInfo();
        this.updateTowerButtons();
        this.updateNextWaveInfo();
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element with id '${id}' not found`);
        }
    }

    updateScore() {
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = Math.floor(this.game.systemIntegrity);
        }
    }

    updateResources() {
        const resourcesElement = document.getElementById('resourcesValue');
        if (resourcesElement) {
            resourcesElement.textContent = Math.floor(this.game.resources);
        }
    }

    updateTowerButtons() {
        document.querySelectorAll('.towerButton').forEach(button => {
            const towerType = button.dataset.tower;
            const towerData = defenseTypes[towerType];
            const isUnlocked = this.game.isDefenseUnlocked(towerType);
            const isAffordable = this.game.resources >= towerData.cost;
            button.disabled = !isUnlocked || !isAffordable;
            button.classList.toggle('affordable', isAffordable);
            button.textContent = `${towerType} (${towerData.cost})`;
        });
    }

    updateTowerSelection() {
        document.querySelectorAll('.towerButton').forEach(button => {
            button.classList.toggle('selected', button.dataset.tower === this.game.selectedTowerType);
        });
    }

    updateWaveInfo() {
        const waveElement = document.getElementById('waveValue');
        if (waveElement) {
            waveElement.textContent = this.game.currentWave;
        }
    }

    updatePlayerInfo() {
        const levelElement = document.getElementById('playerLevel');
        const experienceElement = document.getElementById('playerExperience');
        if (levelElement) {
            levelElement.textContent = this.game.playerLevel;
        }
        if (experienceElement) {
            experienceElement.textContent = this.game.playerExperience;
        }
    }

    updateNextWaveInfo() {
        const nextWaveInfo = document.getElementById('nextWaveInfo');
        if (nextWaveInfo) {
            if (this.game.nextWaveInfo) {
                nextWaveInfo.textContent = `Next Wave: ${this.game.nextWaveInfo.types.join(', ')} - Total Threats: ${this.game.nextWaveInfo.totalThreats}`;
            } else {
                nextWaveInfo.textContent = '';
            }
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
        const gameOverContainer = document.getElementById('gameOverContainer');
        if (gameOverContainer) {
            gameOverContainer.style.display = 'flex';
            document.getElementById('finalScore').textContent = this.game.currentWave;
            document.getElementById('highScore').textContent = this.game.highScore;

            const restartButton = document.getElementById('restartButton');
            if (restartButton) {
                // Remove any existing event listeners to prevent duplicates
                restartButton.removeEventListener('click', this.handleRestartClick);
                // Add new event listener
                restartButton.addEventListener('click', this.handleRestartClick);
            } else {
                console.error('Restart button not found in the DOM');
            }
        } else {
            console.error('Game over container not found in the DOM');
        }
    }

    hideGameOver() {
        const gameOverContainer = document.getElementById('gameOverContainer');
        if (gameOverContainer) {
            gameOverContainer.style.display = 'none';
        }
    }

    handleRestartClick = () => {
        console.log('Restart button clicked');
        this.game.restartGame();
    }

    showCountdown(remainingTime) {
        const seconds = Math.ceil(remainingTime / 1000);
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.textContent = `First wave starts in: ${seconds}s`;
            countdownElement.style.display = 'block';
        }
    }

    hideCountdown() {
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.style.display = 'none';
        }
    }

    updatePauseButton() {
        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.textContent = this.game.state === GAME_STATES.PAUSED ? 'Resume' : 'Pause';
            console.log('Pause button updated. Text:', pauseButton.textContent);
        } else {
            console.error('Pause button not found');
        }
    }

    createErrorMessageElement() {
        const errorMessage = document.createElement('div');
        errorMessage.id = 'errorMessage';
        errorMessage.style.display = 'none';
        errorMessage.style.position = 'absolute';
        errorMessage.style.top = '10px';
        errorMessage.style.left = '50%';
        errorMessage.style.transform = 'translateX(-50%)';
        errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorMessage.style.color = 'white';
        errorMessage.style.padding = '10px';
        errorMessage.style.borderRadius = '5px';
        document.body.appendChild(errorMessage);
    }

    showErrorMessage(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
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
            this.updateUI();
            this.game.startGame();
        } else {
            this.showErrorMessage('No saved game found. Starting a new game.');
            this.game.startGame();
        }
    }
}
