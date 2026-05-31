# Points Reward System

Independent CSV-backed reward service for Vanta points campaign data.

## Apps

- `apps/api`: Public campaign, user points, and leaderboard API.
- `apps/admin-web`: Internal CSV data editor for campaign config, current points, distribution rows, and leaderboard review.

## Packages

- `packages/shared`: Shared TypeScript types.

## Data Files

- `data/campaigns.json`: Campaign config registry and current campaign pointer.
- `data/campaign-<number>-distribution.csv`: One CSV per campaign distribution.
- `data/current-points.csv`: Current accumulated points by address.

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
address,orderly_point,allocation_percentage,vanta_points,special_points,remark
```

Current points CSV columns:

```csv
address,total_accumulated_point_in_past_campaign,total_accumulated_point_in_current_campaign,total_accumulated_special_point_in_past_campaign,total_accumulated_special_point_in_current_campaign,remark
```

## API

```text
GET /api/campaign/current
GET /api/points/:address
GET /api/leaderboard/total

GET /admin/registry
PUT /admin/registry
GET /admin/current-points
PUT /admin/current-points
POST /admin/current-points/rebuild-from-campaigns
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
5. Click **End Campaign** to write the campaign distribution CSV, rebuild `current-points.csv`, and mark the campaign as `SETTLED`.

Default allocation:

```text
allocation_percentage = user_orderly_point / total_orderly_point * 100
vanta_points = totalVantaPoints * allocation_percentage / 100
```

`special_points` are independent manual points and are not part of the Vanta pool allocation.

## Rebuild Current Points

The admin UI can rebuild `current-points.csv` from campaign distribution CSV files.

Rules:

- Campaigns with `campaignNumber < currentCampaignNumber` are accumulated into past campaign point columns.
- Campaigns with `campaignNumber === currentCampaignNumber` are accumulated into current campaign point columns.
- Campaigns with `campaignNumber > currentCampaignNumber` are ignored.
- Normal points come from `vanta_points`.
- Special points come from `special_points`.
- Existing remarks in `current-points.csv` are preserved by address.

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
