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
        Object.keys(defenseTypes).forEach(towerType => {
            const button = document.createElement('button');
            button.textContent = towerType;
            button.classList.add('towerButton');
            button.dataset.tower = towerType;
            towerSelection.appendChild(button);
        });
    }

    showPauseMenu() {
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
        resumeButton.addEventListener('click', () => this.game.togglePause());
        pauseMenu.appendChild(resumeButton);

        const quitButton = document.createElement('button');
        quitButton.textContent = 'Quit to Menu';
        quitButton.addEventListener('click', () => this.game.setState(GAME_STATES.MENU));
        pauseMenu.appendChild(quitButton);

        document.body.appendChild(pauseMenu);
    }

    hidePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) document.body.removeChild(pauseMenu);
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
        document.getElementById('scoreValue').textContent = Math.floor(this.game.systemIntegrity); 
        document.getElementById('resourcesValue').textContent = Math.floor(this.game.resources);  
        document.getElementById('waveValue').textContent = this.game.currentWave;
        document.getElementById('playerLevel').textContent = this.game.playerLevel;
        document.getElementById('playerExperience').textContent = this.game.playerExperience;
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
        try {
            const savedState = localStorage.getItem('gameState');
            if (savedState) {
                const gameState = JSON.parse(savedState);
                this.game.systemIntegrity = gameState.systemIntegrity;
                this.game.resources = gameState.resources;
                this.game.currentWave = gameState.currentWave;
                this.game.playerLevel = gameState.playerLevel;
                this.game.playerExperience = gameState.playerExperience;

                this.game.towers = gameState.towers.map(towerData => 
                    new Tower(towerData.type, towerData.x, towerData.y, towerData.level, this.game)
                );
                this.game.towers.forEach(tower => {
                    tower.experience = gameState.towers.find(t => t.x === tower.x && t.y === tower.y).experience;
                });

                this.game.highScore = gameState.highScore;

                this.updateUI();
                return true;
            }
        } catch (error) {
            console.error('Error loading game:', error);
            this.showErrorMessage('Failed to load the game. Starting a new game.');
        }
        return false;
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.textContent = message;
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '10px';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translateX(-50%)';
        errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '5px';
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}
