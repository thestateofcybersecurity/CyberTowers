import { GRID_SIZE } from './constants.js';

export class GridManager {
    constructor(game) {
        this.game = game;
        this.gridMap = new Map();
        this.cellSize = GRID_SIZE;
    }

    initializeGrid() {
        for (let y = 0; y < this.game.canvas.height; y += this.cellSize) {
            for (let x = 0; x < this.game.canvas.width; x += this.cellSize) {
                const key = `${x},${y}`;
                this.gridMap.set(key, { x, y, occupied: false });
            }
        }
        console.log(`Grid initialized with ${this.gridMap.size} cells`);
    }

    getGridCell(x, y) {
        const gridX = Math.floor(x / this.cellSize) * this.cellSize;
        const gridY = Math.floor(y / this.cellSize) * this.cellSize;
        const key = `${gridX},${gridY}`;
        return this.gridMap.get(key);
    }

    updateGrid(x, y, occupied) {
        const key = `${x},${y}`;
        const cell = this.gridMap.get(key);
        if (cell) {
            cell.occupied = occupied;
        } else {
            console.warn(`Invalid cell at (${x}, ${y})`);
        }
    }

    isCellOnPath(cell) {
        if (!cell) return false;
        const tolerance = this.cellSize / 2;
        return this.game.path.some((segment, index) => {
            if (index === this.game.path.length - 1) return false; // Skip the last segment
            const start = segment;
            const end = this.game.path[index + 1];
            if (!start || !end) return false; // Skip if start or end is undefined
            return this.distanceToSegment(
                cell.x + this.cellSize / 2, 
                cell.y + this.cellSize / 2, 
                start.x, 
                start.y, 
                end.x, 
                end.y
            ) < tolerance;
        });
    }

    resetGrid() {
        this.gridMap.forEach(cell => cell.occupied = false);
    }

    drawGrid(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
    
        for (let x = 0; x <= this.game.canvas.width; x += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.game.canvas.height);
            ctx.stroke();
        }
    
        for (let y = 0; y <= this.game.canvas.height; y += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.game.canvas.width, y);
            ctx.stroke();
        }
    }
    distanceToSegment(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
