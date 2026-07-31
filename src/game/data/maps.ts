import type { GameMapDef, Vec2 } from '../core/types';

const t = (x: number, y: number): Vec2 => ({ x, y });

export const GRID_COLS = 24;
export const GRID_ROWS = 15;

/**
 * Five missions on a shared 24x15 tile board. Lanes start one tile off the left
 * edge so threats slide into view, and end one tile past the right edge where
 * the core sits. Later maps add lanes rather than gimmicks: more simultaneous
 * pressure is what actually makes a tower defence map harder.
 */
export const MAPS: GameMapDef[] = [
  {
    id: 'home-net',
    name: 'Home Network',
    brief:
      'A flat consumer LAN behind a single router. One ingress point, one path, no surprises. Learn the controls here.',
    difficulty: 1,
    unlockAfter: null,
    cols: GRID_COLS,
    rows: GRID_ROWS,
    lanes: [[t(-1, 3), t(7, 3), t(7, 8), t(16, 8), t(16, 12), t(24, 12)]],
    blocked: [t(2, 8), t(3, 8), t(2, 9), t(20, 3), t(21, 3), t(20, 4)],
    startCredits: 420,
    startIntegrity: 100,
    waveCount: 20,
    threatPool: ['virus', 'worm', 'phishing', 'trojan', 'ransomware', 'ddos', 'cryptominer'],
  },

  {
    id: 'corp-lan',
    name: 'Corporate LAN',
    brief:
      'Two access floors feeding one distribution switch. Traffic converges in the middle, so the choke point is obvious. Defending it is not.',
    difficulty: 2,
    unlockAfter: 'home-net',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    lanes: [
      [t(-1, 2), t(5, 2), t(5, 7), t(12, 7), t(12, 4), t(19, 4), t(19, 11), t(24, 11)],
      [t(-1, 12), t(5, 12), t(5, 7), t(12, 7), t(12, 4), t(19, 4), t(19, 11), t(24, 11)],
    ],
    blocked: [t(8, 1), t(9, 1), t(8, 13), t(9, 13), t(15, 8), t(16, 8), t(15, 9)],
    startCredits: 460,
    startIntegrity: 100,
    waveCount: 25,
    threatPool: [
      'virus',
      'worm',
      'phishing',
      'trojan',
      'ransomware',
      'ddos',
      'cryptominer',
      'botnet',
      'rootkit',
    ],
  },

  {
    id: 'cloud-region',
    name: 'Cloud Region',
    brief:
      'Two availability zones, two independent ingress paths, one shared egress. You cannot cover both with one battery. Split your budget.',
    difficulty: 3,
    unlockAfter: 'corp-lan',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    lanes: [
      [t(-1, 2), t(6, 2), t(6, 6), t(13, 6), t(13, 2), t(20, 2), t(20, 7), t(24, 7)],
      [t(-1, 12), t(6, 12), t(6, 8), t(13, 8), t(13, 12), t(20, 12), t(20, 7), t(24, 7)],
    ],
    blocked: [t(2, 7), t(3, 7), t(2, 6), t(9, 0), t(9, 14), t(16, 0), t(16, 14)],
    startCredits: 500,
    startIntegrity: 90,
    waveCount: 30,
    threatPool: [
      'virus',
      'worm',
      'phishing',
      'trojan',
      'ransomware',
      'ddos',
      'cryptominer',
      'botnet',
      'rootkit',
      'tunnel',
      'logicbomb',
    ],
  },

  {
    id: 'scada',
    name: 'Industrial SCADA',
    brief:
      'A flat OT network with a serpentine route to the historian. The path is long, which buys you time, and every segment is a place you failed to segment.',
    difficulty: 4,
    unlockAfter: 'cloud-region',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    lanes: [
      [
        t(-1, 1),
        t(21, 1),
        t(21, 4),
        t(2, 4),
        t(2, 7),
        t(21, 7),
        t(21, 10),
        t(2, 10),
        t(2, 13),
        t(24, 13),
      ],
    ],
    blocked: [t(23, 2), t(23, 3), t(0, 5), t(0, 6), t(23, 8), t(23, 9), t(0, 11), t(0, 12)],
    startCredits: 540,
    startIntegrity: 80,
    waveCount: 30,
    threatPool: [
      'virus',
      'worm',
      'phishing',
      'trojan',
      'ransomware',
      'ddos',
      'cryptominer',
      'botnet',
      'rootkit',
      'tunnel',
      'logicbomb',
      'apt',
    ],
    modifiers: { healthScale: 1.15, economyScale: 1.1 },
  },

  {
    id: 'datacenter',
    name: 'Datacenter Core',
    brief:
      'Three ingress trunks converging on the crown jewels. Everything the adversary has, arriving at once, from three directions.',
    difficulty: 5,
    unlockAfter: 'scada',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    lanes: [
      [t(-1, 2), t(6, 2), t(6, 5), t(14, 5), t(14, 2), t(20, 2), t(20, 7), t(24, 7)],
      [t(-1, 7), t(3, 7), t(3, 11), t(11, 11), t(11, 7), t(20, 7), t(24, 7)],
      [t(-1, 12), t(6, 12), t(6, 9), t(16, 9), t(16, 12), t(20, 12), t(20, 7), t(24, 7)],
    ],
    blocked: [t(9, 0), t(10, 0), t(9, 1), t(0, 4), t(1, 4), t(0, 14), t(1, 14), t(22, 0), t(22, 14)],
    startCredits: 600,
    startIntegrity: 75,
    waveCount: 35,
    threatPool: [
      'virus',
      'worm',
      'phishing',
      'trojan',
      'ransomware',
      'ddos',
      'cryptominer',
      'botnet',
      'rootkit',
      'tunnel',
      'logicbomb',
      'apt',
    ],
    modifiers: { healthScale: 1.25, speedScale: 1.05, economyScale: 1.15 },
  },
];

export const MAP_BY_ID = new Map(MAPS.map((m) => [m.id, m]));

export function getMap(id: string): GameMapDef | undefined {
  return MAP_BY_ID.get(id);
}
