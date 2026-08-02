/**
 * Keeps the ATT&CK / D3FEND mapping honest.
 *
 *   npm run attack:sync     # read the sibling repo, refresh the snapshot
 *   npm run attack:check    # offline, verify the mapping against the snapshot
 *
 * `src/game/data/attack.ts` names real MITRE identifiers. Those identifiers
 * come from the dataset the MITRE ATT&CK Adventure project generates, and that
 * dataset gets refreshed when MITRE publishes. Without something checking, our
 * mapping quietly rots: an ID disappears, a countermeasure is renamed, and the
 * codex confidently shows a dead link.
 *
 * What the sibling dataset can actually vouch for:
 *
 *   - which ATT&CK technique IDs exist, and how many D3FEND counters each has
 *   - every D3FEND countermeasure's id, name and tactic (its `catalog`)
 *
 * What it cannot: ATT&CK technique *display names*. They are not in that file,
 * so the names in `THREAT_ATTACK` are ours and this script does not pretend to
 * have verified them. It says so in its output rather than implying otherwise.
 *
 * `sync` needs the sibling repo checked out. `check` runs offline against the
 * committed snapshot, which is what CI uses.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { THREAT_ATTACK, TOWER_D3FEND } from '../src/game/data/attack';

const SNAPSHOT_PATH = resolve(process.cwd(), 'src/game/data/attack-source.json');

interface Snapshot {
  generatedAt: string;
  source: string;
  sourceSha256: string;
  tactics: string[];
  /** Only the countermeasures the mapping actually references. */
  counters: Record<string, { name: string; tactic: string }>;
  /** Only the techniques the mapping references, with their counter counts. */
  techniques: Record<string, { counters: number }>;
  /** Techniques we reference that the dataset has no D3FEND coverage for. */
  uncovered: string[];
}

/** Where the sibling repo might be, in order of preference. */
function findSource(): string | null {
  const explicit = process.env.MITRE_ATTACK_REPO;
  const candidates = [
    ...(explicit ? [explicit] : []),
    resolve(process.cwd(), '../mitreattack'),
    resolve(homedir(), 'Github Projects/mitreattack'),
    resolve(homedir(), 'github-projects/mitreattack'),
  ];
  for (const base of candidates) {
    const file = base.endsWith('.json') ? base : resolve(base, 'src/data/d3fend.json');
    if (existsSync(file)) return file;
  }
  return null;
}

const problems: string[] = [];
const notes: string[] = [];

function fail(message: string): void {
  problems.push(message);
}

/* --------------------------------------------------------------------- sync */

