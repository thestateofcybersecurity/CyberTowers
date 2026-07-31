import type { AttackParams, OnHitEffect, TowerDef, TowerId } from '../core/types';

/**
 * Defaults for every attack tunable. A tower only declares the fields its
 * behaviour reads; the combat system resolves the rest from here, so adding a
 * new parameter never means touching all eight definitions.
 */
export const DEFAULT_ATTACK_PARAMS: AttackParams = {
  splashRadius: 0,
  splashFalloff: 0.4,
  chainJumps: 0,
  chainFalloff: 0.6,
  chainRange: 90,
  pierce: 0,
  auraDamage: 0,
  auraFireRate: 0,
  rampPerHit: 0,
  rampMax: 0,
  lureRadius: 0,
  lurePull: 0,
  detectStealth: false,
  hitsTunneled: false,
  bountyBonus: 0,
};

/**
 * The eight defences. Each fills a distinct role so a winning layout has to mix
 * them: raw DPS alone loses to armour, and armour-piercing alone loses to swarms.
 */
export const TOWERS: Record<TowerId, TowerDef> = {
  firewall: {
    id: 'firewall',
    name: 'Firewall',
    role: 'Rapid single-target',
    blurb:
      'Stateful packet filtering. Cheap, fast, and always the first thing you stand up. Struggles against hardened payloads.',
    unlockLevel: 1,
    attack: 'projectile',
    color: '#ff5f56',
    targeting: 'first',
    params: {},
    tiers: [
      { cost: 80, damage: 8, range: 112, fireRate: 2.2, note: 'Baseline packet filtering.' },
      { cost: 60, damage: 13, range: 122, fireRate: 2.6, note: 'Tighter rule set: +damage, +range.' },
      {
        cost: 140,
        damage: 20,
        range: 132,
        fireRate: 3.0,
        params: { pierce: 1 },
        note: 'Shots pierce one extra threat.',
      },
      {
        cost: 260,
        damage: 30,
        range: 146,
        fireRate: 3.4,
        params: { pierce: 2 },
        onHit: [{ type: 'burn', potency: 14, duration: 2.5 }],
        note: 'Deep packet inspection burns targets over time.',
      },
    ],
  },

  antivirus: {
    id: 'antivirus',
    name: 'Antivirus',
    role: 'Splash damage',
    blurb:
      'Signature-based scanning with a quarantine burst. Clears clustered, low-health swarms faster than anything else.',
    unlockLevel: 1,
    attack: 'splash',
    color: '#4ade80',
    targeting: 'strongest',
    params: { splashRadius: 42, splashFalloff: 0.45 },
    tiers: [
      { cost: 140, damage: 14, range: 104, fireRate: 1.0, note: 'Quarantine burst on impact.' },
      {
        cost: 110,
        damage: 20,
        range: 112,
        fireRate: 1.05,
        params: { splashRadius: 50 },
        note: 'Wider quarantine radius.',
      },
      {
        cost: 240,
        damage: 30,
        range: 120,
        fireRate: 1.2,
        params: { splashRadius: 58, splashFalloff: 0.55 },
        note: 'Heuristics: larger blast, less falloff.',
      },
      {
        cost: 430,
        damage: 44,
        range: 130,
        fireRate: 1.3,
        params: { splashRadius: 72, splashFalloff: 0.65 },
        onHit: [{ type: 'burn', potency: 11, duration: 3 }],
        note: 'Residual scan burns everything caught in the blast.',
      },
    ],
  },

  ids: {
    id: 'ids',
    name: 'IDS / IPS',
    role: 'Detection & marking',
    blurb:
      'Intrusion detection. Reveals stealthed threats in range and flags what it hits so every other tower hurts more.',
    unlockLevel: 2,
    attack: 'projectile',
    color: '#a78bfa',
    targeting: 'first',
    params: { detectStealth: true },
    tiers: [
      {
        cost: 120,
        damage: 9,
        range: 144,
        fireRate: 1.4,
        onHit: [{ type: 'flag', potency: 0.15, duration: 3 }],
        note: 'Reveals stealth. Flagged threats take +15% damage.',
      },
      {
        cost: 100,
        damage: 13,
        range: 158,
        fireRate: 1.5,
        onHit: [{ type: 'flag', potency: 0.22, duration: 3.5 }],
        note: 'Better signatures: +22% damage taken.',
      },
      {
        cost: 220,
        damage: 18,
        range: 172,
        fireRate: 1.7,
        onHit: [{ type: 'flag', potency: 0.32, duration: 4 }],
        note: 'Correlation engine: +32% damage taken.',
      },
      {
        cost: 400,
        damage: 26,
        range: 192,
        fireRate: 1.9,
        params: { hitsTunneled: true },
        onHit: [{ type: 'flag', potency: 0.45, duration: 4.5 }],
        note: 'Inline prevention. Sees encrypted tunnels; +45% damage taken.',
      },
    ],
  },

  encryption: {
    id: 'encryption',
    name: 'Encryption Node',
    role: 'Area slow',
    blurb:
      'Forces every packet through a crypto handshake. Low damage, but the throughput penalty stacks up across a whole lane.',
    unlockLevel: 3,
    attack: 'field',
    color: '#38bdf8',
    targeting: 'closest',
    params: { hitsTunneled: true },
    tiers: [
      {
        cost: 160,
        damage: 5,
        range: 98,
        fireRate: 1.0,
        onHit: [{ type: 'slow', potency: 0.25, duration: 1.5 }],
        note: 'Pulses the field. Slows everything inside by 25%.',
      },
      {
        cost: 130,
        damage: 8,
        range: 108,
        fireRate: 1.0,
        onHit: [{ type: 'slow', potency: 0.33, duration: 1.6 }],
        note: 'Stronger cipher suite: 33% slow.',
      },
      {
        cost: 280,
        damage: 12,
        range: 118,
        fireRate: 1.15,
        onHit: [{ type: 'slow', potency: 0.42, duration: 1.8 }],
        note: 'Perfect forward secrecy: 42% slow.',
      },
      {
        cost: 500,
        damage: 18,
        range: 132,
        fireRate: 1.3,
        onHit: [{ type: 'slow', potency: 0.52, duration: 2 }],
        note: 'Post-quantum handshake: 52% slow, faster pulses.',
      },
    ],
  },

  honeypot: {
    id: 'honeypot',
    name: 'Honeypot',
    role: 'Lure & forensics',
    blurb:
      'A deliberately soft target. Pulls threats toward it, poisons them slowly, and turns every kill nearby into extra budget.',
    unlockLevel: 4,
    attack: 'lure',
    color: '#fbbf24',
    targeting: 'closest',
    params: { lureRadius: 112, lurePull: 0.35, bountyBonus: 2 },
    tiers: [
      { cost: 100, damage: 4, range: 112, fireRate: 1.5, note: 'Lures threats; +2 credits per kill in range.' },
      {
        cost: 90,
        damage: 7,
        range: 122,
        fireRate: 1.6,
        params: { lureRadius: 126, bountyBonus: 3 },
        note: 'Deeper decoy: stronger pull, +3 credits.',
      },
      {
        cost: 200,
        damage: 11,
        range: 134,
        fireRate: 1.7,
        params: { lureRadius: 142, lurePull: 0.45, bountyBonus: 5 },
        onHit: [{ type: 'burn', potency: 9, duration: 3 }],
        note: 'Tarpit: threats take damage over time, +5 credits.',
      },
      {
        cost: 370,
        damage: 17,
        range: 148,
        fireRate: 1.8,
        params: { lureRadius: 162, lurePull: 0.55, bountyBonus: 9 },
        onHit: [{ type: 'burn', potency: 16, duration: 4 }],
        note: 'Full deception grid: heavy tarpit, +9 credits per kill.',
      },
    ],
  },

  soc: {
    id: 'soc',
    name: 'SOC Uplink',
    role: 'Support aura',
    blurb:
      'Analysts feeding targeting data to everything around them. Deals no damage itself, and makes every neighbour hit harder and faster.',
    unlockLevel: 5,
    attack: 'aura',
    color: '#f97316',
    targeting: 'closest',
    params: { auraDamage: 0.12, auraFireRate: 0.12 },
    tiers: [
      { cost: 260, damage: 0, range: 124, fireRate: 0, note: '+12% damage and fire rate to towers in range.' },
      {
        cost: 200,
        damage: 0,
        range: 138,
        fireRate: 0,
        params: { auraDamage: 0.19, auraFireRate: 0.19 },
        note: 'Tier-2 analysts: +19% to both.',
      },
      {
        cost: 420,
        damage: 0,
        range: 152,
        fireRate: 0,
        params: { auraDamage: 0.27, auraFireRate: 0.27 },
        note: 'Threat intel feed: +27% to both.',
      },
      {
        cost: 690,
        damage: 0,
        range: 178,
        fireRate: 0,
        params: { auraDamage: 0.38, auraFireRate: 0.38, detectStealth: true },
        note: 'Fusion centre: +38% to both, and grants stealth detection.',
      },
    ],
  },

  sentinel: {
    id: 'sentinel',
    name: 'AI Sentinel',
    role: 'Long-range sniper',
    blurb:
      'A model that learns the target it is shooting at. Slow, expensive, enormous range, and it ramps up the longer it stays locked on.',
    unlockLevel: 6,
    attack: 'beam',
    color: '#facc15',
    targeting: 'strongest',
    params: { rampPerHit: 0.08, rampMax: 1.0 },
    tiers: [
      { cost: 320, damage: 30, range: 244, fireRate: 0.7, note: 'Ramps +8% damage per consecutive hit, up to +100%.' },
      { cost: 260, damage: 44, range: 268, fireRate: 0.8, note: 'Larger model: more damage and reach.' },
      {
        cost: 560,
        damage: 64,
        range: 292,
        fireRate: 0.9,
        params: { rampPerHit: 0.1, rampMax: 1.5 },
        note: 'Faster convergence: ramps to +150%.',
      },
      {
        cost: 900,
        damage: 95,
        range: 324,
        fireRate: 1.0,
        params: { rampPerHit: 0.12, rampMax: 2.2, hitsTunneled: true },
        note: 'Autonomous response: ramps to +220% and sees tunnelled traffic.',
      },
    ],
  },

  edr: {
    id: 'edr',
    name: 'EDR Mesh',
    role: 'Chain damage',
    blurb:
      'Endpoint agents sharing telemetry. A detection on one host propagates to its neighbours, arcing between clustered threats.',
    unlockLevel: 4,
    attack: 'chain',
    color: '#22d3ee',
    targeting: 'closest',
    params: { chainJumps: 2, chainFalloff: 0.6, chainRange: 92 },
    tiers: [
      { cost: 200, damage: 16, range: 132, fireRate: 1.1, note: 'Arcs to 2 additional threats.' },
      {
        cost: 170,
        damage: 23,
        range: 142,
        fireRate: 1.15,
        params: { chainJumps: 3 },
        note: 'Wider mesh: arcs to 3.',
      },
      {
        cost: 360,
        damage: 33,
        range: 152,
        fireRate: 1.3,
        params: { chainJumps: 4, chainFalloff: 0.68 },
        note: 'Arcs to 4 with less damage loss.',
      },
      {
        cost: 640,
        damage: 48,
        range: 166,
        fireRate: 1.4,
        params: { chainJumps: 6, chainFalloff: 0.76, chainRange: 112 },
        onHit: [{ type: 'stun', potency: 0, duration: 0.35, chance: 0.25 }],
        note: 'Host isolation: arcs to 6, 25% chance to freeze a threat.',
      },
    ],
  },
};

