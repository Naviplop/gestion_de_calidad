import { useId } from 'react';
import { Icon } from './Icon';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  helperText,
  error,
  required,
  options,
  placeholder,
  className = '',
  id,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id || autoId;
  const hasError = Boolean(error);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={hasError || undefined}
          aria-describedby={helperText || error ? `${selectId}-desc` : undefined}
          className={`block h-9 w-full appearance-none rounded-md border bg-white pl-3 pr-9 text-sm text-slate-900 qms-transition focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 ${
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400'
          } ${props.value ? '' : 'text-slate-400'}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
      </div>
      {(helperText || error) && (
        <p
          id={`${selectId}-desc`}
          className={`mt-1.5 text-xs ${hasError ? 'text-red-600' : 'text-slate-500'}`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}
