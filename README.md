# ThaiNativeOnline · ชีวิตติดกรุง Demo

Open `/life.html` for the single-player Bangkok life-simulation demo. Create a character, choose one of four goals, visit Bangkok landmarks, manage 40 hours per week, and complete 20 weeks. Movement between locations costs two hours; ending a week charges rent and triggers an event. The demo saves automatically in this browser's local storage, separately from the card-game profile. It does not yet support online multiplayer, account/cloud saves, or animated travel.

The city and character illustrations are original generated assets; the high-angle cartoon-map concept is generic and no reference-game assets are included.

## Existing card game

ThaiNative · คืนปลุกวิญญาณ remains available at `/` during the demo.

A playable Thai folklore chibi card game. This replaces the former artillery RPG; its code, wardrobe, forge, dungeon screens and unused assets have been removed. Git commit `f3e3082` retains the former game. The new server leaves existing `data/players.json` untouched and writes separate card profiles to `data/card-players.json`.

## Play

```powershell
npm install
npm start
```

Open http://localhost:4173. A new guest receives an owned 40-card wood deck, five summoning tickets, and one welcome deck from another element. Use **จัดเด็ค** to save up to five owned-card decks. Every element is also available as a free loaner in play modes. The collection supports search, element, rarity and cost filters, with twenty cards per page. The home preview uses a single atlas rather than downloading all five sheets up front.

First-time visitors choose **Login** or **Guest** before entering the village. Login, registration and recovery show the fields appropriate to the selected action. Guest choice is remembered per profile in local browser storage; existing accounts, returning guests with progress and resumed matches bypass the chooser. A header shortcut opens account management later. Attaching an account preserves saved Guest progress; signing into a different account does not merge profiles.

The newcomer guide follows saved progress through three lessons, the welcome deck, the first pack and one qualifying completed duel. Tutorial results offer the next lesson, and the first pack links back to the next step. The guide may be hidden or reopened without changing progress. The `firstDuel` completion flag persists independently of the twenty-entry match-history limit. Legacy profiles are not forced into onboarding. Recovery keys remain prominently visible after successful registration/recovery during the current page session; save them before reloading or logging out.

**Solo:** choose any of five AI decks. **PvP:** casual and ranked players share one queue, matched by hidden skill rating with a widening range. Ranked requires a registered account. **Friends:** create a six-character room code. **Co-op:** two friends combine decks, share a hand/field, and alternate control each team turn against a boss. Use separate browsers or private windows to test accounts; cookies are shared between tabs. Chat and predefined, rate-limited emotes are supported.

## Progression and collection

The **ผจญภัย** page contains three interactive lessons, three one-turn puzzles, five bosses with distinct rules, and a weekly deck restriction. First clears grant tickets and XP once. A free loaner is available for every faction and for the C/B weekly event.

The **ภารกิจ** page contains three daily quests, one reroll a day, one unclaimed quest carried to the next day, weekly boss rewards, a free permanent 20-level reward track, five achievements and faction mastery. Daily resets use midnight Asia/Bangkok; weeks start Monday. Completing a normal game requires at least turn five plus one own summon and attack to earn regular rewards. Rewards/mastery are capped at twenty eligible games a day. Friendly rooms, lessons, puzzles and the surrendering side do not earn normal match rewards. A qualifying winner can still earn rewards when the opponent concedes.

Card mastery unlocks a lore note after five uses, a gold frame/title after twenty, and a glow after fifty. These and shop card backs, avatars, board themes and titles never change card stats. Match history retains the last twenty results with damage, healing, mitigation, earned rewards and rating changes. Registered ranked players have a four-week season, public top-twenty leaderboard and automatic rollover participation rewards after at least five ranked games.

The **เรียกภูติ** page offers all-element or faction packs, each costing one earned ticket and containing five cards with A+ guaranteed. Normal-slot rates are C 50%, B 30%, A 15%, S 4%, SS 1%. If the normal five cards contain no A+, the last slot is replaced from A 75% / S 20% / SS 5%. Pity replaces the last slot as necessary: S+ within ten packs, SS within forty, shared across all packs. Obtaining S+ resets the S counter; obtaining SS resets both. These guarantees raise final aggregate rates above normal-slot rates. Randomness uses Node crypto on the server.

Copies beyond the deck limit automatically become shards: C/B/A/S/SS yield 5/10/25/80/200. Crafting one targeted copy costs 30/60/150/480/1200. One ticket costs 100 earned coins. Transaction receipts deduplicate the last fifty request IDs; there are no cash purchases or payment integrations. The last pack remains available if its animation was closed or the connection failed after the save.

