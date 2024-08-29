import { THREAT_EVOLUTION_FACTOR } from './constants.js';

export class Threat {
    constructor(type, x, y, health, speed, damage, reward, game) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.maxHealth = health;
        this.currentHealth = health;
        this.speed = speed;
        this.damage = damage;
        this.reward = reward;
        this.pathIndex = 0;
        this.invisible = type === 'rootkit';
        this.evolves = type === 'apt';
        this.revealed = false;
        this.image = new Image();
        this.image.src = `./api/${type}.jpg`;
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
        this.image.onerror = () => {
            console.error(`Failed to load image for threat type: ${type}`);
        };
        this.game = game;
    }

    move(path) {
        const targetPoint = path[this.pathIndex];
        const dx = targetPoint.x - this.x;
        const dy = targetPoint.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.pathIndex++;
            if (this.pathIndex >= path.length) {
                return this.reachEnd();
            }
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        return false;
    }

    takeDamage(damage) {
        this.currentHealth -= damage;
        console.log(`${this.type} took ${damage} damage. Current health: ${this.currentHealth}/${this.maxHealth}`);
        
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            console.log(`${this.type} destroyed!`);
            return true; // Threat is destroyed
        }
        return false; // Threat is still alive
    }
    
    die() {
        this.game.threats = this.game.threats.filter(threat => threat !== this);
        this.game.resources += this.reward;
    }

    reachEnd() {
        if (this.game) {
            this.game.systemIntegrity -= this.damage;
            this.game.threats = this.game.threats.filter(threat => threat !== this);
            if (this.game.systemIntegrity <= 0) {
                this.game.setState(GAME_STATES.GAME_OVER);
            }
        } else {
            console.error("Game instance not set for this threat");
        }
        return true;
    }
    
    evolve() {
        if (this.evolves) {
            this.maxHealth *= THREAT_EVOLUTION_FACTOR.health;
            this.currentHealth = this.maxHealth;
            this.speed *= THREAT_EVOLUTION_FACTOR.speed;
            this.damage *= THREAT_EVOLUTION_FACTOR.damage;
            this.reward *= THREAT_EVOLUTION_FACTOR.reward;
        }
    }

    reveal() {
        this.revealed = true;
    }

    draw(ctx) {
        if (this.invisible && !this.revealed) {
            console.log(`Skipping draw for invisible threat: ${this.type}`);
            return;
        }
    
        if (this.imageLoaded) {
            console.log(`Drawing ${this.type} threat image at (${this.x}, ${this.y})`);
            ctx.drawImage(this.image, this.x - 15, this.y - 15, 30, 30);
        } else {
            console.log(`Drawing fallback for ${this.type} threat at (${this.x}, ${this.y})`);
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
            ctx.fill();
        }
    
        this.drawHealthBar(ctx);
    }

    drawHealthBar(ctx) {
        const healthPercentage = this.currentHealth / this.maxHealth;
        const healthBarWidth = 30;
        const healthBarHeight = 4;
        const healthBarY = this.y - 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
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