export const TOWER_ORDER: TowerId[] = [
  'firewall',
  'antivirus',
  'ids',
  'encryption',
  'honeypot',
  'edr',
  'soc',
  'sentinel',
];

/** Total credits sunk into a tower at a given tier, used for sell value. */
export function investedCredits(id: TowerId, tier: number): number {
  const def = TOWERS[id];
  let total = 0;
  for (let i = 0; i <= tier && i < def.tiers.length; i++) total += def.tiers[i].cost;
  return total;
}

export const SELL_REFUND = 0.6;

export function sellValue(id: TowerId, tier: number): number {
  return Math.floor(investedCredits(id, tier) * SELL_REFUND);
}

/** Resolved stats for a tower at a tier, with all tier overrides folded in. */
export function resolveTower(id: TowerId, tier: number) {
  const def = TOWERS[id];
  const capped = Math.min(tier, def.tiers.length - 1);
  const params: AttackParams = { ...DEFAULT_ATTACK_PARAMS, ...def.params };
  // Later tiers replace an on-hit list wholesale rather than stacking, so an
  // upgrade that restates `slow` is a strict improvement, not a second slow.
  let onHit: OnHitEffect[] = [];

  for (let i = 0; i <= capped; i++) {
    const t = def.tiers[i];
    if (t.params) Object.assign(params, t.params);
    if (t.onHit) onHit = t.onHit;
  }

  const active = def.tiers[capped];
  return {
    def,
    tier: capped,
    damage: active.damage,
    range: active.range,
    fireRate: active.fireRate,
    params,
    onHit,
  };
}
