# 🌱 BayState Bloom: plan a Massachusetts native garden, then help it grow

**Live site:** https://smart-garden-two.vercel.app
**Built at:** WHACK 2026 (Wellesley Hackathon)

Most smart-garden tools are built for tech-savvy hobbyists. BayState Bloom is built for everyone, including older gardeners and first-timers. It works in two steps, on one website, under one account:

| Step | What the gardener does |
|---|---|
| **1 · Plan a new garden** | Enter the yard's size, paint each 1-ft square's **sunlight** and **soil moisture**, and place **Massachusetts native plants** that fit. The app warns about crowding and mismatched light or soil. |
| **2 · Track my garden** | The exact garden they planned becomes a living map. Mark plants as planted, see each one's **growth vs. expected**, log check-ins **by typing, voice or photo** (read by **Google Gemini**), get **weather alerts** for the week, and replace plants that die. |

The two most important buttons, **New Garden** and **Track My Garden**, are always in the top bar.

---

## ✨ Features

**Planning** (planner team)
- Garden size in feet, paint sunlight (Sun / Part Shade / Shade) and moisture (Dry / Moist / Wet) on a 1-ft grid
- Search Massachusetts natives by light, moisture and type, then drag them onto the grid
- Mature-spread circles, crowding and border warnings, light/moisture fit checks
- Saved gardens per account, a seasonal care checklist and a care journal

**Tracking** (Track My Garden)
- **Same map as the plan:** same plants, same spots, same drawings. Edit the plan and the tracker updates.
- Plants start **locked** (planned). Tap one → "Yes, I planted it" to start tracking.
- **Growth score vs. expected curve** for each plant: size and health compared with a fully grown, healthy plant, combining height, leaf color, flowers, wilting, pests and disease. A colored ring shows thriving / on track / needs attention / at risk.
- **Sensor stakes** *(simulated)* give live soil moisture, soil temperature and sunlight, plus weekly camera growth points.
- **No sensor?** Type, **speak**, or **photograph** a check-in. **Gemini** turns it into structured data (height, leaf color, flowers, problems) plus advice.
- **7-day weather** for the garden's ZIP code. Hover or tap a day to see alerts that name your actual plants, soil moisture change, insect activity and growth outlook.
- **Lifespan** tracking. When a plant dies, log why (saved to a journal), and pick a replacement that suits that spot and fits the space. The plan updates too.
- Everything is saved **inside the gardener's garden, in their account**. Plantings, check-ins and removals also appear in the care journal.

---

## 🧱 How it works

```
Browser (React + Vite + Tailwind)
  Home ─ Plant Guide ─ My Gardens ─ Designer (plan) ─ Track My Garden ─ Care checklist
                                          │                    │
  /api/flora/ma-plants ──▶ FloraAPI (or built-in list)         ├── /api/analyze ──▶ Google Gemini (structured JSON)
                                                               └── /api/weather ──▶ ZIP ▶ National Weather Service
```

- **Frontend:** one React app (`src/`), styled with Tailwind
- **Backend:** Vercel serverless functions in `api/`, which keep the Gemini and FloraAPI keys secret
- **Plant data:** FloraAPI when `FLORA_API_KEY` is set. Otherwise (or if FloraAPI is down), our 54 garden-friendly Massachusetts natives in `src/data/ma-native-plants.json`, so the demo always works.
- **Storage:** the browser's localStorage, per account (no server database for the demo)

### Project structure

| Path | Purpose |
|---|---|
| `src/App.tsx` | Pages and navigation |
| `src/components/HomeView.tsx`, `DashboardView.tsx`, `DesignerView.tsx`, `MaintenanceView.tsx`, `PlantGuideView.tsx` | Planner pages |
| `src/components/TrackerView.tsx` | **Track My Garden** page |
| `src/utils/tracking.ts` | Connects a garden plan to growth tracking: species growth info, status, simulated sensors |
| `src/lib/growth.js` | Expected-growth curve, growth score, health status |
| `src/lib/weather.js` | Rules that turn the forecast into alerts, moisture, insect and growth notes |
| `src/lib/analyze.js`, `useSpeech.js` | Check-in: photo resizing, Gemini call, voice input |
| `src/types/garden.ts` | Data types (a garden's `tracking` lives inside the garden) |
| `api/analyze.js` | Sends a check-in (text + optional photo) to Gemini, returns structured features |
| `api/weather.js` | ZIP code → town → 7-day forecast |
| `api/flora/*`, `api/_flora.js`, `api/_localPlants.js` | Plant search (FloraAPI with built-in fallback) |

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

### Keys (optional for local work)

Copy the example file and fill in what you have:

```bash
cp .env.example .env.local
```

- `GEMINI_API_KEY`: free at https://aistudio.google.com/apikey. Without it, check-ins use a simple keyword reader. The result card says which reader was used.
- `FLORA_API_KEY`: optional. Without it, the planner uses the built-in plant list.

Restart `npm run dev` after changing keys. ⚠️ **Never commit `.env.local` or paste a key into chat.**

### Deploying

The live site deploys automatically from `main` on **Vercel**. Keys live in Vercel under **Project → Settings → Environment Variables**.

---

## 🎬 2-minute demo script

1. **Home** → **Open Sample 12 × 8 ft Garden** (or **New Garden** to draw one). Show the sun/moisture painting and plant placement.
2. Click **Complete & Track Maintenance**. You land on **Track My Garden** with the exact same map, every plant locked. Enter a ZIP code.
3. Tap a plant near a sensor stake → **2 months ago** → **Yes, I planted it**. Show the live readings and growth curve.
4. Plant one away from the stakes → **Speak** and describe it → **Save update**. Gemini's reading appears, a new point lands on the chart, and the ring color updates.
5. **Preview a summer heat wave** and hover over the days. The alerts name the plants that need water.
6. **This plant died → It died early**, then pick a replacement that fits. Open **Edit garden map** to show the plan changed too.

---

## 📝 Honest notes

- **Simulated:** sensor stakes and camera growth readings (`stakesFor` / `readingsFor` in `src/utils/tracking.ts`, `cameraLogs` in `src/lib/growth.js`). Real hardware would be an ESP32 with a soil-moisture probe, a temperature probe and a camera, in one sealed, solar-powered stake.
- **Plant data:** our built-in list was compiled from the Lady Bird Johnson Wildflower Center's *Massachusetts Recommended* list, the MA Department of Agricultural Resources' native pollinator list and nursery references. Expected-growth curves and lifespans are estimates.
- **Weather alerts** are simple, readable rules (`src/lib/weather.js`), not a plant simulation.
- Accounts and gardens are saved in the browser for the demo, not in a database.

## 🛠️ Built with

React · Vite · Tailwind CSS · Vercel · Google Gemini API · FloraAPI · National Weather Service API · Zippopotam.us · Web Speech API · lucide icons
