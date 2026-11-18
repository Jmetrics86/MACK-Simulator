# MACK Pioneer™ — Loading Dock Simulator (Three.js)

An articulated Class-8 tractor-trailer loading dock backing simulator built with **Three.js** and **Vite**. Drive the flagship **MACK Pioneer™ Highway Tractor** coupled to a **53-foot MACK Dry-Van Trailer** and master fifth-wheel reverse counter-steering across three freight terminal shifts.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173/** in your browser.

## 3D Models & Asset Optimization

- **Official MACK Pioneer™ Tractor (`public/models/mack_pioneer.glb` & `src/mackTruck.js`)**:
  - Converted and game-optimized from the team's 265 MB `Mack_Pioneer_Apple_AR_v13_Exterior` USDZ/glTF CAD asset down to a **14.6 MB Meshopt-compressed GLB** (`EXT_meshopt_compression`) for fast web/Vercel delivery.
  - Preserves 100% of the artist-retopologized clearcoat body panels (`CarPaint_SMATSG` wired to 4 selectable MACK paint liveries) and the **Gold MACK Bulldog hood ornament**, with individually hub-rigged steerable front wheels (`Wheel_FL`, `Wheel_FR`), rolling tandem drive duals (`Wheel_CL`, `Wheel_CR`, `Wheel_RL`, `Wheel_RR`), working LED projector headlights, rear tail/brake lamps, and CAD-exact `5.2257m` wheelbase & fifth-wheel coupling geometry.
- **CC0 Public Domain Industrial Yard Props** (`public/models/`):
  - Sourced directly from [Poly Haven](https://polyhaven.com/models) under the **CC0 1.0 Universal Public Domain** license:
    - `concrete_road_barrier` (Concrete Jersey Barrier)
    - `Barrel_01` (Industrial Steel Drum)
    - `wooden_crate_01` (Heavy Timber Cargo Crate)

## Three Difficulty Levels

| Level | Shift | Target Bay | Environment | CDL Maneuver & Rules |
| :--- | :--- | :--- | :--- | :--- |
| **1 — Easy** | *Rookie* | **Bay 04** | Clear Daylight | **Offset Bay Back**: Spacious apron, dynamic backing guide arcs ON, `±0.65m` lateral & `±6.5°` angle window, 3 strikes. |
| **2 — Medium** | *Pro CDL* | **Bay 03** | Golden Dusk | **45° Sight-Side Alley Dock**: Thread between two flanking 53' trailers (`Bay 02` & `Bay 04`) with forward concrete barriers restricting pull-ups (`±0.45m`, `±4.5°`, 2 strikes). |
| **3 — Hard** | *Bulldog Master* | **Bay 02** | Wet Floodlit Night | **90° Blind-Side Obstacle Hook**: Tight blind-side alley around a cargo barrier island between parked trailers & steel dock bollards (`±0.30m`, `±3.0°`, soft bumper kiss required). |

## Controls

- **`W` / `↑`**: Throttle / Drive Forward (`mDRIVE D`)
- **`S` / `↓`**: Brake & Reverse (`mDRIVE R` — triggers white reverse lamps & yard backup alarm)
- **`A` / `D`** or **`←` / `→`**: Steer Front Axle (watch the live Mack flat-bottom steering wheel & fifth-wheel hitch gauge)
- **`Space`**: Pneumatic Air Brake / Parking Brake
- **`1`–`4`** or **`C`**: Cycle Cameras (`1: Orbit Chase`, `2: Gold Bulldog Hood POV`, `3: Overhead Spotter`, `4: Dock Bay Cam`)
- **Mouse Drag + Scroll**: Free-orbit & zoom in Orbit Cam
- **`M`**: Toggle Live Dual West Coast Side Mirrors (Sight-Side & Blind-Side)
- **`G`**: Toggle Dynamic Predicted Trailer Backing Arcs
- **`L`**: Toggle High-Beam Headlights
- **`H`**: Pull Dual Roof Mack Air Horn
- **`R`**: Reset Current Shift
