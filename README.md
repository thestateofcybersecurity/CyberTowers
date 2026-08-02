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
| `AUTH_SECRET` | Root signing key. Generate with `npx auth secret`. | Any account |
| `NEON_AUTH_BASE_URL` | Provisioned when Neon Auth is enabled on the Neon project. | Neon Auth sign-in |
| `NEON_AUTH_COOKIE_SECRET` | Optional. Derived from `AUTH_SECRET` if unset. | — |
| `MONGODB_URI` | MongoDB connection string. | Profiles, saves, scores |
| `MONGODB_DB` | Database name, defaults to `cybertowers`. | — |
| `DATABASE_URL` | Neon Postgres. Aliases like `POSTGRES_URL` are accepted. | — |

**Neon Postgres and Neon Auth are different products.** Connecting the database
does not give anyone a way to log in; Neon Auth is enabled separately on the
Neon project, and enabling it is what provisions `NEON_AUTH_BASE_URL`.

Neon does not issue a cookie signing key, so `NEON_AUTH_COOKIE_SECRET` is
derived from `AUTH_SECRET` via HMAC with a domain-separation label. The two keys
stay cryptographically independent and there is one fewer variable to manage.
Set it explicitly if you would rather rotate them separately.

Sign-in degrades in one step: with Neon Auth configured you get email and
password accounts; without it, handle accounts — no email, no password, a signed
cookie and a recovery key to move between devices. Visiting `/signin` prints a
presence-only checklist of what the server can see.

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
npm run analyze    # per-tower efficiency and dominant-strategy check
npm run ops:sync   # derive operation rosters from real ATT&CK groups
npm run ops:check  # offline, verify the roster data is well-formed
npm run economy    # income against difficulty; fails if a late game is trivial
npm run intrusion  # attacker-side balance: does any intrusion shape dominate?
```

`npm run simulate` drives the real engine in Node with no browser involved. It
is the fastest way to tell whether a rules change broke combat, the economy, the
wave director, save/restore, or stealth detection.

`npm run balance` plays every map with three build orders and reports how far
each got. `npm run diagnose` traces a single board wave by wave, printing wave
health against the board's damage per second, so a difficulty cliff shows up as
a number rather than as an unexplained death.

Where the balance currently sits, measured by `npm run balance` across five
spending policies (spread vs concentrated, one tower type vs the full roster):

| Map | Firewalls only | Mixed roster |
| --- | --- | --- |
| Home Network | cleared | cleared |
| Corporate LAN | wave 17–25 | cleared |
| Cloud Region | wave 18–20 | cleared |
| Remote Workforce | wave 13–21 | cleared |
| Container Cluster | wave 9–12 | cleared |
| Industrial SCADA | wave 12–21 | cleared |
| Supply Chain | wave 11–14 | cleared |
| Datacenter Core | wave 14 | cleared |
| Air-Gapped Facility | wave 15–16 | cleared |

Endless: one tower type tops out around wave 15–35; a mixed roster reaches wave
47–60.

### How the balance is reasoned about

A tower defence board is a budget allocation problem, and that framing predicts
the failure modes. If total damage is **linear** in how credits are split
between tower types, the optimum is always a *corner solution*: put everything
into whichever type has the best damage per credit. Mixed builds only win when
the payoff is **concave** (each extra copy is worth less) or **complementary**
(types multiply each other). Both failure modes have shown up here:

- Firewall upgrades once granted pierce, so one shot hit three threats in a
  single-file lane. That made the cheapest tower the best area-damage tower and
  one maxed firewall could carry a run.
- Fixing that overcorrected into the opposite corner: upgrades became poor value
  across the board, so the optimum became spamming tier-one towers.

`npm run analyze` prints the numbers that decide which regime the game is in —
damage per credit, damage per credit against a single target, reach per credit
(dps × range, since a threat only takes damage while inside a radius), the
armour cliff, and whether maxing a tower beats spending the same credits on
fresh ones. Every tower now sits at 0.98–1.02 on that last measure, so the
arithmetic does not decide: range, position, armour profile and synergy do.

Three multiplicative terms make a mixed board worth more than the sum
of its parts — a SOC uplink at ×1.90 to everything in range, an IDS flag at
×1.45 to all damage on what it marks, and **defence in depth** at up to ×1.36
for having engaged a threat with five different kinds of control; ×3.76 stacked.

Two rules keep those from running away, both taken from how other tower defences
handle stacking. Support does not stack across copies: five SOC uplinks covering
one tower would hand it +190% damage and delete the encounter, so only the
strongest applies. And **alert fatigue** dilutes every flag on the board once
there are more than three detectors, so three upgraded sensors beat ten cheap
ones. Bonuses are additive against a base rather than exponential, because
`1.2^n` runs away where `1 + 0.2n` does not. Specialisation is enforced
from the other side: antivirus leads damage per credit against clusters but is
near-worst against a lone boss, while the sentinel leads reach, armour
penetration and single-target damage but is poor value against a crowd.

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

## Operations

Ten campaigns against documented threat groups, at `/operations`. What makes
each play differently is not flavour text: the wave roster is weighted by what
that actor actually does, derived from its ATT&CK technique list by
`npm run ops:sync`.

Weighting by raw technique count does not work — broad families dominate every
group equally and the rosters come out identical. The generator measures
*distinctiveness* instead, comparing each group's share of a family against the
average across all groups. That is what makes Lazarus and Sandworm lead with
ransomware (WannaCry, NotPetya), Volt Typhoon with tunnelling, APT1 with
phishing, and APT28 with zero-days.

An operation also contributes its signature threats to the board's pool and
brings them forward in the schedule, so an actor defined by long-lived implants
fields them from the start rather than at wave sixteen of an eighteen-wave run.

## Infiltrate: the attacker seat

At `/infiltrate` the board is flipped. The network is already built by an AI and
reinforces after every wave, and you have twelve attempts to bring the core
down. Instead of credits you spend **intel** composing each intrusion, choosing
what to send and in what proportion.

Four defensive postures decide what a target is bad at, which is the read the
mode is built around. Perimeter-heavy has almost no detection and stealth walks
through it; detection-led is thin on raw damage and volume overwhelms it;
containment-first is slow to kill and armoured payloads survive the crossing;
defence in depth has no obvious gap and is the hardest target.

Playing as a documented actor makes that actor's own tradecraft about 30%
cheaper, using the same roster weights that bias what a *defender* faces, read
the other way round: what a group does often is what it is good at.

Intrusion cost is deliberately not the kill bounty. Bounty prices how much
trouble a threat is to remove, and a trash mob is cheap by design — pricing
intrusions that way let a first wave field three hundred DDoS packets and walk
over any network. Cost tracks delivered damage instead, discounted by how likely
a unit is to survive long enough to deliver it, with a large premium on evasion
because a stealthed or tunnelled unit bypasses most of a board rather than
merely resisting it.

`npm run intrusion` reports the shape-versus-posture matrix and flags any
intrusion that breaches everything. It caught exactly that before this shipped.

## Crossover with MITRE ATT&CK Adventure

Every threat is a real ATT&CK technique and every defence a real D3FEND
countermeasure, taken from the same dataset that powers the sibling project at
[mitre.cybersecurityalphabetsoup.com](https://mitre.cybersecurityalphabetsoup.com)
(`src/data/d3fend.json` in that repo). The mapping lives in
`src/game/data/attack.ts`, is pinned by a committed snapshot of the upstream
dataset, and is surfaced in the codex: each threat row links to
its technique on attack.mitre.org, each tower card shows its D3FEND tactic and
countermeasures.

The two games share the seven D3FEND tactics, so a firewall is Isolate in both
and a honeypot is Deceive in both. Following the sibling project's rule, nothing
is invented: where a threat has no D3FEND coverage in that dataset (Botnet and
Resource Hijacking), the codex still links the real ATT&CK technique rather than
mapping it to something approximate.

```bash
npm run attack:sync    # read the sibling repo, refresh the snapshot
npm run attack:check   # offline, verify the mapping has not drifted
```

`attack:sync` needs the Adventure repo checked out; it looks in a few likely
places or takes `MITRE_ATTACK_REPO=/path/to/mitreattack`. It rewrites
`src/game/data/attack-source.json` from the upstream `d3fend.json` and fails if
any countermeasure we name has been renamed, retactic'd or removed.

`attack:check` runs offline against that snapshot and is what CI runs, so the
mapping cannot be hand-edited out of agreement with the source.

One honest limit: the upstream dataset carries D3FEND countermeasures with their
names and tactics, but not ATT&CK technique *display names*. Those are ours, and
the script says so rather than implying it verified them.

## Economy

The number that decides whether this stays a game is **affordable damage over
required damage**: how much more the player can buy than the wave demands. Above
about 2 there is nothing left to think about; below 1 the wave cannot be stopped
at any placement. `npm run economy` reports it per wave and fails CI if any
campaign's final third leaves the healthy band. All five currently land at
1.6×.

Getting there needed one structural fix. A wave spends its budget as
`count = share / bounty`, so kill income is `count × bounty`, which is the
budget itself: making threats cheaper only spawns more of them and pays exactly
the same. "More enemies per wave" and "fewer credits per wave" were
contradictory requests until `KILL_PAYOUT_RATE` split them apart. Now
`waveBudget` sets how much is coming and the payout rate sets how well it pays.

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
