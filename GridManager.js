// GridManager.js
export class GridManager {
    constructor(width, height, cellSize = 40) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.grid = [];
        this.initializeGrid();
    }

    initializeGrid() {
        for (let y = 0; y < this.height; y += this.cellSize) {
            for (let x = 0; x < this.width; x += this.cellSize) {
                this.grid.push({ x, y, occupied: false });
            }
        }
    }

    getGridCell(x, y) {
        const cellX = Math.floor(x / this.cellSize) * this.cellSize;
        const cellY = Math.floor(y / this.cellSize) * this.cellSize;
        return this.grid.find(cell => cell.x === cellX && cell.y === cellY);
    }

    resetGrid() {
        this.grid.forEach(cell => cell.occupied = false);
    }

    drawGrid(ctx) {
        ctx.strokeStyle = '#0A3C59';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.width; x += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y <= this.height; y += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }
}
