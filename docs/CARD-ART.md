# R้อยภูติ คืนปลุกวิญญาณ — art production

Method: native `image_gen`, five distinct prompts and five generated 5-column × 4-row atlases. The former hand-painted chibi NPC was a style reference, retrieved before the old game assets were removed; it remains in Git commit `f3e3082` at `assets/npc-summon.png`. Generation used no third-party image API or custom image-processing runner.

| Faction | Source in project | Exact prompt | Card numbers |
| --- | --- | --- | --- |
| Wood / เรือนร้าง | `assets/cards/wood.png` | `assets/cards/wood.prompt.txt` | 001–020 |
| Fire / พงไพรอัคคี | `assets/cards/fire.png` | `assets/cards/fire.prompt.txt` | 021–040 |
| Water / จันทราสินธุ์ | `assets/cards/water.png` | `assets/cards/water.prompt.txt` | 041–060 |
| Shadow / ราตรีพันเงา | `assets/cards/shadow.png` | `assets/cards/shadow.prompt.txt` | 061–080 |
| Light / ศาลพิทักษ์ | `assets/cards/light.png` | `assets/cards/light.prompt.txt` | 081–100 |

Original generated PNGs and their metadata remain unchanged. Runtime CSS uses `background-size:500% 400%` and per-tile percentage positions. Tile borders may contain tiny variations from image generation; illustrations are not layered character rigs or separately animated artworks. Card frames, names, stats and ability text are DOM/CSS rather than baked into the image.

All five source sheets were visually inspected. Automated checks verify PNG signatures and dimensions and that every card selects a valid tile. They do not replace inspecting the assembled UI in an actual browser. Thai folklore names are interpreted as playful fantasy; many characters are original to the game rather than traditional entities.
