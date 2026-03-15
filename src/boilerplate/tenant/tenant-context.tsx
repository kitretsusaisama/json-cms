/**
 * Tenant Context Provider
 * 
 * Provides tenant context to React components with settings, features, and limits.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TenantContext, TenantSettings, FeatureFlags, TenantLimits } from '../interfaces/tenant';

interface TenantContextValue {
  tenant: TenantContext | null;
  settings: TenantSettings;
  features: FeatureFlags;
  limits: TenantLimits;
  isLoading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  checkFeature: (feature: string) => boolean;
  checkLimit: (resource: string, amount?: number) => Promise<boolean>;
}

const TenantContextReact = createContext<TenantContextValue | null>(null);

export interface TenantProviderProps {
  children: ReactNode;
  tenantId?: string;
  initialTenant?: TenantContext;
  apiEndpoint?: string;
}

export function TenantProvider({ 
  children, 
  tenantId, 
  initialTenant,
  apiEndpoint = '/api/cms/tenants'
}: TenantProviderProps) {
  const [tenant, setTenant] = useState<TenantContext | null>(initialTenant || null);
  const [isLoading, setIsLoading] = useState(!initialTenant);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async (id?: string) => {
    if (!id && !tenantId) return;
    
    const targetId = id || tenantId;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/${targetId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tenant: ${response.statusText}`);
      }

      const data = await response.json();
      setTenant(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tenant';
      setError(errorMessage);
      console.error('Error fetching tenant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTenant = async () => {
    await fetchTenant();
  };

  const checkFeature = (feature: string): boolean => {
    if (!tenant) return false;
    return tenant.features[feature] === true;
  };

  const checkLimit = async (resource: string, amount: number = 1): Promise<boolean> => {
    if (!tenant) return false;

    try {
      const response = await fetch(`${apiEndpoint}/${tenant.id}/limits/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resource, amount }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.data.allowed;
    } catch (err) {
      console.error('Error checking limit:', err);
      return false;
    }
  };

  useEffect(() => {
    if (!initialTenant && tenantId) {
      fetchTenant();
    }
  }, [tenantId, initialTenant]);

  const contextValue: TenantContextValue = {
    tenant,
    settings: tenant?.settings || {},
    features: tenant?.features || {},
    limits: tenant?.limits || {},
    isLoading,
    error,
    refreshTenant,
    checkFeature,
    checkLimit,
  };

  return (
    <TenantContextReact.Provider value={contextValue}>
      {children}
    </TenantContextReact.Provider>
  );
}

/**
 * Hook to use tenant context
 */
export function useTenant(): TenantContextValue {
  const context = useContext(TenantContextReact);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeature(feature: string): boolean {
  const { checkFeature } = useTenant();
  return checkFeature(feature);
}

/**
 * Hook to check tenant limits
 */
export function useLimit(resource: string) {
  const { checkLimit } = useTenant();
  
  const check = async (amount: number = 1) => {
    return await checkLimit(resource, amount);
  };

  return { check };
}

/**
 * Higher-order component to wrap components with tenant context
 */
export function withTenant<P extends object>(
  Component: React.ComponentType<P>,
  tenantId?: string
) {
  return function TenantWrappedComponent(props: P) {
    return (
      <TenantProvider tenantId={tenantId}>
        <Component {...props} />
      </TenantProvider>
    );
  };
}

/**
 * Component to conditionally render based on feature flags
 */
export interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useFeature(feature);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component to conditionally render based on tenant limits
 */
export interface LimitGateProps {
  resource: string;
  amount?: number;
  children: ReactNode;
  fallback?: ReactNode;
}

export function LimitGate({ resource, amount = 1, children, fallback = null }: LimitGateProps) {
  const { check } = useLimit(resource);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    check(amount).then(setAllowed);
  }, [resource, amount]);

  if (allowed === null) {
    return null; // Loading state
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}

/**
 * Tenant-aware error boundary
 */
interface TenantErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class TenantErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  TenantErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): TenantErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tenant context error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="tenant-error">
          <h2>Tenant Error</h2>
          <p>Something went wrong with the tenant context.</p>
        </div>
      );
    }

    return this.props.children;
  }
}