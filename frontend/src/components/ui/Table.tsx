interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  rowKey?: (item: T) => string;
  className?: string;
  onSort?: (field: string) => void;
}

const alignMap = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function Table<T>({ columns, data, loading, emptyState, onRowClick, rowKey, className = '', onSort }: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width }}
                  className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-500 ${alignMap[column.align || 'left']} ${column.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}
                  onClick={column.sortable ? () => onSort?.(column.key) : undefined}
                >
                  {column.header}
                  {column.sortable ? (
                    <span className="ml-1 text-[10px]">↕</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((item, idx) => (
              <tr
                key={rowKey ? rowKey(item) : idx}
                className={`qms-transition ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/50'}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 text-sm text-slate-700 ${alignMap[column.align || 'left']}`}
                  >
                    {column.render ? column.render(item) : (item as unknown as Record<string, unknown>)[column.key] as string}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
