// Tower.js
import { defenseTypes } from './constants.js';
import { Projectile } from './Projectile.js';

export class Tower {
    constructor(type, position, level = 1) {
        const towerData = defenseTypes[type];
        this.type = type;
        this.x = x;
        this.y = y;
        this.damage = towerData.damage;
        this.range = towerData.range;
        this.fireRate = towerData.fireRate;
        this.cost = towerData.cost;
        this.projectileColor = towerData.projectileColor;
        this.experience = 0;
        this.lastFired = 0;
        this.image = new Image();
        this.image.src = towerData.icon;
        this.position = position;
        this.level = level;
        this.stats = TOWER_STATS[type][level];
    }

    update(timestamp, threats) {
        if (timestamp - this.lastFired > this.fireRate) {
            const target = this.findTarget(threats);
            if (target) {
                this.fire(target);
                this.lastFired = timestamp;
            }
        }
    }

    findTarget(threats) {
        return threats.find(threat => {
            const distance = Math.hypot(threat.x - this.x, threat.y - this.y);
            return distance <= this.range;
        });
    }

    fire(target) {
        const projectile = new Projectile(this.x, this.y, target, this.damage, this.projectileColor, this);
        // Add projectile to game's projectiles array
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, 40, 40); // Assuming 40x40 size for towers
        
        // Optionally, draw range circle
        ctx.beginPath();
        ctx.arc(this.x + 20, this.y + 20, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();
    }

    addExperience(amount) {
        this.experience += amount;
        this.checkLevelUp();
    }

    checkLevelUp() {
        const expForNextLevel = Math.pow(this.level, 2) * 100;
        if (this.experience >= expForNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.experience -= Math.pow(this.level - 1, 2) * 100;
        this.upgradeStats();
    }

    upgradeStats() {
        const upgrades = defenseTypes[this.type].upgrades.find(u => u.level === this.level);
        if (upgrades) {
            Object.assign(this, upgrades);
        }
    }

    upgrade() {
            if (this.level < MAX_TOWER_LEVEL) {
                this.level++;
                this.stats = TOWER_STATS[this.type][this.level];
            }
        }
    }

    static getCost(type) {
        return defenseTypes[type].cost;
    }
}
