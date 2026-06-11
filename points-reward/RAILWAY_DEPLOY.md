# Railway deploy guide for points-reward API

## 1) Create service from this repo

- In Railway, create a new project from GitHub.
- Set service Root Directory to `points-reward`.
- Railway will detect `railway.json` and start command automatically.

## 2) Add persistent volume

- Add a volume and mount path: `/data`.
- This API reads and writes campaign files, so volume is required.

## 3) Set environment variables

- `PORT` is provided by Railway automatically.
- `HOST=0.0.0.0`
- `POINTS_DATA_DIR=/data`

Optional:

- `NODE_ENV=production`

## 4) Initialize data in mounted volume (first deploy only)

Open Railway shell for this service and run:

```bash
cp -R data/* /data/
ls -la /data
```

You should see files like:

- `campaigns.json`
- `settled-points.csv`
- `campaign-1-distribution.csv`

## 5) Verify API is up

After deploy, open:

- `/health`

Expected response:

```json
{"ok":true,"service":"points-reward-api"}
```

## 6) Wire admin-web to Railway API

In your admin-web deployment env var:

```env
VITE_API_BASE_URL=https://<your-railway-domain>
```

Then redeploy admin-web.
