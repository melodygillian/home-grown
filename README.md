# 🌱 My Garden: a living map for native gardens

**Live demo:** https://smart-garden-two.vercel.app
**Built at:** WHACK 2026 (Wellesley Hackathon)

Most smart-garden tools are built for tech-savvy hobbyists. **My Garden** is built for everyone else, including older gardeners and first-timers. You plan a garden of **Massachusetts native plants** once. After that, the plan becomes a cute, game-like map that keeps track of how each plant is growing, warns you about the week's weather, and tells you what to do, in plain language.

The project has two halves:

| Part | What it does | Status |
|---|---|---|
| **1. Planner** (BayState Bloom) | The gardener draws the yard, maps sunlight and moisture on a 1-ft grid, and places FloraAPI native plants with spacing checks. | ✅ Connected: **Open in My Garden** sends the plan here |
| **2. Garden (this repo)** | Turns the plan into a living map: tracks growth, reads check-ins with AI, gives weather alerts, and handles replacing plants. | ✅ Live |

---

## ✨ Features

**🗺️ A map that matches your real yard**
- Drawn from the planner's grid, with **real dimensions in feet** along both edges.
- Switch between **Plants**, **Sunlight** and **Moisture** views.
- Each species has its own cartoon drawing and takes up as much space as it needs to grow.

**🔒 Planned → planted**
- Every plant starts **faded and locked**. Tap it and say when you planted it, and tracking starts.

**📈 Growth vs. expected**
- Each plant has a **growth score**: its size and health compared with a fully grown, healthy plant.
- It's plotted against an **expected growth curve** for that species.
- A colored ring on the map shows the status: 🟢 thriving · 🔵 on track · 🟠 needs attention · 🔴 at risk.
- The gardener's first check-in sets the starting point, so a big plant from the nursery isn't marked as "ahead."

**📡 Sensor stakes** *(simulated for the demo)*
- One stake per bed reports soil moisture, soil temperature and hours of sun.
- A stake camera adds a growth reading every week.

**🗣️ Check-ins by typing, voice or photo (Google Gemini)**
- For plants without a sensor, the gardener just describes what they see, for example: *"About 22 inches, perked up after the rain, a few flower buds."*
- **Gemini** reads the note (and the photo, if there is one) and returns **structured data**: height, leaf color, flowers, wilting, pests, disease and new growth, plus a short summary and advice.
- The app turns that data into a growth score and adds a point to the chart.

**🌦️ The week's weather, explained for *your* garden**
- A 7-day forecast for the gardener's ZIP code, from the National Weather Service.
- Hover over or tap a day to see:
  - **alerts that name your actual plants** (heat, frost, dry spells, heavy rain, wind, mildew)
  - how soil moisture will change
  - insect activity
  - the outlook for plant growth

**🪦 Lifespan, removal and replacement**
- Each plant's age is shown against how long that species usually lives.
- If a plant dies, the gardener logs whether it reached the end of its life or died early. This goes into a garden journal.
- The app then suggests natives that **suit that exact spot and fit the space**.

---

## 🧱 How it works

```
Planner (part 1) ──plan JSON──▶ Garden map (React)
                                   │
                                   ├── /api/analyze  ──▶ Google Gemini (structured JSON output)
                                   └── /api/weather  ──▶ ZIP code ▶ coordinates ▶ National Weather Service forecast
```

- **Frontend:** React + Vite, all custom SVG drawings (no image assets)
- **Backend:** Vercel serverless functions (`/api`), which keep the Gemini key secret
- **AI:** Gemini API with a JSON response schema. The app computes the score from Gemini's output, so it's consistent and easy to explain.
- **Data:** 54 garden-friendly Massachusetts native plants in `src/data/ma-native-plants.json`, shared by the planner and the garden
- **Storage:** the browser's localStorage (no account needed for the demo)

### Project structure

