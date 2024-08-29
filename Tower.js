import { defenseTypes, MAX_TOWER_LEVEL, TOWER_STATS } from './constants.js';
import { Projectile } from './Projectile.js';

export class Tower {
    checkProperties() {
        console.log(`Tower properties check:
            Type: ${this.type}
            Level: ${this.level}
            Damage: ${this.damage}
            Range: ${this.range}
            Fire Rate: ${this.fireRate}
            Last Fired: ${this.lastFired}
        `);
    }
    constructor(type, x, y, level = 1, game) {
        const towerData = defenseTypes[type];
        this.type = type;
        this.x = x;
        this.y = y;
        this.level = level;
        this.damage = towerData.damage;
        this.range = towerData.range;
        this.fireRate = towerData.fireRate;
        this.projectileSpeed = towerData.projectileSpeed || 5;
        this.projectileColor = towerData.projectileColor || '#FFFFFF';
        this.specialAbilities = {};
        this.cost = towerData.cost;
        this.experience = 0;
        this.lastFired = 0;
        this.image = new Image();
        this.image.src = towerData.icon;
        this.stats = TOWER_STATS[type][level];
        this.game = game;
        this.lastFiredTime = 0;
        this.hasLoggedDraw = false;
        this.checkProperties();

        console.log(`Tower created: ${type} at (${x}, ${y})`); // Debug log
    }

    update(timestamp, threats) {
        console.log(`Updating tower at (${this.x}, ${this.y}), type: ${this.type}`);
        if (timestamp - this.lastFired >= this.fireRate) {
            const target = this.findTarget(threats);
            if (target) {
                console.log(`Tower found target: ${target.type} at (${target.x}, ${target.y})`);
                this.fire(target);
            } else {
                console.log('No target found for tower');
            }
        } else {
            console.log(`Tower cooldown: ${this.fireRate - (timestamp - this.lastFired)}ms remaining`);
        }
    }

    findTarget(threats) {
        console.log(`Tower at (${this.x}, ${this.y}) searching for target. Range: ${this.range}`);
        return threats.find(threat => {
            // Calculate the center of the tower
            const towerCenterX = this.x + this.game.gridManager.cellSize / 2;
            const towerCenterY = this.y + this.game.gridManager.cellSize / 2;

            // Calculate the distance from the center of the tower to the threat
            const dx = threat.x - towerCenterX;
            const dy = threat.y - towerCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const inRange = distance <= this.range;

            console.log(`Threat ${threat.type} at (${threat.x.toFixed(2)}, ${threat.y.toFixed(2)})`);
            console.log(`Tower center: (${towerCenterX.toFixed(2)}, ${towerCenterY.toFixed(2)})`);
            console.log(`dx: ${dx.toFixed(2)}, dy: ${dy.toFixed(2)}`);
            console.log(`Distance: ${distance.toFixed(2)}, In range: ${inRange}`);

            return inRange;
        });
    }

    canFire(timestamp) {
        return timestamp - this.lastFired >= this.fireRate;
    }

    fire(target) {
        console.log(`Tower firing at ${target.type}`);
        const projectile = new Projectile(
            this.x + this.game.gridManager.cellSize / 2,
            this.y + this.game.gridManager.cellSize / 2,
            target,
            this.damage,
            this.projectileSpeed,
            this.type,
            this.level,
            this
        );
        this.game.projectiles.push(projectile);
        this.lastFired = performance.now();
        console.log(`Projectile created with damage: ${this.damage}`);
    }

    levelUp() {
        if (this.level < MAX_TOWER_LEVEL) {
            this.level++;
            this.updateStats();
            if (this.level === MAX_TOWER_LEVEL) {
                this.applySpecialAbility();
            }
        }
    }

    updateStats() {
        if (TOWER_STATS[this.type] && TOWER_STATS[this.type][this.level]) {
            this.stats = TOWER_STATS[this.type][this.level];
            this.damage = this.stats.damage;
            this.range = this.stats.range;
            this.fireRate = this.stats.fireRate;
        }
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

    fire(target) {
        const projectile = new Projectile(this, target);
        this.game.projectiles.push(projectile);
    }

    getUpgradeCost() {
        if (this.level >= MAX_TOWER_LEVEL) {
            return Infinity;
        }
        return Math.floor(this.cost * Math.pow(1.5, this.level));
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

    draw(ctx) {
        const cellSize = this.game.gridManager.cellSize;
        if (this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, cellSize, cellSize);
        } else {
            ctx.fillStyle = 'gray';
            ctx.fillRect(this.x, this.y, cellSize, cellSize);
        }
        
        if (!this.hasLoggedDraw) {
            console.log(`Tower drawn at (${this.x}, ${this.y})`);
            this.hasLoggedDraw = true;
        }
    }

    levelUp() {
        this.level++;
        this.experience -= Math.pow(this.level - 1, 2) * 100;
        this.upgradeStats();
        if (this.game) {
            this.game.addVisualEffect('levelUp', this.x, this.y);
        }
    }

    upgradeStats() {
        if (TOWER_STATS[this.type] && TOWER_STATS[this.type][this.level]) {
            this.stats = TOWER_STATS[this.type][this.level];
            const upgrades = defenseTypes[this.type].upgrades.find(u => u.level === this.level);
            if (upgrades) {
                Object.assign(this, upgrades);
            }
        } else {
            console.warn(`No upgrade stats found for ${this.type} at level ${this.level}`);
        }
    }

    static getCost(type) {
        return defenseTypes[type].cost;
    }
}
