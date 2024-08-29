// constants.js
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

export const WAVE_DURATION = 30000; // 30 seconds
export const BREAK_DURATION = 10000; // 10 seconds

export const STARTING_RESOURCES = 500;
export const STARTING_SYSTEM_INTEGRITY = 100;

export const MAX_TOWER_LEVEL = 5;
export const GRID_SIZE = 40;

export const threatTypes = {
    virus: { health: 45, speed: 1.5, damage: 5, reward: 20, icon: './api/virus.jpg' },
    trojan: { health: 75, speed: 1, damage: 8, reward: 30, icon: './api/trojan.jpg' },
    ransomware: { health: 120, speed: 0.7, damage: 15, reward: 50, icon: './api/ransomware.jpg' },
    worm: { health: 30, speed: 2, damage: 10, reward: 25, icon: './api/worm.jpg' },
    botnet: { health: 200, speed: 0.5, damage: 20, reward: 80, icon: './api/botnet.jpg' },
    phishing: { health: 20, speed: 2.5, damage: 3, reward: 15, icon: './api/phishing.jpg' },
    rootkit: { health: 100, speed: 0.8, damage: 12, reward: 40, icon: './api/rootkit.jpg', invisible: true },
    apt: { health: 150, speed: 1.2, damage: 18, reward: 60, icon: './api/apt.jpg', evolves: true }
};

export const defenseTypes = {
    firewall: { 
        cost: 100, 
        damage: 15, 
        range: 120, 
        fireRate: 500, 
        icon: './api/firewall.jpg', 
        projectileColor: '#FF0000',
        maxLevel: 5,
        requiredLevel: 1,
        upgrades: [
            { level: 2, damage: 18, range: 130 },
            { level: 3, damage: 22, fireRate: 450 },
            { level: 4, damage: 26, range: 140 },
            { level: 5, damage: 30, fireRate: 400, special: 'Burn damage over time' }
        ]
    },
    antivirus: { 
        cost: 200, 
        damage: 25, 
        range: 150, 
        fireRate: 1200, 
        icon: './api/antivirus.jpg', 
        projectileColor: '#00FF00',
        maxLevel: 5,
        requiredLevel: 2,
        upgrades: [
            { level: 2, damage: 30, range: 160 },
            { level: 3, damage: 35, fireRate: 1100 },
            { level: 4, damage: 40, range: 170 },
            { level: 5, damage: 45, fireRate: 1000, special: 'Chain reaction damage' }
        ]
    },
    encryption: { 
        cost: 300, 
        damage: 35, 
        range: 180, 
        fireRate: 1500, 
        icon: './api/encryption.jpg', 
        projectileColor: '#0000FF',
        maxLevel: 5,
        requiredLevel: 3,
        upgrades: [
            { level: 2, damage: 40, range: 190 },
            { level: 3, damage: 45, fireRate: 1400 },
            { level: 4, damage: 50, range: 200 },
            { level: 5, damage: 55, fireRate: 1300, special: 'Slow down threats' }
        ]
    },
    ai: { 
        cost: 450, 
        damage: 50, 
        range: 200, 
        fireRate: 2000, 
        icon: './api/ai.jpg', 
        projectileColor: '#FFFF00',
        maxLevel: 5,
        requiredLevel: 4,
        upgrades: [
            { level: 2, damage: 60, range: 220 },
            { level: 3, damage: 70, fireRate: 1800 },
            { level: 4, damage: 80, range: 240 },
            { level: 5, damage: 90, fireRate: 1600, special: 'Adaptive damage increase' }
        ]
    },
    ids: { 
        cost: 350, 
        damage: 30, 
        range: 220, 
        fireRate: 1300, 
        icon: './api/ids.jpg', 
        projectileColor: '#800080',
        maxLevel: 5,
        requiredLevel: 5,
        upgrades: [
            { level: 2, damage: 35, range: 240 },
            { level: 3, damage: 40, fireRate: 1200 },
            { level: 4, damage: 45, range: 260 },
            { level: 5, damage: 50, fireRate: 1100, special: 'Reveal invisible threats' }
        ]
    },
    soc: { 
        cost: 550, 
        damage: 45, 
        range: 250, 
        fireRate: 1800, 
        icon: './api/soc.jpg', 
        projectileColor: '#FFA500',
        maxLevel: 5,
        requiredLevel: 6,
        upgrades: [
            { level: 2, damage: 55, range: 270 },
            { level: 3, damage: 65, fireRate: 1700 },
            { level: 4, damage: 75, range: 290 },
            { level: 5, damage: 85, fireRate: 1600, special: 'Coordinated attack boost' }
        ]
    },
    honeypot: { 
        cost: 150, 
        damage: 5, 
        range: 150, 
        fireRate: 800, 
        icon: './api/honeypot.jpg', 
        projectileColor: '#FFD700',
        maxLevel: 5,
        requiredLevel: 7,
        upgrades: [
            { level: 2, range: 170, special: 'Attract threats in range' },
            { level: 3, damage: 10, fireRate: 700 },
            { level: 4, range: 190, special: 'Slow threats in range' },
            { level: 5, damage: 15, fireRate: 600, special: 'Confuse threats, making them attack each other' }
        ]
    }
};

