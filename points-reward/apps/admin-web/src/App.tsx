import { ListFilter, RefreshCw, Search, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  endCampaign,
  getCurrentPoints,
  getDistribution,
  getLeaderboard,
  getRegistry,
  importOrderlyRows,
  previewAllocation,
  rebuildCurrentPointsFromCampaigns,
  saveCurrentPoints,
  saveDistribution,
  saveRegistry
} from "./api";
import { Metric } from "./components/Metric";
import { tabs } from "./constants";
import { parseCsv } from "./csv";
import { CampaignManagementPage } from "./pages/CampaignManagementPage";
import { CurrentPointsPage } from "./pages/CurrentPointsPage";
import { DistributionPage } from "./pages/DistributionPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { SettlementPage } from "./pages/SettlementPage";
import type {
  AllocationPreview,
  CampaignConfig,
  CampaignDistributionRow,
  CampaignRegistry,
  CurrentPointsRow,
  LeaderboardRow,
  Tab
} from "./types";
import { filterRows, formatNumber, getErrorMessage, numberValue } from "./utils";

type Status = "Idle" | "Loading" | "Saved" | "Error";

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [status, setStatus] = useState<Status>("Idle");
  const [message, setMessage] = useState("");
  const [registry, setRegistry] = useState<CampaignRegistry | null>(null);
  const [currentRows, setCurrentRows] = useState<CurrentPointsRow[]>([]);
  const [distributionRows, setDistributionRows] = useState<CampaignDistributionRow[]>([]);
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);
  const [selectedCampaignNumber, setSelectedCampaignNumber] = useState<number | null>(null);
  const [allocationPreview, setAllocationPreview] = useState<AllocationPreview | null>(null);
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
  const activeTitle = tabs.find((tab) => tab.id === activeTab)?.label ?? "Points Operations";

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
      description: "",
      totalVantaPoints: "0",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      distributionCsv: `campaign-${nextNumber}-distribution.csv`,
      status: "DRAFT",
      orderlyBrokerId: "vanta_exchange",
      orderlyStageId: "",
      orderlyEpochId: ""
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
          allocationPercentage: row.allocation_percentage ?? "",
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
            <h1>{activeTitle}</h1>
          </div>
          <div className="toolbar">
            <div className={`status ${status.toLowerCase()}`}>{message || status}</div>
            <button className="icon-button" onClick={() => void loadAll()} title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>


        <section className="workbench">

          {activeTab === "campaigns" && registry ? (
            <CampaignManagementPage
              registry={registry}
              onChange={setRegistry}
              onAdd={addCampaign}
              onSave={() => void saveCampaigns()}
            />
          ) : null}

          {activeTab === "settlement" && registry ? (
            <SettlementPage
              registry={registry}
              selectedCampaignNumber={selectedCampaignNumber}
              rows={allocationPreview?.rows ?? distributionRows}
              preview={allocationPreview}
              onCampaignChange={setSelectedCampaignNumber}
              onRowsChange={(rows) => {
                setDistributionRows(rows);
                setAllocationPreview(null);
              }}
              onPreview={() => void handlePreviewAllocation()}
              onImportOrderly={(options) => void handleImportOrderly(options)}
              onEndCampaign={() => void handleEndCampaign()}
            />
          ) : null}

          {activeTab === "current" ? (
            <CurrentPointsPage
              rows={filteredCurrentRows}
              allRows={currentRows}
              onChange={setCurrentRows}
              onImport={importCurrentCsv}
              onSave={() => void saveCurrentTable()}
              onRebuild={() => void rebuildCurrentTableFromCampaigns()}
            />
          ) : null}

          {activeTab === "distribution" && registry ? (
            <DistributionPage
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
            <LeaderboardPage rows={filteredLeaderboardRows} />
          ) : null}
        </section>
      </main>
    </div>
  );

  async function handlePreviewAllocation() {
    if (!selectedCampaignNumber) return;

    try {
      setStatus("Loading");
      const preview = await previewAllocation(selectedCampaignNumber);
      setAllocationPreview(preview);
      setDistributionRows(preview.rows);
      setStatus("Idle");
      setMessage("Allocation preview generated");
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }

  async function handleImportOrderly(options: {
    mode: "leaderboard" | "rankings";
    brokerId?: string;
    stage?: string;
    period?: string;
    epochId?: string;
  }) {
    if (!selectedCampaignNumber) return;

    try {
      setStatus("Loading");
      const preview = await importOrderlyRows(selectedCampaignNumber, options);
      setAllocationPreview(preview);
      setDistributionRows(preview.rows);
      setStatus("Idle");
      setMessage("Orderly rows imported");
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }

  async function handleEndCampaign() {
    if (!selectedCampaignNumber) return;
    const confirmed = window.confirm(
      "End this campaign? This writes the distribution CSV, rebuilds current-points.csv, and marks the campaign as SETTLED."
    );

    if (!confirmed) return;

    try {
      setStatus("Loading");
      const result = await endCampaign(
        selectedCampaignNumber,
        allocationPreview?.rows ?? distributionRows
      );
      const nextRegistry = await getRegistry();
      const leaderboard = await getLeaderboard();
      setRegistry(nextRegistry);
      setAllocationPreview(result.preview);
      setDistributionRows(result.preview.rows);
      setCurrentRows(result.currentPoints.rows);
      setLeaderboardRows(leaderboard.items);
      setStatus("Saved");
      setMessage(`Campaign settled for ${result.preview.stats.userCount} users`);
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }
}
