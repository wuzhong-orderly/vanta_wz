import { RefreshCw, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  endCampaign,
  getCurrentPoints,
  getDistribution,
  getInviteCodes,
  getOrderlyStages,
  getRegistry,
  importOrderlyRows,
  rebuildCurrentPointsFromCampaigns,
  saveDistribution,
  saveInviteCodes,
  saveRegistry
} from "./api";
import { Metric } from "./components/Metric";
import { tabs } from "./constants";
import { parseCsv } from "./csv";
import { CampaignManagementPage } from "./pages/CampaignManagementPage";
import { CurrentPointsPage } from "./pages/CurrentPointsPage";
import { DistributionPage } from "./pages/DistributionPage";
import { InviteManagementPage } from "./pages/InviteManagementPage";
import { SettlementPage } from "./pages/SettlementPage";
import type {
  CampaignConfig,
  CampaignDistributionRow,
  CampaignRegistry,
  CurrentPointsRow,
  InviteCodeRow,
  Tab
} from "./types";
import { formatNumber, getErrorMessage, numberValue } from "./utils";

type Status = "Idle" | "Loading" | "Saved" | "Error";
type BusyAction =
  | "load-all"
  | "load-distribution"
  | "save-campaigns"
  | "save-distribution"
  | "save-invites"
  | "rebuild-current"
  | "import-csv"
  | "import-invites"
  | "pull-orderly"
  | "end-campaign";

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [status, setStatus] = useState<Status>("Idle");
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [message, setMessage] = useState("");
  const [registry, setRegistry] = useState<CampaignRegistry | null>(null);
  const [currentRows, setCurrentRows] = useState<CurrentPointsRow[]>([]);
  const [distributionRows, setDistributionRows] = useState<CampaignDistributionRow[]>([]);
  const [inviteRows, setInviteRows] = useState<InviteCodeRow[]>([]);
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
      setBusyAction("load-all");
      const [registryResponse, currentResponse, inviteResponse] = await Promise.all([
        getRegistry(),
        getCurrentPoints(),
        getInviteCodes()
      ]);

      setRegistry(registryResponse);
      setCurrentRows(currentResponse.rows);
      setInviteRows(inviteResponse.rows);
      setSelectedCampaignNumber(registryResponse.currentCampaignNumber);
      setMessage("Data loaded");
      setStatus("Idle");
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function loadDistribution(campaignNumber: number) {
    try {
      setStatus("Loading");
      setBusyAction("load-distribution");
      setMessage(`Loading campaign ${campaignNumber} CSV...`);
      const response = await getDistribution(campaignNumber);
      setDistributionRows(response.rows);
      setStatus("Idle");
      setMessage(`Loaded ${response.rows.length} distribution rows`);
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveCampaigns() {
    if (!registry) return;

    try {
      setStatus("Loading");
      setBusyAction("save-campaigns");
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
    } finally {
      setBusyAction(null);
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
      setBusyAction("rebuild-current");
      const response = await rebuildCurrentPointsFromCampaigns();
      setCurrentRows(response.rows);
      setStatus("Saved");
      setMessage(
        `Rebuilt current-points.csv from ${response.stats.campaignsRead} campaign CSVs`
      );
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveDistributionTable() {
    if (!selectedCampaignNumber) return;

    try {
      setStatus("Loading");
      setBusyAction("save-distribution");
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
    } finally {
      setBusyAction(null);
    }
  }

  async function saveInviteTable() {
    try {
      setStatus("Loading");
      setBusyAction("save-invites");
      const response = await saveInviteCodes(inviteRows);
      setInviteRows(response.rows);
      setStatus("Saved");
      setMessage(`Invite CSV saved with ${response.rows.length} codes`);
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
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

  async function importDistributionCsv(file: File) {
    try {
      setStatus("Loading");
      setBusyAction("import-csv");
      setMessage(`Importing ${file.name}...`);
      const text = await file.text();
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
      setStatus("Idle");
      setMessage(`Imported ${file.name}`);
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function importInviteCsv(file: File) {
    try {
      setStatus("Loading");
      setBusyAction("import-invites");
      setMessage(`Importing ${file.name}...`);
      const text = await file.text();
      setInviteRows(
        parseCsv(text).map((row) => ({
          inviteCode: (row["邀请码"] ?? row.invite_code ?? row.invitecode ?? "").toUpperCase(),
          boundAddress: row["绑定地址"] ?? row.bound_address ?? row.boundaddress ?? "",
          boundAt: row["绑定时间"] ?? row.bound_at ?? row.boundat ?? ""
        }))
      );
      setStatus("Idle");
      setMessage(`Imported ${file.name}`);
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
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
      setBusyAction("save-campaigns");
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
    } finally {
      setBusyAction(null);
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
            <div className={`status ${status.toLowerCase()}`}>
              {status === "Loading" ? <span className="spinner" aria-hidden="true" /> : null}
              {message || status}
            </div>
            <button
              className="icon-button"
              disabled={Boolean(busyAction)}
              onClick={() => void loadAll()}
              title="Refresh"
            >
              <RefreshCw className={busyAction === "load-all" ? "spin-icon" : ""} size={18} />
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
              isSaving={busyAction === "save-campaigns"}
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
              loadingAction={busyAction}
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
              onImport={(file) => void importDistributionCsv(file)}
              onSave={() => void saveDistributionTable()}
              isLoading={busyAction === "load-distribution"}
              isImporting={busyAction === "import-csv"}
              isSaving={busyAction === "save-distribution"}
            />
          ) : null}

          {activeTab === "invites" ? (
            <InviteManagementPage
              rows={inviteRows}
              onChange={setInviteRows}
              onImport={(file) => void importInviteCsv(file)}
              onSave={() => void saveInviteTable()}
              isImporting={busyAction === "import-invites"}
              isSaving={busyAction === "save-invites"}
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
      setBusyAction("pull-orderly");
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
    } finally {
      setBusyAction(null);
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
      setBusyAction("end-campaign");
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
    } finally {
      setBusyAction(null);
    }
  }
}
