import { RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EditableRowsPanel } from "../components/EditableRowsPanel";
import { settledHeaders } from "../constants";
import { downloadCsv, stringifyCsv } from "../csv";
import type { SettledPointsRow } from "../types";

export function CurrentPointsPage({
  rows,
  onChange,
  onImport,
  onRebuild,
  onSave,
  isImporting,
  isRebuilding,
  isSaving
}: {
  rows: SettledPointsRow[];
  onChange: (rows: SettledPointsRow[]) => void;
  onImport: (file: File) => void;
  onRebuild: () => void;
  onSave: () => void;
  isImporting?: boolean;
  isRebuilding?: boolean;
  isSaving?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter(
      (row) =>
        row.address.toLowerCase().includes(normalizedQuery) ||
        row.remark.toLowerCase().includes(normalizedQuery)
    );
  }, [query, rows]);

  return (
    <EditableRowsPanel
      title="Settled Point & Special Point Management"
      headers={settledHeaders}
      rows={filteredRows}
      allRows={rows}
      extraControl={
        <div className="search table-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search address or remark"
          />
        </div>
      }
      extraAction={
        <button className="secondary-button" disabled={isRebuilding} onClick={onRebuild}>
          {isRebuilding ? (
            <span className="spinner button-spinner" aria-hidden="true" />
          ) : (
            <RotateCcw size={17} />
          )}
          {isRebuilding ? "Rebuilding" : "Rebuild settled points"}
        </button>
      }
      isImporting={isImporting}
      isSaving={isSaving}
      onAdd={() =>
        onChange([
          ...rows,
          {
            address: "",
            settledPoints: "0",
            totalPoints: "0",
            specialPoints: "0",
            remark: ""
          }
        ])
      }
      onImport={onImport}
      onExport={() =>
        downloadCsv(
          "settled-points.csv",
          stringifyCsv(
            settledHeaders,
            rows.map((row) => ({
              address: row.address,
              settled_points: row.settledPoints,
              total_points: row.totalPoints,
              special_points: row.specialPoints,
              remark: row.remark
            }))
          )
        )
      }
      onSave={onSave}
      renderRow={(row) => (
        <SettledPointTableRow
          key={`${row.address}-${rows.indexOf(row)}`}
          row={row}
          rows={rows}
          onChange={onChange}
        />
      )}
    />
  );
}

function SettledPointTableRow({
  row,
  rows,
  onChange
}: {
  row: SettledPointsRow;
  rows: SettledPointsRow[];
  onChange: (rows: SettledPointsRow[]) => void;
}) {
  const index = rows.indexOf(row);

  function patch(patchRow: Partial<SettledPointsRow>) {
    onChange(rows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchRow } : item)));
  }

  return (
    <tr>
      <td>
        <input value={row.address} onChange={(event) => patch({ address: event.target.value })} />
      </td>
      <td>
        <input aria-label="settled_points" readOnly value={row.settledPoints} />
      </td>
      <td>
        <input aria-label="total_points" readOnly value={row.totalPoints} />
      </td>
      <td>
        <input
          value={row.specialPoints}
          onChange={(event) => patch({ specialPoints: event.target.value })}
        />
      </td>
      <td>
        <input value={row.remark} onChange={(event) => patch({ remark: event.target.value })} />
      </td>
      <td>
        <button
          className="icon-button danger"
          onClick={() => onChange(rows.filter((_, itemIndex) => itemIndex !== index))}
          title="Delete row"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}
