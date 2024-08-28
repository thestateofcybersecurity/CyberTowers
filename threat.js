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
            // Draw threat image
            this.drawHealthBar(ctx);
        }
    }

    drawHealthBar(ctx) {
        const healthPercentage = this.currentHealth / this.maxHealth;
        const healthBarWidth = 25;
        const healthBarHeight = 3;
        const healthBarY = this.y - 5;

        ctx.fillStyle = 'black';
        ctx.fillRect(this.x, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = this.getHealthBarColor(healthPercentage);
        ctx.fillRect(this.x, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(this.x, healthBarY, healthBarWidth, healthBarHeight);
    }

    getHealthBarColor(percentage) {
        if (percentage > 0.6) return 'green';
        if (percentage > 0.3) return 'yellow';
        return 'red';
    }
}