function sync(sourceFile: string): Snapshot {
  const raw = readFileSync(sourceFile, 'utf8');
  const data = JSON.parse(raw) as {
    techniques: Record<string, { counters: Array<{ id: string; name: string; tactic: string }> }>;
    tactics: string[];
    catalog: Array<{ id: string; name: string; tactic: string }>;
  };

  const catalog = new Map(data.catalog.map((c) => [c.id, c]));

  const counters: Snapshot['counters'] = {};
  const techniques: Snapshot['techniques'] = {};
  const uncovered: string[] = [];

  // Every D3FEND countermeasure the towers claim must exist in the catalogue,
  // and its name and tactic are taken from there rather than from our file.
  for (const [tower, doctrine] of Object.entries(TOWER_D3FEND)) {
    for (const counter of doctrine.counters) {
      const real = catalog.get(counter.id);
      if (!real) {
        fail(`${tower}: D3FEND ${counter.id} is not in the catalogue`);
        continue;
      }
      counters[counter.id] = { name: real.name, tactic: real.tactic };
      if (real.name !== counter.name) {
        fail(`${tower}: ${counter.id} is "${real.name}" upstream, mapping says "${counter.name}"`);
      }
      if (real.tactic !== counter.tactic) {
        fail(
          `${tower}: ${counter.id} is tactic ${real.tactic} upstream, mapping says ${counter.tactic}`,
        );
      }
    }
    if (!data.tactics.includes(doctrine.tactic)) {
      fail(`${tower}: tactic "${doctrine.tactic}" is not one of the seven D3FEND tactics`);
    }
  }

  for (const [threat, technique] of Object.entries(THREAT_ATTACK)) {
    const entry = data.techniques[technique.id];
    if (entry) {
      techniques[technique.id] = { counters: entry.counters.length };
    } else {
      // Not an error. The dataset covers 418 techniques, not all of ATT&CK, and
      // the codex is written to show these without countermeasures.
      uncovered.push(technique.id);
      notes.push(`${threat}: ${technique.id} has no D3FEND coverage upstream (shown without counters)`);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'mitreattack/src/data/d3fend.json',
    sourceSha256: createHash('sha256').update(raw).digest('hex'),
    tactics: data.tactics,
    counters,
    techniques,
    uncovered: uncovered.sort(),
  };
}

/* -------------------------------------------------------------------- check */

function check(snapshot: Snapshot): void {
  for (const [tower, doctrine] of Object.entries(TOWER_D3FEND)) {
    for (const counter of doctrine.counters) {
      const known = snapshot.counters[counter.id];
      if (!known) {
        fail(`${tower}: ${counter.id} is not in the snapshot — run npm run attack:sync`);
        continue;
      }
      if (known.name !== counter.name) {
        fail(`${tower}: ${counter.id} name drifted ("${known.name}" vs "${counter.name}")`);
      }
      if (known.tactic !== counter.tactic) {
        fail(`${tower}: ${counter.id} tactic drifted (${known.tactic} vs ${counter.tactic})`);
      }
    }
    if (!snapshot.tactics.includes(doctrine.tactic)) {
      fail(`${tower}: tactic "${doctrine.tactic}" is not a D3FEND tactic`);
    }
  }

  for (const [threat, technique] of Object.entries(THREAT_ATTACK)) {
    const covered = technique.id in snapshot.techniques;
    const known = covered || snapshot.uncovered.includes(technique.id);
    if (!known) {
      fail(`${threat}: ${technique.id} is not in the snapshot — run npm run attack:sync`);
    }
  }
}

/* --------------------------------------------------------------------- main */

const wantCheck = process.argv.includes('--check');

if (wantCheck) {
  if (!existsSync(SNAPSHOT_PATH)) {
    console.error('No snapshot found. Run: npm run attack:sync');
    process.exit(1);
  }
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot;
  check(snapshot);
  console.log(
    `\nChecked ${Object.keys(TOWER_D3FEND).length} defences and ` +
      `${Object.keys(THREAT_ATTACK).length} threats against the snapshot ` +
      `(generated ${snapshot.generatedAt.slice(0, 10)}).`,
  );
} else {
  const sourceFile = findSource();
  if (!sourceFile) {
    console.error(
      'Could not find the MITRE ATT&CK Adventure dataset.\n' +
        'Point at it explicitly:  MITRE_ATTACK_REPO=/path/to/mitreattack npm run attack:sync',
    );
    process.exit(1);
  }

  const snapshot = sync(sourceFile);
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`\nRead ${sourceFile}`);
  console.log(
    `Snapshot written: ${Object.keys(snapshot.counters).length} countermeasures, ` +
      `${Object.keys(snapshot.techniques).length} techniques with coverage, ` +
      `${snapshot.uncovered.length} without.`,
  );
}

for (const note of notes) console.log(`  \x1b[33mnote\x1b[0m  ${note}`);

if (problems.length > 0) {
  console.error(`\n\x1b[31m${problems.length} problem(s):\x1b[0m`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    '\nATT&CK technique display names are not in the upstream dataset and are not\n' +
      'checked here. Everything else above is verified against it.\n',
  );
  process.exit(1);
}

console.log(
  '\n\x1b[32mMapping is consistent.\x1b[0m ATT&CK technique display names are not carried\n' +
    'by the upstream dataset, so they are ours and are not verified here.\n',
);
