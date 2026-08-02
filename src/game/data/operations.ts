import type { MapModifiers, ThreatId } from '../core/types';
import source from './operations-source.json';

/**
 * Operations: campaigns against documented threat groups.
 *
 * What makes each one play differently is not flavour text. The wave roster is
 * weighted by what the real group actually does, derived from its ATT&CK
 * technique list by `npm run ops:sync`. Sandworm leads with destructive impact,
 * Volt Typhoon with tunnelling, APT1 with phishing, because that is what the
 * data says about them.
 *
 * Everything factual here comes from that generated file. The prose is written
 * for this game rather than lifted from MITRE, and every operation links back to
 * its group page so a claim can be checked.
 */

export type OperationTier = 'espionage' | 'financial' | 'disruption' | 'capstone';

export const TIER_LABEL: Record<OperationTier, string> = {
  espionage: 'Espionage',
  financial: 'Financial crime',
  disruption: 'Disruption',
  capstone: 'Capstone',
};

export const TIER_ORDER: OperationTier[] = ['espionage', 'financial', 'disruption', 'capstone'];

export interface OperationSource {
  groupId: string;
  actor: string;
  aliases: string[];
  techniqueCount: number;
  weights: Partial<Record<ThreatId, number>>;
  evidence: Partial<Record<ThreatId, string[]>>;
  signature: ThreatId[];
}

const SOURCE = source as { source: string; operations: OperationSource[] };
const BY_GROUP = new Map(SOURCE.operations.map((o) => [o.groupId, o]));

export interface Operation {
  id: string;
  groupId: string;
  /** Codename for the run. Ours, not MITRE's. */
  name: string;
  tier: OperationTier;
  mapId: string;
  waveCount: number;
  /** Short brief written for this game. */
  brief: string;
  /** What playing against this actor feels like. */
  signature: string;
  modifiers?: MapModifiers;
  /** Group id that must be cleared first. */
  unlockAfter: string | null;
}

/**
 * Ten operations across the four theatres. Board and length are chosen to suit
 * the actor: a phishing-heavy opener on the simplest map, a three-lane
 * datacentre for the capstones.
 */
