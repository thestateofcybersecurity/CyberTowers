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
export const BREAK_DURATION = 5000; // 10 seconds

export const STARTING_RESOURCES = 500;
export const STARTING_SYSTEM_INTEGRITY = 100;

export const MAX_TOWER_LEVEL = 5;
export const GRID_SIZE = 40;

export const threatTypes = {
    virus: { health: 60, speed: 1.7, damage: 7, reward: 10, icon: './api/virus.jpg' }, // Increased health and speed
    trojan: { health: 90, speed: 1.2, damage: 10, reward: 15, icon: './api/trojan.jpg' },
    ransomware: { health: 150, speed: 0.9, damage: 18, reward: 25, icon: './api/ransomware.jpg' },
    worm: { health: 40, speed: 2.3, damage: 12, reward: 20, icon: './api/worm.jpg' },
    botnet: { health: 250, speed: 0.7, damage: 25, reward: 40, icon: './api/botnet.jpg' },
    phishing: { health: 30, speed: 2.8, damage: 5, reward: 10, icon: './api/phishing.jpg' },
    rootkit: { health: 130, speed: 1.0, damage: 15, reward: 20, icon: './api/rootkit.jpg', invisible: true },
    apt: { health: 200, speed: 1.4, damage: 22, reward: 30, icon: './api/apt.jpg', evolves: true }
};

export const defenseTypes = {
    firewall: { 
        cost: 150, 
        damage: 15, 
        range: 200, 
        fireRate: 600, 
        icon: './api/firewall.jpg', 
        projectileColor: '#FF0000',
        maxLevel: 5,
        requiredLevel: 1,
        upgrades: [
            { level: 2, damage: 25, range: 220 },
            { level: 3, damage: 30, fireRate: 500 },
            { level: 4, damage: 35, range: 240 },
            { level: 5, damage: 45, fireRate: 400, special: 'Burn damage over time' }
        ]
    },
    antivirus: { 
        cost: 400, 
        damage: 25, 
        range: 250, 
        fireRate: 1200, 
        icon: './api/antivirus.jpg', 
        projectileColor: '#00FF00',
        maxLevel: 5,
        requiredLevel: 2,
        upgrades: [
            { level: 2, damage: 30, range: 270 },
            { level: 3, damage: 35, fireRate: 1100 },
            { level: 4, damage: 40, range: 290 },
            { level: 5, damage: 45, fireRate: 1000, special: 'Chain reaction damage' }
        ]
    },
    encryption: { 
        cost: 600, 
        damage: 35, 
        range: 300, 
        fireRate: 1500, 
        icon: './api/encryption.jpg', 
        projectileColor: '#0000FF',
        maxLevel: 5,
        requiredLevel: 3,
        upgrades: [
            { level: 2, damage: 40, range: 320 },
            { level: 3, damage: 45, fireRate: 1400 },
            { level: 4, damage: 50, range: 340 },
            { level: 5, damage: 55, fireRate: 1300, special: 'Slow down threats' }
        ]
    },
    ai: { 
        cost: 850, 
        damage: 50, 
        range: 350, 
        fireRate: 2000, 
        icon: './api/ai.jpg', 
        projectileColor: '#FFFF00',
        maxLevel: 5,
        requiredLevel: 4,
        upgrades: [
            { level: 2, damage: 60, range: 370 },
            { level: 3, damage: 70, fireRate: 1800 },
            { level: 4, damage: 80, range: 390 },
            { level: 5, damage: 90, fireRate: 1600, special: 'Adaptive damage increase' }
        ]
    },
    ids: { 
        cost: 650, 
        damage: 30, 
        range: 300, 
        fireRate: 1300, 
        icon: './api/ids.jpg', 
        projectileColor: '#800080',
        maxLevel: 5,
        requiredLevel: 5,
        upgrades: [
            { level: 2, damage: 35, range: 320 },
            { level: 3, damage: 40, fireRate: 1200 },
            { level: 4, damage: 45, range: 340 },
            { level: 5, damage: 50, fireRate: 1100, special: 'Reveal invisible threats' }
        ]
    },
    soc: { 
        cost: 1050, 
        damage: 45, 
        range: 450, 
        fireRate: 1800, 
        icon: './api/soc.jpg', 
        projectileColor: '#FFA500',
        maxLevel: 5,
        requiredLevel: 6,
        upgrades: [
            { level: 2, damage: 55, range: 470 },
            { level: 3, damage: 65, fireRate: 1700 },
            { level: 4, damage: 75, range: 490 },
            { level: 5, damage: 85, fireRate: 1600, special: 'Coordinated attack boost' }
        ]
    },
    honeypot: { 
        cost: 250, 
        damage: 5, 
        range: 200, 
        fireRate: 800, 
        icon: './api/honeypot.jpg', 
        projectileColor: '#FFD700',
        maxLevel: 5,
        requiredLevel: 7,
        upgrades: [
            { level: 2, range: 220, special: 'Attract threats in range' },
            { level: 3, damage: 10, fireRate: 700 },
            { level: 4, range: 240, special: 'Slow threats in range' },
            { level: 5, damage: 15, fireRate: 600, special: 'Confuse threats, making them attack each other' }
        ]
    }
};

