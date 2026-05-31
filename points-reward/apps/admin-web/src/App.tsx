import {
  Download,
  FileUp,
  ListFilter,
  Plus,
  RefreshCw,
  Save,
  Search,
  TableProperties,
  Trash2,
  Trophy
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  getCurrentPoints,
  getDistribution,
  getLeaderboard,
  getRegistry,
  rebuildCurrentPointsFromCampaigns,
  saveCurrentPoints,
  saveDistribution,
  saveRegistry
} from "./api";
import { downloadCsv, parseCsv, stringifyCsv } from "./csv";
import type {
  CampaignConfig,
  CampaignDistributionRow,
  CampaignRegistry,
  CurrentPointsRow,
  LeaderboardRow
} from "./types";

type Tab = "campaigns" | "current" | "distribution" | "leaderboard";
type Status = "Idle" | "Loading" | "Saved" | "Error";

const currentHeaders = [
  "address",
  "total_accumulated_point_in_past_campaign",
  "total_accumulated_point_in_current_campaign",
  "total_accumulated_special_point_in_past_campaign",
  "total_accumulated_special_point_in_current_campaign",
  "remark"
];

const distributionHeaders = [
  "address",
  "pnl",
  "volume",
  "orderly_point",
  "vanta_points",
  "special_points",
  "remark"
];

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "campaigns", label: "Campaigns" },
  { id: "current", label: "Current Points" },
  { id: "distribution", label: "Distribution" },
  { id: "leaderboard", label: "Leaderboard" }
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [status, setStatus] = useState<Status>("Idle");
  const [message, setMessage] = useState("");
  const [registry, setRegistry] = useState<CampaignRegistry | null>(null);
  const [currentRows, setCurrentRows] = useState<CurrentPointsRow[]>([]);
  const [distributionRows, setDistributionRows] = useState<CampaignDistributionRow[]>([]);
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);
  const [selectedCampaignNumber, setSelectedCampaignNumber] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (selectedCampaignNumber) {
      void loadDistribution(selectedCampaignNumber);
    }
  }, [selectedCampaignNumber]);

  const currentCampaign = useMemo(
    () =>
      registry?.campaigns.find(
        (campaign) => campaign.campaignNumber === registry.currentCampaignNumber
      ),
    [registry]
  );

  const filteredCurrentRows = useMemo(
    () => filterRows(currentRows, query),
    [currentRows, query]
  );

  const filteredDistributionRows = useMemo(
    () => filterRows(distributionRows, query),
    [distributionRows, query]
  );

  const filteredLeaderboardRows = useMemo(
    () => filterRows(leaderboardRows, query),
    [leaderboardRows, query]
  );

  const totals = useMemo(() => {
    const currentPoint = currentRows.reduce(
      (sum, row) => sum + numberValue(row.totalAccumulatedPointInCurrentCampaign),
      0
    );
    const currentSpecial = currentRows.reduce(
      (sum, row) => sum + numberValue(row.totalAccumulatedSpecialPointInCurrentCampaign),
      0
    );
    const totalPoint = currentRows.reduce(
      (sum, row) =>
        sum +
        numberValue(row.totalAccumulatedPointInPastCampaign) +
        numberValue(row.totalAccumulatedPointInCurrentCampaign),
      0
    );

    return {
      users: currentRows.length,
      currentPoint,
      currentSpecial,
      totalPoint
    };
  }, [currentRows]);

  async function loadAll() {
    try {
      setStatus("Loading");
      const [registryResponse, currentResponse, leaderboardResponse] = await Promise.all([
        getRegistry(),
        getCurrentPoints(),
        getLeaderboard()
      ]);

      setRegistry(registryResponse);
      setCurrentRows(currentResponse.rows);
      setLeaderboardRows(leaderboardResponse.items);
      setSelectedCampaignNumber(registryResponse.currentCampaignNumber);
      setMessage("Data loaded");
      setStatus("Idle");
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }

  async function loadDistribution(campaignNumber: number) {
    try {
      const response = await getDistribution(campaignNumber);
      setDistributionRows(response.rows);
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }

  async function saveCampaigns() {
    if (!registry) return;

    try {
      setStatus("Loading");
      const next = await saveRegistry(registry);
      setRegistry(next);
      setStatus("Saved");
      setMessage("Campaign config saved");
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }

  async function saveCurrentTable() {
    try {
      setStatus("Loading");
      const response = await saveCurrentPoints(currentRows);
      const leaderboard = await getLeaderboard();
      setCurrentRows(response.rows);
      setLeaderboardRows(leaderboard.items);
      setStatus("Saved");
      setMessage("Current points CSV saved");
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }

  async function rebuildCurrentTableFromCampaigns() {
    const confirmed = window.confirm(
      "Rebuild current-points.csv from campaign distribution CSVs? This overwrites point columns and preserves existing remarks by address."
    );

    if (!confirmed) {
      return;
    }

    try {
      setStatus("Loading");
      const response = await rebuildCurrentPointsFromCampaigns();
      const leaderboard = await getLeaderboard();
      setCurrentRows(response.rows);
      setLeaderboardRows(leaderboard.items);
      setStatus("Saved");
      setMessage(
        `Rebuilt current-points.csv from ${response.stats.campaignsRead} campaign CSVs`
      );
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }

  async function saveDistributionTable() {
    if (!selectedCampaignNumber) return;

    try {
      setStatus("Loading");
      const response = await saveDistribution(selectedCampaignNumber, distributionRows);
      setDistributionRows(response.rows);
      setStatus("Saved");
      setMessage("Campaign distribution CSV saved");
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }

  function addCampaign() {
    if (!registry) return;

    const nextNumber =
      Math.max(0, ...registry.campaigns.map((campaign) => campaign.campaignNumber)) + 1;

    const nextCampaign: CampaignConfig = {
      campaignNumber: nextNumber,
      campaignName: `Vanta Points Campaign ${nextNumber}`,
      totalVantaPoints: "0",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      distributionCsv: `campaign-${nextNumber}-distribution.csv`
    };

    setRegistry({
      ...registry,
      campaigns: [...registry.campaigns, nextCampaign]
    });
    setSelectedCampaignNumber(nextNumber);
  }

  function importCurrentCsv(file: File) {
    void file.text().then((text) => {
      setCurrentRows(
        parseCsv(text).map((row) => ({
          address: row.address ?? "",
          totalAccumulatedPointInPastCampaign:
            row.total_accumulated_point_in_past_campaign ?? "",
          totalAccumulatedPointInCurrentCampaign:
            row.total_accumulated_point_in_current_campaign ?? "",
          totalAccumulatedSpecialPointInPastCampaign:
            row.total_accumulated_special_point_in_past_campaign ?? "",
          totalAccumulatedSpecialPointInCurrentCampaign:
            row.total_accumulated_special_point_in_current_campaign ?? "",
          remark: row.remark ?? ""
        }))
      );
    });
  }

  function importDistributionCsv(file: File) {
    void file.text().then((text) => {
      setDistributionRows(
        parseCsv(text).map((row) => ({
          address: row.address ?? "",
          pnl: row.pnl ?? "",
          volume: row.volume ?? "",
          orderlyPoints: row.orderly_point ?? "",
          vantaPoints: row.vanta_points ?? "",
          specialPoints: row.special_points ?? "",
          remark: row.remark ?? ""
        }))
      );
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Trophy size={22} />
          <span>Vanta Points</span>
        </div>
        <nav>
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "nav-button active" : "nav-button"}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Points Operations</h1>
            <p>{currentCampaign?.campaignName ?? "No current campaign"}</p>
          </div>
          <div className="toolbar">
            <div className={`status ${status.toLowerCase()}`}>{message || status}</div>
            <button className="icon-button" onClick={() => void loadAll()} title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        <section className="metrics-grid">
          <Metric label="Users" value={String(totals.users)} />
          <Metric label="Current Points" value={formatNumber(totals.currentPoint)} />
          <Metric label="Current Special" value={formatNumber(totals.currentSpecial)} />
          <Metric label="Total Points" value={formatNumber(totals.totalPoint)} />
        </section>

        <section className="workbench">
          <div className="workbench-bar">
            <div className="search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search address or remark"
              />
            </div>
            <div className="toolbar">
              <ListFilter size={18} />
              <span>{query ? "Filtered" : "All rows"}</span>
            </div>
          </div>

          {activeTab === "campaigns" && registry ? (
            <CampaignsPanel
              registry={registry}
              onChange={setRegistry}
              onAdd={addCampaign}
              onSave={() => void saveCampaigns()}
            />
          ) : null}

          {activeTab === "current" ? (
            <CurrentPointsPanel
              rows={filteredCurrentRows}
              allRows={currentRows}
              onChange={setCurrentRows}
              onImport={importCurrentCsv}
              onSave={() => void saveCurrentTable()}
              onRebuild={() => void rebuildCurrentTableFromCampaigns()}
            />
          ) : null}

          {activeTab === "distribution" && registry ? (
            <DistributionPanel
              registry={registry}
              selectedCampaignNumber={selectedCampaignNumber}
              rows={filteredDistributionRows}
              allRows={distributionRows}
              onCampaignChange={setSelectedCampaignNumber}
              onChange={setDistributionRows}
              onImport={importDistributionCsv}
              onSave={() => void saveDistributionTable()}
            />
          ) : null}

          {activeTab === "leaderboard" ? (
            <LeaderboardPanel rows={filteredLeaderboardRows} />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function CampaignsPanel({
  registry,
  onChange,
  onAdd,
  onSave
}: {
  registry: CampaignRegistry;
  onChange: (registry: CampaignRegistry) => void;
  onAdd: () => void;
  onSave: () => void;
}) {
  function patchCampaign(index: number, patch: Partial<CampaignConfig>) {
    onChange({
      ...registry,
      campaigns: registry.campaigns.map((campaign, campaignIndex) =>
        campaignIndex === index ? { ...campaign, ...patch } : campaign
      )
    });
  }

  function removeCampaign(index: number) {
    const nextCampaigns = registry.campaigns.filter((_, campaignIndex) => campaignIndex !== index);
    onChange({
      ...registry,
      campaigns: nextCampaigns,
      currentCampaignNumber:
        nextCampaigns[0]?.campaignNumber ?? registry.currentCampaignNumber
    });
  }

  return (
    <div className="panel">
      <div className="panel-actions">
        <label>
          Current
          <select
            value={registry.currentCampaignNumber}
            onChange={(event) =>
              onChange({ ...registry, currentCampaignNumber: Number(event.target.value) })
            }
          >
            {registry.campaigns.map((campaign) => (
              <option key={campaign.campaignNumber} value={campaign.campaignNumber}>
                #{campaign.campaignNumber} {campaign.campaignName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Current Points CSV
          <input
            value={registry.currentPointsCsv}
            onChange={(event) =>
              onChange({ ...registry, currentPointsCsv: event.target.value })
            }
          />
        </label>
        <button className="secondary-button" onClick={onAdd}>
          <Plus size={17} />
          Add
        </button>
        <button className="primary-button" onClick={onSave}>
          <Save size={17} />
          Save
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Total Vanta Points</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Distribution CSV</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {registry.campaigns.map((campaign, index) => (
              <tr key={`${campaign.campaignNumber}-${index}`}>
                <td>
                  <input
                    value={campaign.campaignNumber}
                    onChange={(event) =>
                      patchCampaign(index, { campaignNumber: Number(event.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    value={campaign.campaignName}
                    onChange={(event) => patchCampaign(index, { campaignName: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={campaign.totalVantaPoints}
                    onChange={(event) =>
                      patchCampaign(index, { totalVantaPoints: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    value={campaign.startTime}
                    onChange={(event) => patchCampaign(index, { startTime: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={campaign.endTime}
                    onChange={(event) => patchCampaign(index, { endTime: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={campaign.distributionCsv}
                    onChange={(event) =>
                      patchCampaign(index, { distributionCsv: event.target.value })
                    }
                  />
                </td>
                <td>
                  <button className="icon-button danger" onClick={() => removeCampaign(index)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CurrentPointsPanel({
  rows,
  allRows,
  onChange,
  onImport,
  onRebuild,
  onSave
}: {
  rows: CurrentPointsRow[];
  allRows: CurrentPointsRow[];
  onChange: (rows: CurrentPointsRow[]) => void;
  onImport: (file: File) => void;
  onRebuild: () => void;
  onSave: () => void;
}) {
  return (
    <EditableRowsPanel
      title="Current Points"
      headers={currentHeaders}
      rows={rows}
      allRows={allRows}
      onAdd={() =>
        onChange([
          ...allRows,
          {
            address: "",
            totalAccumulatedPointInPastCampaign: "0",
            totalAccumulatedPointInCurrentCampaign: "0",
            totalAccumulatedSpecialPointInPastCampaign: "0",
            totalAccumulatedSpecialPointInCurrentCampaign: "0",
            remark: ""
          }
        ])
      }
      onImport={onImport}
      extraAction={
        <button className="secondary-button" onClick={onRebuild}>
          <RefreshCw size={17} />
          Rebuild
        </button>
      }
      onExport={() =>
        downloadCsv(
          "current-points.csv",
          stringifyCsv(
            currentHeaders,
            allRows.map((row) => ({
              address: row.address,
              total_accumulated_point_in_past_campaign:
                row.totalAccumulatedPointInPastCampaign,
              total_accumulated_point_in_current_campaign:
                row.totalAccumulatedPointInCurrentCampaign,
              total_accumulated_special_point_in_past_campaign:
                row.totalAccumulatedSpecialPointInPastCampaign,
              total_accumulated_special_point_in_current_campaign:
                row.totalAccumulatedSpecialPointInCurrentCampaign,
              remark: row.remark
            }))
          )
        )
      }
      onSave={onSave}
      renderRow={(row) => (
        <CurrentPointRow
          key={row.address || Math.random()}
          row={row}
          allRows={allRows}
          onChange={onChange}
        />
      )}
    />
  );
}

function CurrentPointRow({
  row,
  allRows,
  onChange
}: {
  row: CurrentPointsRow;
  allRows: CurrentPointsRow[];
  onChange: (rows: CurrentPointsRow[]) => void;
}) {
  const index = allRows.indexOf(row);

  function patch(patchRow: Partial<CurrentPointsRow>) {
    onChange(allRows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchRow } : item)));
  }

  return (
    <tr>
      <td><input value={row.address} onChange={(event) => patch({ address: event.target.value })} /></td>
      <td><input value={row.totalAccumulatedPointInPastCampaign} onChange={(event) => patch({ totalAccumulatedPointInPastCampaign: event.target.value })} /></td>
      <td><input value={row.totalAccumulatedPointInCurrentCampaign} onChange={(event) => patch({ totalAccumulatedPointInCurrentCampaign: event.target.value })} /></td>
      <td><input value={row.totalAccumulatedSpecialPointInPastCampaign} onChange={(event) => patch({ totalAccumulatedSpecialPointInPastCampaign: event.target.value })} /></td>
      <td><input value={row.totalAccumulatedSpecialPointInCurrentCampaign} onChange={(event) => patch({ totalAccumulatedSpecialPointInCurrentCampaign: event.target.value })} /></td>
      <td><input value={row.remark} onChange={(event) => patch({ remark: event.target.value })} /></td>
      <td><button className="icon-button danger" onClick={() => onChange(allRows.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></td>
    </tr>
  );
}

function DistributionPanel({
  registry,
  selectedCampaignNumber,
  rows,
  allRows,
  onCampaignChange,
  onChange,
  onImport,
  onSave
}: {
  registry: CampaignRegistry;
  selectedCampaignNumber: number | null;
  rows: CampaignDistributionRow[];
  allRows: CampaignDistributionRow[];
  onCampaignChange: (campaignNumber: number) => void;
  onChange: (rows: CampaignDistributionRow[]) => void;
  onImport: (file: File) => void;
  onSave: () => void;
}) {
  return (
    <EditableRowsPanel
      title="Campaign Distribution"
      headers={distributionHeaders}
      rows={rows}
      allRows={allRows}
      extraControl={
        <select
          value={selectedCampaignNumber ?? ""}
          onChange={(event) => onCampaignChange(Number(event.target.value))}
        >
          {registry.campaigns.map((campaign) => (
            <option key={campaign.campaignNumber} value={campaign.campaignNumber}>
              #{campaign.campaignNumber} {campaign.campaignName}
            </option>
          ))}
        </select>
      }
      onAdd={() =>
        onChange([
          ...allRows,
          {
            address: "",
            pnl: "0",
            volume: "0",
            orderlyPoints: "0",
            vantaPoints: "0",
            specialPoints: "0",
            remark: ""
          }
        ])
      }
      onImport={onImport}
      onExport={() =>
        downloadCsv(
          `campaign-${selectedCampaignNumber}-distribution.csv`,
          stringifyCsv(
            distributionHeaders,
            allRows.map((row) => ({
              address: row.address,
              pnl: row.pnl,
              volume: row.volume,
              orderly_point: row.orderlyPoints,
              vanta_points: row.vantaPoints,
              special_points: row.specialPoints,
              remark: row.remark
            }))
          )
        )
      }
      onSave={onSave}
      renderRow={(row) => (
        <DistributionRow
          key={row.address || Math.random()}
          row={row}
          allRows={allRows}
          onChange={onChange}
        />
      )}
    />
  );
}

function DistributionRow({
  row,
  allRows,
  onChange
}: {
  row: CampaignDistributionRow;
  allRows: CampaignDistributionRow[];
  onChange: (rows: CampaignDistributionRow[]) => void;
}) {
  const index = allRows.indexOf(row);

  function patch(patchRow: Partial<CampaignDistributionRow>) {
    onChange(allRows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchRow } : item)));
  }

  return (
    <tr>
      <td><input value={row.address} onChange={(event) => patch({ address: event.target.value })} /></td>
      <td><input value={row.pnl} onChange={(event) => patch({ pnl: event.target.value })} /></td>
      <td><input value={row.volume} onChange={(event) => patch({ volume: event.target.value })} /></td>
      <td><input value={row.orderlyPoints} onChange={(event) => patch({ orderlyPoints: event.target.value })} /></td>
      <td><input value={row.vantaPoints} onChange={(event) => patch({ vantaPoints: event.target.value })} /></td>
      <td><input value={row.specialPoints} onChange={(event) => patch({ specialPoints: event.target.value })} /></td>
      <td><input value={row.remark} onChange={(event) => patch({ remark: event.target.value })} /></td>
      <td><button className="icon-button danger" onClick={() => onChange(allRows.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></td>
    </tr>
  );
}

function EditableRowsPanel<T>({
  title,
  headers,
  rows,
  allRows,
  extraControl,
  extraAction,
  onAdd,
  onImport,
  onExport,
  onSave,
  renderRow
}: {
  title: string;
  headers: string[];
  rows: T[];
  allRows: T[];
  extraControl?: ReactNode;
  extraAction?: ReactNode;
  onAdd: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onSave: () => void;
  renderRow: (row: T) => ReactNode;
}) {
  return (
    <div className="panel">
      <div className="panel-actions">
        <div className="panel-title">
          <TableProperties size={18} />
          <span>{title}</span>
          <strong>{allRows.length}</strong>
        </div>
        {extraControl}
        {extraAction}
        <label className="file-button">
          <FileUp size={17} />
          Import
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button className="secondary-button" onClick={onExport}>
          <Download size={17} />
          Export
        </button>
        <button className="secondary-button" onClick={onAdd}>
          <Plus size={17} />
          Add
        </button>
        <button className="primary-button" onClick={onSave}>
          <Save size={17} />
          Save
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      </div>
    </div>
  );
}

function LeaderboardPanel({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="panel">
      <div className="panel-actions">
        <div className="panel-title">
          <Trophy size={18} />
          <span>Total Point Leaderboard</span>
          <strong>{rows.length}</strong>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Address</th>
              <th>Total Point</th>
              <th>Current Point</th>
              <th>Total Special</th>
              <th>Current Special</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.rank}-${row.address}`}>
                <td>{row.rank}</td>
                <td className="mono">{row.address}</td>
                <td>{row.totalPoint}</td>
                <td>{row.currentPoint}</td>
                <td>{row.totalSpecialPoint}</td>
                <td>{row.currentSpecialPoint}</td>
                <td>{row.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function filterRows<T>(rows: T[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalizedQuery));
}

function numberValue(value: string) {
  const number = Number(value.replaceAll(",", ""));
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4
  }).format(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
