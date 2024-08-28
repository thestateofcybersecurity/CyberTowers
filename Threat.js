// Threat.js
import { threatTypes } from './constants.js';

export class Threat {
    constructor(type, x, y, waveMultiplier = 1) {
        const threatData = threatTypes[type];
        this.x = x;
        this.y = y;
        this.type = type;
        this.currentHealth = threatData.health * waveMultiplier;
        this.maxHealth = threatData.health * waveMultiplier;
        this.speed = threatData.speed;
        this.damage = threatData.damage * waveMultiplier;
        this.reward = threatData.reward * waveMultiplier;
        this.invisible = threatData.invisible || false;
        this.evolves = threatData.evolves || false;
        this.pathIndex = 0;
        this.revealed = false;
        this.image = new Image();
        this.image.src = threatData.icon;
    }

    move(path) {
        const targetPoint = path[this.pathIndex];
        const dx = targetPoint.x - this.x;
        const dy = targetPoint.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < this.speed) {
            this.pathIndex++;
            return this.pathIndex >= path.length;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
            return false;
        }
    }

    draw(ctx) {
        if (!this.invisible || this.revealed) {
            ctx.drawImage(this.image, this.x - 15, this.y - 15, 30, 30); // Adjust size as needed
            this.drawHealthBar(ctx);
        }
    }

    drawHealthBar(ctx) {
        const healthPercentage = this.currentHealth / this.maxHealth;
        const healthBarWidth = 30; // Increased for better visibility
        const healthBarHeight = 4; // Increased for better visibility
        const healthBarY = this.y - 20; // Moved up slightly

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent background
        ctx.fillRect(this.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = this.getHealthBarColor(healthPercentage);
        ctx.fillRect(this.x - healthBarWidth / 2, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(this.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);
    }

    getHealthBarColor(percentage) {
        if (percentage > 0.6) return 'lime';
        if (percentage > 0.3) return 'yellow';
        return 'red';
    }

    takeDamage(amount) {
        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            return true; // Threat is destroyed
        }
        return false;
    }

    reveal() {
        this.revealed = true;
    }

    evolve(waveMultiplier) {
        if (this.evolves) {
            this.maxHealth *= 1.5;
            this.currentHealth = this.maxHealth;
            this.speed *= 1.2;
            this.damage *= 1.5;
            this.reward *= 2;
        }
    }
}
