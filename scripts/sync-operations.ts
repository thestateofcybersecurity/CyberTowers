/**
 * Derives operation threat rosters from real ATT&CK groups.
 *
 *   npm run ops:sync     # read the sibling repo, regenerate the roster data
 *   npm run ops:check    # offline, verify the committed data is self-consistent
 *
 * An operation is a campaign against a documented threat group. What makes each
 * one play differently is that its wave composition is weighted by what that
 * group actually does: Wizard Spider brings ransomware, Sandworm brings
 * disruption, Turla brings stealth.
 *
 * Requiring an exact technique-for-threat match would not work. CyberTowers has
 * fourteen threats and a group has sixty to ninety techniques, most of which are
 * reconnaissance or discovery with no tower-defence analogue. APT1 would land a
 * single match and produce a campaign of nothing but viruses.
 *
 * So each threat claims a *family* of techniques, and a group's roster weight
 * for that threat is how much of its documented tradecraft falls in the family.
 * That is a real signal from real data, and the evidence is kept alongside the
 * weight so any claim can be traced back to the techniques that produced it.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import type { ThreatId } from '../src/game/core/types';

const OUT = resolve(process.cwd(), 'src/game/data/operations-source.json');

/**
 * Technique-ID prefixes each threat stands in for. Matching is by prefix so a
 * sub-technique counts toward its parent family.
 */
const FAMILIES: Record<ThreatId, string[]> = {
  // T1489 Service Stop belongs here, not with network denial of service: it is
  // how ransomware kills backup and AV services before encrypting. Volumetric
  // DoS is T1498/T1499.
  ransomware: ['T1486', 'T1490', 'T1485', 'T1491', 'T1489', 'T1561'],
  phishing: ['T1566', 'T1598', 'T1534'],
  virus: ['T1204', 'T1059', 'T1106'],
  worm: ['T1091', 'T1210', 'T1021', 'T1080', 'T1570'],
  trojan: ['T1027', 'T1036', 'T1140', 'T1553'],
  rootkit: ['T1014', 'T1562', 'T1070', 'T1055', 'T1112'],
  botnet: ['T1583', 'T1584', 'T1071', 'T1102', 'T1568'],
  bot: ['T1105', 'T1608'],
  cryptominer: ['T1496', 'T1543', 'T1569'],
  ddos: ['T1498', 'T1499'],
  tunnel: ['T1572', 'T1573', 'T1090', 'T1041', 'T1048'],
  logicbomb: ['T1053', 'T1547', 'T1546'],
  apt: ['T1078', 'T1098', 'T1136', 'T1550', 'T1003'],
  zeroday: ['T1068', 'T1190', 'T1211', 'T1212', 'T1203'],
};

interface GroupInfo {
  name: string;
  aliases: string[];
  description: string;
  techniques: string[];
}

interface OperationSource {
  groupId: string;
  actor: string;
  aliases: string[];
  techniqueCount: number;
  /** Normalised 0..1 weight per threat, and the techniques behind it. */
  weights: Partial<Record<ThreatId, number>>;
  evidence: Partial<Record<ThreatId, string[]>>;
  /** The threats this group leans on hardest, for the operation blurb. */
  signature: ThreatId[];
}

function findGroups(): string | null {
  const explicit = process.env.MITRE_ATTACK_REPO;
  const candidates = [
    ...(explicit ? [explicit] : []),
    resolve(process.cwd(), '../mitreattack'),
    resolve(homedir(), 'Github Projects/mitreattack'),
  ];
  for (const base of candidates) {
    const file = base.endsWith('.json') ? base : resolve(base, 'src/data/groups.json');
    if (existsSync(file)) return file;
  }
  return null;
}

/**
 * Raw hit counts per threat family for one group.
 *
 * Counting alone is not enough. Families differ in how many techniques they
 * span, so broad ones dominate every group equally and the rosters come out
 * looking the same. Worse, it is wrong: Wizard Spider is the Ryuk and Conti
 * crew, and a count-weighted roster does not surface ransomware at all.
 */
