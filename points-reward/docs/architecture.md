# CSV-backed Points Reward Service Architecture

## System Shape

```text
campaigns.json
campaign distribution CSVs
current-points.csv
        |
        v
Points Reward API
        |
        +----> User-facing frontend / widget
        |
        v
Admin CSV Editor
```

## Core Rule

There is no database in the initial version. Campaign metadata and user points are served from files.

## Data Files

- `data/campaigns.json`: Current campaign pointer and campaign config list.
- `data/campaign-<number>-distribution.csv`: One file per campaign distribution.
- `data/current-points.csv`: Current accumulated user points by address.

## Campaign Config

Each campaign defines:

- `campaignNumber`
- `campaignName`
- `description`
- `totalVantaPoints`
- `startTime`
- `endTime`
- `distributionCsv`
- `orderlyBrokerId`
- `orderlyStageId`
- `orderlyEpochId`

## APIs

- `GET /api/campaign/current`: Serve current campaign info.
- `GET /api/points/:address`: Return past/current normal points and special points for an address.
- `GET /api/leaderboard/total`: Return total point leaderboard without pagination.

## Admin APIs

- `GET /admin/registry`
- `PUT /admin/registry`
- `GET /admin/current-points`
- `PUT /admin/current-points`
- `POST /admin/current-points/rebuild-from-campaigns`
- `GET /admin/campaigns/:campaignNumber/distribution`
- `PUT /admin/campaigns/:campaignNumber/distribution`
- `POST /admin/campaigns/:campaignNumber/allocation-preview`
- `POST /admin/campaigns/:campaignNumber/import-orderly`
- `POST /admin/campaigns/:campaignNumber/end`

## End Campaign Settlement

Settlement imports or previews Orderly points, calculates `allocation_percentage`, derives `vanta_points` from the campaign total pool, then writes the campaign distribution CSV and rebuilds `current-points.csv`.

Manual percentage overrides are allowed. `special_points` remain separate from the Vanta pool.

## Current Points Rebuild

The rebuild flow reads every configured campaign distribution CSV up to the current campaign.

- Past totals use campaigns where `campaignNumber < currentCampaignNumber`.
- Current totals use the campaign where `campaignNumber === currentCampaignNumber`.
- Future campaign CSVs are ignored.
- `vanta_points` is accumulated into normal points.
- `special_points` is accumulated into special points.
- Existing current-points remarks are preserved when the address already exists.
