# Garden plan format (planner → garden)

The planning part of the project produces one JSON object. The garden part reads it to draw the map.
Both parts use the same plant list: `src/data/ma-native-plants.json` (use its `id` values).

```json
{
  "version": 1,
  "name": "Sample backyard",
  "zip": "02481",
  "width_ft": 24,
  "length_ft": 14,
  "cell_ft": 2,
  "cells": [
    [ { "sun": "full_sun", "moisture": "dry" }, { "sun": "full_sun", "moisture": "dry" }, "... one per column ..." ],
    "... one row per (length_ft / cell_ft) ..."
  ],
  "plants": [
    { "id": "p1", "species": "asclepias-tuberosa", "x": 0, "y": 0 }
  ],
  "sensors": [
    { "id": "stake-1", "name": "Sunny corner stake", "x": 1, "y": 2, "radius": 2 }
  ]
}
```

| Field | Meaning |
|---|---|
| `width_ft`, `length_ft` | Garden size in feet. Shown on the map rulers. |
| `cell_ft` | Size of one grid square in feet (e.g. 1 or 2). |
| `cells[y][x]` | Row `y` (top to bottom), column `x` (left to right). `rows = length_ft / cell_ft`, `columns = width_ft / cell_ft`. |
| `sun` | `full_sun` (sunlight), `part_shade` (partly shady), `shade` (shady) |
| `moisture` | `wet`, `wet_mesic`, `mesic`, `dry_mesic`, `dry` |
| `plants[].x, y` | Top-left grid cell of the plant. |
| `plants[].species` | An `id` from `ma-native-plants.json`. |
| `sensors` | Optional. A sensor stake covers cells within `radius` squares of it. Plants it covers get live (simulated) readings; others get the typed/voice/photo check-in. |

## How much space a plant takes

A plant takes a square of `size × size` cells, where

```
size = max(1, ceil( (spread_cm / 30.48) / cell_ft ))
```

No two plants may share a cell. The same rule is in `src/lib/catalog.js` (`footprint`, `canPlace`), so the planner can import those functions instead of rewriting them.

## Handing the plan over

Any of these work:
1. **Same website:** the planner saves `localStorage.setItem('gardenPlan', JSON.stringify(plan))`, and the garden page shows a “Use the plan from the planner” button.
2. **File:** the planner offers a “Download plan” button that saves the JSON. The garden page has “Upload a plan file”.
3. **Sample:** `src/data/sample-garden.json` is a complete, valid example to test with.
