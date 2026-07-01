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
- PublicDomainVectors naval ship silhouettes
  - URL: https://publicdomainvectors.org/en/navy-ship-silhouette-clip-art
  - License: Public domain/free of copyright per source page.
  - Usage: side-profile naval silhouette references for cruiser, carrier, and heavy-gun variants.
- FreeSVG/OpenClipart warship
  - URL: https://freesvg.org/a-warship
  - License: Public Domain
  - Usage: historical warship side-profile reference.
- FreeSVG/OpenClipart container ship and cargo vessel
  - URLs: https://freesvg.org/container-ship-vector-illustration and https://freesvg.org/cargo-vessel
  - License: Public Domain / CC0 per source pages.
  - Usage: side-profile cargo/container ship references for trade ship candidates.
- PublicDomainVectors cargo ship clipart
  - URL: https://publicdomainvectors.org/en/cargo-ship-clipart
  - License: Public domain/free of copyright per source page.
  - Usage: cargo ship silhouette and container layout references.
- OpenGameArt Battleships
  - URL: https://opengameart.org/content/battleships
  - License: CC0
  - Usage: battleship/game-token readability reference.
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
- `trade-side-cargo-13.png`: Trade ship side cargo candidate. 13x13 current-compatible; side-profile cargo hull with container blocks. Source: Custom side-profile cargo ship using public-domain cargo vessel references. License: Project-owned with public-domain/CC0 reference.
- `trade-side-stacked-cargo-13.png`: Trade ship stacked cargo candidate. 13x13 current-compatible; more container detail while still tiny. Source: Custom side-profile container ship using public-domain cargo vessel references. License: Project-owned with public-domain/CC0 reference.
- `trade-side-cargo-17.png`: Trade ship side cargo detailed candidate. 17x17 enlarged; hull, stern cabin, and container sections read more clearly. Source: Custom side-profile cargo ship using public-domain cargo vessel references. License: Project-owned with public-domain/CC0 reference.
- `trade-side-stacked-cargo-17.png`: Trade ship stacked cargo detailed candidate. 17x17 enlarged; stronger container-stack silhouette for trade ships. Source: Custom side-profile container ship using public-domain cargo vessel references. License: Project-owned with public-domain/CC0 reference.
- `trade-side-cargo-21.png`: Trade ship side cargo large candidate. 21x21 enlarged; clearest cargo ship profile, requires unit-size work. Source: Custom side-profile cargo ship using public-domain cargo vessel references. License: Project-owned with public-domain/CC0 reference.
- `warship-destroyer-11.png`: Warship destroyer candidate. 11x11 actual cell; sharper bow and centerline gun hints. Source: OpenGameArt Sea Warfare Destroyer silhouette, normalized. License: CC0.
- `warship-battleship-11.png`: Warship battleship candidate. 11x11 alternative; heavier silhouette than the destroyer. Source: OpenGameArt Sea Warfare Battleship silhouette, normalized. License: CC0.
- `warship-detailed-13.png`: Warship detailed candidate. 13x13 full current atlas cell; most detail possible without renderer changes. Source: Custom redraw using OpenGameArt Sea Warfare silhouette references. License: Project-owned with CC0 reference.
- `warship-silhouette-13.png`: Warship silhouette candidate. 13x13 full current atlas cell; cleaner and less noisy than the detailed version. Source: Custom redraw using modern destroyer silhouette references. License: Project-owned with CC0 reference.
- `warship-detailed-17.png`: Warship detailed enlarged candidate. 17x17; requires atlas/unit-size changes, but supports real turrets/barrels. Source: Custom redraw using OpenGameArt Sea Warfare silhouette references. License: Project-owned with CC0 reference.
- `warship-silhouette-21.png`: Warship large silhouette candidate. 21x21; requires renderer changes, but reads as an actual warship. Source: Custom redraw using modern battleship/destroyer silhouette references. License: Project-owned with CC0 reference.
- `warship-side-silhouette-13.png`: Warship side silhouette candidate. 13x13 current-compatible; less top-down, but much more readable as a warship. Source: Custom side-profile warship silhouette using CC0 references. License: Project-owned with CC0 reference.
- `warship-side-detailed-17.png`: Warship side detailed candidate. 17x17 enlarged; bridge, guns, hull, and waterline have room to read. Source: Custom side-profile warship silhouette using CC0 references. License: Project-owned with CC0 reference.
- `warship-side-silhouette-21.png`: Warship side large silhouette candidate. 21x21 enlarged; most recognizable silhouette, but requires unit-size work. Source: Custom side-profile warship silhouette using CC0 references. License: Project-owned with CC0 reference.
- `warship-side-cruiser-13.png`: Warship side cruiser candidate. 13x13 current-compatible; bridge and forward gun are emphasized. Source: Custom side-profile cruiser silhouette using public-domain naval references. License: Project-owned with public-domain/CC0 reference.
- `warship-side-heavy-gun-13.png`: Warship side heavy gun candidate. 13x13 current-compatible; chunky hull with fore/aft guns. Source: Custom side-profile battleship silhouette using public-domain naval references. License: Project-owned with public-domain/CC0 reference.
- `warship-side-stealth-13.png`: Warship side stealth candidate. 13x13 current-compatible; angular modern silhouette with minimal clutter. Source: Custom side-profile modern destroyer silhouette using CC0 references. License: Project-owned with CC0 reference.
- `warship-side-carrier-13.png`: Warship side carrier candidate. 13x13 current-compatible; flat-deck carrier style, less gunship-like. Source: Custom side-profile carrier silhouette using public-domain naval references. License: Project-owned with public-domain/CC0 reference.
- `warship-side-cruiser-17.png`: Warship side cruiser detailed candidate. 17x17 enlarged; bridge, gun, mast, and waterline read more clearly. Source: Custom side-profile cruiser silhouette using public-domain naval references. License: Project-owned with public-domain/CC0 reference.
- `warship-side-heavy-gun-17.png`: Warship side heavy gun detailed candidate. 17x17 enlarged; strongest classic battleship/gunship profile. Source: Custom side-profile battleship silhouette using public-domain naval references. License: Project-owned with public-domain/CC0 reference.
- `warship-side-stealth-17.png`: Warship side stealth detailed candidate. 17x17 enlarged; angular stealth destroyer profile with clean deck line. Source: Custom side-profile modern destroyer silhouette using CC0 references. License: Project-owned with CC0 reference.
- `warship-side-carrier-17.png`: Warship side carrier detailed candidate. 17x17 enlarged; flat-top carrier profile with island superstructure. Source: Custom side-profile carrier silhouette using public-domain naval references. License: Project-owned with public-domain/CC0 reference.
- `warship-side-carrier-21.png`: Warship side carrier large candidate. 21x21 enlarged; clearest aircraft carrier profile with deck and island. Source: Custom side-profile carrier silhouette using public-domain naval references. License: Project-owned with public-domain/CC0 reference.
- `carrier-cargo-side-profile-pairing.png`: Aircraft carrier and cargo ship pairing. Side-by-side pairing sheet for warship carrier and trade cargo ship candidates. Source: Generated from carrier and cargo side-profile candidates. License: Project-owned with public-domain/CC0 reference.
- `warship-side-profile-variants.png`: Warship side-profile variants. Side-by-side sheet of current-compatible 13px and enlarged 17px silhouettes. Source: Generated from the side-profile warship variant set. License: Project-owned with public-domain/CC0 reference.
- `warship-size-detail-comparison.png`: Warship size/detail comparison. Side-by-side: current-compatible 13px options versus enlarged options. Source: Generated from the four warship-focused candidates. License: Project-owned with CC0 reference.
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
