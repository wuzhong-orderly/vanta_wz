import { Plus, Save, TableProperties, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Pagination, defaultPageSize, paginateRows } from "../components/Pagination";
import type { CampaignConfig, CampaignRegistry } from "../types";

export function CampaignManagementPage({
  registry,
  onChange,
  onAdd,
  onSave,
  isSaving,
  onStatusChange
}: {
  registry: CampaignRegistry;
  onChange: (registry: CampaignRegistry) => void;
  onAdd: () => void;
  onSave: () => void;
  isSaving?: boolean;
  onStatusChange: (
    campaignNumber: number,
    status: NonNullable<CampaignConfig["status"]>
  ) => void;
}) {
  const [page, setPage] = useState(1);
  const pageCampaigns = paginateRows(registry.campaigns, page, defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [registry.campaigns.length]);

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
        <div className="panel-title">
          <TableProperties size={18} />
          <span>Campaign Management</span>
          <strong>{registry.campaigns.length}</strong>
        </div>
        <button className="secondary-button" onClick={onAdd}>
          <Plus size={17} />
          Add
        </button>
        <button className="primary-button" disabled={isSaving} onClick={onSave}>
          {isSaving ? <span className="spinner button-spinner" aria-hidden="true" /> : <Save size={17} />}
          {isSaving ? "Saving" : "Save"}
        </button>
      </div>

      <div className="table-wrap">
        <table className="campaign-management-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Total Vanta Points</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Description</th>
              <th>Status</th>
              <th>Distribution CSV</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageCampaigns.map((campaign) => {
              const index = registry.campaigns.indexOf(campaign);

              return (
              <tr key={`${campaign.campaignNumber}-${index}`}>
                <td>
                  <input
                    className="campaign-no-input"
                    value={campaign.campaignNumber}
                    onChange={(event) =>
                      patchCampaign(index, { campaignNumber: Number(event.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    className="campaign-name-input"
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
                    className="campaign-description-input"
                    value={campaign.description ?? ""}
                    onChange={(event) => patchCampaign(index, { description: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    className={`campaign-status-select status-${(campaign.status ?? "ACTIVE").toLowerCase()}`}
                    value={campaign.status ?? "ACTIVE"}
                    onChange={(event) => {
                      const status = event.target.value as NonNullable<CampaignConfig["status"]>;
                      patchCampaign(index, {
                        status
                      });
                      onStatusChange(campaign.campaignNumber, status);
                    }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ENDED">ENDED</option>
                    <option value="SETTLED">SETTLED</option>
                  </select>
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
            );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={registry.campaigns.length} onPageChange={setPage} />
    </div>
  );
}
