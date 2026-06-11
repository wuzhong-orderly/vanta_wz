import { Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EditableRowsPanel } from "../components/EditableRowsPanel";
import { inviteHeaders } from "../constants";
import { downloadCsv, stringifyCsv } from "../csv";
import type { InviteCodeRow } from "../types";

export function InviteManagementPage({
  rows,
  onChange,
  onImport,
  onSave,
  isLoading,
  isImporting,
  isSaving
}: {
  rows: InviteCodeRow[];
  onChange: (rows: InviteCodeRow[]) => void;
  onImport: (file: File) => void;
  onSave: () => void;
  isLoading?: boolean;
  isImporting?: boolean;
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
        row.inviteCode.toLowerCase().includes(normalizedQuery) ||
        row.boundAddress.toLowerCase().includes(normalizedQuery)
    );
  }, [query, rows]);

  return (
    <EditableRowsPanel
      title="Invite Management"
      headers={inviteHeaders}
      rows={filteredRows}
      allRows={rows}
      extraControl={
        <div className="search table-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code or address"
          />
        </div>
      }
      isImporting={isImporting}
      isLoading={isLoading}
      isSaving={isSaving}
      onAdd={() =>
        onChange([
          ...rows,
          {
            inviteCode: "",
            boundAddress: "",
            boundAt: ""
          }
        ])
      }
      onImport={onImport}
      onExport={() =>
        downloadCsv(
          "invite-codes.csv",
          stringifyCsv(
            inviteHeaders,
            rows.map((row) => ({
              邀请码: row.inviteCode,
              绑定地址: row.boundAddress,
              绑定时间: row.boundAt
            }))
          )
        )
      }
      onSave={onSave}
      renderRow={(row) => (
        <InviteCodeTableRow
          key={`${row.inviteCode}-${rows.indexOf(row)}`}
          row={row}
          rows={rows}
          onChange={onChange}
        />
      )}
    />
  );
}

function InviteCodeTableRow({
  row,
  rows,
  onChange
}: {
  row: InviteCodeRow;
  rows: InviteCodeRow[];
  onChange: (rows: InviteCodeRow[]) => void;
}) {
  const index = rows.indexOf(row);

  function patch(patchRow: Partial<InviteCodeRow>) {
    onChange(rows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchRow } : item)));
  }

  return (
    <tr>
      <td>
        <input
          value={row.inviteCode}
          maxLength={6}
          onChange={(event) => patch({ inviteCode: event.target.value.toUpperCase() })}
        />
      </td>
      <td>
        <input
          value={row.boundAddress}
          onChange={(event) => patch({ boundAddress: event.target.value })}
        />
      </td>
      <td>
        <input value={row.boundAt} onChange={(event) => patch({ boundAt: event.target.value })} />
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
