# Painted character production

Generated with the native image_gen tool, using the user-supplied purple-haired Thai fantasy NPC as the visual reference. Original PNG files and their alpha channels are preserved. There are 140 generated headless bodies across four atlases, of which 100 are used by the gender-specific catalog; the world-fashion designs supersede four rows of the first pair. Fourteen additional parts provide six faces, four hairstyles and four head accessories.

| Source atlas | Exact generation prompt |
|---|---|
| [Male fantasy](../assets/sprites/npc-style-male.png) | [Prompt](../assets/sprites/npc-style-male.prompt.txt) |
| [Female fantasy](../assets/sprites/npc-style-female.png) | [Prompt](../assets/sprites/npc-style-female.prompt.txt) |
| [Male world fashion](../assets/sprites/npc-style-male-world.png) | [Prompt](../assets/sprites/npc-style-male-world.prompt.txt) |
| [Female world fashion](../assets/sprites/npc-style-female-world.png) | [Prompt](../assets/sprites/npc-style-female-world.prompt.txt) |
| [Faces, hair and accessories](../assets/sprites/npc-style-headparts.png) | [Prompt](../assets/sprites/npc-style-headparts.prompt.txt) |

The read-only source indexer `scripts/index-character-sprites.py` requires Pillow and NumPy and writes `sprite-character-data.js`. For all body silhouettes it follows connected opaque components and records per-row extents, so neighbouring skirt hems do not appear in another outfit. It also records compact exposed-skin regions from source color components and body location, keeping warm ivory cloth out of skin dye. This does not modify any source image. The game itself needs no Python or additional dependencies.

`sprite-character.js` composes parts in a 256 × 320 logical frame with a shared foot baseline. Canvas color mapping targets blue/teal cloth, gold trim, purple hair and pink/purple accessories while retaining neutral fabric, outlines and facial eyes. Skin mapping also covers hands and legs. Preset palettes are stored in `fashion-catalog.js`; saved player colors override the selected outfit. Source alpha below 8 is ignored during rendering to suppress nearly transparent edge noise. Caches are bounded.

The same compositor supplies the creator, lobby portrait, equipment preview, battle portrait and 1024 × 2560 runtime action sheet. Eight actions have four samples each. Each pose fits its full layer bounds within the frame, including wide skirts and crowns. Combat offsets align the painted foot baseline with the terrain. These samples use bob, lean and recoil of painted layers; they are not 32 independently painted poses or a skeletal limb rig. Use articulated source parts if full walking and throwing cycles become necessary. The older SVG renderer remains as a non-browser fallback and test fixture; normal browser gameplay uses the raster renderer.

## Fashion references

General garment shapes informed original, unbranded designs: suit lapels and double-breasted tailoring, football stripes/sashes and knee socks, basketball sleeveless jerseys/long shorts, asymmetric coats and layered runway dresses. No real club logos or designer marks were reproduced.

- [Nike 2026 football kit collection](https://about.nike.com/en/newsroom/collections/nike-football-unveils-2026-federation-kits-featuring-aero-fit-performance-cooling-technology)
- [Nike Team Basketball catalog](https://niketeam.nike.com/niketeamsports/content/pdf/catalog_thumbs/NTS_M_Basketball.pdf?cb=20200915)
- [Vogue Spring 2026 runway collections](https://www.vogue.com/fashion-shows/spring-2026-ready-to-wear)

## Validation and limits

Twenty-three automated tests cover gameplay, queue/lifecycle behavior, surrender and room membership, plus 100 unique IDs and palettes, 50 outfits per gender, source PNG dimensions and crop bounds, silhouette spans, dye channel isolation, neutral/eye preservation, extreme color values, server-side validation and persistence. Browser inspection covered male football, female runway, preset reset, custom dye after refresh and a solo move/shot with the saved character. Responsive layout is checked at 390px. Physical phones, low-memory mobile GPU behavior and every possible combination of colors/parts are not exhaustively tested. The five uncompressed source atlases total approximately 13 MB before browser caching.

The review on 2026-10-27 rendered all 100 outfits and a 32-frame crown/long-hair/wide-dress sheet in the browser without render errors. Additional browser checks covered dark skin without ivory-skirt recoloring, reselecting a dyed outfit, purchase/equip/enhancement with matching combat HP, and battle portrait readiness. Production dependencies reported no known vulnerabilities in the package-manager audit. This is a bounded review of the current alpha, not a security certification or high-concurrency benchmark.
