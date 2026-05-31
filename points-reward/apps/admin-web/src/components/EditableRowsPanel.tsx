import { Download, FileUp, Plus, Save, TableProperties } from "lucide-react";
import type { ReactNode } from "react";

export function EditableRowsPanel<T>({
  title,
  headers,
  rows,
  allRows,
  extraControl,
  extraAction,
  onAdd,
  onImport,
  onExport,
  onSave,
  renderRow
}: {
  title: string;
  headers: string[];
  rows: T[];
  allRows: T[];
  extraControl?: ReactNode;
  extraAction?: ReactNode;
  onAdd: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onSave: () => void;
  renderRow: (row: T) => ReactNode;
}) {
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
        <label className="file-button">
          <FileUp size={17} />
          Import
          <input
            type="file"
            accept=".csv,text/csv"
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
        <button className="primary-button" onClick={onSave}>
          <Save size={17} />
          Save
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      </div>
    </div>
  );
}
