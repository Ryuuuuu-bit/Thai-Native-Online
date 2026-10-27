# ThaiNative · คืนปลุกวิญญาณ

A playable Thai folklore chibi card game. This replaces the former artillery RPG; its code, wardrobe, forge, dungeon screens and unused assets have been removed. Git commit `f3e3082` retains the former game. The new server leaves existing `data/players.json` untouched and writes separate card profiles to `data/card-players.json`.

## Play

```powershell
npm install
npm start
```

Open http://localhost:4173. A new guest gets a legal 40-card wood deck. All 100 cards are available immediately. Use **จัดเด็ค** to choose one of five starters or build a mixed deck, then save before playing. The collection supports search, element, rarity and cost filters, with twenty cards per page. The home preview uses a single atlas rather than downloading all five sheets up front.

**Solo:** choose any of five AI decks. **PvP:** two real guests join the same queue. Use separate browsers or a private window to test two accounts; cookies are shared between tabs. Chat is shared across connected guests. No packs, paid random draws, login or account recovery are included.

## Rules

- 30 player HP; 40-card decks; at most three copies of a card, one copy for SS.
- Five-card opening hands; random first player skips their first draw. Maximum ten cards in hand and five units on each field.
- Mana increases by one each own turn, up to eight, and refills. Newly summoned or revived units cannot attack until the next own turn.
- Attacking units exchange damage simultaneously. Damage persists. Direct player attacks require the opponent field to be empty.
- All 100 effects are implemented: healing, tokens, death effects, shields, freezing, sealing, protection, return to hand, revival, temporary attack buffs and graveyard interactions. Enter effects fire only when summoned from hand.
- Shields absorb two on the next damage event and do not stack. Freeze blocks the target's next turn of attacking. Seal stops abilities through the next turn. Revival skips enter effects.
- Turn timeout: 90 seconds. Disconnect grace: 20 seconds. Empty-deck draws inflict increasing fatigue that bypasses damage protection. Simultaneous lethal damage is a draw.

Some descriptions use deterministic choices to keep play concise: lowest-health ally healing, sorting the top two cards by cost, and automatically selecting targets for multi-target legendary effects. Single-target enter effects can be selected on the field; the Summon button uses the first eligible target.

## Structure

| File | Purpose |
| --- | --- |
| `card-catalog.js` | 100 card definitions, five factions, starters and strict deck validation |
| `card-engine.js` | Server-owned deterministic simulation, effect resolution, private views and AI |
| `server.cjs` | HTTP, guest saves, WebSocket actions, private matchmaking, deadlines and chat |
| `card-client.js` | Home, collection, deck editing, accessible card details and live duel UI |
| `cards.css` | Responsive illustrated card UI, five-slot boards, mobile hand scrolling and reduced motion |
| `assets/cards/` | Five original 20-tile atlases and their exact image_gen prompts |

The simulation never trusts client mana, damage, hand contents or turn state. Each action checks the authoritative revision and ownership. Opponent hand identities, shuffled deck order and RNG seed are absent from public room views. Guests use HttpOnly/SameSite cookies. Player and chat text are escaped or inserted as text nodes. Public files are explicitly allowlisted; saves and server sources are inaccessible.

Profile saves use a temporary file and rename. Rooms and queues are memory-only; a deployment or restart ends current matches. One connection per guest is active. For larger production traffic, move profile persistence to a database and rooms to shared infrastructure after measuring real demand.

## Art and audio

Five native **image_gen** calls produced 100 illustrated tiles, one 5×4 sheet per faction. These are new paintings in the same chibi direction as the former NPC artwork. The reference was `assets/npc-summon.png` from commit `f3e3082`. Original PNGs remain unchanged; CSS background positions select each tile. Exact prompts are stored beside each PNG. See [art production notes](docs/CARD-ART.md).

The approved Thai lobby BGM, combat BGM and sound effects remain available. Playback and effects honor their mute controls and browser gesture requirements. No external generation API key is required to run the game.

## Verify

```powershell
npm test
node tests/live-smoke.cjs https://thainative.online
```

Tests cover deck limits, all 100 enter effects, status timing, combat, death/revival, hidden information, 125 seeded AI matches, client draft/summon behavior, real WebSocket PvP, saves, invalid actions, reconnect, timeout and disconnect forfeits. Live smoke creates its own guest, saves a deck, starts a solo duel, validates privacy and concedes.

At initial delivery, browser UI verification was blocked because the Windows desktop was locked and no controlled browser was available. Automated client tests execute the actual script against a minimal DOM harness; they do not prove visual layout or mobile touch behavior. Card balance has not been tuned from human playtests. Matches and guest profiles are not a substitute for authenticated accounts or production load testing.

## Deploy

Railway runs the Dockerfile with `HOST=0.0.0.0`, its assigned `PORT`, and a persistent volume mounted at `/data`. The public domain is https://thainative.online. Keep the volume attached when redeploying.
