interface AvatarProps {
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
}

export function Avatar({ name, email, size = 'md', className = '' }: AvatarProps) {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white ${sizeMap[size]} ${className}`}
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </div>
  );
}
