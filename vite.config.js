import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// During `npm run dev`, serve the files in /api the same way Vercel does in production,
// so you don't need the Vercel CLI to test the Gemini and weather functions locally.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();
        const name = req.url.slice(5).split('?')[0].replace(/[^a-z0-9-]/gi, '');
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          const url = new URL(req.url, 'http://localhost');
          req.query = Object.fromEntries(url.searchParams);
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
  // Make GEMINI_API_KEY from .env.local available to the /api functions in dev.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;
  return { plugins: [react(), localApi()] };
});
