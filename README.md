# CyberTowers

A cybersecurity-themed tower defence game. Place firewalls, intrusion detection,
encryption fields and AI sentinels along a network path and stop viruses,
ransomware, rootkits and zero-days before they reach your core.

Built with Next.js (App Router) on Vercel, Auth.js over Neon Postgres for
accounts, and MongoDB for game data.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

The game is fully playable with no environment configured at all: you get a
guest profile with the starter defences, and accounts, cloud saves and the
leaderboard degrade politely to "not configured".

## Environment

| Variable | Purpose | Required for |
| --- | --- | --- |
| `AUTH_SECRET` | Session encryption. Generate with `npx auth secret`. | Any auth |
| `DATABASE_URL` | Neon Postgres connection string. | Accounts |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app. | GitHub sign-in |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client. | Google sign-in |
| `MONGODB_URI` | MongoDB Atlas connection string. | Profiles, saves, scores |
| `MONGODB_DB` | Database name, defaults to `cybertowers`. | — |

Apply the auth schema to Neon once. This is idempotent, so re-running it is the
intended way to bring an existing database up to date:

```bash
npm run db:migrate
```

It reads the connection string from `.env.local`, or from the environment:

```bash
DATABASE_URL="postgres://..." npm run db:migrate
```

OAuth callback URLs are `{origin}/api/auth/callback/github` and
`{origin}/api/auth/callback/google`. `{origin}` must be the origin people
actually visit. If the site is served on a custom domain, register the callback
against that domain, not the `*.vercel.app` one — an OAuth app whose callback
points somewhere the user never lands will fail the redirect back.

**A database integration is not an identity provider.** Vercel's Neon and
MongoDB integrations provision databases and set their own connection variables;
neither gives you a way for a person to log in. At least one OAuth app has to be
registered by hand before sign-in appears. Visiting `/signin` on a deployment
prints a presence-only checklist of what the server can actually see, which is
the fastest way to find out which piece is missing.

The app accepts the common alternate variable names, so `NEXTAUTH_SECRET` works
in place of `AUTH_SECRET`, and `POSTGRES_URL` or `DATABASE_URL_UNPOOLED` work in
place of `DATABASE_URL`.

## Deploying to Vercel

Vercel is the only host. The app is server-rendered and needs a Node runtime for
its route handlers, auth and database access, so a static host cannot serve it —
an earlier version of this repo deployed to GitHub Pages, and that is not a
configuration this build can run under.

Import the repository, set the environment variables above in the project
settings, and deploy. No build configuration is needed; Vercel detects Next.js.
Pushes to `main` deploy straight to production, with no CI gate in front of
them — run `npm run typecheck && npm run lint && npm run simulate` before
pushing, or add a workflow that does.
`AUTH_URL` is inferred automatically on Vercel deployments.

Both datastores are serverless-friendly: Neon is accessed through
`@neondatabase/serverless` over HTTP, and the Mongo client is cached per
instance so functions reuse a connection rather than opening one per request.

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run simulate   # headless engine smoke test, non-zero exit on failure
npm run balance    # run every map and build order, report waves survived
npm run diagnose -- cloud-region campaign   # wave-by-wave difficulty trace
```

`npm run simulate` drives the real engine in Node with no browser involved. It
is the fastest way to tell whether a rules change broke combat, the economy, the
wave director, save/restore, or stealth detection.

`npm run balance` plays every map with three build orders and reports how far
each got. `npm run diagnose` traces a single board wave by wave, printing wave
health against the board's damage per second, so a difficulty cliff shows up as
a number rather than as an unexplained death.

Where the balance currently sits. `npm run balance` plays each map under five
spending policies — spreading credits across many towers versus concentrating
them into a few maxed ones, with firewalls only versus the full roster:

| Map | Firewalls only | Mixed roster |
| --- | --- | --- |
| Home Network | cleared | cleared |
| Corporate LAN | wave 13–19 | cleared |
| Cloud Region | wave 15–16 | cleared |
| Industrial SCADA | wave 19 | cleared |
| Datacenter Core | wave 14 | cleared |

Endless: firewalls only tops out around wave 13–25; a mixed roster reaches wave
40–64 depending on the board.

The property that matters is that a single tower type never clears a campaign
map past the tutorial, and that concentrating every credit into one maxed tower
performs no better than spreading the same credits around. Both were false in an
earlier build — one maxed firewall could carry a whole run, because firewall
upgrades granted pierce and so quietly turned the cheapest single-target tower
into the best area-damage tower in the game.

## How it is put together

```
src/game/          the simulation — no React, no DOM outside the renderer
  core/            types, fixed-point math, seeded RNG
  data/            towers, threats, maps, wave generation, progression
  art/             pixel sprites as character grids, plus the canvas baker
  engine/          board geometry, entities, Game (the simulation), Renderer, loop
  audio/           procedurally synthesised sound, no audio files
src/app/           routes and API handlers
src/components/    UI shell, HUD, inspector, palette
src/lib/           Mongo, session, validation, player context
```

A few decisions worth knowing about:

**Fixed timestep.** `Game.tick()` always advances exactly 1/60s and is the only
method that mutates simulation state. The render loop accumulates real time and
runs however many ticks it owes, then interpolates positions for drawing. Frame
rate cannot affect balance, and the fast-forward button runs more ticks rather
than larger ones.

**One damage path.** Every weapon, splash, chain and damage-over-time tick calls
a single `applyDamage`. There is no second place a hit can be counted.

**Lanes are arc-length parameterised.** A threat's position is one scalar,
distance travelled, rather than a waypoint index. "Which threat is furthest
along?" is then a numeric comparison, which is what first/last targeting uses.

**Deterministic waves.** Wave composition is seeded on `(mapId, mode, wave)`, so
every player sees the same campaign and the server can rebuild any wave to check
a submitted score against what was actually possible.

**Art is source code.** Sprites are 16x16 character grids with a palette, baked
to canvases at an integer scale on first use. The grids are validated at load,
so a miscounted row fails loudly rather than rendering slightly clipped.

## Economy

Three income streams, in order of how much they should matter:

1. **Kill bounties.** The main source. Every threat is worth credits, scaled up
   as waves progress.
2. **Wave clear bonus.** Multiplied by the fraction of the wave you actually
   killed, from 30% for a wave that mostly leaked through to 100% for a clean
   sweep. Letting threats reach the core costs the integrity *and* the payout.
3. **Sending a wave early.** Capped, and small. An uncapped time bonus is free
   money for a board that is already winning.

The design intent is that income tracks how well you are actually holding the
line. A guaranteed per-wave salary lets a losing board coast, and a losing board
that coasts never has to change what it is doing.

## Score validation

This is a browser game, so the client owns the simulation and a determined
player can lie. What the server does is replay the deterministic wave generator
for the claimed map and wave, total the credits those waves could have paid out,
and reject anything above that bound, below the minimum possible run duration,
or claiming victory before the final wave. That stops casual tampering. It is
not, and does not pretend to be, real anti-cheat.

## Licence

MIT. See [LICENSE](LICENSE).
