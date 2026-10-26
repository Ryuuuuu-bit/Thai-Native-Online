# ThaiNative Assets & UI — playable v1

## Delivered

- `assets.html`: interactive library for item art, animation, VFX, scene layers and reusable UI states.
- `assets/items-concept-v1.png`: original transparent source sheet, reused without resampling. Sixteen separately addressable item frames; seven gear images, gold and enhancement stones are integrated with existing systems. EXP art decorates the reward screen. Consumable/key/gacha art does not add those systems.
- `assets/manifests/catalog.json` and `asset-catalog.js`: source rectangles, shared character base height, action frame order/fps/loop and scene layers.
- `assets/sheets/guide-actions.png`: 28 drawn poses. Eight runtime actions; guard shares two protective poses with hit. Generated source contains seven rows rather than the requested eight, so metadata follows observed rows.
- `assets/sheets/enemy-actions.png`: 32 frames, eight actions. Source faces right; runtime mirrors for opposite facing.
- `assets/sheets/combat-vfx.png`: 24 frames, six effects (impact, burst, heal, shield, hit, victory), additive compositing in battle.
- `assets/sheets/moon-valley.png` and `forest-frame.png`: separate distant scene and transparent tree/lantern layer. Existing terrain art is clipped against server terrain, with separate fireflies and subtle pointer parallax.
- `item-ui.css`: reusable plum/gold/jade panels, focus/hover/pressed/disabled states, item slots, rarity badges, filters, comparisons and responsive layouts.
- `rpg-ui.js`: real-data equipment, inventory, shop, enhancement and wardrobe screens. Outfit selection previews before applying; server still owns every transaction.
- `sprite-runtime.js`: Phaser frame registration plus shared preview timing. Character scale is fixed per sheet, with bottom-center anchor. Reduced motion shows static poses; VFX remains briefly visible to convey results.

## Production and provenance

All new raster source images were generated using built-in `image_gen`. Exact prompts are stored beside each source. Item source prompt is `assets/items-concept-v1.prompt.txt`. Original source pixels are preserved; no destructive cleanup or AI enlargement has been applied.

`scripts/index-assets.py` reads RGBA alpha, derives trimmed rectangles within visually reviewed row boundaries, and writes metadata only. It requires Pillow and NumPy for offline indexing; game runtime does not require Python. Run it from any directory, then `npm test`. The checked-in metadata is sufficient for deployment.

The source PNGs are irregular generated sheets, not uniformly spaced 256px strips. Use the manifest rectangles, not a fixed grid. SVG item views clip exactly to each rectangle to prevent neighboring art showing through letterbox space. Scene loading uses the same rectangles in Phaser. No extra image processing dependency was added to production.

Rarity is presentational catalog metadata in `rpg-ui.js`: C/B/A/S are assigned to existing gear; SS is demonstrated in the UI kit only. It does not change combat balance or enhancement chances.

## Validation

- Eleven automated tests: frame bounds and source dimensions, all gear frame references, pure stat comparison with upgrades, escaped profile names, affordability/pending states, unique clip IDs, negative animation elapsed time, existing combat/audio/inventory/server tests.
- Browser: buying, equipping, enhancement, wardrobe preview/apply, real shot with new character frames, guard, animation switching and no new battle console errors.
- 390px embedded viewport: lobby and equipment menu layout inspected. This is responsive browser QA, not physical-device testing.

## Limits

This is a first animation set, four samples per action (with shared guide guard poses), not a 6–8-frame polished studio animation set. Some AI frame-to-frame costume/hair variation remains. Medium outfit still uses original whole-image motion. Weapon swapping updates combat stats/projectile presentation; the guide's held talisman is not yet a separately rigged weapon.

Items are independently addressable source rectangles rather than sixteen rewritten PNGs. Original source sheet and manifest must travel together. UI supports loading/disconnected and in-flight transaction states; production load testing/account recovery remain outside this asset update.

## Character customization update

The player can now choose gender, face, hair, head accessory, outfit and five independent colors. `character-art.js` is the editable vector source; it generates a shared 256×320 preview and a 1024×2560 runtime sheet with four frames for each of idle, move, aim, cast, hit, guard, victory and defeat. There is no separate exported PNG per combination. Character proportions and clothing parts remain identical across poses. This first modular animation set uses limb rotations and small body offsets; it is not a hand-drawn animation set or skeletal rig.

Both genders may use all options. The previous three outfits retain their ownership and pricing, and appearance is separate from combat equipment. New guests are offered creation; existing guests retain their original appearance until explicitly saving. Customized medium characters use the new action sheet; legacy medium characters retain the earlier whole-image fallback described above. NPC, enemy, item and scene assets are unchanged.

Validated with thirteen automated tests, a fresh guest creation/save/reload, color changes and reset, equipment preview, a live solo movement/shot, and the responsive creator at 390px width. No physical-device or high-concurrency benchmark was run.
