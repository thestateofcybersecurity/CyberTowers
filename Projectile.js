// Projectile.js
export class Projectile {
    constructor(x, y, target, damage, color, tower) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.color = color;
        this.tower = tower;
        this.speed = 5;
    }

    move() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > this.speed) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        } else {
            this.x = this.target.x;
            this.y = this.target.y;
        }
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
