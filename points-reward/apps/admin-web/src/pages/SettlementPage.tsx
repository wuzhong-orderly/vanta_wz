import { Download, Flag, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Pagination, defaultPageSize, paginateRows } from "../components/Pagination";
import { calculateVantaPoints, trimDecimal } from "../points";
import type {
  CampaignConfig,
  CampaignDistributionRow,
  CampaignRegistry,
  OrderlyEpoch,
  OrderlyStage
} from "../types";
import { numberValue } from "../utils";

const campaignStatuses: Array<NonNullable<CampaignConfig["status"]>> = [
  "DRAFT",
  "ACTIVE",
  "ENDED",
  "SETTLED"
];

type OrderlyMode = "stage-ranking" | "epoch-ranking";
type CampaignDataSortKey = keyof CampaignDistributionRow;
type SortDirection = "asc" | "desc";
type LoadingAction =
  | "load-all"
  | "load-distribution"
  | "save-campaigns"
  | "save-distribution"
  | "rebuild-current"
  | "import-csv"
  | "pull-orderly"
  | "end-campaign";

const campaignDataColumns: Array<{ key: CampaignDataSortKey; label: string; numeric?: boolean }> = [
  { key: "address", label: "Address" },
  { key: "orderlyPoints", label: "Orderly Point", numeric: true },
  { key: "allocationPercentage", label: "Allocation %", numeric: true },
  { key: "vantaPoints", label: "Vanta Points", numeric: true },
  { key: "specialPoints", label: "Special Points", numeric: true },
  { key: "remark", label: "Remark" }
];

