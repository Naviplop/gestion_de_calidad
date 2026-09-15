import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface TenantBranding {
  organizationName: string;
  logoUrl: string | null;
}

export function useTenantBranding(): TenantBranding {
  const { user } = useAuth();

  return useMemo(() => {
    const tenant = user?.tenant;
    return {
      organizationName: tenant?.name || 'QMS Platform',
      logoUrl: tenant?.logoUrl || null,
    };
  }, [user]);
}
