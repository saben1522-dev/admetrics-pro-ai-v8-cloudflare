# AdMetrics Pro AI V8 — Cloudflare Free Edition

This is a separate deployment package for the existing V8 project. It does not modify the original V8 source package.

## Architecture
- Cloudflare Pages for the HTML UI
- Pages Functions for `/api/*`
- Cloudflare D1 for users, sessions, workspace state and audit log
- No Node server, no Render, no persistent local filesystem
- Gemini is intentionally not configured in this free edition

## Demo accounts
- owner / owner
- admin / admin
- marketer / marketer
- creator / creator
- viewer / viewer

Change these credentials before treating the deployment as production.

## Deploy from GitHub
1. Create a separate GitHub repo, for example `admetrics-pro-ai-v8-cloudflare`.
2. Upload the contents of this folder to the repository root.
3. In Cloudflare Dashboard open **Workers & Pages** and create a **Pages** project from the GitHub repository.
4. Production branch: `main`.
5. Build command: `npm run build`.
6. Build output directory: `.`.
7. Deploy.
8. In the Pages project go to **Settings → Bindings → Add → D1 database**. Use variable name `DB` and select your D1 database.
9. Create the D1 database from **Workers & Pages → D1**. If using Wrangler locally, `npx wrangler d1 create admetrics-v8` is also supported.
10. Apply `migrations/0001_init.sql` to that D1 database, then redeploy the Pages project.

Cloudflare's current documentation says Workers Free is available by default; Pages Functions use the Workers Free quota, and D1 has a Free plan intended for prototyping. Free limits apply.

## Important
The original V8 package uses a local JSON file. This edition replaces that local persistence with D1 so the app can run on Cloudflare's serverless runtime. The original V8 package remains unchanged.
