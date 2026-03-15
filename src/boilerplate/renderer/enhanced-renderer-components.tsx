/**
 * Enhanced Renderer Components
 * Provides enhanced error handling, debug information, and fallback strategies
 */

import React from "react";
import { TenantContext } from "../interfaces/tenant";
import { AuthContext } from "../interfaces/auth";

export interface ErrorDisplayProps {
  error: Error;
  slug: string;
  tenantContext?: TenantContext;
  authContext?: AuthContext;
}

export interface PlanningErrorDisplayProps {
  errors: Array<{ message: string; code?: string; details?: unknown }>;
  warnings: Array<{ message: string; suggestion?: string }>;
  tenantContext?: TenantContext;
  authContext?: AuthContext;
}

export interface FallbackRendererProps {
  slug: string;
  tenantContext?: TenantContext;
  authContext?: AuthContext;
  message?: string;
}

export interface DebugInfoProps {
  planResult: {
    components: Array<{ id: string; key: string }>;
    metrics: Record<string, unknown>;
    warnings: Array<{ message: string }>;
  };
  loadWarnings: Array<{ message: string }>;
  cacheKey: string;
  tenantContext?: TenantContext;
  authContext?: AuthContext;
}

/**
 * Enhanced Error Display with tenant and auth context
 */
export function ErrorDisplay({ 
  error, 
  slug, 
  tenantContext, 
  authContext 
}: ErrorDisplayProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 border border-red-200">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">
              Page Rendering Error
            </h3>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-red-700 mb-2">
            An error occurred while rendering the page "{slug}".
          </p>
          <div className="bg-red-100 border border-red-200 rounded p-3">
            <p className="text-xs font-mono text-red-800 break-all">
              {error.message}
            </p>
          </div>
        </div>

        {(tenantContext || authContext) && (
          <div className="mb-4 p-3 bg-gray-50 rounded border">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Context Information</h4>
            {tenantContext && (
              <p className="text-xs text-gray-600">
                Tenant: {tenantContext.name} ({tenantContext.id})
              </p>
            )}
            {authContext?.user && (
              <p className="text-xs text-gray-600">
                User: {authContext.user.name} ({authContext.user.id})
              </p>
            )}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry
          </button>
          <button
            onClick={() => window.history.back()}
            className="text-red-600 hover:text-red-800 text-sm px-4 py-2 focus:outline-none"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Enhanced Planning Error Display
 */
export function PlanningErrorDisplay({ 
  errors, 
  warnings, 
  tenantContext, 
  authContext 
}: PlanningErrorDisplayProps) {
  return (
    <div className="min-h-screen bg-orange-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-orange-500 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">
              Page Planning Errors
            </h2>
            <p className="text-orange-100 text-sm mt-1">
              The page layout could not be planned due to constraint violations
            </p>
          </div>
          
          <div className="p-6">
            {(tenantContext || authContext) && (
              <div className="mb-6 p-4 bg-gray-50 rounded border">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Context Information</h3>
                {tenantContext && (
                  <p className="text-xs text-gray-600 mb-1">
                    Tenant: {tenantContext.name} ({tenantContext.id})
                  </p>
                )}
                {authContext?.user && (
                  <p className="text-xs text-gray-600">
                    User: {authContext.user.name} ({authContext.user.id})
                  </p>
                )}
              </div>
            )}

            {errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-red-800 mb-3">Errors</h3>
                <div className="space-y-3">
                  {errors.map((error, index) => (
                    <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm text-red-800 font-medium">
                            {error.message}
                          </p>
                          {error.code && (
                            <p className="text-xs text-red-600 mt-1">
                              Code: {error.code}
                            </p>
                          )}
                          {error.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-red-600 cursor-pointer">
                                Show Details
                              </summary>
                              <pre className="text-xs text-red-700 mt-1 bg-red-100 p-2 rounded overflow-auto">
                                {JSON.stringify(error.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-yellow-800 mb-3">Warnings</h3>
                <div className="space-y-3">
                  {warnings.map((warning, index) => (
                    <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800">
                            {warning.message}
                          </p>
                          {warning.suggestion && (
                            <p className="text-xs text-yellow-700 mt-1">
                              Suggestion: {warning.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Retry Page Load
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Enhanced Fallback Renderer with tenant context
 */
export function FallbackRenderer({ 
  slug, 
  tenantContext, 
  authContext, 
  message 
}: FallbackRendererProps) {
  const defaultMessage = `The page "${slug}" is temporarily unavailable.`;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Page Unavailable
        </h2>
        
        <p className="text-gray-600 mb-6">
          {message || defaultMessage}
        </p>

        {tenantContext && (
          <div className="mb-6 p-3 bg-gray-50 rounded border text-left">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Site Information</h4>
            <p className="text-xs text-gray-600">
              {tenantContext.name}
            </p>
            {tenantContext.domain && (
              <p className="text-xs text-gray-500">
                {tenantContext.domain}
              </p>
            )}
          </div>
        )}
        
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full text-blue-600 hover:text-blue-800 px-4 py-2 focus:outline-none"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Enhanced Debug Information with tenant and auth context
 */
export function DebugInfo({ 
  planResult, 
  loadWarnings, 
  cacheKey, 
  tenantContext, 
  authContext 
}: DebugInfoProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg overflow-hidden max-w-md">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 text-left bg-gray-800 hover:bg-gray-700 focus:outline-none focus:bg-gray-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Debug Info</span>
            <svg 
              className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        
        {isExpanded && (
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-4 text-xs">
              {/* Context Information */}
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">Context</h4>
                <div className="space-y-1">
                  <div>Cache Key: <span className="text-gray-300">{cacheKey}</span></div>
                  {tenantContext && (
                    <div>Tenant: <span className="text-gray-300">{tenantContext.name} ({tenantContext.id})</span></div>
                  )}
                  {authContext?.user && (
                    <div>User: <span className="text-gray-300">{authContext.user.name} ({authContext.user.id})</span></div>
                  )}
                  {authContext?.roles && authContext.roles.length > 0 && (
                    <div>Roles: <span className="text-gray-300">{authContext.roles.join(', ')}</span></div>
                  )}
                </div>
              </div>

              {/* Plan Results */}
              <div>
                <h4 className="font-semibold text-green-300 mb-2">Plan Results</h4>
                <div className="space-y-1">
                  <div>Components: <span className="text-gray-300">{planResult.components.length}</span></div>
                  <div>Metrics: <span className="text-gray-300">{JSON.stringify(planResult.metrics)}</span></div>
                </div>
              </div>

              {/* Components */}
              {planResult.components.length > 0 && (
                <div>
                  <h4 className="font-semibold text-purple-300 mb-2">Components</h4>
                  <div className="space-y-1">
                    {planResult.components.map((component, index) => (
                      <div key={index} className="text-gray-300">
                        {component.key} ({component.id})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {(planResult.warnings.length > 0 || loadWarnings.length > 0) && (
                <div>
                  <h4 className="font-semibold text-yellow-300 mb-2">Warnings</h4>
                  <div className="space-y-1">
                    {planResult.warnings.map((warning, index) => (
                      <div key={`plan-${index}`} className="text-yellow-200 text-xs">
                        Plan: {warning.message}
                      </div>
                    ))}
                    {loadWarnings.map((warning, index) => (
                      <div key={`load-${index}`} className="text-yellow-200 text-xs">
                        Load: {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tenant Features */}
              {tenantContext?.features && Object.keys(tenantContext.features).length > 0 && (
                <div>
                  <h4 className="font-semibold text-indigo-300 mb-2">Tenant Features</h4>
                  <div className="space-y-1">
                    {Object.entries(tenantContext.features).map(([feature, enabled]) => (
                      <div key={feature} className="text-gray-300">
                        {feature}: <span className={enabled ? 'text-green-300' : 'text-red-300'}>
                          {enabled ? 'enabled' : 'disabled'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Loading Spinner Component
 */
export function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Retry Button Component
 */
export function RetryButton({ 
  onRetry, 
  disabled = false, 
  children = "Retry" 
}: { 
  onRetry: () => void; 
  disabled?: boolean; 
  children?: React.ReactNode; 
}) {
  return (
    <button
      onClick={onRetry}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
      }`}
    >
      {children}
    </button>
  );
}