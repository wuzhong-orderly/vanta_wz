import { Download, Flag, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Metric } from "../components/Metric";
import type { AllocationPreview, CampaignDistributionRow, CampaignRegistry } from "../types";
import { formatNumber, numberValue } from "../utils";

export function SettlementPage({
  registry,
  selectedCampaignNumber,
  rows,
  preview,
  onCampaignChange,
  onRowsChange,
  onPreview,
  onImportOrderly,
  onEndCampaign
}: {
  registry: CampaignRegistry;
  selectedCampaignNumber: number | null;
  rows: CampaignDistributionRow[];
  preview: AllocationPreview | null;
  onCampaignChange: (campaignNumber: number) => void;
  onRowsChange: (rows: CampaignDistributionRow[]) => void;
  onPreview: () => void;
  onImportOrderly: (options: {
    mode: "leaderboard" | "rankings";
    brokerId?: string;
    stage?: string;
    period?: string;
    epochId?: string;
  }) => void;
  onEndCampaign: () => void;
}) {
  const campaign = registry.campaigns.find(
    (item) => item.campaignNumber === selectedCampaignNumber
  );
  const [mode, setMode] = useState<"leaderboard" | "rankings">("leaderboard");
  const [brokerId, setBrokerId] = useState(campaign?.orderlyBrokerId ?? "");
  const [stage, setStage] = useState(campaign?.orderlyStageId ?? "");
  const [period, setPeriod] = useState("weekly");
  const [epochId, setEpochId] = useState(campaign?.orderlyEpochId ?? "");

  useEffect(() => {
    setBrokerId(campaign?.orderlyBrokerId ?? "");
    setStage(campaign?.orderlyStageId ?? "");
    setPeriod("weekly");
    setEpochId(campaign?.orderlyEpochId ?? "");
  }, [campaign?.campaignNumber]);

  const totalPool = numberValue(campaign?.totalVantaPoints ?? "0");
  const totalPercentage = rows.reduce(
    (sum, row) => sum + numberValue(row.allocationPercentage),
    0
  );

  function patchRow(index: number, patch: Partial<CampaignDistributionRow>) {
    onRowsChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function recalculateRow(index: number, allocationPercentage: string) {
    const percentage = numberValue(allocationPercentage);
    patchRow(index, {
      allocationPercentage,
      vantaPoints: String((totalPool * percentage) / 100)
    });
  }

  return (
    <div className="panel">
      <div className="panel-actions">
        <div className="panel-title">
          <Flag size={18} />
          <span>End Campaign</span>
          <strong>{campaign?.status ?? "ACTIVE"}</strong>
        </div>
        <select
          value={selectedCampaignNumber ?? ""}
          onChange={(event) => onCampaignChange(Number(event.target.value))}
        >
          {registry.campaigns.map((item) => (
            <option key={item.campaignNumber} value={item.campaignNumber}>
              #{item.campaignNumber} {item.campaignName}
            </option>
          ))}
        </select>
        <button className="secondary-button" onClick={onPreview}>
          <RefreshCw size={17} />
          Preview
        </button>
        <button className="primary-button" onClick={onEndCampaign}>
          <Flag size={17} />
          End Campaign
        </button>
      </div>

      <div className="settlement-layout">
        <div className="settlement-card">
          <h2>Orderly import</h2>
          <div className="form-grid compact">
            <label>
              Mode
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as "leaderboard" | "rankings")}
              >
                <option value="leaderboard">Merits leaderboard</option>
                <option value="rankings">Stage rankings</option>
              </select>
            </label>
            <label>
              Orderly broker ID
              <input value={brokerId} onChange={(event) => setBrokerId(event.target.value)} />
            </label>
            <label>
              Orderly stage number
              <input value={stage} onChange={(event) => setStage(event.target.value)} />
            </label>
            <label>
              Period
              <input value={period} onChange={(event) => setPeriod(event.target.value)} />
            </label>
            <label>
              Orderly stage epoch
              <input value={epochId} onChange={(event) => setEpochId(event.target.value)} />
            </label>
            <button
              className="secondary-button"
              onClick={() => onImportOrderly({ mode, brokerId, stage, period, epochId })}
            >
              <Download size={17} />
              Import Orderly
            </button>
          </div>
        </div>

        <div className="settlement-card">
          <h2>Allocation summary</h2>
          <div className="settlement-metrics">
            <Metric label="Users" value={String(preview?.stats.userCount ?? rows.length)} />
            <Metric
              label="Orderly Points"
              value={formatNumber(numberValue(preview?.stats.totalOrderlyPoints ?? "0"))}
            />
            <Metric
              label="Allocation %"
              value={formatNumber(numberValue(preview?.stats.totalAllocationPercentage ?? String(totalPercentage)))}
            />
            <Metric
              label="Vanta Points"
              value={formatNumber(numberValue(preview?.stats.totalVantaPoints ?? "0"))}
            />
          </div>
          {preview?.warnings.length ? (
            <div className="warning-list">
              {preview.warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Address</th>
              <th>Orderly Point</th>
              <th>Allocation %</th>
              <th>Vanta Points</th>
              <th>Special Points</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.address}-${index}`}>
                <td><input value={row.address} onChange={(event) => patchRow(index, { address: event.target.value })} /></td>
                <td><input value={row.orderlyPoints} onChange={(event) => patchRow(index, { orderlyPoints: event.target.value })} /></td>
                <td><input value={row.allocationPercentage} onChange={(event) => recalculateRow(index, event.target.value)} /></td>
                <td><input value={row.vantaPoints} onChange={(event) => patchRow(index, { vantaPoints: event.target.value })} /></td>
                <td><input value={row.specialPoints} onChange={(event) => patchRow(index, { specialPoints: event.target.value })} /></td>
                <td><input value={row.remark} onChange={(event) => patchRow(index, { remark: event.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
