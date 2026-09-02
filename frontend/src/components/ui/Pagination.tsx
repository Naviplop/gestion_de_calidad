import { Button } from './Button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, className = '' }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={`flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 ${className}`}>
      <p className="text-sm text-slate-500">
        {total === 0 ? 'Sin resultados' : (
          <>
            Mostrando <span className="font-medium text-slate-700">{start}</span>–<span className="font-medium text-slate-700">{end}</span> de <span className="font-medium text-slate-700">{total}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!canPrev} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span className="text-sm tabular-nums text-slate-600">
          {page} / {totalPages}
        </span>
        <Button variant="secondary" size="sm" disabled={!canNext} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
