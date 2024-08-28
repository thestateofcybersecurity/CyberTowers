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

    addEventListeners() {
        document.querySelectorAll('.towerButton').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.dataset.tower;
                this.game.selectedTowerType = towerType;
                this.updateTowerSelection();
            });
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
