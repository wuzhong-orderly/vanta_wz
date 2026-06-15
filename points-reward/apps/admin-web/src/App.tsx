import { KeyRound, RefreshCw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearAdminToken,
  endCampaign,
  getAdminToken,
  getBrokerMarketStats,
  getBrokerOverviewStats,
  getBrokerRiskStats,
  getBrokerUserStats,
  getDistribution,
  getInviteCodes,
  getOrderlyStages,
  getRegistry,
  getSettledPoints,
  importOrderlyRows,
  rebuildSettledPointsFromCampaigns,
  saveDistribution,
  saveInviteCodes,
  setAdminToken,
  saveSettledPoints,
  saveRegistry
} from "./api";
import { tabs } from "./constants";
import { parseCsv } from "./csv";
import { CampaignManagementPage } from "./pages/CampaignManagementPage";
import { BrokerStatsPage } from "./pages/BrokerStatsPage";
import { CurrentPointsPage } from "./pages/CurrentPointsPage";
import { DistributionPage } from "./pages/DistributionPage";
import { InviteManagementPage } from "./pages/InviteManagementPage";
import { SettlementPage } from "./pages/SettlementPage";
import type {
  CampaignConfig,
  CampaignDistributionRow,
  BrokerMarketStats,
  BrokerOverviewStats,
  BrokerRiskStats,
  BrokerUserStats,
  CampaignRegistry,
  InviteBindingRow,
  InviteCodeRow,
  SettledPointsRow,
  Tab
} from "./types";
import { getErrorMessage } from "./utils";

