# Hollis Visual Redo Asset Provenance

This directory is preview-only. These files are candidate assets for review before gameplay or atlas integration.

## External Sources

- Kenney Pirate Pack
  - URL: https://kenney.nl/assets/pirate-pack
  - License: Creative Commons CC0
  - Usage: ship silhouette/style reference for transport and cargo candidates.
- OpenGameArt Sea Warfare set
  - URL: https://opengameart.org/content/sea-warfare-set-ships-and-more
  - Author: Lowder2
  - License: CC0
  - Usage: destroyer and battleship silhouette reference normalized into OpenFront grayscale bands.
- Kenney Pixel Shmup
  - URL: https://kenney-assets.itch.io/pixel-shmup
  - License: CC0 1.0 Universal
  - Usage: reference for crisp low-resolution strategy/shmup readability.
- itch.io CC0 top-down/sprite asset listings
  - URL: https://itch.io/game-assets/assets-cc0/tag-top-down and https://itch.io/game-assets/assets-cc0/tag-sprites
  - License: varies by asset; only used as direction research here.
  - Usage: reference for one-bit and tiny-pixel concept directions.

## Generated Candidates

- `transport-ship-clean-5.png`: Transport ship candidate. 5x5 actual cell; broader landing-craft silhouette. Source: Kenney Pirate Pack, simplified by hand for OpenFront scale. License: CC0.
- `trade-ship-cargo-5.png`: Trade ship cargo candidate. 5x5 actual cell; light deck/container pixels carry the cargo read. Source: Kenney Pirate Pack hull language, simplified by hand. License: CC0.
- `warship-destroyer-11.png`: Warship destroyer candidate. 11x11 actual cell; sharper bow and centerline gun hints. Source: OpenGameArt Sea Warfare Destroyer silhouette, normalized. License: CC0.
- `warship-battleship-11.png`: Warship battleship candidate. 11x11 alternative; heavier silhouette than the destroyer. Source: OpenGameArt Sea Warfare Battleship silhouette, normalized. License: CC0.
- `construction-progress-16x4.png`: Construction progress marker. Four 16x16 frames; intentionally no people and no noisy movement. Source: Custom minimal scaffold/crane marker. License: Project-owned.
- `city-level-growth-16x5.png`: City level growth concept. Five 16x16 frames; more blocks appear as level increases. Source: Existing OpenFront building-level idea, redrawn as preview. License: Project-owned.
- `port-level-growth-16x5.png`: Port level growth concept. Five 16x16 frames; docks/crane elements expand with level. Source: Existing OpenFront port-level idea, redrawn as preview. License: Project-owned.
- `rail-road-style-16.png`: Railway and road styling tile. Readable sleepers plus restrained road marker; shader guide only. Source: Custom preview using OpenFront banding. License: Project-owned.
- `combat-micro-fx-16x4.png`: Combat muzzle/smoke micro-FX. Four frames for subtle tracer/smoke, not constant flashy overlays. Source: Custom minimal FX strip. License: Project-owned.
- `unit-atlas-placement-preview-13px.png`: Unit atlas placement preview. 13px cells matching UnitPass atlas columns 0, 1, and 2. Source: Generated from transport/trade/warship candidates. License: Mixed CC0/project-owned derivative.

## Concept Direction Families

- `concept-a-tactical-symbols.png`: A. Tactical map symbols. Not literal ships; this optimizes hard for readability at distance. Source: Custom, inspired by military map-marker language. License: Project-owned.
- `concept-b-modern-naval-silhouettes.png`: B. Modern naval silhouettes. More literal ships, wider than the first pass, less tiny-diamond looking. Source: Kenney Pirate Pack and OpenGameArt Sea Warfare CC0 references. License: CC0 derivative/project-owned redraw.
- `concept-c-one-bit-strategy-counters.png`: C. One-bit strategy counters. Crisp and severe; the least decorative and easiest to scan. Source: Custom, informed by CC0 1-bit/pixel asset direction on itch.io. License: Project-owned.
- `concept-d-badge-token-icons.png`: D. Badge/token UI icons. Symbols sit in consistent tokens; more board-game than pixel-art. Source: Custom badge treatment with CC0 ship silhouette reference. License: Project-owned with CC0 reference.

## Regeneration

Run `npx tsx scripts/visual-redo/generate-hollis-preview.ts` from the repo root.
