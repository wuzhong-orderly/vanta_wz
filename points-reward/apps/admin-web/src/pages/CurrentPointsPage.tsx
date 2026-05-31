import { RefreshCw, Trash2 } from "lucide-react";
import { currentHeaders } from "../constants";
import { downloadCsv, stringifyCsv } from "../csv";
import type { CurrentPointsRow } from "../types";
import { EditableRowsPanel } from "../components/EditableRowsPanel";

export function CurrentPointsPage({
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
