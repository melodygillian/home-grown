import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

// During `npm run dev`, files in /api are served the same way Vercel serves them in production,
// so Gemini check-ins, weather and the plant search all work locally without the Vercel CLI.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();
        const url = new URL(req.url, 'http://localhost');
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.some((p) => p.startsWith('_') || p.includes('..'))) return next();
        req.query = Object.fromEntries(url.searchParams);
        let file = path.join(process.cwd(), ...parts) + '.js';
        if (!fs.existsSync(file)) {
          const dir = path.join(process.cwd(), ...parts.slice(0, -1));
          const dyn = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => /^\[.+\]\.js$/.test(f));
          if (!dyn) return next();
          req.query[dyn.slice(1, -4)] = decodeURIComponent(parts[parts.length - 1]);
          file = path.join(dir, dyn);
        }
        try {
          const mod = await server.ssrLoadModule(file);
          await mod.default(req, res);
        } catch (err) {
          console.error(err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err.message || err) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;
  return { plugins: [react(), tailwindcss(), localApi()] };
});