export function SettlementPage({
  registry,
  selectedCampaignNumber,
  rows,
  onCampaignChange,
  onCampaignPatch,
  onCampaignSave,
  onCampaignStatusChange,
  onRowsChange,
  onRefreshData,
  onSaveData,
  onLoadStages,
  onPullOrderly,
  onEndCampaign,
  loadingAction
}: {
  registry: CampaignRegistry;
  selectedCampaignNumber: number | null;
  rows: CampaignDistributionRow[];
  onCampaignChange: (campaignNumber: number) => void;
  onCampaignPatch: (patch: Partial<CampaignConfig>) => void;
  onCampaignSave: () => void;
  onCampaignStatusChange: (status: NonNullable<CampaignConfig["status"]>) => void;
  onRowsChange: (rows: CampaignDistributionRow[]) => void;
  onRefreshData: () => void;
  onSaveData: () => void;
  onLoadStages: (brokerId: string) => Promise<{ rows: OrderlyStage[] }>;
  onPullOrderly: (options: {
    mode: OrderlyMode;
    brokerId?: string;
    stage?: string;
    epochId?: string;
  }) => Promise<CampaignDistributionRow[]>;
  onEndCampaign: () => void;
  loadingAction?: LoadingAction | null;
}) {
  const campaign = registry.campaigns.find(
    (item) => item.campaignNumber === selectedCampaignNumber
  );
  const [mode, setMode] = useState<OrderlyMode>("stage-ranking");
  const [brokerId, setBrokerId] = useState(campaign?.orderlyBrokerId ?? "");
  const [stage, setStage] = useState(campaign?.orderlyStageId ?? "");
  const [epochId, setEpochId] = useState(campaign?.orderlyEpochId ?? "");
  const [stages, setStages] = useState<OrderlyStage[]>([]);
  const [epochs, setEpochs] = useState<OrderlyEpoch[]>([]);
  const [metadataMessage, setMetadataMessage] = useState("");
  const [orderlyRows, setOrderlyRows] = useState<CampaignDistributionRow[]>([]);
  const [keepCurrentAllocation, setKeepCurrentAllocation] = useState(false);
  const [orderlyQuery, setOrderlyQuery] = useState("");
  const [orderlyPage, setOrderlyPage] = useState(1);
  const [campaignDataQuery, setCampaignDataQuery] = useState("");
  const [campaignDataPage, setCampaignDataPage] = useState(1);
  const [campaignDataSort, setCampaignDataSort] = useState<{
    direction: SortDirection;
    key: CampaignDataSortKey;
  }>({ direction: "desc", key: "orderlyPoints" });

  useEffect(() => {
    setBrokerId(campaign?.orderlyBrokerId ?? "");
    setStage(campaign?.orderlyStageId ?? "");
    setEpochId(campaign?.orderlyEpochId ?? "");
    setStages([]);
    setEpochs([]);
    setMetadataMessage("");
    setOrderlyRows([]);
    setKeepCurrentAllocation(false);
    setOrderlyQuery("");
    setOrderlyPage(1);
    setCampaignDataQuery("");
    setCampaignDataPage(1);
  }, [campaign?.campaignNumber]);

  const campaignStatus = campaign?.status ?? "ACTIVE";
  const canPullOrderly =
    mode === "stage-ranking"
      ? Boolean(stage.trim())
      : Boolean(stage.trim()) && Boolean(epochId.trim());
  const isLoadingDistribution = loadingAction === "load-distribution";
  const isSavingCampaign = loadingAction === "save-campaigns";
  const isSavingDistribution = loadingAction === "save-distribution";
  const isPullingOrderly = loadingAction === "pull-orderly";

  const orderlyPointTotal = useMemo(
    () =>
      orderlyRows.reduce((sum, row) => {
        const value = Number(row.orderlyPoints || 0);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0),
    [orderlyRows]
  );
  const selectedStage = stages.find((item) => item.id === stage);
  const selectedEpoch = epochs.find((item) => item.id === epochId);
  const filteredOrderlyRows = useMemo(
    () => filterByAddress(orderlyRows, orderlyQuery),
    [orderlyQuery, orderlyRows]
  );
  const pageOrderlyRows = paginateRows(filteredOrderlyRows, orderlyPage, defaultPageSize);
  const filteredCampaignDataRows = useMemo(
    () => filterByAddress(rows, campaignDataQuery),
    [campaignDataQuery, rows]
  );
  const pageCampaignDataRows = paginateRows(
    filteredCampaignDataRows,
    campaignDataPage,
    defaultPageSize
  );

  useEffect(() => {
    setOrderlyPage(1);
  }, [orderlyQuery, orderlyRows.length]);

  useEffect(() => {
    setCampaignDataPage(1);
  }, [campaignDataQuery, rows.length]);

  async function loadStages() {
    if (!brokerId.trim()) {
      setMetadataMessage("Enter broker ID first.");
      return;
    }

    try {
      setMetadataMessage("Loading stages...");
      const response = await onLoadStages(brokerId);
      setStages(response.rows);
      setMetadataMessage(`Loaded ${response.rows.length} stages.`);

      if (!stage && response.rows[0]?.id) {
        setStage(response.rows[0].id);
        setEpochs(response.rows[0].epochs);
        onCampaignPatch({ orderlyBrokerId: brokerId, orderlyStageId: response.rows[0].id });

        if (!epochId && response.rows[0].epochs[0]?.id) {
          setEpochId(response.rows[0].epochs[0].id);
          onCampaignPatch({ orderlyEpochId: response.rows[0].epochs[0].id });
        }
      }
    } catch (error) {
      setMetadataMessage(error instanceof Error ? error.message : "Failed to load stages.");
    }
  }

  async function pullOrderlyRows() {
    const pulledRows = await onPullOrderly({
      mode,
      brokerId,
      stage,
      epochId: mode === "epoch-ranking" ? epochId : undefined
    });
    setOrderlyRows(pulledRows);
  }

  function mergeOrderlyData() {
    const orderlyPointsByAddress = new Map<string, string>();

    for (const row of orderlyRows) {
      const addressKey = row.address.trim().toLowerCase();

      if (addressKey) {
        orderlyPointsByAddress.set(addressKey, row.orderlyPoints || "0");
      }
    }

    const localAddresses = new Set<string>();
    const resetRows = rows.map((row) => ({
      ...row,
      orderlyPoints: "0",
      allocationPercentage: "0",
      vantaPoints: "0"
    }));
    const mergedRows = resetRows.map((row) => {
      const addressKey = row.address.trim().toLowerCase();
      localAddresses.add(addressKey);
      const orderlyPoints = orderlyPointsByAddress.get(addressKey);

      if (orderlyPoints === undefined) {
        return row;
      }

      return {
        ...row,
        orderlyPoints
      };
    });

    for (const orderlyRow of orderlyRows) {
      const addressKey = orderlyRow.address.trim().toLowerCase();

      if (!addressKey || localAddresses.has(addressKey)) {
        continue;
      }

      const newRow: CampaignDistributionRow = {
        address: orderlyRow.address,
        orderlyPoints: orderlyRow.orderlyPoints,
        allocationPercentage: "",
        vantaPoints: "",
        specialPoints: "",
        remark: ""
      };

      localAddresses.add(addressKey);
      mergedRows.push(newRow);
    }

    onRowsChange(
      keepCurrentAllocation
        ? mergedRows
        : recalculateAllocation(mergedRows, campaign?.totalVantaPoints)
    );
  }

  function patchCampaignDataRow(index: number, patch: Partial<CampaignDistributionRow>) {
    onRowsChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function patchCampaignDataAllocation(index: number, allocationPercentage: string) {
    patchCampaignDataRow(index, {
      allocationPercentage,
      vantaPoints: calculateVantaPoints(campaign?.totalVantaPoints, allocationPercentage)
    });
  }

  function addCampaignDataRow() {
    onRowsChange([
      ...rows,
      {
        address: "",
        orderlyPoints: "0",
        allocationPercentage: "0",
        vantaPoints: "0",
        specialPoints: "",
        remark: ""
      }
    ]);
  }

  function deleteCampaignDataRow(index: number) {
    onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  function sortCampaignData(key: CampaignDataSortKey) {
    const column = campaignDataColumns.find((item) => item.key === key);
    const direction =
      campaignDataSort.key === key && campaignDataSort.direction === "desc" ? "asc" : "desc";
    const sortedRows = [...rows].sort((left, right) => {
      const result = column?.numeric
        ? numberValue(left[key]) - numberValue(right[key])
        : left[key].localeCompare(right[key], undefined, { sensitivity: "base" });

      return direction === "asc" ? result : -result;
    });

    setCampaignDataSort({ direction, key });
    onRowsChange(sortedRows);
  }

  return (
    <div className="panel point-management-page">
      <div className="panel-actions">
        <div className="panel-title">
          <Flag size={18} />
          <span>Point Management</span>
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
      </div>

      <div className="campaign-status-strip">
        <span className={`status-chip status-${campaignStatus.toLowerCase()}`}>
          {campaignStatus}
        </span>
        <div className="status-button-group">
          {campaignStatuses.map((status) => (
            <button
              className={`status-action status-${status.toLowerCase()} ${
                campaignStatus === status ? "active" : ""
              }`}
              key={status}
              onClick={() => onCampaignStatusChange(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="settlement-card campaign-info-card">
        <h2>Campaign information</h2>
        <div className="form-grid campaign-info-grid">
          <label>
            Name
            <input
              value={campaign?.campaignName ?? ""}
              onChange={(event) => onCampaignPatch({ campaignName: event.target.value })}
            />
          </label>
          <label>
            Total Vanta points
            <input
              value={campaign?.totalVantaPoints ?? ""}
              onChange={(event) => onCampaignPatch({ totalVantaPoints: event.target.value })}
            />
          </label>
          <label>
            Start time
            <input
              value={campaign?.startTime ?? ""}
              onChange={(event) => onCampaignPatch({ startTime: event.target.value })}
            />
          </label>
          <label>
            End time
            <input
              value={campaign?.endTime ?? ""}
              onChange={(event) => onCampaignPatch({ endTime: event.target.value })}
            />
          </label>
          <label className="span-2">
            Description
            <input
              value={campaign?.description ?? ""}
              onChange={(event) => onCampaignPatch({ description: event.target.value })}
            />
          </label>
          <label>
            Distribution CSV
            <input
              value={campaign?.distributionCsv ?? ""}
              onChange={(event) => onCampaignPatch({ distributionCsv: event.target.value })}
            />
          </label>
          <button
            className="secondary-button align-end"
            disabled={isSavingCampaign}
            onClick={onCampaignSave}
          >
            {isSavingCampaign ? <span className="spinner button-spinner" aria-hidden="true" /> : <Save size={17} />}
            {isSavingCampaign ? "Saving" : "Save campaign"}
          </button>
        </div>
      </div>

      <div className="point-management-layout">
        <div className="settlement-card">
          <h2>Orderly data input</h2>
          <div className="orderly-input-stack">
            <label>
              Input broker ID
              <input
                value={brokerId}
                onChange={(event) => {
                  setBrokerId(event.target.value);
                  setStages([]);
                  setEpochs([]);
                }}
              />
            </label>
            <button
              className="secondary-button"
              disabled={!brokerId.trim()}
              onClick={() => void loadStages()}
            >
              Load Orderly campaign data
            </button>

            <div className="form-grid compact">
              <label>
                Stage selection
                <select
                  value={stage}
                  onChange={(event) => {
                    const nextStage = event.target.value;
                    const nextStageDetails = stages.find((item) => item.id === nextStage);
                    const nextEpochs = nextStageDetails?.epochs ?? [];
                    setStage(nextStage);
                    setEpochs(nextEpochs);
                    setEpochId("");
                    onCampaignPatch({ orderlyBrokerId: brokerId, orderlyStageId: nextStage });

                    if (nextEpochs[0]?.id) {
                      setEpochId(nextEpochs[0].id);
                      onCampaignPatch({ orderlyEpochId: nextEpochs[0].id });
                    }
                  }}
                >
                  <option value="">Select stage</option>
                  {stages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mode selection
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as OrderlyMode)}
                >
                  <option value="stage-ranking">Stage ranking</option>
                  <option value="epoch-ranking">Epoch ranking</option>
                </select>
              </label>
            </div>

            {mode === "epoch-ranking" ? (
              <label>
                Epoch selection
                <select
                  value={epochId}
                  onChange={(event) => {
                    setEpochId(event.target.value);
                    onCampaignPatch({ orderlyEpochId: event.target.value });
                  }}
                >
                  <option value="">Select epoch</option>
                  {epochs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="orderly-meta-grid">
              <OrderlyInfo
                title="Selected stage"
                item={selectedStage}
                emptyText="No stage selected"
              />
              <OrderlyInfo
                title="Selected epoch"
                item={selectedEpoch}
                emptyText="No epoch selected"
              />
            </div>
            {metadataMessage ? <div className="inline-message">{metadataMessage}</div> : null}
            <button
              className="secondary-button"
              disabled={!canPullOrderly || isPullingOrderly}
              onClick={() => void pullOrderlyRows()}
            >
              {isPullingOrderly ? <span className="spinner button-spinner" aria-hidden="true" /> : <Download size={17} />}
              {isPullingOrderly ? "Pulling" : "Pull data from Orderly"}
            </button>
          </div>
        </div>

        <div className="settlement-card orderly-data-card">
          <div className="table-card-header">
            <h2>Orderly data</h2>
            <div className="table-header-actions">
              <span>
                {filteredOrderlyRows.length} rows / {orderlyPointTotal} points
              </span>
              <div className="search table-search">
                <Search size={17} />
                <input
                  value={orderlyQuery}
                  onChange={(event) => setOrderlyQuery(event.target.value)}
                  placeholder="Search address"
                />
              </div>
            </div>
          </div>
          <div className="table-wrap embedded-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Orderly Point</th>
                </tr>
              </thead>
              <tbody>
                {pageOrderlyRows.map((row, index) => (
                  <tr key={`${row.address}-${index}`}>
                    <td>
                      <input value={row.address} readOnly />
                    </td>
                    <td>
                      <input value={row.orderlyPoints} readOnly />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="primary-button"
            disabled={orderlyRows.length === 0}
            onClick={mergeOrderlyData}
          >
            Merge Orderly data
          </button>
          <div className="table-footer-row">
            <label className="checkbox-label">
              <input
                checked={keepCurrentAllocation}
                type="checkbox"
                onChange={(event) => setKeepCurrentAllocation(event.target.checked)}
              />
              Keep current allocation
            </label>
            <Pagination
              page={orderlyPage}
              total={filteredOrderlyRows.length}
              onPageChange={setOrderlyPage}
            />
          </div>
        </div>
      </div>

      <div className="settlement-card campaign-data-card">
        <div className="table-card-header">
          <h2>Campaign data</h2>
          <div className="table-header-actions">
            <span>{filteredCampaignDataRows.length} rows</span>
            <div className="search table-search">
              <Search size={17} />
              <input
                value={campaignDataQuery}
                onChange={(event) => setCampaignDataQuery(event.target.value)}
                placeholder="Search address"
              />
            </div>
            <button className="icon-button" onClick={addCampaignDataRow} title="Add campaign row">
              <Plus size={16} />
            </button>
            <button
              className="icon-button"
              disabled={isLoadingDistribution}
              onClick={onRefreshData}
              title="Refresh campaign data"
            >
              <RefreshCw className={isLoadingDistribution ? "spin-icon" : ""} size={16} />
            </button>
          </div>
        </div>
        <div className="table-wrap embedded-table-wrap loading-container">
          {isLoadingDistribution ? (
            <div className="table-loading-overlay">
              <span className="spinner" aria-hidden="true" />
              <span>Loading campaign CSV</span>
            </div>
          ) : null}
          <table>
            <thead>
              <tr>
                {campaignDataColumns.map((column) => (
                  <th key={column.key}>
                    <button
                      className="table-sort-button"
                      onClick={() => sortCampaignData(column.key)}
                    >
                      {column.label}
                      <span>
                        {campaignDataSort.key === column.key
                          ? campaignDataSort.direction === "asc"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    </button>
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageCampaignDataRows.map((row, index) => {
                const rowIndex = rows.indexOf(row);

                return (
                <tr key={`${row.address}-${index}`}>
                  <td>
                    <input
                      value={row.address}
                      onChange={(event) =>
                        patchCampaignDataRow(rowIndex, { address: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.orderlyPoints}
                      onChange={(event) =>
                        patchCampaignDataRow(rowIndex, { orderlyPoints: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.allocationPercentage}
                      onChange={(event) =>
                        patchCampaignDataAllocation(rowIndex, event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.vantaPoints}
                      onChange={(event) =>
                        patchCampaignDataRow(rowIndex, { vantaPoints: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.specialPoints}
                      onChange={(event) =>
                        patchCampaignDataRow(rowIndex, { specialPoints: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.remark}
                      onChange={(event) =>
                        patchCampaignDataRow(rowIndex, { remark: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="icon-button danger"
                      onClick={() => deleteCampaignDataRow(rowIndex)}
                      title="Delete row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        <button
          className="primary-button save-data-button"
          disabled={isSavingDistribution}
          onClick={onSaveData}
        >
          {isSavingDistribution ? <span className="spinner button-spinner" aria-hidden="true" /> : <Save size={17} />}
          {isSavingDistribution ? "Saving" : "Save data"}
        </button>
        <Pagination
          page={campaignDataPage}
          total={filteredCampaignDataRows.length}
          onPageChange={setCampaignDataPage}
        />
      </div>
    </div>
  );
}

function filterByAddress(rows: CampaignDistributionRow[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) => row.address.toLowerCase().includes(normalizedQuery));
}

function recalculateAllocation(rows: CampaignDistributionRow[], totalVantaPoints?: string) {
  const totalOrderlyPoints = rows.reduce(
    (sum, row) => sum + numberValue(row.orderlyPoints),
    0
  );
  const pool = numberValue(totalVantaPoints ?? "0");

  return rows.map((row) => {
    const orderlyPoints = numberValue(row.orderlyPoints);
    const allocationPercentage =
      totalOrderlyPoints > 0 ? (orderlyPoints / totalOrderlyPoints) * 100 : 0;
    const vantaPoints = (pool * allocationPercentage) / 100;

    return {
      ...row,
      allocationPercentage: trimDecimal(allocationPercentage),
      vantaPoints: trimDecimal(vantaPoints)
    };
  });
}

function OrderlyInfo({
  title,
  item,
  emptyText
}: {
  title: string;
  item?: OrderlyStage | OrderlyEpoch;
  emptyText: string;
}) {
  if (!item) {
    return (
      <div className="orderly-info">
        <strong>{title}</strong>
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="orderly-info">
      <strong>{title}</strong>
      <span>ID: {item.id || "-"}</span>
      {"status" in item && item.status ? <span>Status: {item.status}</span> : null}
      <span>Start: {formatReadableTime(item.startTime)}</span>
      <span>End: {formatReadableTime(item.endTime)}</span>
    </div>
  );
}

function formatReadableTime(value: string) {
  if (!value) {
    return "-";
  }

  const numeric = Number(value);
  const date =
    Number.isFinite(numeric) && value.trim() !== ""
      ? new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
