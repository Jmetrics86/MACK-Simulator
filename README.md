# MACK Trucks — Loading Dock Simulator (Three.js)

An articulated Class-8 tractor-trailer loading dock backing simulator built with **Three.js** and **Vite**. Drive an iconic **MACK Super-Liner Conventional Tractor** coupled to a **53-foot MACK Dry-Van Trailer** and master fifth-wheel reverse counter-steering across three freight terminal shifts.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173/** in your browser.

## 3D Models & Asset Credits

- **Iconic MACK Super-Liner Conventional & 53' Articulated Trailer** (`src/mackTruck.js`):
  - Because no royalty-free / CC0 3D model of a branded articulated MACK semi-truck exists publicly, a detailed bespoke PBR Three.js rig was engineered specifically for this simulator—complete with the **Gold MACK Bulldog hood ornament** (signifying an all-Mack powertrain), sculpted conventional hood and curved fenders, horizontal chrome radiator grille with **M A C K** emblem, split flat-glass windshield with sun visor, 5 amber roof marker lights, twin roof air horns, dual chrome vertical exhaust stacks with live diesel smoke particles, polished aluminum saddle fuel tanks, dynamic flexing red/blue gladhand air lines, steerable Alcoa wheels, and a 53' dry-van trailer in 4 selectable MACK paint liveries.
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
