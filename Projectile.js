export class Projectile {
    constructor(x, y, target, damage, speed, towerType, towerLevel, tower) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.towerType = towerType;
        this.towerLevel = towerLevel;
        this.tower = tower;
        this.toRemove = false; // Flag to mark projectile for removal
        console.log(`New projectile created at (${this.x.toFixed(2)}, ${this.y.toFixed(2)}) targeting ${this.target.type}`);
    }

    move() {
        if (!this.target || this.target.currentHealth <= 0) {
            console.log('Projectile target is no longer valid. Marking for removal.');
            return true; // Mark for removal
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.x = this.target.x;
            this.y = this.target.y;
            console.log(`Projectile reached target at (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);
            return true; // Mark for removal, we've hit the target
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
            console.log(`Projectile moved to (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);
            return false;
        }
    }

    hitTarget() {
        this.target.takeDamage(this.damage);
        this.tower.game.projectiles = this.tower.game.projectiles.filter(p => p !== this);
        this.tower.game.addVisualEffect('explosion', this.x, this.y);
    }

    checkCollision(threats) {
        if (this.toRemove) return null;

        for (let threat of threats) {
            const dx = this.x - threat.x;
            const dy = this.y - threat.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 10) { // Assuming 10 is the collision radius
                return threat;
            }
        }
        return null;
    }

    draw(ctx) {
        if (this.toRemove) return;

        ctx.fillStyle = this.tower.projectileColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
