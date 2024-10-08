import { defenseTypes, MAX_TOWER_LEVEL, TOWER_STATS } from './constants.js';
import { Projectile } from './Projectile.js';
import { GAME_STATES } from './constants.js';

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
     constructor(type, x, y, level, game) {
        this.type = type;
        this.game = game;
        this.level = Number(level);
        
        // Center the tower in its grid cell
        const cellSize = this.game.gridManager.cellSize;
        // Ensure the tower is placed at the center of the cell
        this._x = Math.floor(x / cellSize) * cellSize + cellSize / 2;
        this._y = Math.floor(y / cellSize) * cellSize + cellSize / 2;
    
        if (isNaN(this._x) || isNaN(this._y)) {
            console.error(`Invalid tower coordinates: x=${x}, y=${y}`);
            return;
        }

        const towerData = defenseTypes[type];
        if (!towerData) {
            console.error(`Invalid tower type: ${type}`);
            return;
        }

        this.damage = Number(towerData.damage);
        this.range = Number(towerData.range);
        this.fireRate = Number(towerData.fireRate);
        this.projectileSpeed = Number(towerData.projectileSpeed || 5);
        this.projectileColor = towerData.projectileColor || '#FFFFFF';
        this.cost = Number(towerData.cost);
        this.experience = 0;
        this.lastFiredTime = 0;

        this.image = new Image();
        this.image.src = towerData.icon;

        console.log(`Tower created: ${type} at (${this._x}, ${this._y})`);
        console.log(`Tower properties: damage=${this.damage}, range=${this.range}, fireRate=${this.fireRate}, projectileSpeed=${this.projectileSpeed}`);
    }

    get x() { return this._x; }
    get y() { return this._y; }

    update(timestamp) {
        console.log(`Updating tower at (${this.x}, ${this.y}), type: ${this.type}`);
        const currentTime = timestamp || performance.now();
        const timeSinceLastFire = currentTime - this.lastFiredTime;
        console.log(`Time since last fire: ${timeSinceLastFire.toFixed(2)}ms, Fire rate: ${this.fireRate}ms`);
    
        if (timeSinceLastFire >= this.fireRate) {
            const target = this.findTarget(this.game.threats);
            if (target) {
                console.log(`Tower found target: ${target.type} at (${target.x.toFixed(2)}, ${target.y.toFixed(2)})`);
                this.fire(target, currentTime);
            } else {
                console.log('No target found for tower');
            }
        } else {
            console.log(`Tower cooldown: ${(this.fireRate - timeSinceLastFire).toFixed(2)}ms remaining`);
        }
    }

    findTarget(threats) {
        console.log(`Tower at (${this.x}, ${this.y}) searching for target. Range: ${this.range}`);
        return threats.find(threat => {
            const dx = threat.x - this.x;
            const dy = threat.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const inRange = distance <= this.range;
            console.log(`Threat ${threat.type} at (${threat.x.toFixed(2)}, ${threat.y.toFixed(2)}). Distance: ${distance.toFixed(2)}, In range: ${inRange}`);
            return inRange;
        });
    }

    fire(target, currentTime) {
        console.log(`Tower firing at ${target.type}`);
        console.log(`Tower position: (${this.x}, ${this.y})`);
        console.log(`Projectile start position: (${this.x}, ${this.y})`);

        const projectile = new Projectile(
            this.x,
            this.y,
            target,
            this.damage,
            this.projectileSpeed,
            this.type,
            this.level,
            this
        );

        if (!projectile.toRemove) {
            this.game.projectiles.push(projectile);
            this.lastFiredTime = currentTime;
            console.log(`Projectile created with damage: ${this.damage}. Total projectiles: ${this.game.projectiles.length}`);
        } else {
            console.error('Failed to create valid projectile');
        }
    }

    canFire(timestamp) {
        return timestamp - this.lastFired >= this.fireRate;
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
    
    fire(target, currentTime) {
        console.log(`Tower firing at ${target.type}`);

        console.log(`Tower position: (${this._x}, ${this._y})`);
        console.log(`Projectile start position: (${this._x}, ${this._y})`);

        if (isNaN(this._x) || isNaN(this._y)) {
            console.error(`Invalid tower coordinates: x=${this._x}, y=${this._y}`);
            return;
        }

        const projectile = new Projectile(
            this._x,
            this._y,
            target,
            this.damage,
            this.projectileSpeed,
            this.type,
            this.level,
            this
        );

        if (!projectile.toRemove) {
            this.game.projectiles.push(projectile);
            this.lastFiredTime = currentTime;
            console.log(`Projectile created with damage: ${this.damage}. Total projectiles: ${this.game.projectiles.length}`);
        } else {
            console.error('Failed to create valid projectile');
        }
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
        const drawX = this.x - cellSize / 2;  // Calculate the top-left corner for drawing
        const drawY = this.y - cellSize / 2;
    
        if (this.image.complete) {
            ctx.drawImage(this.image, drawX, drawY, cellSize, cellSize);
        } else {
            ctx.fillStyle = 'gray';
            ctx.fillRect(drawX, drawY, cellSize, cellSize);
        }
    
        // Draw tower level
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.level.toString(), this.x, this.y);
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
