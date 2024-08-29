// Projectile.js
export class Projectile {
    constructor(tower, target) {
        this.tower = tower;
        this.target = target;
        this.x = tower.position.x;
        this.y = tower.position.y;
        this.speed = tower.projectileSpeed || 5;
        this.damage = tower.damage;
        this.color = tower.projectileColor || '#FFFFFF';
    }

    move() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.hitTarget();
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    hitTarget() {
        this.target.takeDamage(this.damage);
        this.tower.game.projectiles = this.tower.game.projectiles.filter(p => p !== this); // Remove projectile after hit
        this.tower.game.addEffect(this.x, this.y, 'explosion');
    }

    checkCollision(threats) {
        return threats.find(threat => {
            const distance = Math.hypot(threat.x - this.x, threat.y - this.y);
            return distance < 5; // Collision radius
        });
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}
