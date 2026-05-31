import { Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { distributionHeaders } from "../constants";
import { downloadCsv, stringifyCsv } from "../csv";
import type { CampaignDistributionRow, CampaignRegistry } from "../types";
import { EditableRowsPanel } from "../components/EditableRowsPanel";

export function DistributionPage({
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
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => row.address.toLowerCase().includes(normalizedQuery));
  }, [query, rows]);

  return (
    <EditableRowsPanel
      title="Campaign Distribution"
      headers={distributionHeaders}
      rows={filteredRows}
      allRows={allRows}
      extraControl={
        <>
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
          <div className="search table-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search address"
            />
          </div>
        </>
      }
      onAdd={() =>
        onChange([
          ...allRows,
          {
            address: "",
            orderlyPoints: "0",
            allocationPercentage: "",
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
              orderly_point: row.orderlyPoints,
              allocation_percentage: row.allocationPercentage,
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
      <td><input value={row.orderlyPoints} onChange={(event) => patch({ orderlyPoints: event.target.value })} /></td>
      <td><input value={row.allocationPercentage} onChange={(event) => patch({ allocationPercentage: event.target.value })} /></td>
      <td><input value={row.vantaPoints} onChange={(event) => patch({ vantaPoints: event.target.value })} /></td>
      <td><input value={row.specialPoints} onChange={(event) => patch({ specialPoints: event.target.value })} /></td>
      <td><input value={row.remark} onChange={(event) => patch({ remark: event.target.value })} /></td>
      <td><button className="icon-button danger" onClick={() => onChange(allRows.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></td>
    </tr>
  );
}
