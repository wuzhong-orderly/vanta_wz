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
  "totalVantaPoints": "1000000",
  "startTime": "2026-05-01T00:00:00.000Z",
  "endTime": "2026-05-31T23:59:59.000Z",
  "distributionCsv": "campaign-1-distribution.csv"
}
```

Campaign distribution CSV columns:

```csv
address,pnl,volume,orderly_point,vanta_points,special_points,remark
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
```

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
