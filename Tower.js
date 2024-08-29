// Tower.js
import { defenseTypes, MAX_TOWER_LEVEL, TOWER_STATS } from './constants.js';
import { Projectile } from './Projectile.js';

export class Tower {
    constructor(type, x, y, level = 1) {
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

    getUpgradeCost() {
        if (this.level >= MAX_TOWER_LEVEL) {
            return Infinity; // Cannot upgrade beyond max level
        }
        return Math.floor(this.cost * Math.pow(1.5, this.level)); // 50% increase per level
    }

    applySpecialAbility(target) {
        if (this.level === 5) {
            switch (this.type) {
                case 'firewall':
                    this.applyBurnEffect(target);
                    break;
                case 'antivirus':
                    this.applyChainReaction(target);
                    break;
                case 'encryption':
                    this.applySlowEffect(target);
                    break;
                case 'ai':
                    this.applyAdaptiveDamage(target);
                    break;
                case 'ids':
                    this.revealInvisibleThreats();
                    break;
                case 'soc':
                    this.applyCoordinatedAttack(target);
                    break;
                case 'honeypot':
                    this.applyConfuseEffect(target);
                    break;
            }
        }
    }
    
    applyBurnEffect(target) {
        const burnDamage = this.damage * 0.2;
        const burnDuration = 5000;
        const burnInterval = 1000;

        let elapsedTime = 0;
        const burnEffect = setInterval(() => {
            target.takeDamage(burnDamage);
            elapsedTime += burnInterval;
            if (elapsedTime >= burnDuration || target.currentHealth <= 0) {
                clearInterval(burnEffect);
            }
        }, burnInterval);
    }

    applyChainReaction(target) {
        const nearbyThreats = this.game.threats.filter(threat => 
            Math.hypot(threat.x - target.x, threat.y - target.y) <= 50 && threat !== target
        );
        nearbyThreats.forEach(threat => threat.takeDamage(this.damage * 0.5));
    }

    applySlowEffect(target) {
        target.speed *= 0.5;
        setTimeout(() => {
            target.speed /= 0.5;
        }, 3000);
    }

    applyAdaptiveDamage(target) {
        this.damage += 1;
    }

    revealInvisibleThreats() {
        this.game.threats.forEach(threat => {
            if (threat.invisible) {
                threat.reveal();
            }
        });
    }

    applyCoordinatedAttack(target) {
        this.game.towers.forEach(tower => {
            if (tower !== this && Math.hypot(tower.x - this.x, tower.y - this.y) <= 100) {
                tower.damage *= 1.2;
                setTimeout(() => {
                    tower.damage /= 1.2;
                }, 5000);
            }
        });
    }

    applyConfuseEffect(target) {
        const nearbyThreats = this.game.threats.filter(threat => 
            Math.hypot(threat.x - target.x, threat.y - target.y) <= 100 && threat !== target
        );
        if (nearbyThreats.length > 0) {
            const randomThreat = nearbyThreats[Math.floor(Math.random() * nearbyThreats.length)];
            target.takeDamage(randomThreat.damage);
            randomThreat.takeDamage(target.damage);
        }
    }

    // Update the fire method to use special abilities
    fire(target) {
        const projectile = new Projectile(this.x, this.y, target, this.damage, this.projectileColor, this);
        this.applySpecialAbility(target);
        return projectile;
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
        if (this.experience >= expForNextLevel && this.level < MAX_TOWER_LEVEL) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.experience -= Math.pow(this.level - 1, 2) * 100;
        this.upgradeStats();
        this.game.addVisualEffect('levelUp', this.x, this.y);
    }

    upgradeStats() {
        this.stats = TOWER_STATS[this.type][this.level];
        const upgrades = defenseTypes[this.type].upgrades.find(u => u.level === this.level);
        if (upgrades) {
            Object.assign(this, upgrades);
        }
    }

    static getCost(type) {
        return defenseTypes[type].cost;
    }
}