export const OPERATIONS: Operation[] = [
  {
    id: 'first-light',
    groupId: 'G0006',
    name: 'First Light',
    tier: 'espionage',
    mapId: 'home-net',
    waveCount: 12,
    brief:
      'A long-running espionage effort that got in the same way almost everyone gets in: a convincing email to somebody who had no reason to doubt it.',
    signature: 'Relentless phishing. Volume at the perimeter, little subtlety once inside.',
    unlockAfter: null,
  },
  {
    id: 'quiet-tenant',
    groupId: 'G0045',
    name: 'Quiet Tenant',
    tier: 'espionage',
    mapId: 'corp-lan',
    waveCount: 15,
    brief:
      'An intrusion built on looking like software that belongs. Payloads arrive wearing the name of something you installed on purpose.',
    signature: 'Disguised traffic. Detection matters more than raw damage.',
    unlockAfter: 'G0006',
  },
  {
    id: 'long-shadow',
    groupId: 'G0010',
    name: 'Long Shadow',
    tier: 'espionage',
    mapId: 'cloud-region',
    waveCount: 18,
    brief:
      'Command and control routed through infrastructure nobody thinks to watch, by an actor with a long history of doing exactly that.',
    signature: 'Heavy command-and-control presence. Expect the lanes to stay busy.',
    modifiers: { healthScale: 1.05 },
    unlockAfter: 'G0045',
  },
  {
    id: 'still-water',
    groupId: 'G0016',
    name: 'Still Water',
    tier: 'espionage',
    mapId: 'corp-lan',
    waveCount: 18,
    brief:
      'Access obtained legitimately and kept quietly. The credentials are real, which is what makes it hard.',
    signature: 'Persistence over force. Long-lived threats that keep coming back.',
    modifiers: { healthScale: 1.08 },
    unlockAfter: 'G0010',
  },
  {
    id: 'card-table',
    groupId: 'G0046',
    name: 'Card Table',
    tier: 'financial',
    mapId: 'corp-lan',
    waveCount: 16,
    brief:
      'A financially motivated crew with a taste for attachments that run more than they claim to, aimed squarely at payment systems.',
    signature: 'Delivered payloads in volume. Splash damage earns its place.',
    unlockAfter: 'G0006',
  },
  {
    id: 'spider-web',
    groupId: 'G0102',
    name: 'Spider Web',
    tier: 'financial',
    mapId: 'cloud-region',
    waveCount: 20,
    brief:
      'A criminal enterprise that treats initial access as a product. Whatever gets in first is rarely what does the damage.',
    signature: 'Credential abuse and lateral movement. The board fills from the inside.',
    modifiers: { healthScale: 1.06, economyScale: 1.18 },
    unlockAfter: 'G0046',
  },
  {
    id: 'black-tide',
    groupId: 'G0034',
    name: 'Black Tide',
    tier: 'disruption',
    mapId: 'scada',
    waveCount: 20,
    brief:
      'A state programme that has repeatedly turned intrusion into destruction, including against systems that keep the lights on.',
    signature: 'Destructive impact. Armoured, slow and extremely expensive to let through.',
    modifiers: { healthScale: 1.12, economyScale: 1.61 },
    unlockAfter: 'G0016',
  },
  {
    id: 'iron-rain',
    groupId: 'G0032',
    name: 'Iron Rain',
    tier: 'disruption',
    mapId: 'scada',
    waveCount: 22,
    brief:
      'Wiper and ransomware operations run at national scale, with a habit of spreading far beyond the intended target.',
    signature: 'Ransomware behind a screen of stealth. Detection and burst damage, together.',
    modifiers: { healthScale: 1.14, economyScale: 1.61 },
    unlockAfter: 'G0034',
  },
  {
    id: 'grid-walker',
    groupId: 'G1017',
    name: 'Grid Walker',
    tier: 'capstone',
    mapId: 'datacenter',
    waveCount: 24,
    brief:
      'An actor that avoids malware where it can, living off tools already present and routing traffic through equipment nobody audits.',
    signature: 'Tunnelled traffic and stealth. Most of your board simply cannot see it.',
    modifiers: { healthScale: 1.15, speedScale: 1.05, economyScale: 1.54 },
    unlockAfter: 'G0032',
  },
  {
    id: 'open-season',
    groupId: 'G0007',
    name: 'Open Season',
    tier: 'capstone',
    mapId: 'datacenter',
    waveCount: 26,
    brief:
      'A well-resourced programme with a long record of using vulnerabilities before anybody has a patch for them.',
    signature: 'Zero-days and persistence. Nothing about this one is signature-based.',
    modifiers: { healthScale: 1.2, speedScale: 1.05, economyScale: 1.54 },
    unlockAfter: 'G1017',
  },
];

export const OPERATION_BY_ID = new Map(OPERATIONS.map((o) => [o.id, o]));

export function getOperation(id: string): Operation | undefined {
  return OPERATION_BY_ID.get(id);
}

/** The generated roster data behind an operation. */
export function operationSource(op: Operation): OperationSource | undefined {
  return BY_GROUP.get(op.groupId);
}

/**
 * Roster weights for an operation, as a multiplier per threat.
 *
 * Returned as multipliers rather than absolute probabilities so the wave
 * director keeps its own sense of which threats are unlocked yet: an operation
 * bends the composition, it does not replace it. A weight of 0 for a threat the
 * group never uses would make early waves empty on some boards, so the floor is
 * a small non-zero value.
 */
export function rosterMultipliers(op: Operation): Partial<Record<ThreatId, number>> {
  const src = operationSource(op);
  if (!src) return {};

  const out: Partial<Record<ThreatId, number>> = {};
  const values = Object.values(src.weights) as number[];
  const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

  for (const [threat, weight] of Object.entries(src.weights) as Array<[ThreatId, number]>) {
    // Around 1 for an average family, up to about 3 for a signature one.
    out[threat] = Math.max(0.25, Math.min(3, weight / Math.max(0.001, mean)));
  }
  return out;
}

export function operationsByTier(tier: OperationTier): Operation[] {
  return OPERATIONS.filter((o) => o.tier === tier);
}

/** attack.mitre.org page for the group an operation is built from. */
export function groupUrl(groupId: string): string {
  return `https://attack.mitre.org/groups/${groupId}/`;
}