type Status = "Idle" | "Loading" | "Saved" | "Error";
type BusyAction =
  | "load-all"
  | "load-distribution"
  | "save-campaigns"
  | "save-distribution"
  | "save-invites"
  | "save-settled"
  | "rebuild-settled"
  | "import-csv"
  | "import-invites"
  | "import-settled"
  | "pull-orderly"
  | "end-campaign"
  | "load-stats";

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [status, setStatus] = useState<Status>("Idle");
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [message, setMessage] = useState("");
  const [registry, setRegistry] = useState<CampaignRegistry | null>(null);
  const [settledRows, setSettledRows] = useState<SettledPointsRow[]>([]);
  const [distributionRows, setDistributionRows] = useState<CampaignDistributionRow[]>([]);
  const [inviteRows, setInviteRows] = useState<InviteCodeRow[]>([]);
  const [inviteBindings, setInviteBindings] = useState<InviteBindingRow[]>([]);
  const [statsBrokerId, setStatsBrokerId] = useState("vanta_exchange");
  const [statsStartDate, setStatsStartDate] = useState(() => formatDateInput(addDays(new Date(), -29)));
  const [statsEndDate, setStatsEndDate] = useState(() => formatDateInput(new Date()));
  const [brokerOverviewStats, setBrokerOverviewStats] = useState<BrokerOverviewStats | null>(null);
  const [brokerMarketStats, setBrokerMarketStats] = useState<BrokerMarketStats | null>(null);
  const [brokerRiskStats, setBrokerRiskStats] = useState<BrokerRiskStats | null>(null);
  const [brokerUserStats, setBrokerUserStats] = useState<BrokerUserStats | null>(null);
  const [selectedCampaignNumber, setSelectedCampaignNumber] = useState<number | null>(null);
  const [adminToken, setAdminTokenState] = useState(() => getAdminToken());
  const settlementLoadingAction = busyAction === "load-stats" ? null : busyAction;

  useEffect(() => {
    if (adminToken) {
      void loadAll();
    }
  }, [adminToken]);

  useEffect(() => {
    function handleUnauthorized() {
      handleAdminLogout();
      setStatus("Error");
      setMessage("Admin token is invalid or expired");
    }

    window.addEventListener("points-admin-unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("points-admin-unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (adminToken && selectedCampaignNumber) {
      void loadDistribution(selectedCampaignNumber);
    }
  }, [adminToken, selectedCampaignNumber]);

  useEffect(() => {
    if (adminToken && activeTab === "stats") {
      void loadBrokerStats(statsBrokerId, statsStartDate, statsEndDate);
    }
  }, [activeTab, adminToken]);

  const activeTitle = tabs.find((tab) => tab.id === activeTab)?.label ?? "Points Operations";

  function handleAdminLogin(token: string) {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setStatus("Error");
      setMessage("Admin token is required");
      return;
    }

    setAdminToken(trimmedToken);
    setAdminTokenState(trimmedToken);
    setStatus("Loading");
    setMessage("Checking admin token...");
  }

  function handleAdminLogout() {
    clearAdminToken();
    setAdminTokenState("");
    setRegistry(null);
    setSettledRows([]);
    setDistributionRows([]);
    setInviteRows([]);
    setInviteBindings([]);
    setBrokerOverviewStats(null);
    setBrokerMarketStats(null);
    setBrokerRiskStats(null);
    setBrokerUserStats(null);
    setSelectedCampaignNumber(null);
    setStatus("Idle");
    setMessage("");
  }

  async function loadAll() {
    try {
      setStatus("Loading");
      setBusyAction("load-all");
      const [registryResponse, settledResponse, inviteResponse] = await Promise.all([
        getRegistry(),
        getSettledPoints(),
        getInviteCodes()
      ]);

      const normalizedRegistry = normalizeCurrentCampaign(registryResponse);
      setRegistry(normalizedRegistry);
      setSettledRows(settledResponse.rows);
      setInviteRows(inviteResponse.rows);
      setInviteBindings(inviteResponse.bindings);
      setSelectedCampaignNumber(normalizedRegistry.currentCampaignNumber);
      setMessage("Data loaded");
      setStatus("Idle");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleAdminLogout();
        setStatus("Error");
        setMessage("Admin token is invalid or expired");
        return;
      }

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
    const normalizedRegistry = normalizeCurrentCampaign(registry);
    const validationMessage = validateCurrentCampaign(normalizedRegistry);

    if (validationMessage) {
      setStatus("Error");
      setMessage(validationMessage);
      return;
    }

    try {
      setStatus("Loading");
      setBusyAction("save-campaigns");
      const next = await saveRegistry(syncCurrentCampaignNumber(normalizedRegistry));
      const settled = await rebuildSettledPointsFromCampaigns();
      setRegistry(next);
      setSettledRows(settled.rows);
      setStatus("Saved");
      setMessage(
        `Campaign config saved and settled-points rebuilt from ${settled.stats.campaignsRead} non-draft campaigns`
      );
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function rebuildSettledTableFromCampaigns() {
    const confirmed = window.confirm(
      "Rebuild settled-points.csv from campaign distribution CSVs? This recalculates settled_points from settled campaigns and total_points from non-draft campaigns, while preserving special_points and remarks by address."
    );

    if (!confirmed) {
      return;
    }

    try {
      setStatus("Loading");
      setBusyAction("rebuild-settled");
      const response = await rebuildSettledPointsFromCampaigns();
      setSettledRows(response.rows);
      setStatus("Saved");
      setMessage(
        `Rebuilt settled-points.csv from ${response.stats.campaignsRead} non-draft campaign CSVs`
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
      const settled = await rebuildSettledPointsFromCampaigns();
      setDistributionRows(response.rows);
      setSettledRows(settled.rows);
      setStatus("Saved");
      setMessage(
        `Campaign distribution saved and settled-points rebuilt from ${settled.stats.campaignsRead} non-draft campaigns`
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
      const response = await saveInviteCodes(inviteRows, inviteBindings);
      setInviteRows(response.rows);
      setInviteBindings(response.bindings);
      setStatus("Saved");
      setMessage(
        `Invite CSV saved with ${response.rows.length} codes and ${response.bindings.length} bindings`
      );
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveSettledTable() {
    try {
      setStatus("Loading");
      setBusyAction("save-settled");
      const response = await saveSettledPoints(settledRows);
      const settled = await rebuildSettledPointsFromCampaigns();
      setSettledRows(settled.rows);
      setStatus("Saved");
      setMessage(
        `Special points saved for ${response.rows.length} rows; settled and total points recalculated`
      );
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function loadBrokerStats(brokerId: string, startDate: string, endDate: string) {
    const trimmedBrokerId = brokerId.trim();

    if (!trimmedBrokerId) {
      setStatus("Error");
      setMessage("Broker ID is required");
      return;
    }

    const validationMessage = validateStatsDateRange(startDate, endDate);

    if (validationMessage) {
      setStatus("Error");
      setMessage(validationMessage);
      return;
    }

    try {
      setStatus("Loading");
      setBusyAction("load-stats");
      setStatsBrokerId(trimmedBrokerId);
      setStatsStartDate(startDate);
      setStatsEndDate(endDate);

      const [overview, markets, risk, users] = await Promise.all([
        getBrokerOverviewStats(trimmedBrokerId, startDate, endDate),
        getBrokerMarketStats(trimmedBrokerId),
        getBrokerRiskStats(trimmedBrokerId),
        getBrokerUserStats(trimmedBrokerId, startDate, endDate)
      ]);

      setBrokerOverviewStats(overview);
      setBrokerMarketStats(markets);
      setBrokerRiskStats(risk);
      setBrokerUserStats(users);
      setStatus("Idle");
      setMessage(`Loaded broker stats for ${trimmedBrokerId}`);
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
      orderlyEpochId: "",
      currentCampaign: false
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
      const parsedRows = parseCsv(text);
      const hasInviteConfigColumns = parsedRows.some(
        (row) =>
          row["orderly ref code"] !== undefined ||
          row.orderly_ref_code !== undefined ||
          row.max_bindings !== undefined ||
          row["max bindings"] !== undefined ||
          row.remark !== undefined
      );
      const hasInviteBindingColumns = parsedRows.some(
        (row) =>
          row["绑定地址"] !== undefined ||
          row.bound_address !== undefined ||
          row.boundaddress !== undefined
      );
      const importedInviteRows: InviteCodeRow[] = [];
      const importedBindings: InviteBindingRow[] = [];

      for (const row of parsedRows) {
        const inviteCode = (row["邀请码"] ?? row.invite_code ?? row.invitecode ?? "").toUpperCase();
        const boundAddress = row["绑定地址"] ?? row.bound_address ?? row.boundaddress ?? "";
        const boundAt = row["绑定时间"] ?? row.bound_at ?? row.boundat ?? "";

        if (hasInviteConfigColumns || !boundAddress.trim()) {
          importedInviteRows.push({
            inviteCode,
            orderlyRefCode:
              row["orderly ref code"] ??
              row.orderly_ref_code ??
              row.orderlyrefcode ??
              row.ref_code ??
              row.refcode ??
              row.ref ??
              "",
            maxBindings: row["max bindings"] ?? row.max_bindings ?? row.maxbindings ?? "500",
            remark: row.remark ?? ""
          });
        }

        if (boundAddress.trim()) {
          importedBindings.push({
            inviteCode,
            boundAddress,
            boundAt
          });
        }
      }

      if (hasInviteConfigColumns || importedInviteRows.length > 0) {
        setInviteRows(importedInviteRows);
      }

      if (hasInviteBindingColumns) {
        setInviteBindings(importedBindings);
      }
      setStatus("Idle");
      setMessage(`Imported ${file.name}`);
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function importSettledCsv(file: File) {
    try {
      setStatus("Loading");
      setBusyAction("import-settled");
      setMessage(`Importing ${file.name}...`);
      const text = await file.text();
      const currentRowsByAddress = new Map(
        settledRows
          .filter((row) => row.address.trim())
          .map((row) => [row.address.trim().toLowerCase(), row] as const)
      );
      const importedRows = parseCsv(text)
        .map((row) => {
          const address = row.address ?? "";
          const existingRow = currentRowsByAddress.get(address.trim().toLowerCase());

          return {
            address,
            settledPoints: existingRow?.settledPoints ?? "0",
            totalPoints: existingRow?.totalPoints ?? "0",
            specialPoints: row.special_points ?? row.specialpoints ?? "0",
            remark: row.remark ?? ""
          } satisfies SettledPointsRow;
        })
        .filter((row) => row.address.trim());

      setSettledRows(importedRows);
      setStatus("Idle");
      setMessage(`Imported ${file.name}; settled_points and total_points were preserved by address`);
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
    const normalizedRegistry = normalizeCurrentCampaign(nextRegistry);
    const validationMessage = validateCurrentCampaign(normalizedRegistry);

    if (validationMessage) {
      setStatus("Error");
      setMessage(validationMessage);
      return;
    }

    try {
      setStatus("Loading");
      setBusyAction("save-campaigns");
      const next = await saveRegistry(syncCurrentCampaignNumber(normalizedRegistry));
      const settled = await rebuildSettledPointsFromCampaigns();
      setRegistry(next);
      setSettledRows(settled.rows);
      setStatus("Saved");
      setMessage(
        `Campaign status saved and settled-points rebuilt from ${settled.stats.campaignsRead} non-draft campaigns`
      );
    } catch (error) {
      setStatus("Error");
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  if (!adminToken) {
    return (
      <AdminTokenGate
        errorMessage={status === "Error" ? message : ""}
        onSubmit={handleAdminLogin}
      />
    );
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
            <button className="secondary-button" onClick={handleAdminLogout}>
              Sign out
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
              loadingAction={settlementLoadingAction}
            />
          ) : null}

          {activeTab === "current" ? (
            <CurrentPointsPage
              rows={settledRows}
              onChange={setSettledRows}
              onImport={(file) => void importSettledCsv(file)}
              onRebuild={() => void rebuildSettledTableFromCampaigns()}
              onSave={() => void saveSettledTable()}
              isImporting={busyAction === "import-settled"}
              isRebuilding={busyAction === "rebuild-settled"}
              isSaving={busyAction === "save-settled"}
            />
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

          {activeTab === "stats" ? (
            <BrokerStatsPage
              brokerId={statsBrokerId}
              endDate={statsEndDate}
              loading={busyAction === "load-stats"}
              markets={brokerMarketStats}
              onRefresh={loadBrokerStats}
              overview={brokerOverviewStats}
              risk={brokerRiskStats}
              startDate={statsStartDate}
              users={brokerUserStats}
            />
          ) : null}

          {activeTab === "invites" ? (
            <InviteManagementPage
              rows={inviteRows}
              bindings={inviteBindings}
              onChange={setInviteRows}
              onBindingsChange={setInviteBindings}
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
      "End this campaign? This writes the distribution CSV, rebuilds settled-points.csv, and marks the campaign as SETTLED."
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
      setSettledRows(result.settledPoints.rows);
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

function AdminTokenGate({
  errorMessage,
  onSubmit
}: {
  errorMessage: string;
  onSubmit: (token: string) => void;
}) {
  const [token, setToken] = useState("");

  return (
    <main className="auth-shell">
      <form
        className="auth-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(token);
        }}
      >
        <div className="auth-brand">
          <KeyRound size={24} />
          <span>Vanta Points Admin</span>
        </div>
        <label>
          <span>Admin token</span>
          <input
            autoComplete="current-password"
            autoFocus
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste admin token"
            type="password"
            value={token}
          />
        </label>
        {errorMessage ? <div className="auth-error">{errorMessage}</div> : null}
        <button className="primary-button" type="submit">
          Unlock admin
        </button>
      </form>
    </main>
  );
}

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "Unauthorized";
}

function validateCurrentCampaign(registry: CampaignRegistry) {
  const currentCampaignCount = registry.campaigns.filter(
    (campaign) => campaign.currentCampaign === true
  ).length;

  if (currentCampaignCount !== 1) {
    return `Exactly one campaign must be set as current. Current selection count: ${currentCampaignCount}.`;
  }

  return "";
}

function normalizeCurrentCampaign(registry: CampaignRegistry): CampaignRegistry {
  const hasCurrentCampaignFlag = registry.campaigns.some(
    (campaign) => campaign.currentCampaign === true
  );
  const campaigns = registry.campaigns.map((campaign) => ({
    ...campaign,
    currentCampaign: hasCurrentCampaignFlag
      ? campaign.currentCampaign === true
      : campaign.campaignNumber === registry.currentCampaignNumber
  }));
  const currentCampaign = campaigns.find((campaign) => campaign.currentCampaign === true);

  return {
    ...registry,
    currentCampaignNumber: currentCampaign?.campaignNumber ?? registry.currentCampaignNumber,
    campaigns
  };
}

function syncCurrentCampaignNumber(registry: CampaignRegistry): CampaignRegistry {
  const currentCampaign = registry.campaigns.find(
    (campaign) => campaign.currentCampaign === true
  );

  return {
    ...registry,
    currentCampaignNumber: currentCampaign?.campaignNumber ?? registry.currentCampaignNumber
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function validateStatsDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return "Start date and end date are required";
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Stats date range is invalid";
  }

  if (start > end) {
    return "Start date must be before end date";
  }

  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (days > 90) {
    return "Stats date range must be 90 days or less";
  }

  return "";
}
