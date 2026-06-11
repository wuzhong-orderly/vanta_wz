# Points Reward System

Independent CSV-backed reward service for Vanta points campaign data.

## Apps

- `apps/api`: Public campaign, user points, and leaderboard API.
- `apps/admin-web`: Internal CSV data editor for campaign config, settled points, distribution rows, and leaderboard review.

## Packages

- `packages/shared`: Shared TypeScript types.

## Data Files

- `data/campaigns.json`: Campaign config registry and current campaign pointer.
- `data/campaign-<number>-distribution.csv`: One CSV per campaign distribution.
- `data/settled-points.csv`: Settled points, total points, special points, and remarks by address.

Campaign config schema:

```json
{
  "campaignNumber": 1,
  "campaignName": "Vanta Points Campaign 1",
  "description": "First Vanta points campaign",
  "totalVantaPoints": "1000000",
  "startTime": "2026-05-01T00:00:00.000Z",
  "endTime": "2026-05-31T23:59:59.000Z",
  "distributionCsv": "campaign-1-distribution.csv",
  "status": "ACTIVE",
  "orderlyBrokerId": "vanta_exchange",
  "orderlyStageId": "1",
  "orderlyEpochId": "1"
}
```

Campaign distribution CSV columns:

```csv
address,orderly_point,allocation_percentage,vanta_points,remark
```

Settled points CSV columns:

```csv
address,settled_points,total_points,special_points,remark
```

## API

```text
GET /api/campaign/current
GET /api/points/:address
GET /api/leaderboard/total

GET /admin/registry
PUT /admin/registry
GET /admin/settled-points
PUT /admin/settled-points
POST /admin/settled-points/rebuild-from-campaigns
GET /admin/campaigns/:campaignNumber/distribution
PUT /admin/campaigns/:campaignNumber/distribution
POST /admin/campaigns/:campaignNumber/allocation-preview
POST /admin/campaigns/:campaignNumber/import-orderly
POST /admin/campaigns/:campaignNumber/end
```

## End Campaign Settlement

The admin UI includes an **End Campaign** tab for turning Orderly points into Vanta points.

Flow:

1. Configure the campaign with `totalVantaPoints` and optional Orderly fields.
2. Import Orderly points, or use the existing campaign distribution CSV.
3. Generate an allocation preview.
4. Edit `allocation_percentage` per address if manual override is needed.
5. Click **End Campaign** to write the campaign distribution CSV, rebuild `settled-points.csv`, and mark the campaign as `SETTLED`.

Default allocation:

```text
allocation_percentage = user_orderly_point / total_orderly_point * 100
vanta_points = totalVantaPoints * allocation_percentage / 100
```

Special points are independent manual points stored in `settled-points.csv`; campaign distribution CSVs do not contain special points.

## Rebuild Settled Points

The admin UI can rebuild `settled-points.csv` from settled campaign distribution CSV files.

Rules:

- Settled campaigns are accumulated into `settled_points`.
- All non-draft campaigns are accumulated into `total_points`.
- Normal points come from `vanta_points`.
- Existing `special_points` and remarks in `settled-points.csv` are preserved by address.

## MVP Scope

1. Serve current campaign info.
2. Query points by user address.
3. Return total point leaderboard without pagination.

## Development

```sh
yarn install
yarn dev:api
yarn dev:admin
```
