-- CyberTowers auth schema for Neon Postgres.
--
-- These four tables are exactly what @auth/neon-adapter expects; the column
-- names are quoted where they are camelCase because the adapter's SQL quotes
-- them. Run once against your Neon branch:
--
--   psql "$DATABASE_URL" -f db/neon-schema.sql
--
-- Game data (profiles, saves, scores) lives in MongoDB, joined on users.id.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL,
  name VARCHAR(255),
  email VARCHAR(255),
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL,
  "userId" INTEGER NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL,
  "userId" INTEGER NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Session lookup happens on every authenticated request, so it gets a unique
-- index rather than relying on a sequential scan.
CREATE UNIQUE INDEX IF NOT EXISTS sessions_session_token_idx ON sessions ("sessionToken");
CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_idx
  ON accounts (provider, "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);
