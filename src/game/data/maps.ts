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
    modifiers: { economyScale: 1.46 },
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
    startCredits: 520,
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
    modifiers: { economyScale: 1.51 },
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
    // The zones converge with nine tiles still to run, so a shared kill box at
    // the egress is a real option. Converging on the exit tile instead would
    // force the player to fund two independent batteries and nothing else.
    lanes: [
      [t(-1, 2), t(6, 2), t(6, 6), t(11, 6), t(11, 3), t(15, 3), t(15, 7), t(24, 7)],
      [t(-1, 12), t(6, 12), t(6, 8), t(11, 8), t(11, 11), t(15, 11), t(15, 7), t(24, 7)],
    ],
    blocked: [t(2, 7), t(3, 7), t(2, 6), t(9, 0), t(9, 14), t(16, 0), t(16, 14)],
    startCredits: 620,
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
    modifiers: { economyScale: 1.26 },
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
    startCredits: 640,
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
    modifiers: { healthScale: 1.08, economyScale: 1.39 },
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
    // All three trunks merge at column 12, leaving a twelve-tile shared corridor
    // into the core. Three lanes that only meet at the exit would just divide
    // the player's damage by three, which is not difficulty, only arithmetic.
    lanes: [
      [t(-1, 2), t(4, 2), t(4, 5), t(8, 5), t(8, 7), t(12, 7), t(24, 7)],
      [t(-1, 7), t(2, 7), t(2, 11), t(6, 11), t(6, 7), t(12, 7), t(24, 7)],
      [t(-1, 12), t(4, 12), t(4, 9), t(9, 9), t(9, 7), t(12, 7), t(24, 7)],
    ],
    blocked: [t(9, 0), t(10, 0), t(9, 1), t(0, 4), t(1, 4), t(0, 14), t(1, 14), t(22, 0), t(22, 14)],
    startCredits: 780,
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
    modifiers: { healthScale: 1.12, speedScale: 1.05, economyScale: 1.65 },
  },

  {
    id: 'vpn-concentrator',
    name: 'Remote Workforce',
    brief:
      'Four ingress points and one concentrator. Everyone dialled in from somewhere else, and all of it funnels through the same tunnel before it touches anything that matters.',
    difficulty: 3,
    unlockAfter: 'corp-lan',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    // Four entries collapsing to one point at column four, then a long shared
    // run. The opposite problem to Cloud Region: the choke is obvious and early,
    // and the question is whether you can afford to hold it.
    lanes: [
      [t(-1, 1), t(4, 1), t(4, 7), t(8, 7), t(14, 7), t(14, 11), t(19, 11), t(19, 7), t(24, 7)],
      [t(-1, 5), t(4, 5), t(4, 7), t(8, 7), t(14, 7), t(14, 11), t(19, 11), t(19, 7), t(24, 7)],
      [t(-1, 9), t(4, 9), t(4, 7), t(8, 7), t(14, 7), t(14, 11), t(19, 11), t(19, 7), t(24, 7)],
      [t(-1, 13), t(4, 13), t(4, 7), t(8, 7), t(14, 7), t(14, 11), t(19, 11), t(19, 7), t(24, 7)],
    ],
    blocked: [t(0, 3), t(1, 3), t(0, 11), t(1, 11), t(10, 0), t(11, 0), t(10, 14), t(11, 14)],
    startCredits: 560,
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
    modifiers: { economyScale: 1.24 },
  },

  {
    id: 'cluster',
    name: 'Container Cluster',
    brief:
      'Short paths, wide open floor, and workloads that appear and vanish faster than anyone can inventory them. Nothing here takes long to reach the middle.',
    difficulty: 3,
    unlockAfter: 'cloud-region',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    // Deliberately short lanes and an unusually open board. Difficulty comes
    // from how little time anything spends in range, not from the layout.
    lanes: [
      [t(-1, 3), t(10, 3), t(10, 7), t(24, 7)],
      [t(-1, 7), t(10, 7), t(24, 7)],
      [t(-1, 11), t(10, 11), t(10, 7), t(24, 7)],
    ],
    blocked: [t(3, 0), t(4, 0), t(3, 14), t(4, 14), t(16, 1), t(17, 1), t(16, 13), t(17, 13)],
    startCredits: 640,
    startIntegrity: 85,
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
    ],
    modifiers: { speedScale: 1.12, economyScale: 1.37 },
  },

  {
    id: 'supply-chain',
    name: 'Supply Chain',
    brief:
      'One route in from the internet, and one from a vendor you already trust. The second does not pass your perimeter because it was never meant to.',
    difficulty: 4,
    unlockAfter: 'scada',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    // The vendor lane enters from the top edge, deep in your network and close
    // to the core. You cannot defend its entry point, only the ground it still
    // has to cross, which is the whole lesson of third-party risk.
    lanes: [
      [t(-1, 12), t(6, 12), t(6, 8), t(13, 8), t(13, 12), t(19, 12), t(19, 7), t(24, 7)],
      [t(20, -1), t(20, 4), t(15, 4), t(15, 7), t(19, 7), t(24, 7)],
    ],
    blocked: [t(0, 5), t(1, 5), t(0, 6), t(9, 0), t(10, 0), t(23, 10), t(23, 11)],
    startCredits: 680,
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
    modifiers: { healthScale: 1.1, economyScale: 1.49 },
  },

  {
    id: 'air-gap',
    name: 'Air-Gapped Facility',
    brief:
      'Isolated, in theory. The route in is long and there is almost nowhere to stand: this floor was built for equipment, not for defenders.',
    difficulty: 5,
    unlockAfter: 'datacenter',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    // A five-pass serpentine with narrow buildable strips between the passes.
    // Anything you site covers two runs at once, which is the compensation for
    // having so few places to put it.
    lanes: [
      [
        t(-1, 1),
        t(22, 1),
        t(22, 4),
        t(1, 4),
        t(1, 7),
        t(22, 7),
        t(22, 10),
        t(1, 10),
        t(1, 13),
        t(24, 13),
      ],
    ],
    blocked: [
      t(5, 2), t(6, 2), t(12, 2), t(13, 2), t(18, 2),
      t(4, 5), t(10, 5), t(11, 5), t(17, 5), t(18, 5),
      t(6, 8), t(7, 8), t(14, 8), t(19, 8),
      t(5, 11), t(11, 11), t(12, 11), t(17, 11),
    ],
    startCredits: 720,
    startIntegrity: 70,
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
    modifiers: { healthScale: 1.22, economyScale: 1.59 },
  },
];

export const MAP_BY_ID = new Map(MAPS.map((m) => [m.id, m]));

export function getMap(id: string): GameMapDef | undefined {
  return MAP_BY_ID.get(id);
}
