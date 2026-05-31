export const defaultPageSize = 20;

export function Pagination({
  page,
  pageSize = defaultPageSize,
  total,
  onPageChange
}: {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  return (
    <div className="pagination">
      <span>
        {start}-{end} of {total}
      </span>
      <button
        className="secondary-button"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        Previous
      </button>
      <strong>
        {safePage} / {totalPages}
      </strong>
      <button
        className="secondary-button"
        disabled={safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
      >
        Next
      </button>
    </div>
  );
}

export function paginateRows<T>(rows: T[], page: number, pageSize = defaultPageSize) {
  return rows.slice((page - 1) * pageSize, page * pageSize);
}
