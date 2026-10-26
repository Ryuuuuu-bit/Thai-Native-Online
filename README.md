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

New guests see the creator on first connection. Existing guests open their portrait or the medium NPC. Choose male/female, eight faces, twelve hairstyles, five head-accessory choices (including none), and 60 separate fashions per gender. The twelve categories include Thai fantasy, forest, magic, suits, streetwear, football, festivals, basketball, runway, winter, urban casual and occupations/leisure. The 120 outfits are free; the three legacy outfits retain their original ownership and prices.

Generated raster paper-doll bodies, faces, hair and head accessories share the NPC's chibi painted style. Each outfit has a default palette; choosing another outfit applies its palette. Five color pickers control skin, hair, clothing, trim and head decoration. Restore outfit colors or discard the entire unsaved draft. Neutral fabric, dark outlines and facial eyes are preserved by the selective dye renderer. Source metadata separates exposed skin from ivory fabric, so darker skin does not recolor cream skirts or white jackets.

The server validates the full appearance and name before saving. Cosmetics do not change equipment statistics. Saved appearance is replicated to other room participants and used by the lobby portrait, equipment preview, battle portrait and battlefield sprite. Older profiles and progress remain valid.

Sources: fashion-catalog.js (stable IDs, gender, names, palettes), sprite-character-data.js (source frames), sprite-character.js (Canvas composition, dye, action sheets), character-art.js (editor and legacy SVG fallback), and character-ui.css (responsive controls). See [all 120 designs](docs/FASHION-CATALOG.md) and [raster production notes](docs/PAINTED-CHARACTERS.md).

Twenty-four automated tests cover validation, atomic unlocks, persistence, multiplayer appearance replication, catalog pagination, raster source bounds, palettes and dye isolation, alongside existing gameplay checks. Browser checks include saved dye after refresh, male/female previews, mobile-width layout and a solo movement/shot. Motion uses layered bob/lean/recoil, not articulated limb animation. Physical mobile devices and production load were not tested.

## Review fixes · 2026-10-27

All body atlases are indexed by complete connected silhouettes rather than fixed cell cuts. Painted action frames fit their actual layer bounds and use the shared foot baseline in combat. Battle portraits refresh after asynchronous character loading. Part caches reuse unchanged regions and do not reparse target colors for every pixel.

Reselecting the current outfit preserves draft dye. Restoring saved appearance returns to the page containing the outfit. Queue cancellation stays closed; reconnects reconcile the queue with server state, and browser-history restores refresh closed sockets.

Surrendering or disconnecting past the grace period gives no rewards. A teammate leaving off-turn does not cancel the remaining player's projectile or skip their turn. Departed players are removed from room delivery and may return to the lobby or start another encounter. Normal completed defeats retain their consolation rewards.

## Expanded customization · 2026-10-27

Added 20 painted garments (ten per gender), ten face parts (five new expressions per gender) and eight hairstyles. There are now 60 outfits per gender, eight selectable faces per gender, twelve shared hairstyles and five existing head-accessory choices. Face and hair buttons show painted previews; color changes update these previews alongside the character. Old saved IDs and dyes remain valid. New outfits are free and retain their own preset palettes.

Four additional source atlases and their exact native image_gen prompts are listed in [painted character production](docs/PAINTED-CHARACTERS.md). Every source PNG remains unchanged; index metadata supplies crop bounds, skin regions and calibrated hair placement. Saved new face/hair/outfit IDs are validated and replicated through the same server and battle compositor.
