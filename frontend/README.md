# Frontend

React, TypeScript, and Tailwind CSS, served by Vite during development.
See the [project README](../README.md) for full setup and manual review steps.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. Start the backend on port 8080 and PostgreSQL
before viewing the feed. API requests are forwarded by the
proxy in `vite.config.ts`.

```bash
npm run build
```

This checks TypeScript and builds production assets into `dist/`.