export const TOWER_STATS = {
    firewall: {
        1: { damage: 15, range: 200, fireRate: 600 },
        2: { damage: 25, range: 220, fireRate: 600 },
        3: { damage: 30, range: 220, fireRate: 550 },
        4: { damage: 35, range: 240, fireRate: 550 },
        5: { damage: 45, range: 240, fireRate: 500 }
    },
    antivirus: {
        1: { damage: 20, range: 250, fireRate: 1300 },
        2: { damage: 24, range: 270, fireRate: 1300 },
        3: { damage: 28, range: 270, fireRate: 1200 },
        4: { damage: 32, range: 290, fireRate: 1200 },
        5: { damage: 36, range: 290, fireRate: 1100 }
    },
    encryption: { 
        1: { damage: 30, range: 300, fireRate: 1700 },
        2: { damage: 34, range: 320, fireRate: 1700 },
        3: { damage: 38, range: 320, fireRate: 1600 },
        4: { damage: 42, range: 340, fireRate: 1600 },
        5: { damage: 46, range: 340, fireRate: 1500 }
    },
    ai: {
        1: { damage: 40, range: 350, fireRate: 2200 },
        2: { damage: 46, range: 370, fireRate: 2200 },
        3: { damage: 52, range: 370, fireRate: 2000 },
        4: { damage: 58, range: 390, fireRate: 2000 },
        5: { damage: 64, range: 390, fireRate: 1800 }
    },
    ids: {
        1: { damage: 24, range: 300, fireRate: 1500 },
        2: { damage: 28, range: 320, fireRate: 1500 },
        3: { damage: 32, range: 320, fireRate: 1400 },
        4: { damage: 36, range: 340, fireRate: 1400 },
        5: { damage: 40, range: 340, fireRate: 1300 }
    },
    soc: {
        1: { damage: 36, range: 450, fireRate: 2000 },
        2: { damage: 42, range: 470, fireRate: 2000 },
        3: { damage: 48, range: 470, fireRate: 1900 },
        4: { damage: 54, range: 490, fireRate: 1900 },
        5: { damage: 60, range: 490, fireRate: 1800 }
    },
    honeypot: {
        1: { damage: 3, range: 200, fireRate: 900 },
        2: { damage: 3, range: 220, fireRate: 900 },
        3: { damage: 6, range: 220, fireRate: 800 },
        4: { damage: 6, range: 240, fireRate: 800 },
        5: { damage: 9, range: 240, fireRate: 700 }
    }
};

export const PATH = [
    {x: 0, y: 280},
    {x: 200, y: 280},
    {x: 200, y: 120},
    {x: 600, y: 120},
    {x: 600, y: 480},
    {x: 800, y: 480}
];

export const PLAYER_LEVEL_THRESHOLDS = [
    0, 300, 1000, 2000, 3000, 4200, 5400, 7200, 9000, 15000
];

export const THREAT_EVOLUTION_FACTOR = {
    health: 1.2,  // More gradual health increase
    speed: 1.1,   // Slight increase in speed
    damage: 1.3,  // Gradual increase in damage
    reward: 1.5   // Slight increase in rewards
};
