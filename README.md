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

A playable vertical slice with three dungeons and a small equipment/appearance catalog. Friend invitations, rankings, moderation tools, guilds, login/account recovery, cross-device saves and production load testing are not implemented. Animation uses action sheets and whole-image fallback rather than a skeletal rig. No payments.

## Art and audio

Original chibi fantasy artwork generated with image_gen. Guide and forest enemy use action-sheet animation with fixed shared scale and foot anchors; the medium retains whole-image motion. Layered valley/forest art, 24 VFX frames, item atlas art and responsive inventory/shop/forge/wardrobe interfaces are integrated. Rendering never changes server collision or damage.

Open `/assets.html` for the interactive art and UI library. See [asset delivery notes](docs/ASSET-DELIVERY.md) for source frames, generation prompts, metadata workflow and animation limits. Download atlas metadata at `/assets/manifests/catalog.json`.

Accepted lobby BGM: `assets/lobby-thai-varied.mp3`. New 80-second Thai-instrument battle music: `assets/battle-chibi-thai.mp3`. Eight combat effects cover cast, impact, burst, heal, shield, victory, defeat and enhancement. Generated with ElevenLabs; requests are saved beside the assets. Audio starts on user interaction, caps overlapping combat effects at three, and ducks battle music under effects. Music and motion controls are in the gear menu. Google Fonts have local fallbacks. Older prototype files are retained but not loaded by the current game.

## Character creation

New guests see the creator on first connection. Existing guests open the profile portrait or the medium NPC's appearance menu. Choose male/female, three faces, four hairstyles, five head-accessory choices (including none), and three outfits. Skin, hair, clothing, trim and head accessory each have a free color picker. Ranger and medium costumes are included; jade unlocks once for 300 earned coins.

The draft previews without spending or saving. Save validates the complete appearance/name on the server, unlocks the outfit if needed, and persists the profile. Closing or resetting discards the draft. Character cosmetics never change equipment statistics; saved colors and choices are sent to every participant in the room. Creation uses a new layered vector chibi character in the lobby portrait, equipment preview, battle portrait and animated battle sprite. Existing guests keep the original art until saving a custom look. No saved inventory or progress is migrated away.

`character-art.js` provides one shared SVG renderer and 32-frame runtime sheet (eight actions, four samples each); `character-ui.css` provides the responsive creator. These are authored vector assets, separate from the earlier generated raster NPC/enemy sheets. The mobile preview stays visible while controls scroll. Thirteen tests cover the existing suite plus customization validation, atomic purchases, persistence, multiplayer appearance replication and legacy compatibility. Physical mobile devices and production load are not tested.
