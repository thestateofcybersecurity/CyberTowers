import { MongoClient, type Collection, type Db } from 'mongodb';
import type { GameMode, RunSnapshot, TowerId } from '@/game/core/types';

/**
 * MongoDB holds everything about the *game*: profiles, cloud saves and scores.
 * Auth lives in Neon Postgres behind Auth.js, and the two are joined on the
 * Auth.js user id, which is what every document here keys on.
 */

export interface ProfileDoc {
  /** Auth.js user id, as a string. */
  _id: string;
  handle: string;
  xp: number;
  level: number;
  campaign: Record<string, { bestWave: number; bestScore: number; cleared: boolean }>;
  stats: {
    runs: number;
    wavesCleared: number;
    threatsKilled: number;
    towersBuilt: number;
    bestEndlessWave: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveDoc {
  userId: string;
  mapId: string;
  mode: GameMode;
  snapshot: RunSnapshot;
  updatedAt: Date;
}

export interface ScoreDoc {
  userId: string;
  handle: string;
  mapId: string;
  mode: GameMode;
  wave: number;
  score: number;
  elapsed: number;
  threatsKilled: number;
  integrity: number;
  victory: boolean;
  towersUsed: TowerId[];
  createdAt: Date;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'cybertowers';

/**
 * In development Next.js clears the module registry on every hot reload, which
 * would otherwise open a new connection pool per edit until Mongo refuses them.
 * Caching the promise on `globalThis` survives reloads; production gets a plain
 * module-level singleton per serverless instance.
 */
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env.local and fill in your connection string.',
    );
  }
  if (process.env.NODE_ENV === 'development') {
    globalForMongo._mongoClientPromise ??= new MongoClient(uri).connect();
    return globalForMongo._mongoClientPromise;
  }
  clientPromise ??= new MongoClient(uri).connect();
  return clientPromise;
}

/** True when a connection string is configured, so routes can degrade politely. */
export function isMongoConfigured(): boolean {
  return Boolean(uri);
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes(db: Db): Promise<void> {
  indexesReady ??= (async () => {
    await Promise.all([
      // One save slot per user, per map, per mode.
      db.collection<SaveDoc>('saves').createIndex(
        { userId: 1, mapId: 1, mode: 1 },
        { unique: true },
      ),
      // Drives the leaderboard query: filter by board, sort by score.
      db.collection<ScoreDoc>('scores').createIndex({ mapId: 1, mode: 1, score: -1 }),
      db.collection<ScoreDoc>('scores').createIndex({ userId: 1, createdAt: -1 }),
      db.collection<ProfileDoc>('profiles').createIndex({ handle: 1 }),
    ]);
  })();
  return indexesReady;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}

export async function profiles(): Promise<Collection<ProfileDoc>> {
  return (await getDb()).collection<ProfileDoc>('profiles');
}

export async function saves(): Promise<Collection<SaveDoc>> {
  return (await getDb()).collection<SaveDoc>('saves');
}

export async function scores(): Promise<Collection<ScoreDoc>> {
  return (await getDb()).collection<ScoreDoc>('scores');
}

/** Fetches a profile, creating a default one the first time a user plays. */
export async function getOrCreateProfile(
  userId: string,
  fallbackHandle: string,
): Promise<ProfileDoc> {
  const col = await profiles();
  const existing = await col.findOne({ _id: userId });
  if (existing) return existing;

  const now = new Date();
  const doc: ProfileDoc = {
    _id: userId,
    handle: fallbackHandle.slice(0, 24) || 'operator',
    xp: 0,
    level: 1,
    campaign: {},
    stats: {
      runs: 0,
      wavesCleared: 0,
      threatsKilled: 0,
      towersBuilt: 0,
      bestEndlessWave: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  // Another concurrent request may have created it first; upsert-and-read keeps
  // this safe without a transaction.
  await col.updateOne({ _id: userId }, { $setOnInsert: doc }, { upsert: true });
  return (await col.findOne({ _id: userId })) ?? doc;
}
