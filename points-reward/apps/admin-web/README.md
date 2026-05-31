# points-reward admin-web deployment

## Vercel setup

Create a Vercel project and set these values:

- Root Directory: `points-reward/apps/admin-web`
- Framework Preset: `Vite`
- Install Command: `yarn install`
- Build Command: `yarn build`
- Output Directory: `dist`
- Node.js Version: `20.x`

## Environment variables

Set this variable in Vercel:

- `VITE_API_BASE_URL`: public base URL of your points API service

Example:

```env
VITE_API_BASE_URL=https://points-api.example.com
```

## Local development

Run from `points-reward` workspace root:

```bash
yarn dev:all
```

`apps/admin-web` will proxy `/api`, `/admin`, and `/v1` to local API (`http://localhost:4100`).
In production, those requests use `VITE_API_BASE_URL`.
