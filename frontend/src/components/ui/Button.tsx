import { ReactNode } from 'react';
import { Icon } from './Icon';

type IconName = Parameters<typeof Icon>[0]['name'];

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  children?: ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus-visible:ring-slate-500 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500 shadow-sm',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-500',
  subtle: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent focus-visible:ring-slate-500',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium qms-transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : leftIcon ? (
        <Icon name={leftIcon} className="h-4 w-4" />
      ) : null}
      {children}
      {!loading && rightIcon && <Icon name={rightIcon} className="h-4 w-4" />}
    </button>
  );
}
