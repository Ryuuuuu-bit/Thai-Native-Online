# ThaiNative Online — ศึกแห่งไสยเวท

Playable alpha: a Thai-folklore chibi artillery RPG with a Node.js authoritative server, Phaser battlefield, and a Thai DOM interface.

## Run

```sh
npm ci
npm start
```

Open http://localhost:4173. A Python static server cannot run the online features.

## Play

- Lobby: shopkeeper, spirit-medium wardrobe, and adventure guide.
- Solo: three replayable dungeons with rewards and persistent XP.
- Equipment: weapon, armor and charm slots; purchases affect PvE stats.
- Forge: weapon upgrades to +5. Costs and chances are shown before attempts. Failures consume materials without destroying or downgrading equipment.
- Wardrobe: two starter appearances and a jade palette unlock; appearances do not affect stats.
- Co-op: two real players against two AI enemies.
- PvP: live connected, turn-based 1v1 matchmaking, normalized to 300 HP / 58 attack.
- Chat: live lobby chat with a 180-character limit and rate limiting.
- Aim using angle and power sliders; arrows adjust angle/power when the page has focus; Space fires. Tap the battlefield to set an angle. Move twice per turn, guard, or use energy skills.
- Solo shows a full trajectory guide; PvP shows only its beginning. The server computes wind, collisions, damage, terrain dents, turns and rewards.

Use different browsers or a private window for two players. Tabs sharing a guest cookie are the same character; only one connection per character is active.

## Persistence and deployment

Guest profiles are stored in `DATA_DIR/players.json` (default `./data`, ignored by Git). An HttpOnly SameSite cookie identifies the guest. HTTPS cookies are Secure. Clearing the cookie creates a new guest. Battles and queues are in memory and reset on restart.

Railway project: ThaiNative-Online. Dockerfile deployment, persistent volume at `/data`, `PORT` for the listener and `/health` for health checks. Exactly one replica is supported by this JSON storage implementation. Local profiles are not uploaded.

Domain: https://thainative.online

## Verification

```sh
npm test
node lobby-motion.test.js
node ui-sounds.test.js
npm audit --omit=dev
```

Tests cover inventory validation, enhancement success/failure/cap, PvP normalization, turn/skill/movement rules, complete solo simulations, and two WebSocket clients exercising chat, PvP, co-op and persistent inventory.

## Alpha boundaries

A playable vertical slice with three dungeons and a small equipment/appearance catalog. Friend invitations, rankings, moderation tools, guilds, login/account recovery, cross-device saves and production load testing are not implemented. Whole-sprite animation is used instead of skeletal animation. No payments.

## Art and audio

Original chibi fantasy artwork generated with image_gen. Rounded chibi village and forest scenes, with smaller battlefield sprites. Cast anticipation, recoil, hit reaction, protective shields, healing rings, projectile glyphs, orbiting particles, impact bursts and victory hops are renderer-only effects.

Accepted lobby BGM: `assets/lobby-thai-varied.mp3`. New 80-second Thai-instrument battle music: `assets/battle-chibi-thai.mp3`. Eight combat effects cover cast, impact, burst, heal, shield, victory, defeat and enhancement. Generated with ElevenLabs; requests are saved beside the assets. Audio starts on user interaction, caps overlapping combat effects at three, and ducks battle music under effects. Music and motion controls are in the gear menu. Google Fonts have local fallbacks. Older prototype files are retained but not loaded by the current game.