| Path | Purpose |
|---|---|
| `src/data/ma-native-plants.json` | Plant catalog: sun, moisture, height, spread, bloom months, lifespan, growth speed, drawing style |
| `src/data/sample-garden.json` | Example plan: a 24 × 14 ft backyard with 24 plants and 2 sensor stakes |
| `PLAN_FORMAT.md` | The JSON format the planner outputs and the garden reads |
| `api/analyze.js` | Sends the check-in (text + optional photo) to Gemini and returns structured features |
| `api/weather.js` | ZIP code → town → 7-day forecast |
| `src/lib/growth.js` | Expected-growth curve, growth score, health status |
| `src/lib/weather.js` | Rules that turn the forecast into alerts, moisture, insect and growth notes |
| `src/lib/catalog.js` | Plant lookup, how much space a plant takes, and whether a plant fits a spot |
| `src/lib/sensors.js` | Simulated sensor-stake readings |
| `src/components/` | Map, flowers, plant panel, chart, check-in, weather bar, setup screens |

---

## 🚀 Run it locally

You need **Node.js 20+** ([nodejs.org](https://nodejs.org), choose "LTS").

```bash
git clone https://github.com/melodygillian/smart-garden.git
cd smart-garden
npm install
npm run dev
```

Open **http://localhost:5173** in **Chrome**. Voice input needs Chrome, Edge or Safari.

### Gemini key (optional for local work)

Without a key, check-ins use a simple keyword reader. The result card says which reader was used. To use Gemini locally:

1. Get a free key at **https://aistudio.google.com/apikey**.
2. Copy the example file: `cp .env.example .env.local`
3. Open `.env.local` and set `GEMINI_API_KEY=your-key`.
4. Restart `npm run dev`.

⚠️ **Never commit `.env.local` or paste a key into chat.** The file is already in `.gitignore`.

The Terminal running `npm run dev` prints a line for every Gemini call, showing what was sent, what came back, and how long it took.

### Deploying

The live site deploys automatically from `main` on **Vercel**. Every push updates https://smart-garden-two.vercel.app within about a minute. The Gemini key is stored in Vercel under **Project → Settings → Environment Variables**.

---

## 🤝 How the two parts connect

1. In the planner, finish a garden and click **Open in My Garden** (Maintenance page or dashboard card).
2. My Garden opens in a new tab with the plan inside the link, asks for a ZIP code, and shows the map. Every plant starts locked until it's planted.
3. Backup: **Download plan** in the planner → **Upload a plan file** in My Garden.

Details, field mappings and both JSON formats are in [`PLAN_FORMAT.md`](PLAN_FORMAT.md). Planner code: `src/utils/exportToGarden.ts`. My Garden code: `src/lib/importPlanner.js`.

**Git workflow:** run `git pull` before starting, keep changes small, and commit and push working pieces.

---

## 🎬 2-minute demo script

1. In the planner, open a finished garden → **Open in My Garden**. Enter a ZIP code. (Or use **Try the sample backyard**.) Point out the rulers in feet and switch to the **Sunlight** and **Moisture** views.
2. Every plant is faded and locked. Tap **Butterfly weed** → **2 months ago** → **Yes, I planted it**. It's next to a sensor stake, so show the live readings and the growth curve.
3. Tap **Wild bergamot**, which has no sensor. Plant it, then tap **Speak** and describe it. Gemini returns structured features, a new point appears on the chart, and the ring color updates.
4. Go to **Settings → Use a sample summer heat-wave week** and hover over the days. The alerts name the plants that need water.
5. On any plant: **This plant died → It died early**, then pick a replacement that fits the spot.

To set up the demo: **Settings → Plant everything 2 months ago** fills the garden, and **Reset garden to fresh plan** starts over.

---

## 📝 Honest notes

- **Simulated:** sensor stakes and camera growth readings (`src/lib/sensors.js`, `cameraLogs` in `src/lib/growth.js`). The real hardware would be an ESP32 with a soil-moisture probe, a temperature probe and a camera, inside one sealed, solar-powered stake.
- **Plant data:** sun and moisture ranges were compiled from the Lady Bird Johnson Wildflower Center's *Massachusetts Recommended* list, the MA Department of Agricultural Resources' native pollinator list, and nursery references. Expected-growth curves and lifespans are estimates.
- **Weather alerts** are simple, readable rules (see `src/lib/weather.js`), not a plant simulation.
- Data is saved in the browser, not a database.

## 🛠️ Built with

React · Vite · Vercel · Google Gemini API · National Weather Service API · Zippopotam.us · Web Speech API
