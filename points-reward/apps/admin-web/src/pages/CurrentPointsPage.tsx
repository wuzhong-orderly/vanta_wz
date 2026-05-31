import { Search, TableProperties } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Pagination, defaultPageSize, paginateRows } from "../components/Pagination";
import type { CurrentPointsRow } from "../types";
import { numberValue } from "../utils";

type CurrentPointSortKey = keyof CurrentPointsRow | "totalPoints";
type SortDirection = "asc" | "desc";

const currentPointColumns: Array<{
  header: string;
  id: string;
  key?: CurrentPointSortKey;
  numeric?: boolean;
}> = [
  { header: "ranking", id: "ranking" },
  { header: "address", id: "address", key: "address" },
  { header: "total_points", id: "totalPoints", key: "totalPoints", numeric: true },
  {
    header: "current_campaign_vanta_points",
    id: "currentPoints",
    key: "totalAccumulatedPointInCurrentCampaign",
    numeric: true
  },
  {
    header: "current_campaign_special_points",
    id: "currentSpecial",
    key: "totalAccumulatedSpecialPointInCurrentCampaign",
    numeric: true
  },
  {
    header: "accumulated_settled_campaign_vanta_points",
    id: "pastPoints",
    key: "totalAccumulatedPointInPastCampaign",
    numeric: true
  },
  {
    header: "accumulated_settled_campaign_special_points",
    id: "pastSpecial",
    key: "totalAccumulatedSpecialPointInPastCampaign",
    numeric: true
  },
  { header: "remark", id: "remark", key: "remark" }
];

export function CurrentPointsPage({ rows }: { rows: CurrentPointsRow[] }) {
  const [sort, setSort] = useState<{ direction: SortDirection; key: CurrentPointSortKey }>({
    direction: "desc",
    key: "totalPoints"
  });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => row.address.toLowerCase().includes(normalizedQuery));
  }, [query, rows]);

  const sortedRows = useMemo(() => {
    const column = currentPointColumns.find((item) => item.key === sort.key);

    return [...filteredRows].sort((left, right) => {
      const result = column?.numeric
        ? getNumericValue(left, sort.key) - getNumericValue(right, sort.key)
        : getTextValue(left, sort.key).localeCompare(getTextValue(right, sort.key), undefined, {
            sensitivity: "base"
          });

      return sort.direction === "asc" ? result : -result;
    });
  }, [filteredRows, sort]);
  const pageRows = paginateRows(sortedRows, page, defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [query, rows.length]);

  function sortRows(key: CurrentPointSortKey) {
    setSort((current) => ({
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
      key
    }));
  }

  return (
    <div className="panel">
      <div className="panel-actions">
        <div className="panel-title">
          <TableProperties size={18} />
          <span>Total points ranking</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="search table-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search address"
          />
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {currentPointColumns.map((column) => (
                <th key={column.id}>
                  <button
                    className="table-sort-button"
                    disabled={!column.key}
                    onClick={() => {
                      if (column.key) {
                        sortRows(column.key);
                      }
                    }}
                  >
                    {column.header}
                    {column.key ? (
                      <span>
                        {sort.key === column.key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => {
              const ranking = sortedRows.indexOf(row) + 1;

              return (
              <tr key={`${row.address}-${index}`}>
                <td>{ranking}</td>
                <td>{row.address}</td>
                <td>{getNumericValue(row, "totalPoints")}</td>
                <td>{row.totalAccumulatedPointInCurrentCampaign}</td>
                <td>{row.totalAccumulatedSpecialPointInCurrentCampaign}</td>
                <td>{row.totalAccumulatedPointInPastCampaign}</td>
                <td>{row.totalAccumulatedSpecialPointInPastCampaign}</td>
                <td>{row.remark}</td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={sortedRows.length} onPageChange={setPage} />
    </div>
  );
}

function getNumericValue(row: CurrentPointsRow, key: CurrentPointSortKey) {
  if (key === "totalPoints") {
    return (
      numberValue(row.totalAccumulatedPointInPastCampaign) +
      numberValue(row.totalAccumulatedPointInCurrentCampaign) +
      numberValue(row.totalAccumulatedSpecialPointInPastCampaign) +
      numberValue(row.totalAccumulatedSpecialPointInCurrentCampaign)
    );
  }

  return numberValue(row[key]);
}

function getTextValue(row: CurrentPointsRow, key: CurrentPointSortKey) {
  if (key === "totalPoints") {
    return String(getNumericValue(row, key));
  }

  return row[key];
}
