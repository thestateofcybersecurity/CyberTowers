// UIManager.js
export class UIManager {
    constructor(game) {
        this.game = game;
        this.initializeUI();
    }

    initializeUI() {
        this.createUIElements();
        this.addEventListeners();
    }

    createUIElements() {
        // Create and append UI elements to the DOM
        // This includes score, resources, wave info, tower selection buttons, etc.
    }

    addEventListeners() {
        // Add event listeners to UI elements
        document.querySelectorAll('.towerButton').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.getAttribute('data-tower');
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
        Object.keys(this.game.defenseTypes).forEach(defenseType => {
            const button = document.querySelector(`[data-tower="${defenseType}"]`);
            if (button) {
                const isUnlocked = this.game.unlockedDefenses.includes(defenseType);
                const isAffordable = this.game.resources >= this.game.defenseTypes[defenseType].cost;
                button.disabled = !isUnlocked || !isAffordable;
                button.classList.toggle('affordable', isAffordable);
            }
        });
    }

    updateTowerSelection() {
        document.querySelectorAll('.towerButton').forEach(button => {
            button.classList.remove('selected');
        });
        const selectedButton = document.querySelector(`[data-tower="${this.game.selectedTowerType}"]`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }
    }

    showMenu() {
        // Implement menu display logic
    }

    showGameOver() {
        // Implement game over screen logic
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = message;
        errorDiv.style.color = 'red';
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(errorDiv);
    }
}
