# My Garden — smart garden maintenance (WHACK 2026)

The maintenance half of the project. It turns the garden plan into a living map:

- **Garden map** with real dimensions, a sun/moisture grid, and cartoon plants.
- Plants start **locked** (planned). Tap one → “Yes, I planted it” to start tracking.
- **Growth score vs. expected curve** for every planted plant, with a colored ring: thriving / on track / needs attention / at risk.
- **Sensor stakes** (simulated) give live soil moisture, soil temperature and sunlight, plus weekly camera growth points.
- **No sensor?** The gardener types, **speaks**, or **photographs** a check-in. **Google Gemini** reads it into height, leaf color, flowers, wilting, pests and disease, and the app turns that into a growth score.
- **Lifespan** tracking, **remove** (with reason, saved to a journal) and **replace** with natives that suit that exact spot and fit the space.
- **7-day weather** for the gardener’s ZIP code (National Weather Service). Hover or tap a day to see alerts, soil moisture change, insect activity and growth outlook for *this* garden.

## Files

| Path | What it does |
|---|---|
| `src/data/ma-native-plants.json` | 54 garden-friendly Massachusetts native plants: sun, moisture, size, bloom, lifespan, growth speed, drawing style. Shared with the planner. |
| `src/data/sample-garden.json` | Example plan (24 × 14 ft backyard, 24 plants, 2 sensor stakes). |
| `PLAN_FORMAT.md` | The plan format your teammate’s planner should output. |
| `api/analyze.js` | Server function: sends the note/photo to Gemini, returns structured features. Keeps the API key secret. |
| `api/weather.js` | Server function: ZIP → town → 7-day forecast. |
| `src/lib/growth.js` | Expected growth curve, growth score, status. |
| `src/lib/weather.js` | Weather → alerts / moisture / insects / growth rules. |
| `src/lib/sensors.js` | Simulated sensor stake readings. |
| `src/lib/catalog.js` | Plant lookup, footprint and “does it fit here?” rules. |
| `src/components/*` | Map, flowers, plant panel, chart, check-in, weather bar, setup screens. |

---

## Step 1 — Run it on your laptop

1. Install **Node.js 20 or newer** from https://nodejs.org (choose “LTS”).
2. Unzip this folder, open a terminal **in the folder**, and run:
   ```bash
   npm install
   ```
3. Add your Gemini key (see Step 2), then run:
   ```bash
   npm run dev
   ```
4. Open http://localhost:5173 in **Chrome** (voice input needs Chrome, Edge or Safari).

Without a key everything still works, but check-ins use a simple keyword reader instead of Gemini (the result card says which one was used).

## Step 2 — Gemini API key (exact steps)

1. Go to https://aistudio.google.com/apikey and sign in with your Google account.
2. Click **Create API key** and copy it. Don’t paste it into chats, code, or GitHub.
3. In the project folder, make a copy of `.env.example` and name it **`.env.local`**.
4. Open `.env.local` and paste the key after the `=`:
   ```
   GEMINI_API_KEY=your-key-here
   ```
5. Stop and restart `npm run dev` (Ctrl+C, then `npm run dev` again).
6. Test it: open the app → Try the sample backyard → tap **Wild bergamot** → plant it “2 months ago” → type *“about 20 inches tall, a few leaves have white powder, buds forming”* → **Save update**. The purple card should say **“Read by Google Gemini”**.

`.env.local` is in `.gitignore`, so it won’t be uploaded to GitHub.
If you see “model not found”, set `GEMINI_MODEL=gemini-2.5-flash` (or any model listed in AI Studio) in `.env.local`.

## Step 3 — Put the code on GitHub

1. Create a new repository on https://github.com/new (e.g. `smart-garden`). Don’t add a README.
2. In the project folder:
   ```bash
   git init
   git add .
   git commit -m "Smart garden maintenance app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/smart-garden.git
   git push -u origin main
   ```
3. Check that `.env.local` is **not** listed on GitHub.

## Step 4 — Put it online with Vercel (free)

1. Go to https://vercel.com and **sign up with GitHub**.
2. **Add New… → Project**, pick your `smart-garden` repo, click **Import**.
3. Vercel detects **Vite** automatically. Open **Environment Variables** and add:
   - Name: `GEMINI_API_KEY` — Value: your key
4. Click **Deploy**. In about a minute you get a link like `https://smart-garden-xyz.vercel.app`.
5. Every `git push` to `main` redeploys automatically. If you change the key later: Project → Settings → Environment Variables, then **Redeploy**.

The `/api` folder becomes server functions on Vercel automatically, so the key stays on the server.

## Demo script (2 minutes)

1. Enter a ZIP → **Try the sample backyard**. Point out the rulers (24 × 14 ft) and the **Sunlight / Moisture** views.
2. All plants are faded and locked. Tap **Butterfly weed** → *2 months ago* → **Yes, I planted it**. It’s in a sensor bed: show live readings and the camera growth curve.
3. Tap **Wild bergamot** (no sensor) → plant it → tap **Speak** and describe it → **Save update**. Gemini’s reading appears and a new point lands on the chart; the ring color changes.
4. **Settings → Use a sample summer heat-wave week** and hover over the days: alerts name the plants that need water.
5. On any plant: **This plant died → It died early** → pick a replacement that fits the spot.

Settings → *Plant everything 2 months ago* fills the garden quickly; *Reset garden to fresh plan* starts the demo over.

## Notes for judges / honesty

- Sensor stakes and camera growth points are **simulated** (see `src/lib/sensors.js`, `cameraLogs` in `src/lib/growth.js`).
- Plant sun/moisture ranges come from the Lady Bird Johnson Wildflower Center “Massachusetts Recommended” list, the MA Dept. of Agricultural Resources pollinator list and nursery references. Expected-growth curves and lifespans are estimates.
- Data is saved in the browser (localStorage), not a database.