function rawCounts(info: GroupInfo): Partial<Record<ThreatId, number>> {
  const counts: Partial<Record<ThreatId, number>> = {};
  for (const [threat, prefixes] of Object.entries(FAMILIES) as Array<[ThreatId, string[]]>) {
    const hits = info.techniques.filter((t) => prefixes.some((p) => t.startsWith(p)));
    if (hits.length > 0) counts[threat] = hits.length;
  }
  return counts;
}

function derive(
  groupId: string,
  info: GroupInfo,
  meanShare: Partial<Record<ThreatId, number>>,
): OperationSource {
  const counts = rawCounts(info);
  const evidence: Partial<Record<ThreatId, string[]>> = {};
  for (const [threat, prefixes] of Object.entries(FAMILIES) as Array<[ThreatId, string[]]>) {
    const hits = info.techniques.filter((t) => prefixes.some((p) => t.startsWith(p)));
    if (hits.length > 0) evidence[threat] = hits.slice(0, 6);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  // Blend how much of this group's tradecraft sits in a family with how unusual
  // that is across every group. The lift term is what makes a ransomware crew
  // read as a ransomware crew instead of as an average actor.
  const scored: Partial<Record<ThreatId, number>> = {};
  for (const [threat, n] of Object.entries(counts) as Array<[ThreatId, number]>) {
    const share = n / total;
    const lift = share / Math.max(0.001, meanShare[threat] ?? share);
    scored[threat] = share * (0.4 + 0.6 * Math.min(3, lift));
  }

  const scoreTotal = Object.values(scored).reduce((a, b) => a + b, 0) || 1;
  const weights: Partial<Record<ThreatId, number>> = {};
  for (const [threat, v] of Object.entries(scored) as Array<[ThreatId, number]>) {
    weights[threat] = Math.round((v / scoreTotal) * 1000) / 1000;
  }
  Object.assign(counts, {});

  const signature = (Object.entries(weights) as Array<[ThreatId, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  return {
    groupId,
    actor: info.name,
    aliases: info.aliases.slice(0, 4),
    techniqueCount: info.techniques.length,
    weights,
    evidence,
    signature,
  };
}

if (process.argv.includes('--check')) {
  if (!existsSync(OUT)) {
    console.error('No operation data. Run: npm run ops:sync');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(OUT, 'utf8')) as { operations: OperationSource[] };
  let bad = 0;
  for (const op of data.operations) {
    const sum = Object.values(op.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.02) {
      console.error(`  ✗ ${op.actor}: weights sum to ${sum.toFixed(3)}, expected 1`);
      bad += 1;
    }
    if (op.signature.length === 0) {
      console.error(`  ✗ ${op.actor}: no signature threats`);
      bad += 1;
    }
  }
  console.log(`\nChecked ${data.operations.length} operations.`);
  if (bad) process.exit(1);
  console.log('\x1b[32mOperation rosters are well-formed.\x1b[0m\n');
} else {
  const file = findGroups();
  if (!file) {
    console.error(
      'Could not find groups.json.\n' +
        'Point at it:  MITRE_ATTACK_REPO=/path/to/mitreattack npm run ops:sync',
    );
    process.exit(1);
  }

  const groups = JSON.parse(readFileSync(file, 'utf8')) as Record<string, GroupInfo>;

  // Average share per family across every group, so "unusual for an actor to do"
  // can be measured rather than assumed.
  const meanShare: Partial<Record<ThreatId, number>> = {};
  const entries = Object.values(groups);
  for (const info of entries) {
    const counts = rawCounts(info);
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    for (const [threat, n] of Object.entries(counts) as Array<[ThreatId, number]>) {
      meanShare[threat] = (meanShare[threat] ?? 0) + n / total / entries.length;
    }
  }

  const operations = Object.entries(groups).map(([id, info]) => derive(id, info, meanShare));

  writeFileSync(
    OUT,
    `${JSON.stringify({ source: 'mitreattack/src/data/groups.json', operations }, null, 2)}\n`,
  );

  console.log(`\nRead ${file}\n`);
  console.log('  actor                  techniques   signature threats');
  for (const op of operations) {
    console.log(
      `  ${op.actor.padEnd(22)} ${String(op.techniqueCount).padStart(3)}          ` +
        op.signature.map((t) => `${t} ${Math.round((op.weights[t] ?? 0) * 100)}%`).join(', '),
    );
  }
  console.log(`\nWrote ${OUT}\n`);
}
