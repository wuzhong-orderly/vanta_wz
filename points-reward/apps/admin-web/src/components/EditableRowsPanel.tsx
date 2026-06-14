import { Download, FileUp, Plus, Save, TableProperties } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Pagination, defaultPageSize, paginateRows } from "./Pagination";

export function EditableRowsPanel<T>({
  title,
  headers,
  rows,
  allRows,
  extraControl,
  extraAction,
  isImporting,
  isLoading,
  isSaving,
  onAdd,
  onImport,
  onExport,
  onSave,
  renderRow
}: {
  title: string;
  headers: ReactNode[];
  rows: T[];
  allRows: T[];
  extraControl?: ReactNode;
  extraAction?: ReactNode;
  isImporting?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  onAdd: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onSave: () => void;
  renderRow: (row: T) => ReactNode;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  const pageRows = paginateRows(rows, page, defaultPageSize);

  return (
    <div className="panel">
      <div className="panel-actions">
        <div className="panel-title">
          <TableProperties size={18} />
          <span>{title}</span>
          <strong>{allRows.length}</strong>
        </div>
        {extraControl}
        {extraAction}
        <label className={`file-button ${isImporting ? "disabled" : ""}`}>
          {isImporting ? <span className="spinner button-spinner" aria-hidden="true" /> : <FileUp size={17} />}
          {isImporting ? "Importing" : "Import"}
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={isImporting}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button className="secondary-button" onClick={onExport}>
          <Download size={17} />
          Export
        </button>
        <button className="secondary-button" onClick={onAdd}>
          <Plus size={17} />
          Add
        </button>
        <button className="primary-button" disabled={isSaving} onClick={onSave}>
          {isSaving ? <span className="spinner button-spinner" aria-hidden="true" /> : <Save size={17} />}
          {isSaving ? "Saving" : "Save"}
        </button>
      </div>
      <div className="table-wrap loading-container">
        {isLoading ? (
          <div className="table-loading-overlay">
            <span className="spinner" aria-hidden="true" />
            <span>Loading CSV data</span>
          </div>
        ) : null}
        <table>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>{pageRows.map(renderRow)}</tbody>
        </table>
      </div>
      <Pagination page={page} total={rows.length} onPageChange={setPage} />
    </div>
  );
}
