import type { ThreatId, TowerId } from '../core/types';

/**
 * Crossover with MITRE ATT&CK Adventure.
 *
 * Every threat here is a real ATT&CK technique and every defence is a real
 * D3FEND countermeasure. The identifiers were taken from the same D3FEND
 * dataset the Adventure app generates its content from, so the two games agree
 * about what a rootkit is and what stops one.
 *
 * The rule the sibling project sets for itself, and this follows: no invented
 * content. Where a threat has no D3FEND coverage in that dataset, it says so
 * rather than being mapped to something approximate.
 *
 * Source: MITRE ATT&CK STIX and the D3FEND ontology, via
 * github.com/thestateofcybersecurity/mitreattack (src/data/d3fend.json).
 */

export const ADVENTURE_URL = 'https://mitre.cybersecurityalphabetsoup.com';

export interface AttackTechnique {
  id: string;
  name: string;
  /** Why this threat maps to that technique, in one line. */
  note: string;
}

/** Deep link to the technique on attack.mitre.org, handling sub-techniques. */
export function attackUrl(id: string): string {
  const [base, sub] = id.split('.');
  return sub
    ? `https://attack.mitre.org/techniques/${base}/${sub}/`
    : `https://attack.mitre.org/techniques/${base}/`;
}

/** D3FEND pages are keyed by the countermeasure name in Pascal case. */
export function d3fendUrl(name: string): string {
  return `https://d3fend.mitre.org/technique/d3f:${name.replace(/[^A-Za-z0-9]/g, '')}/`;
}

export const THREAT_ATTACK: Record<ThreatId, AttackTechnique> = {
  virus: {
    id: 'T1204.002',
    name: 'User Execution: Malicious File',
    note: 'Runs because somebody opened it.',
  },
  worm: {
    id: 'T1091',
    name: 'Replication Through Removable Media',
    note: 'Spreads on its own, without anyone opening anything.',
  },
  phishing: {
    id: 'T1566.002',
    name: 'Phishing: Spearphishing Link',
    note: 'A convincing lure, clicked by a real person.',
  },
  trojan: {
    id: 'T1027.002',
    name: 'Obfuscated Files or Information: Software Packing',
    note: 'Packed so the thing you scan is not the thing that runs.',
  },
  ransomware: {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    note: 'Encrypts what it reaches and asks to be paid.',
  },
  botnet: {
    id: 'T1583.005',
    name: 'Acquire Infrastructure: Botnet',
    note: 'A rented crowd of compromised hosts.',
  },
  bot: {
    id: 'T1105',
    name: 'Ingress Tool Transfer',
    note: 'The payload pulled down onto each conscripted host.',
  },
  rootkit: {
    id: 'T1014',
    name: 'Rootkit',
    note: 'Sits below the layer doing the looking.',
  },
  cryptominer: {
    id: 'T1496',
    name: 'Resource Hijacking',
    note: 'Wants your compute, not your data.',
  },
  ddos: {
    id: 'T1498.001',
    name: 'Network Denial of Service: Direct Network Flood',
    note: 'Volume as the weapon.',
  },
  tunnel: {
    id: 'T1572',
    name: 'Protocol Tunneling',
    note: 'Exfiltration wrapped in traffic you already allow.',
  },
  logicbomb: {
    id: 'T1053',
    name: 'Scheduled Task/Job',
    note: 'Dormant until its trigger condition fires.',
  },
  apt: {
    id: 'T1078',
    name: 'Valid Accounts',
    note: 'Not breaking in. Logging in, and staying.',
  },
  zeroday: {
    id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    note: 'No signature exists yet, because nobody has seen it.',
  },
};

export interface D3fendCounter {
  id: string;
  name: string;
  tactic: 'Model' | 'Harden' | 'Detect' | 'Isolate' | 'Deceive' | 'Evict' | 'Restore';
}

export interface TowerDoctrine {
  /** The D3FEND tactic this defence most belongs to. */
  tactic: D3fendCounter['tactic'];
  counters: D3fendCounter[];
}

export const TOWER_D3FEND: Record<TowerId, TowerDoctrine> = {
  firewall: {
    tactic: 'Isolate',
    counters: [
      { id: 'D3-NTF', name: 'Network Traffic Filtering', tactic: 'Isolate' },
      { id: 'D3-ITF', name: 'Inbound Traffic Filtering', tactic: 'Isolate' },
    ],
  },
  antivirus: {
    tactic: 'Detect',
    counters: [
      { id: 'D3-EFA', name: 'Emulated File Analysis', tactic: 'Detect' },
      { id: 'D3-EDL', name: 'Executable Denylisting', tactic: 'Isolate' },
    ],
  },
  ids: {
    tactic: 'Detect',
    counters: [
      { id: 'D3-NTSA', name: 'Network Traffic Signature Analysis', tactic: 'Detect' },
      { id: 'D3-DNSTA', name: 'DNS Traffic Analysis', tactic: 'Detect' },
    ],
  },
  encryption: {
    tactic: 'Harden',
    counters: [
      { id: 'D3-FE', name: 'File Encryption', tactic: 'Harden' },
      { id: 'D3-DENCR', name: 'Disk Encryption', tactic: 'Harden' },
    ],
  },
  honeypot: {
    tactic: 'Deceive',
    counters: [
      { id: 'D3-DE', name: 'Decoy Environment', tactic: 'Deceive' },
      { id: 'D3-DNR', name: 'Decoy Network Resource', tactic: 'Deceive' },
    ],
  },
  soc: {
    tactic: 'Model',
    counters: [
      { id: 'D3-NNI', name: 'Network Node Inventory', tactic: 'Model' },
      { id: 'D3-SWI', name: 'Software Inventory', tactic: 'Model' },
    ],
  },
  sentinel: {
    tactic: 'Detect',
    counters: [
      { id: 'D3-NTCD', name: 'Network Traffic Community Deviation', tactic: 'Detect' },
      { id: 'D3-IPCTA', name: 'IPC Traffic Analysis', tactic: 'Detect' },
    ],
  },
  edr: {
    tactic: 'Isolate',
    counters: [
      { id: 'D3-ABPI', name: 'Application-based Process Isolation', tactic: 'Isolate' },
      { id: 'D3-SCF', name: 'System Call Filtering', tactic: 'Isolate' },
    ],
  },
};

/** Colour per D3FEND tactic, so the codex reads at a glance. */
export const TACTIC_COLOR: Record<D3fendCounter['tactic'], string> = {
  Model: '#8296b4',
  Harden: '#38bdf8',
  Detect: '#a78bfa',
  Isolate: '#4ade80',
  Deceive: '#fbbf24',
  Evict: '#f97316',
  Restore: '#22d3ee',
};
