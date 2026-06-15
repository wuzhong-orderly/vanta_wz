# Deployment Guide (2 Vercel Frontends + 1 Railway Backend)

This project is deployed as 3 services:

1. Main DEX frontend on Vercel
2. Points Admin frontend on Vercel
3. Points API backend on Railway

## Architecture

- Main frontend source: ./
- Admin frontend source: ./points-reward/apps/admin-web
- Backend source: ./points-reward/apps/api (started from ./points-reward workspace)

Recommended production URLs:

- Main frontend: https://your-main-frontend.vercel.app
- Admin frontend: https://your-admin-frontend.vercel.app
- API backend: https://your-points-api.up.railway.app

## 1) Deploy Main DEX Frontend (Vercel)

Vercel project settings:

- Root Directory: .
- Install Command: yarn install
- Build Command: yarn build
- Output Directory: build/client

Runtime config is loaded from public/config.js at request time.

Important env-like values live in public/config.js, including:

- VITE_ORDERLY_BROKER_ID
- VITE_ORDERLY_BROKER_NAME
- VITE_POINTS_API_BASE_URL

Set VITE_POINTS_API_BASE_URL in public/config.js to your Railway API domain, for example:

  "VITE_POINTS_API_BASE_URL": "https://your-points-api.up.railway.app"

This makes points requests resolve to:

- /points-api/... -> https://your-points-api.up.railway.app/api/...

Optional: if you want same-origin direct access to /points-api on the main domain, add a Vercel rewrite in ./vercel.json for /points-api/(.*) before SPA fallback.

## 2) Deploy Points Admin Frontend (Vercel)

Vercel project settings:

- Root Directory: points-reward/apps/admin-web
- Install Command: yarn install
- Build Command: yarn build
- Output Directory: build/client

Set Vercel Environment Variable for this project:

- VITE_API_BASE_URL = https://your-points-api.up.railway.app

Notes:

- Admin frontend sends Bearer token for /admin/* requests.
- The token is entered in the Admin UI and stored in browser localStorage.
- You do not need to expose POINTS_ADMIN_TOKEN to Vercel frontend env.

## 3) Deploy Points API Backend (Railway)

Railway project/service settings:

- Root Directory: points-reward
- railway.json is already present and uses start command: yarn start:api

Add a persistent volume:

- Mount path: /data

Set Railway variables:

- HOST = 0.0.0.0
- POINTS_DATA_DIR = /data
- POINTS_ADMIN_TOKEN = your-strong-secret-token
- NODE_ENV = production (optional)

PORT is provided by Railway automatically.

### First-time data initialization on Railway

Open Railway shell and run:

  cp -R data/* /data/
  ls -la /data

Expected files include:

- campaigns.json
- settled-points.csv
- campaign-1-distribution.csv
- invite-codes.csv
- invite-bindings.csv

## POINTS_ADMIN_TOKEN: how to generate and configure

Generate a strong token locally, then paste it into Railway variable POINTS_ADMIN_TOKEN.

Example generation commands:

- macOS/Linux (openssl):
  openssl rand -base64 48

- Node.js:
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

How it is used:

- Backend checks Authorization header for /admin/* routes.
- Required format:
  Authorization: Bearer <POINTS_ADMIN_TOKEN>

How to use in Admin Web:

1. Open Admin frontend.
2. Paste token into Admin token input.
3. Click validate/check.
4. Token is stored in browser localStorage key: pointsRewardAdminToken.

If token rotates on Railway, clear and re-enter it in Admin UI.

## Verification checklist

Backend:

- GET https://your-points-api.up.railway.app/health returns ok
- GET https://your-points-api.up.railway.app/api/campaign/current returns JSON

Main frontend:

- Main app loads and trading pages render
- Invite and points requests succeed (no HTML fallback for API calls)

Admin frontend:

- Can load registry after token is set
- /admin endpoints return 200 with valid token
- /admin endpoints return 401 with invalid token

## Common issues

1. API returns HTML instead of JSON
- Cause: SPA fallback rewrite catches API path.
- Fix: use VITE_POINTS_API_BASE_URL or add explicit /points-api rewrite before fallback.

2. Admin says token invalid
- Cause: Railway POINTS_ADMIN_TOKEN mismatch.
- Fix: confirm Railway var, redeploy, re-enter token in Admin UI.

3. Data changes disappear after restart
- Cause: volume not mounted or POINTS_DATA_DIR not set to /data.
- Fix: mount volume and set POINTS_DATA_DIR=/data.
