import { THREAT_EVOLUTION_FACTOR } from './constants.js';

export class Threat {
    constructor(type, x, y, health, speed, damage, reward) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.health = health;
        this.maxHealth = health;
        this.speed = speed;
        this.damage = damage;
        this.reward = reward;
        this.pathIndex = 0;
        this.invisible = type === 'rootkit';
        this.evolves = type === 'apt';
        this.revealed = false;
        this.image = new Image();
        this.image.src = `./api/${type}.jpg`; // Ensure this path is correct
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
        this.image.onerror = () => {
            console.error(`Failed to load image for threat type: ${type}`);
        };
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
        if (this.evolves && Math.random() < 0.001) { // 0.1% chance to evolve each move
            this.evolve();
        }

        return reachedEnd;
    }

    takeDamage(amount) {
        if (this.invisible && !this.revealed) {
            amount *= 0.5; // Invisible threats take half damage unless revealed
        }
        this.health -= amount;
        if (this.health <= 0) {
            return true; // Threat is destroyed
        }
        return false;
    }

    evolve() {
        this.health *= THREAT_EVOLUTION_FACTOR.health;
        this.maxHealth = this.health;
        this.speed *= THREAT_EVOLUTION_FACTOR.speed;
        this.damage *= THREAT_EVOLUTION_FACTOR.damage;
        this.reward *= THREAT_EVOLUTION_FACTOR.reward;
    }

    reveal() {
        this.revealed = true;
    }

    draw(ctx) {
        if (!this.invisible || this.revealed) {
            if (this.imageLoaded) {
                ctx.drawImage(this.image, this.x - 15, this.y - 15, 30, 30);
            } else {
                // Fallback drawing if image is not loaded
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
                ctx.fill();
            }
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
