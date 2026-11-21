# Connecting the planner and My Garden

**Planner (part 1):** BayState Bloom, the Massachusetts native garden planner.
**My Garden (part 2):** this app, https://smart-garden-two.vercel.app

## How a plan gets from the planner to My Garden

In the planner, open a finished garden and click **Open in My Garden** (on the Maintenance page or the dashboard card).
That opens My Garden in a new tab with the whole plan packed into the link:

```
https://smart-garden-two.vercel.app/#plan=<the plan, base64url-encoded JSON>
```

My Garden reads the plan, removes it from the address bar, asks for a ZIP code if needed, and opens the map.
If a garden is already open, it asks first: **Open new plan** or **Keep my current garden**.

**Backup:** in the planner, click **Download plan**, then in My Garden go to **Settings → Load a different garden plan → Upload a plan file**.

The planner code for this is `src/utils/exportToGarden.ts`. My Garden's side is `src/lib/importPlanner.js`.

## The planner's export format (`baystate-bloom-plan`)

```json
{
  "format": "baystate-bloom-plan",
  "version": 1,
  "name": "Concord Pollinator Border",
  "zone": "6a",
  "width": 16,
  "height": 10,
  "cells": [[{ "sun": "Sun", "moisture": "Dry" }, "..."]],
  "placements": [
    { "uid": "u1", "plantId": "flora-id", "cx": 2, "cy": 2,
      "name": "Butterflyweed", "sci": "Asclepias tuberosa", "category": "perennial",
      "spreadFt": 2, "heightFt": "1–2.5 ft", "bloomMonths": [6,7,8],
      "color": "#F97316", "accentColor": "#FDE68A",
      "lightRequirements": ["Sun"], "soilMoisture": ["Dry", "Moist"], "careTip": "..." }
  ],
  "return_url": "https://<planner site>"
}
```

My Garden also accepts a raw planner `GardenProject` (the object the planner keeps in localStorage).

## How My Garden translates it

| Planner | My Garden |
|---|---|
| 1-ft grid, `width × height` ft | `cell_ft = 1`, rulers show the same feet |
| Sun: `Sun` / `Part Shade` / `Shade` | `full_sun` / `part_shade` / `shade` |
| Moisture (3 levels): `Dry` / `Moist` / `Wet` | `dry` / `mesic` / `wet` (My Garden's 5-level scale also has `dry_mesic` and `wet_mesic`) |
| Plant placed by center (`cx`, `cy`) with round spread `spreadFt` | Square of `ceil(spreadFt)` cells, placed so its center matches |
| Plant from FloraAPI | If its scientific name is in `ma-native-plants.json`, that richer data is used (growth curve, lifespan, drawing). Otherwise a custom species is built from the planner's data, so every plant shows up. |
| *(no sensors)* | Two simulated sensor stakes are added for the demo: one in the driest area and one in the wettest. Plants near them get live readings; the rest use typed/voice/photo check-ins. |

`return_url` adds **Settings → Edit this plan in the planner ↗** in My Garden.

---

## My Garden's own plan format

If you build a plan by hand (like `src/data/sample-garden.json`):

```json
{
  "version": 1,
  "name": "Sample backyard",
  "width_ft": 24,
  "length_ft": 14,
  "cell_ft": 2,
  "cells": [[{ "sun": "full_sun", "moisture": "dry" }, "..."]],
  "plants": [{ "id": "p1", "species": "asclepias-tuberosa", "x": 0, "y": 0, "size": 1 }],
  "species": [],
  "sensors": [{ "id": "stake-1", "name": "Sunny corner stake", "x": 1, "y": 2, "radius": 2 }]
}
```

| Field | Meaning |
|---|---|
| `cells[y][x]` | Row `y` (top to bottom), column `x` (left to right). `rows = length_ft / cell_ft`, `columns = width_ft / cell_ft`. |
| `sun` | `full_sun`, `part_shade`, `shade` |
| `moisture` | `wet`, `wet_mesic`, `mesic`, `dry_mesic`, `dry` |
| `plants[].x, y` | Top-left grid cell of the plant |
| `plants[].species` | An `id` from `ma-native-plants.json`, or from `species` |
| `plants[].size` | Optional. Grid squares per side. If missing: `max(1, ceil((spread_cm / 30.48) / cell_ft))` |
| `species` | Optional extra plants not in the catalog (same fields as the catalog) |
| `sensors` | Optional. A stake covers cells within `radius` squares of it |
