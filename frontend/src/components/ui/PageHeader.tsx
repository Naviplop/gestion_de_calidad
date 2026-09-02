import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  metadata?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions, metadata }: PageHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1280px] px-4 pb-5 pt-5 sm:px-6 lg:px-8">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Ruta de navegación" className="mb-2">
            <ol className="flex items-center gap-1.5 text-xs text-slate-500">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5">
                    {crumb.href && !isLast ? (
                      <Link
                        to={crumb.href}
                        className="rounded qms-transition hover:text-slate-700"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? 'font-medium text-slate-700' : ''}>{crumb.label}</span>
                    )}
                    {!isLast && <Icon name="chevron-right" className="h-3 w-3 text-slate-300" />}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
            )}
            {metadata && <div className="mt-2">{metadata}</div>}
          </div>

          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