export const TOWER_STATS = {
    firewall: {
        1: { damage: 15, range: 120, fireRate: 500 },
        2: { damage: 18, range: 130, fireRate: 500 },
        3: { damage: 22, range: 130, fireRate: 450 },
        4: { damage: 26, range: 140, fireRate: 450 },
        5: { damage: 30, range: 140, fireRate: 400 }
    },
    antivirus: {
        1: { damage: 25, range: 150, fireRate: 1200 },
        2: { damage: 30, range: 160, fireRate: 1200 },
        3: { damage: 35, range: 160, fireRate: 1100 },
        4: { damage: 40, range: 170, fireRate: 1100 },
        5: { damage: 45, range: 170, fireRate: 1000 }
    },
    encryption: { 
        1: { damage: 35, range: 180, fireRate: 1500 },
        2: { damage: 40, range: 190, fireRate: 1500 },
        3: { damage: 45, range: 190, fireRate: 1400 },
        4: { damage: 50, range: 200, fireRate: 1400 },
        5: { damage: 55, range: 200, fireRate: 1300 }
    },
    ai: {
        1: { damage: 50, range: 200, fireRate: 2000 },
        2: { damage: 60, range: 220, fireRate: 2000 },
        3: { damage: 70, range: 220, fireRate: 1800 },
        4: { damage: 80, range: 240, fireRate: 1800 },
        5: { damage: 90, range: 240, fireRate: 1600 }
    },
    ids: {
        1: { damage: 30, range: 220, fireRate: 1300 },
        2: { damage: 35, range: 240, fireRate: 1300 },
        3: { damage: 40, range: 240, fireRate: 1200 },
        4: { damage: 45, range: 260, fireRate: 1200 },
        5: { damage: 50, range: 260, fireRate: 1100 }
    },
    soc: {
        1: { damage: 45, range: 250, fireRate: 1800 },
        2: { damage: 55, range: 270, fireRate: 1800 },
        3: { damage: 65, range: 270, fireRate: 1700 },
        4: { damage: 75, range: 290, fireRate: 1700 },
        5: { damage: 85, range: 290, fireRate: 1600 }
    },
    honeypot: {
        1: { damage: 5, range: 150, fireRate: 800 },
        2: { damage: 5, range: 170, fireRate: 800 },
        3: { damage: 10, range: 170, fireRate: 700 },
        4: { damage: 10, range: 190, fireRate: 700 },
        5: { damage: 15, range: 190, fireRate: 600 }
    }
};

export const PATH = [
    {x: 0, y: 300},
    {x: 200, y: 300},
    {x: 200, y: 100},
    {x: 600, y: 100},
    {x: 600, y: 500},
    {x: 800, y: 500}
];

export const PLAYER_LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500
];

export const THREAT_EVOLUTION_FACTOR = {
    health: 1.5,
    speed: 1.2,
    damage: 1.5,
    reward: 2
};
