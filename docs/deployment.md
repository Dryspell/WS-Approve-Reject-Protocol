# Deployment Guide

This document covers deploying Nashfall to production. The recommended stack is:

- **Backend**: SpacetimeDB Cloud (managed; no self-hosting)
- **Frontend**: Vercel (or Netlify / Fly.io)
- **Assets**: Cloudflare R2 CDN (or Vercel/Netlify edge if staying under ~20MB)

For the CDN-only decision tree and asset optimization details, see [cdn-asset-strategy.md](./cdn-asset-strategy.md).

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Backend — SpacetimeDB Cloud](#backend--spacetimedb-cloud)
3. [Frontend — Vercel](#frontend--vercel)
4. [Asset CDN — Cloudflare R2](#asset-cdn--cloudflare-r2)
5. [Full Deployment Checklist](#full-deployment-checklist)
6. [Database Management](#database-management)
7. [Monitoring & Logs](#monitoring--logs)
8. [Alternative Deployments](#alternative-deployments)

---

## Environment Variables

Create a `.env.production` file (never commit it). Copy from `.env.example`:

```env
# SpacetimeDB connection
VITE_SPACETIME_HOST=wss://maincloud.spacetimedb.com
VITE_SPACETIME_MODULE_NAME=socket-signals

# Asset CDN (set to CDN origin; falls back to /assets if omitted)
VITE_ASSET_BASE_URL=https://assets.nashfall.com

# Optional: feature flags
VITE_ENABLE_BOTS=false          # disable bot runner UI in production
VITE_DEBUG_PANEL=false          # hide debug/admin panels for all users
```

**For local development**, `.env` (no suffix) or `.env.local` is used:

```env
VITE_SPACETIME_HOST=ws://localhost:3000
VITE_SPACETIME_MODULE_NAME=socket-signals
# VITE_ASSET_BASE_URL not set — falls back to /assets (local public/)
```

---

## Backend — SpacetimeDB Cloud

SpacetimeDB Cloud hosts and manages the Rust module. No server provisioning needed.

### 1. Authenticate

```bash
spacetime login
```

Follow the browser prompt to authenticate with your SpacetimeDB account.

### 2. Publish the module

```bash
cd server
spacetime publish \
  --project-path . \
  --server maincloud \
  socket-signals
```

- `socket-signals` is the module name (must match `VITE_SPACETIME_MODULE_NAME`)
- `--server maincloud` targets the SpacetimeDB production cloud (verify the exact server alias at [spacetimedb.com/docs](https://spacetimedb.com/docs))
- On first publish, the module is created; subsequent publishes update it in place

### 3. Regenerate TypeScript bindings after schema changes

Any time you change tables or reducers in `server/src/lib.rs`, regenerate bindings before rebuilding the frontend:

```bash
spacetime generate --lang typescript --out-dir src/module_bindings --project-path server
```

### 4. Verify the module is live

```bash
spacetime logs socket-signals --server maincloud
```

Should show the module initializing and accepting connections.

### Updating the Module

Publishing a new version replaces the running module. **Schema-breaking changes** (adding/removing/renaming table columns) require a database reset — all data is lost. Plan schema changes carefully for production.

```bash
# Re-publish after Rust changes
cd server && spacetime publish --project-path . --server maincloud socket-signals
```

---

## Frontend — Vercel

Vercel is the simplest deployment for SolidStart. Files in `public/` (including `/assets`) are served from Vercel's global edge CDN automatically — which may be sufficient until assets exceed ~20MB.

### 1. Install the Vercel CLI

```bash
npm i -g vercel
```

### 2. Link the project

```bash
vercel link
```

Select or create a Vercel project. Follow the prompts.

### 3. Set environment variables in Vercel

In the Vercel dashboard → Project Settings → Environment Variables, add:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SPACETIME_HOST` | `wss://maincloud.spacetimedb.com` | Production |
| `VITE_SPACETIME_MODULE_NAME` | `socket-signals` | Production |
| `VITE_ASSET_BASE_URL` | `https://assets.nashfall.com` | Production (set only when using external CDN) |

### 4. Deploy

```bash
vercel --prod
```

Or push to your linked Git branch — Vercel auto-deploys on push.

### SolidStart Configuration

Ensure `vite.config.ts` (or `app.config.ts`) targets the correct adapter:

```ts
import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    preset: "vercel",   // or "netlify", "node-server" for Fly.io
  },
});
```

---

## Asset CDN — Cloudflare R2

Use this when assets outgrow what you want bundled in the Vercel deployment (threshold: ~20MB). See [cdn-asset-strategy.md](./cdn-asset-strategy.md) for full provider comparison and optimization options.

### Quick Setup: Cloudflare R2

**Why R2**: No egress fees (unlike AWS S3), S3-compatible API, 300+ edge locations, generous free tier (10GB / 10M reads per month).

#### 1. Create an R2 bucket

In the Cloudflare dashboard: R2 → Create Bucket → name it `nashfall-assets`.

#### 2. Configure CORS on the bucket

R2 requires explicit CORS rules for Three.js cross-origin asset loading. In the bucket settings → CORS → Add rule:

```json
[
  {
    "AllowedOrigins": ["https://nashfall.com", "https://*.vercel.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "MaxAgeSeconds": 86400
  }
]
```

#### 3. Create an API token

R2 → Manage R2 API Tokens → Create API Token with **Object Read & Write** on the bucket.

#### 4. Upload assets

```bash
# Install rclone (https://rclone.org)
rclone sync public/assets/ r2:nashfall-assets/ \
  --header-upload "Cache-Control: public, max-age=31536000, immutable"
```

Configure `rclone` with your R2 credentials (`rclone config`).

#### 5. Bind a custom subdomain

Cloudflare dashboard → R2 bucket → Settings → Custom Domain → add `assets.nashfall.com`. This routes through Cloudflare's CDN automatically.

#### 6. Set the env variable

```env
VITE_ASSET_BASE_URL=https://assets.nashfall.com
```

No code changes required — the asset loader reads this env var.

#### 7. Verify

Visit `https://assets.nashfall.com/characters/Knight.glb` in a browser. Should download the file. Check browser DevTools → Network for the `Cache-Control: immutable` header.

---

## Full Deployment Checklist

Run through this before every production release:

### Backend

- [ ] `cargo check` passes locally in `server/`
- [ ] All table schema changes are intentional (breaking changes require data reset — document them)
- [ ] `spacetime publish --project-path server --server maincloud socket-signals` succeeds
- [ ] `spacetime logs socket-signals --server maincloud` shows no errors
- [ ] TypeScript bindings regenerated: `spacetime generate ...`

### Frontend

- [ ] `pnpm build` completes without errors
- [ ] `VITE_SPACETIME_HOST` set to production cloud URL in Vercel env
- [ ] `VITE_SPACETIME_MODULE_NAME` set to `socket-signals`
- [ ] `VITE_ASSET_BASE_URL` set if using external CDN
- [ ] `vercel --prod` deploys successfully
- [ ] Preview URL tested: connect to game, confirm SpacetimeDB connects (no "Syncing..." hang)

### Assets (if using R2)

- [ ] `rclone sync public/assets/ r2:nashfall-assets/` complete
- [ ] CORS headers verified (`curl -I https://assets.nashfall.com/characters/Knight.glb`)
- [ ] Asset loads in the game (open the 3D viewport, check network tab — assets from CDN domain)

### Security & UX

- [ ] Admin panel not visible to non-dev users (`isDev()` gate is in place)
- [ ] Debug panel hidden in production (`VITE_DEBUG_PANEL=false` or `isDev()` gate)
- [ ] Guest name prompt appears on `/vote` for new users
- [ ] HTTPS enforced on frontend domain
- [ ] No `.env` files committed to the repo

---

## Database Management

### Resetting the Database

SpacetimeDB Cloud does not provide a "delete all data" button. To reset:

```bash
# Delete and re-publish (destroys all data)
spacetime delete socket-signals --server maincloud
spacetime publish --project-path server --server maincloud socket-signals
```

**Warning**: This deletes all rooms, players, votes, transactions, and resources. Only do this in development or when intentionally wiping for a new season.

### Local Reset (Development)

```bash
spacetime delete socket-signals         # delete local module instance
pnpm publish:local                      # republish from scratch
```

Or the all-in-one reset:

```bash
spacetime server stop
spacetime server start
pnpm publish:local
```

### Schema Migrations

SpacetimeDB does not support in-place schema migrations between module versions. The options are:

1. **Additive-only changes** (add new tables/columns with defaults): Publish directly — existing data is preserved
2. **Breaking changes** (rename/remove columns, change types): Delete the module and re-publish — all data is lost
3. **Data migration**: Export data via custom reducer before the breaking publish, re-import after — requires custom tooling

For production, plan schema changes at the start of a season and communicate downtime to players.

---

## Monitoring & Logs

### SpacetimeDB Cloud Logs

```bash
# Tail module logs in real time
spacetime logs socket-signals --server maincloud --follow

# Show last 100 lines
spacetime logs socket-signals --server maincloud --num-lines 100
```

Look for:
- `REDUCER ERROR` lines — indicates a reducer panicked or returned an error
- High-frequency `process_round_votes` calls — normal at round end
- `out of memory` or `timeout` — performance issues in Rust logic

### Frontend Monitoring

Vercel provides basic analytics in the dashboard. For deeper monitoring consider:

- **Sentry** — capture client-side errors (especially SpacetimeDB connection failures, Three.js WebGL errors)
- **Vercel Analytics** — Web Vitals and page load performance
- **Cloudflare Analytics** — CDN cache hit rates for assets

### Health Check

A quick sanity check after any deployment:

1. Open the game in a private browser window (no cached state)
2. Confirm connection: the "Syncing..." badge should resolve within 3 seconds
3. Create a room, confirm the 3D viewport loads and assets appear
4. Run `pnpm bots` locally pointing at production (`VITE_SPACETIME_HOST=wss://maincloud.spacetimedb.com pnpm bots`) and confirm bots appear in the 3D world

---

## Alternative Deployments

### Fly.io (Self-Hosted Frontend)

The project includes `fly.toml`. Use this if you prefer a Docker-based frontend host:

```bash
fly auth login
fly launch        # first time
fly deploy        # subsequent deploys
```

Set secrets instead of `.env`:

```bash
fly secrets set VITE_SPACETIME_HOST=wss://maincloud.spacetimedb.com
fly secrets set VITE_SPACETIME_MODULE_NAME=socket-signals
```

### Self-Hosted SpacetimeDB (Not Recommended)

SpacetimeDB can be self-hosted via Docker. This is only recommended for internal/staging environments where you don't want to use cloud credits.

```bash
# Run SpacetimeDB in Docker
docker run \
  -p 3000:3000 \
  -v $(pwd)/stdb-data:/var/lib/spacetimedb \
  clockworklabs/spacetimedb:latest

# Publish module to local Docker instance
cd server
spacetime publish --project-path . --server http://localhost:3000 socket-signals
```

Update env:

```env
VITE_SPACETIME_HOST=ws://your-server-ip:3000
VITE_SPACETIME_MODULE_NAME=socket-signals
```

For self-hosted production with Nginx + SSL, follow the standard reverse proxy pattern — see [Nginx SSL setup](https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/) with Let's Encrypt.

---

## Cost Estimates (Monthly, Approximate)

| Service | Tier | Est. Cost |
|---------|------|-----------|
| SpacetimeDB Cloud | Free tier (testnet) / Paid TBD | $0 (testnet) |
| Vercel | Hobby / Pro | $0–$20 |
| Cloudflare R2 | Free tier (10GB, 10M reads) | $0 for early stage |
| Domain | Any registrar | ~$12/yr |
| **Total early-stage** | | **~$0–$20/mo** |

SpacetimeDB Cloud pricing beyond testnet is not yet published (as of Feb 2026). Monitor [spacetimedb.com/pricing](https://spacetimedb.com/pricing) as the project approaches launch.

---

**Last Updated**: February 26, 2026
