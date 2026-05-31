import { RefreshCw, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  endCampaign,
  getCurrentPoints,
  getDistribution,
  getOrderlyStages,
  getRegistry,
  importOrderlyRows,
  rebuildCurrentPointsFromCampaigns,
  saveDistribution,
  saveRegistry
} from "./api";
import { Metric } from "./components/Metric";
import { tabs } from "./constants";
import { parseCsv } from "./csv";
import { CampaignManagementPage } from "./pages/CampaignManagementPage";
import { CurrentPointsPage } from "./pages/CurrentPointsPage";
import { DistributionPage } from "./pages/DistributionPage";
import { SettlementPage } from "./pages/SettlementPage";
import type {
  CampaignConfig,
  CampaignDistributionRow,
  CampaignRegistry,
  CurrentPointsRow,
  Tab
} from "./types";
import { formatNumber, getErrorMessage, numberValue } from "./utils";

type Status = "Idle" | "Loading" | "Saved" | "Error";

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [status, setStatus] = useState<Status>("Idle");
  const [message, setMessage] = useState("");
  const [registry, setRegistry] = useState<CampaignRegistry | null>(null);
  const [currentRows, setCurrentRows] = useState<CurrentPointsRow[]>([]);
  const [distributionRows, setDistributionRows] = useState<CampaignDistributionRow[]>([]);
  const [selectedCampaignNumber, setSelectedCampaignNumber] = useState<number | null>(null);

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
      const [registryResponse, currentResponse] = await Promise.all([
        getRegistry(),
        getCurrentPoints()
      ]);

      setRegistry(registryResponse);
      setCurrentRows(currentResponse.rows);
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
      const current = await rebuildCurrentPointsFromCampaigns();
      setRegistry(next);
      setCurrentRows(current.rows);
      setStatus("Saved");
      setMessage(
        `Campaign config saved and current-points rebuilt from ${current.stats.campaignsRead} campaigns`
      );
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
      setCurrentRows(response.rows);
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
      const current = await rebuildCurrentPointsFromCampaigns();
      setDistributionRows(response.rows);
      setCurrentRows(current.rows);
      setStatus("Saved");
      setMessage(
        `Campaign distribution saved and current-points rebuilt from ${current.stats.campaignsRead} campaigns`
      );
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

  function importDistributionCsv(file: File) {
    void file.text().then((text) => {
      setDistributionRows(
        parseCsv(text).map((row) => ({
          address: row.address ?? "",
          orderlyPoints: row.orderly_point ?? "",
          allocationPercentage: row.allocation_percentage ?? "",
          vantaPoints: row.vanta_points ?? "",
          specialPoints: row.special_points ?? "",
          remark: row.remark ?? ""
        }))
      );
    });
  }

  function patchSelectedCampaign(patch: Partial<CampaignConfig>) {
    if (!registry || !selectedCampaignNumber) return;

    setRegistry({
      ...registry,
      campaigns: registry.campaigns.map((campaign) =>
        campaign.campaignNumber === selectedCampaignNumber
          ? { ...campaign, ...patch }
          : campaign
      )
    });
  }

  async function saveCampaignPatch(campaignNumber: number, patch: Partial<CampaignConfig>) {
    if (!registry) return;

    const nextRegistry = {
      ...registry,
      campaigns: registry.campaigns.map((campaign) =>
        campaign.campaignNumber === campaignNumber
          ? { ...campaign, ...patch }
          : campaign
      )
    };

    try {
      setStatus("Loading");
      const next = await saveRegistry(nextRegistry);
      const current = await rebuildCurrentPointsFromCampaigns();
      setRegistry(next);
      setCurrentRows(current.rows);
      setStatus("Saved");
      setMessage(
        `Campaign status saved and current-points rebuilt from ${current.stats.campaignsRead} campaigns`
      );
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
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
              onStatusChange={(campaignNumber, status) =>
                void saveCampaignPatch(campaignNumber, { status })
              }
            />
          ) : null}

          {activeTab === "settlement" && registry ? (
            <SettlementPage
              registry={registry}
              selectedCampaignNumber={selectedCampaignNumber}
              rows={distributionRows}
              onCampaignChange={setSelectedCampaignNumber}
              onCampaignPatch={patchSelectedCampaign}
              onCampaignSave={() => void saveCampaigns()}
              onCampaignStatusChange={(status) => {
                if (selectedCampaignNumber) {
                  void saveCampaignPatch(selectedCampaignNumber, { status });
                }
              }}
              onRowsChange={setDistributionRows}
              onRefreshData={() => {
                if (selectedCampaignNumber) {
                  void loadDistribution(selectedCampaignNumber);
                }
              }}
              onSaveData={() => void saveDistributionTable()}
              onLoadStages={(brokerId) => getOrderlyStages(brokerId)}
              onPullOrderly={(options) => handlePullOrderly(options)}
              onEndCampaign={() => void handleEndCampaign()}
            />
          ) : null}

          {activeTab === "current" ? (
            <CurrentPointsPage rows={currentRows} />
          ) : null}

          {activeTab === "distribution" && registry ? (
            <DistributionPage
              registry={registry}
              selectedCampaignNumber={selectedCampaignNumber}
              rows={distributionRows}
              allRows={distributionRows}
              onCampaignChange={setSelectedCampaignNumber}
              onChange={setDistributionRows}
              onImport={importDistributionCsv}
              onSave={() => void saveDistributionTable()}
            />
          ) : null}

        </section>
      </main>
    </div>
  );

  async function handlePullOrderly(options: {
    mode: "stage-ranking" | "epoch-ranking";
    brokerId?: string;
    stage?: string;
    epochId?: string;
  }): Promise<CampaignDistributionRow[]> {
    if (!selectedCampaignNumber) return [];

    try {
      setStatus("Loading");
      const preview = await importOrderlyRows(selectedCampaignNumber, options);
      setStatus("Idle");
      setMessage(`Pulled ${preview.rows.length} Orderly rows`);
      return preview.rows.map((row) => ({
        address: row.address,
        orderlyPoints: row.orderlyPoints,
        allocationPercentage: "",
        vantaPoints: "",
        specialPoints: "",
        remark: ""
      }));
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
      return [];
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
        distributionRows
      );
      const nextRegistry = await getRegistry();
      setRegistry(nextRegistry);
      setDistributionRows(result.preview.rows);
      setCurrentRows(result.currentPoints.rows);
      setStatus("Saved");
      setMessage(`Campaign settled for ${result.preview.stats.userCount} users`);
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    }
  }
}
