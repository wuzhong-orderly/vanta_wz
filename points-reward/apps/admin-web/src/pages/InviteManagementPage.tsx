import { ArrowDown, ArrowUp, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EditableRowsPanel } from "../components/EditableRowsPanel";
import { inviteBindingHeaders, inviteHeaders } from "../constants";
import { downloadCsv, stringifyCsv } from "../csv";
import type { InviteBindingRow, InviteCodeRow } from "../types";

export function InviteManagementPage({
  rows,
  bindings,
  onChange,
  onBindingsChange,
  onImport,
  onSave,
  isLoading,
  isImporting,
  isSaving
}: {
  rows: InviteCodeRow[];
  bindings: InviteBindingRow[];
  onChange: (rows: InviteCodeRow[]) => void;
  onBindingsChange: (rows: InviteBindingRow[]) => void;
  onImport: (file: File) => void;
  onSave: () => void;
  isLoading?: boolean;
  isImporting?: boolean;
  isSaving?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [bindingQuery, setBindingQuery] = useState("");
  const [activeInviteTab, setActiveInviteTab] = useState<"codes" | "bindings">("codes");
  const [boundAtSortDirection, setBoundAtSortDirection] = useState<"asc" | "desc">("desc");
  const bindingCounts = useMemo(() => countBindingsByInviteCode(bindings), [bindings]);
  const codeHeaders = useMemo(() => [...inviteHeaders, "Bindings"], []);
  const bindingHeaders = useMemo(
    () =>
      inviteBindingHeaders.map((header) =>
        header === "绑定时间" ? (
          <button
            className="table-sort-button"
            onClick={() =>
              setBoundAtSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
            }
            type="button"
          >
            <span>{header}</span>
            {boundAtSortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        ) : (
          header
        )
      ),
    [boundAtSortDirection]
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter(
      (row) =>
        row.inviteCode.toLowerCase().includes(normalizedQuery) ||
        row.orderlyRefCode.toLowerCase().includes(normalizedQuery) ||
        row.remark.toLowerCase().includes(normalizedQuery)
    );
  }, [query, rows]);
  const filteredBindings = useMemo(() => {
    const normalizedQuery = bindingQuery.trim().toLowerCase();
    const nextRows = !normalizedQuery
      ? bindings
      : bindings.filter(
          (row) =>
            row.inviteCode.toLowerCase().includes(normalizedQuery) ||
            row.boundAddress.toLowerCase().includes(normalizedQuery)
        );

    return [...nextRows].sort((left, right) =>
      compareBoundAt(left.boundAt, right.boundAt, boundAtSortDirection)
    );
  }, [bindingQuery, bindings, boundAtSortDirection]);

  return (
    <div className="invite-management">
      <div className="sub-tabs" role="tablist" aria-label="Invite management views">
        <button
          aria-selected={activeInviteTab === "codes"}
          className={activeInviteTab === "codes" ? "active" : ""}
          onClick={() => setActiveInviteTab("codes")}
          role="tab"
          type="button"
        >
          Invite Codes
        </button>
        <button
          aria-selected={activeInviteTab === "bindings"}
          className={activeInviteTab === "bindings" ? "active" : ""}
          onClick={() => setActiveInviteTab("bindings")}
          role="tab"
          type="button"
        >
          Invite Bindings
        </button>
      </div>

      {activeInviteTab === "codes" ? (
        <EditableRowsPanel
        title="Invite Codes"
        headers={codeHeaders}
        rows={filteredRows}
        allRows={rows}
        extraControl={
          <div className="search table-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search code, ref, or remark"
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
              orderlyRefCode: "",
              maxBindings: "500",
              remark: ""
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
                "Orderly Ref Code": row.orderlyRefCode,
                "Max Bindings": row.maxBindings,
                Remark: row.remark
              }))
            )
          )
        }
        onSave={onSave}
        renderRow={(row) => (
          <InviteCodeTableRow
            bindingCount={bindingCounts.get(row.inviteCode.toUpperCase()) ?? 0}
            key={`${row.inviteCode}-${rows.indexOf(row)}`}
            row={row}
            rows={rows}
            onChange={onChange}
          />
        )}
      />
      ) : null}

      {activeInviteTab === "bindings" ? (
        <EditableRowsPanel
        title="Invite Bindings"
        headers={bindingHeaders}
        rows={filteredBindings}
        allRows={bindings}
        extraControl={
          <div className="search table-search">
            <Search size={17} />
            <input
              value={bindingQuery}
              onChange={(event) => setBindingQuery(event.target.value)}
              placeholder="Search code or address"
            />
          </div>
        }
        isImporting={isImporting}
        isLoading={isLoading}
        isSaving={isSaving}
        onAdd={() =>
          onBindingsChange([
            ...bindings,
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
            "invite-bindings.csv",
            stringifyCsv(
              inviteBindingHeaders,
              bindings.map((row) => ({
                邀请码: row.inviteCode,
                绑定地址: row.boundAddress,
                绑定时间: row.boundAt
              }))
            )
          )
        }
        onSave={onSave}
        renderRow={(row) => (
          <InviteBindingTableRow
            key={`${row.inviteCode}-${row.boundAddress}-${bindings.indexOf(row)}`}
            row={row}
            rows={bindings}
            onChange={onBindingsChange}
          />
        )}
      />
      ) : null}
    </div>
  );
}

function InviteCodeTableRow({
  row,
  rows,
  bindingCount,
  onChange
}: {
  row: InviteCodeRow;
  rows: InviteCodeRow[];
  bindingCount: number;
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
          value={row.orderlyRefCode}
          onChange={(event) => patch({ orderlyRefCode: event.target.value.trim() })}
        />
      </td>
      <td>
        <input value={row.maxBindings} onChange={(event) => patch({ maxBindings: event.target.value })} />
      </td>
      <td>
        <input value={row.remark} onChange={(event) => patch({ remark: event.target.value })} />
      </td>
      <td>{bindingCount}</td>
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

function InviteBindingTableRow({
  row,
  rows,
  onChange
}: {
  row: InviteBindingRow;
  rows: InviteBindingRow[];
  onChange: (rows: InviteBindingRow[]) => void;
}) {
  const index = rows.indexOf(row);

  function patch(patchRow: Partial<InviteBindingRow>) {
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

function countBindingsByInviteCode(rows: InviteBindingRow[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const inviteCode = row.inviteCode.trim().toUpperCase();

    if (!inviteCode) {
      continue;
    }

    counts.set(inviteCode, (counts.get(inviteCode) ?? 0) + 1);
  }

  return counts;
}

function compareBoundAt(left: string, right: string, direction: "asc" | "desc") {
  const leftValue = dateSortValue(left);
  const rightValue = dateSortValue(right);

  if (leftValue === rightValue) {
    return 0;
  }

  if (leftValue === Number.POSITIVE_INFINITY) {
    return 1;
  }

  if (rightValue === Number.POSITIVE_INFINITY) {
    return -1;
  }

  return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
}

function dateSortValue(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = Date.parse(trimmedValue);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}