**Existing accounts retain all 100 previously available cards at their usable copy limits.** Before first migration, the server creates `card-players.json.pre-progression-backup` without overwriting an existing backup. Former RPG data remains untouched. New accounts receive owned starters rather than blanket ownership; the server checks ownership on deck save and play.

## Accounts and recovery

Use **บัญชี** to attach a username/password to the current Guest without losing its progress. Registration and recovery show a one-time 48-character recovery key; keep it offline. Recovery replaces both the password and recovery key. There is no email recovery. Signing into another account does not merge the current Guest's progress.

Passwords use scrypt (N=32768, r=8, p=3) with random salts. Only password hashes and hashed recovery keys are saved in private `data/card-accounts.json`; neither is returned in profiles. Account operations accept same-origin JSON POSTs, use input/body limits and rate limiting, rotate HttpOnly/SameSite cookies, and close revoked WebSocket sessions. Login identifiers are not exposed in the public leaderboard. Authentication is local to this service and has not had an independent security audit.

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
| `card-content.js` | Shared quest, challenge, cosmetic, rate, rank and calendar definitions |
| `card-engine.js` | Server-owned deterministic simulation, effect resolution, private views and AI |
| `card-progress.js` | Ownership migration, packs/pity, crafting, reward eligibility and receipt deduplication |
| `card-challenges.js` | Lesson/puzzle fixtures, win objectives and boss rules |
| `card-accounts.js` | Password/recovery hashing, private credential persistence and authentication limits |
| `server.cjs` | HTTP, guest saves, WebSocket actions, private matchmaking, deadlines and chat |
| `card-client.js` | Home, collection, deck editing, accessible card details and live duel UI |
| `cards.css`, `progress.css` | Responsive illustrated card UI, progression menus, reveal animation and reduced motion |
| `assets/cards/` | Five original 20-tile atlases and their exact image_gen prompts |

The simulation never trusts client mana, damage, hand contents or turn state. Each action checks the authoritative revision and ownership. Opponent hand identities, shuffled deck order and RNG seed are absent from public room views. Guests use HttpOnly/SameSite cookies. Player and chat text are escaped or inserted as text nodes. Public files are explicitly allowlisted; saves and server sources are inaccessible.

Profile saves use a temporary file and rename. Rooms, room codes and queues are memory-only; a deployment or restart ends current matches. One connection per account is active. This service is designed for one replica: profile files and in-memory queues are not multi-process coordination. Before larger production traffic, migrate profiles, credentials, receipts and rooms to an appropriate database/shared infrastructure. Free-currency and rank abuse protections are basic; paid transactions are deliberately absent.

## Art and audio

Five native **image_gen** calls produced 100 illustrated tiles, one 5×4 sheet per faction. These are new paintings in the same chibi direction as the former NPC artwork. The reference was `assets/npc-summon.png` from commit `f3e3082`. Original PNGs remain unchanged; CSS background positions select each tile. Exact prompts are stored beside each PNG. See [art production notes](docs/CARD-ART.md).

The approved Thai lobby BGM, combat BGM and sound effects remain available. Playback and effects honor their mute controls and browser gesture requirements. No external generation API key is required to run the game.

## Verify

```powershell
npm test
node tests/live-smoke.cjs https://thainative.online
node tests/progression-smoke.cjs https://thainative.online
```

Tests cover deck limits, all 100 enter effects, status timing, combat, death/revival, hidden information, 125 seeded AI matches, actual client menu rendering and commands, ownership migration, guaranteed pack results/pity, replay safety, crafting/rewards, achievable lessons/puzzles, real WebSocket PvP, co-op control, room codes/rematches, account registration/login/recovery/logout, saved decks, reconnect, timeout and disconnect forfeits. Live smoke scripts create their own guests; they never reuse a player's browser cookie.

Browser UI verification has been unavailable because there is no controlled browser. Automated client tests execute the actual script against a minimal DOM harness; they do not prove visual layout or mobile touch behavior. Card/reward balance has not been tuned from human playtests, nor has high concurrency been tested. Recovery depends on retaining the key; there is no email fallback.

## Deploy

Railway runs the Dockerfile with `HOST=0.0.0.0`, its assigned `PORT`, and a persistent volume mounted at `/data`. The public domain is https://thainative.online. Keep the volume attached when redeploying.
