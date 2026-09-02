import { useId, ReactNode } from 'react';
import { Icon } from './Icon';

interface BaseFieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

type IconName = Parameters<typeof Icon>[0]['name'];

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseFieldProps {
  leftIcon?: IconName;
  rightIcon?: IconName;
}

export function Input({
  label,
  helperText,
  error,
  required,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const hasError = Boolean(error);

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <Icon
            name={leftIcon}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
        )}
        <input
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={helperText || error ? `${inputId}-desc` : undefined}
          className={`block h-9 w-full rounded-md border bg-white text-sm text-slate-900 placeholder:text-slate-400 qms-transition focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
            leftIcon ? 'pl-9' : 'px-3'
          } ${rightIcon ? 'pr-9' : 'px-3'} ${
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400'
          }`}
          {...props}
        />
        {rightIcon && (
          <Icon
            name={rightIcon}
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
        )}
      </div>
      {(helperText || error) && (
        <p
          id={`${inputId}-desc`}
          className={`mt-1.5 text-xs ${hasError ? 'text-red-600' : 'text-slate-500'}`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

export function Textarea({
  label,
  helperText,
  error,
  required,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const hasError = Boolean(error);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        aria-invalid={hasError || undefined}
        aria-describedby={helperText || error ? `${inputId}-desc` : undefined}
        className={`block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 qms-transition focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 ${
          hasError
            ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400'
        }`}
        rows={3}
        {...props}
      />
      {(helperText || error) && (
        <p
          id={`${inputId}-desc`}
          className={`mt-1.5 text-xs ${hasError ? 'text-red-600' : 'text-slate-500'}`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

interface FieldGroupProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldGroup({ label, helperText, error, required, children, className = '' }: FieldGroupProps) {
  const hasError = Boolean(error);
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {(helperText || error) && (
        <p className={`mt-1.5 text-xs ${hasError ? 'text-red-600' : 'text-slate-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}
