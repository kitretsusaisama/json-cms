'use client'

import React, { ReactElement, useState } from "react";
import { useRef, useEffect } from 'react';
import { motion, PanInfo, useAnimation, AnimatePresence } from 'framer-motion';

// Type guard for PlanComponent
function isComponent(comp: any): comp is PlanComponent {
  return comp !== null && 
         typeof comp === 'object' && 
         comp.id !== undefined && 
         comp.key !== undefined &&
         comp.props !== undefined;
}

// Safe component access with defaults
function getSafeComponent(comp: any, index: number): PlanComponent {
  if (!comp || typeof comp !== 'object') {
    return {
      id: `component-${index}`,
      props: {},
      weight: 0,
      key: `component-${index}`,
      conditions: []
    };
  }
  
  return {
    id: comp.id ?? `component-${index}`,
    props: comp.props || {},
    weight: typeof comp.weight === 'number' ? comp.weight : 0,
    key: comp.key || `component-${index}`,
    conditions: Array.isArray(comp.conditions) ? comp.conditions : [],
    variant: comp.variant
  };
}

// Define types that match the JsonRendererV2 structure
interface PlanComponent {
  id: string;
  props: Record<string, unknown>;
  weight: number;
  key: string;
  conditions?: { when: string | number | boolean | { op: string; args: any[] }; elseHide: boolean }[];
  variant?: string;
  constraints?: string[];
  name?: string;
  type?: string;
  warnings?: string[];
  errors?: string[];
}

interface PlanMetrics {
  totalComponents: number;
  variantsSelected: number;
  totalWeight: number;
  foldWeight: number;
  constraintsPassed: number;
  constraintsFailed: number;
}

interface PlanResult {
  components: PlanComponent[];
  errors: string[];
  warnings: string[];
  metrics: PlanMetrics;
}

interface ComponentDetails {
  id: string;
  name?: string;
  type?: string;
  props?: Record<string, any>;
  weight?: number;
  variant?: string;
  constraints?: string[];
  warnings?: string[];
  errors?: string[];
  conditions?: string[];
}

interface DraggableState {
  isDragging: boolean;
  position: { x: number; y: number };
  dragOffset: { x: number; y: number } | null;
}

interface DebugInfoProps {
  planResult?: any;
  loadWarnings?: string[];
  cacheKey?: string;
}

interface PanelItemProps {
  title: string;
  value: string;
  subtitle?: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function PanelItem({ title, value, subtitle, isActive, onClick, children }: PanelItemProps) {
  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden backdrop-blur-sm">
      <button
        className="w-full p-3 bg-gray-800/40 hover:bg-gray-700/50 transition-all duration-200 text-left"
        onClick={onClick}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-medium text-gray-200">{title}</div>
            <div className="text-xs text-gray-400">{value}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
          </div>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-gray-800/20 border-t border-gray-700/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DebugInfo({ 
  planResult: unsafePlanResult, 
  loadWarnings = [], 
  cacheKey = '' 
}: DebugInfoProps) {
  const [mounted, setMounted] = useState(false);
  
  // Safely access planResult with defaults
  const planResult = {
    components: Array.isArray(unsafePlanResult?.components) ? unsafePlanResult.components : [],
    errors: Array.isArray(unsafePlanResult?.errors) ? unsafePlanResult.errors : [],
    warnings: Array.isArray(unsafePlanResult?.warnings) ? unsafePlanResult.warnings : [],
    metrics: {
      totalComponents: unsafePlanResult?.metrics?.totalComponents ?? 0,
      variantsSelected: unsafePlanResult?.metrics?.variantsSelected ?? 0,
      totalWeight: unsafePlanResult?.metrics?.totalWeight ?? 0,
      foldWeight: unsafePlanResult?.metrics?.foldWeight ?? 0,
      constraintsPassed: unsafePlanResult?.metrics?.constraintsPassed ?? 0,
      constraintsFailed: unsafePlanResult?.metrics?.constraintsFailed ?? 0,
    },
  };

  const [isMinimized, setIsMinimized] = useState(true);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentDetails | null>(null);
  const [draggable, setDraggable] = useState<DraggableState>({
    isDragging: false,
    position: { x: 0, y: 0 },
    dragOffset: null
  });
  
  const panelRef = useRef<HTMLDivElement>(null);
  const safeLoadWarnings = Array.isArray(loadWarnings) ? loadWarnings : [];
  const totalWarnings = (planResult?.warnings?.length || 0) + safeLoadWarnings.length;

  // Get panel dimensions based on state
  const getPanelDimensions = () => {
    const minWidth = isMinimized ? 200 : 320;
    const maxWidth = isMinimized ? 220 : Math.min(450, window.innerWidth - 40);
    const height = isMinimized ? 50 : Math.min(500, window.innerHeight - 40);
    
    return {
      width: Math.max(minWidth, Math.min(maxWidth, window.innerWidth - 40)),
      height: isMinimized ? 50 : height
    };
  };

  // Calculate initial position (bottom-right with margin)
  const getInitialPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    
    const dimensions = getPanelDimensions();
    const margin = 50;
    
    return {
      x: window.innerWidth - dimensions.width - margin,
      y: window.innerHeight - dimensions.height - margin
    };
  };

  // Constrain position to viewport
  const constrainPosition = (x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    
    const dimensions = getPanelDimensions();
    const margin = 10;
    
    const constrainedX = Math.max(margin, Math.min(x, window.innerWidth - dimensions.width - margin));
    const constrainedY = Math.max(margin, Math.min(y, window.innerHeight - dimensions.height - margin));
    
    return { x: constrainedX, y: constrainedY };
  };

  // Handle initial positioning and mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialPos = getInitialPosition();
      setDraggable(prev => ({
        ...prev,
        position: initialPos
      }));
      setMounted(true);
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      setDraggable(prev => ({
        ...prev,
        position: constrainPosition(prev.position.x, prev.position.y)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted, isMinimized]);

  // Update position when minimized state changes
  useEffect(() => {
    if (!mounted) return;

    setDraggable(prev => ({
      ...prev,
      position: constrainPosition(prev.position.x, prev.position.y)
    }));
  }, [isMinimized, mounted]);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left mouse button
    e.preventDefault();
    e.stopPropagation();
    
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setDraggable(prev => ({
      ...prev,
      isDragging: true,
      dragOffset
    }));
  };

  // Handle drag movement and end
  useEffect(() => {
    if (!draggable.isDragging || !draggable.dragOffset || !mounted) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const newX = e.clientX - draggable.dragOffset!.x;
      const newY = e.clientY - draggable.dragOffset!.y;
      
      const constrainedPos = constrainPosition(newX, newY);
      
      setDraggable(prev => ({
        ...prev,
        position: constrainedPos
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      setDraggable(prev => ({ 
        ...prev, 
        isDragging: false,
        dragOffset: null
      }));
    };

    // Add event listeners to document for global mouse tracking
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [draggable.isDragging, draggable.dragOffset, mounted, isMinimized]);

  const togglePanel = (panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const toggleMinimize = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      setActivePanel(null);
    }
  };

  const StatusBadge = ({ count, type }: { count: number; type: 'warning' | 'error' }) => (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
      type === 'warning' 
        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30' 
        : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
    }`}>
      {count} {type.charAt(0).toUpperCase() + type.slice(1)}{count !== 1 ? 's' : ''}
    </span>
  );

  // Don't render until mounted to prevent hydration mismatches
  if (!mounted) {
    return null;
  }

  const dimensions = getPanelDimensions();

  return (
    <>
      {/* Custom scrollbar styles */}
      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.2);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.5));
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8));
        }
      `}</style>

      <motion.div 
        ref={panelRef}
        className="fixed overflow-hidden rounded-xl shadow-2xl border border-gray-700/50 bg-gray-900/95 backdrop-blur-lg text-gray-100 select-none"
        style={{
          zIndex: 9999,
          width: `${dimensions.width}px`,
          height: isMinimized ? 'auto' : `${dimensions.height}px`,
          left: `${draggable.position.x}px`,
          top: `${draggable.position.y}px`,
          cursor: draggable.isDragging ? 'grabbing' : 'default',
          userSelect: draggable.isDragging ? 'none' : 'auto'
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          boxShadow: draggable.isDragging 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(59, 130, 246, 0.3)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        transition={{ duration: 0.2 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated top accent - premium gradient */}
        <div 
          className="h-px relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #3b82f6 20%, #8b5cf6 40%, #ec4899 60%, #f59e0b 80%, transparent 100%)',
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />
        </div>

        <div 
          className={`flex items-center justify-between px-4 py-2.5 bg-gray-800/80 border-b border-gray-700/50 cursor-move transition-all duration-200 ${
            isHovered || draggable.isDragging ? 'bg-gray-750/90' : ''
          } ${draggable.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
        >
          <div className={`flex items-center gap-3 ${isMinimized ? 'gap-2' : 'gap-3'}`}>
            <div className={`w-2 h-2 rounded-full ${
              planResult.errors.length > 0 ? 'bg-red-500' : 'bg-green-500'
            } shadow-[0_0_8px_var(--tw-shadow-color)] ${
              planResult.errors.length > 0 ? 'shadow-red-500/50' : 'shadow-green-500/50'
            } animate-pulse`} />
            <h3 className={`font-medium tracking-wide text-gray-200 ${
              isMinimized ? 'text-xs' : 'text-sm'
            }`}>
              {isMinimized ? 'DEBUG' : 'DEBUG CONSOLE'}
            </h3>
            {!isMinimized && (
              <div className="flex gap-2 ml-1">
                {totalWarnings > 0 && <StatusBadge count={totalWarnings} type="warning" />}
                {planResult.errors.length > 0 && <StatusBadge count={planResult.errors.length} type="error" />}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isMinimized && (
              <button 
                className="text-gray-400 hover:text-gray-200 p-1 rounded transition-colors hover:bg-gray-700/50"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.reload();
                }}
                aria-label="Refresh"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button 
              className="text-gray-400 hover:text-gray-200 p-1 rounded transition-colors hover:bg-gray-700/50"
              onClick={toggleMinimize}
              aria-label={isMinimized ? 'Expand' : 'Minimize'}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {!isMinimized && (
          <div className="p-4 space-y-3 text-sm overflow-y-auto custom-scrollbar" style={{ maxHeight: `${dimensions.height - 120}px` }}>
            {/* Cache Key */}
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 backdrop-blur-sm">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Cache Key</div>
              <div className="font-mono text-xs text-gray-200 break-all">{cacheKey}</div>
            </div>
            
            {/* Collapsible Panels */}
            <div className="space-y-2">
              <PanelItem 
                title="Components" 
                value={`${planResult.metrics.totalComponents} items`}
                isActive={activePanel === 'components'}
                onClick={() => togglePanel('components')}
                subtitle={planResult.components
                  .flatMap((c: PlanComponent) => c?.constraints || [])
                  .filter((c: string | undefined, i: number, arr: (string | undefined)[]) => c && arr.indexOf(c) === i)
                  .join(', ')}
              >
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-800/30 p-2 rounded backdrop-blur-sm">
                      <div className="text-xs text-gray-400">Total</div>
                      <div className="text-gray-100 font-medium">{planResult.metrics.totalComponents}</div>
                    </div>
                    <div className="bg-gray-800/30 p-2 rounded backdrop-blur-sm">
                      <div className="text-xs text-gray-400">Variants</div>
                      <div className="text-gray-100 font-medium">{planResult.metrics.variantsSelected}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {Array.isArray(planResult.components) && planResult.components.filter(Boolean).length > 0 ? (
                      planResult.components
                        .filter(Boolean)
                        .map((comp, index) => {
                          if (typeof comp !== 'object' || comp === null) {
                            return null;
                          }
                          
                          const id = comp.id ?? `component-${index}`;
                          const name = comp.name ?? 'Unnamed Component';
                          const weight = typeof comp.weight === 'number' ? comp.weight : 0;
                          const type = typeof comp.type === 'string' ? comp.type : 'unknown';
                          const props = comp.props && typeof comp.props === 'object' ? comp.props : {};
                          const constraints = Array.isArray(comp.constraints) ? comp.constraints : [];
                          const warnings = Array.isArray(comp.warnings) ? comp.warnings : [];
                          const errors = Array.isArray(comp.errors) ? comp.errors : [];
                          const variant = typeof comp.variant === 'string' ? comp.variant : undefined;
                          const conditions = Array.isArray(comp.conditions) ? comp.conditions : undefined;
                          
                          const safeComponent: ComponentDetails = { 
                            id, name, type, props, weight, variant, constraints, warnings, errors, conditions
                          };
                        
                          if (!safeComponent) return null;
                          
                          return (
                          <div 
                            key={safeComponent.id}
                            className="p-2 hover:bg-gray-700/50 rounded cursor-pointer transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50 backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComponent(safeComponent);
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-100">
                                  {safeComponent.name !== 'Unnamed Component' 
                                    ? safeComponent.name 
                                    : `Component: ${safeComponent.id}`}
                                </div>
                                <div className="text-xs text-gray-400">ID: {safeComponent.id}</div>
                              </div>
                              <div className="text-xs text-gray-400">
                                Weight: {safeComponent.weight}
                              </div>
                            </div>
                            
                            {safeComponent.constraints && safeComponent.constraints.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-gray-400 mb-1">
                                  Constraints ({safeComponent.constraints.length}):
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {safeComponent.constraints.map((constraint, i) => (
                                    <span 
                                      key={`${safeComponent.id}-constraint-${i}`}
                                      className="inline-block bg-gray-700/50 text-xs px-2 py-0.5 rounded text-gray-300 backdrop-blur-sm"
                                    >
                                      {constraint}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2 text-xs mt-2">
                              {safeComponent.warnings && safeComponent.warnings.length > 0 && (
                                <span className="text-yellow-400">
                                  ⚠️ {safeComponent.warnings.length} warning{safeComponent.warnings.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {safeComponent.errors && safeComponent.errors.length > 0 && (
                                <span className="text-red-400">
                                  ❌ {safeComponent.errors.length} error{safeComponent.errors.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        {Array.isArray(planResult.components) 
                          ? 'No components available' 
                          : 'Invalid components data'}
                      </div>
                    )}
                  </div>
                </div>
              </PanelItem>
              
              <PanelItem 
                title="Weights" 
                value={`Total: ${planResult.metrics.totalWeight}`}
                isActive={activePanel === 'weights'}
                onClick={() => togglePanel('weights')}
                subtitle={`Fold: ${planResult.metrics.foldWeight}`}
              >
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-800/30 p-2 rounded backdrop-blur-sm">
                      <div className="text-xs text-gray-400">Total</div>
                      <div className="text-gray-100 font-medium">{planResult.metrics.totalWeight}</div>
                    </div>
                    <div className="bg-gray-800/30 p-2 rounded backdrop-blur-sm">
                      <div className="text-xs text-gray-400">Fold</div>
                      <div className="text-gray-100 font-medium">{planResult.metrics.foldWeight}</div>
                    </div>
                  </div>
                </div>
              </PanelItem>
              
              <PanelItem 
                title="Constraints" 
                value={`${planResult.metrics.constraintsPassed + planResult.metrics.constraintsFailed} total`}
                isActive={activePanel === 'constraints'}
                onClick={() => togglePanel('constraints')}
                subtitle={`${planResult.metrics.constraintsPassed} passed, ${planResult.metrics.constraintsFailed} failed`}
              >
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-800/30 p-2 rounded backdrop-blur-sm">
                      <div className="text-xs text-green-400">Passed</div>
                      <div className="text-gray-100 font-medium">{planResult.metrics.constraintsPassed}</div>
                    </div>
                    <div className="bg-gray-800/30 p-2 rounded backdrop-blur-sm">
                      <div className="text-xs text-red-400">Failed</div>
                      <div className="text-gray-100 font-medium">{planResult.metrics.constraintsFailed}</div>
                    </div>
                  </div>
                </div>
              </PanelItem>
            </div>
            
            {/* Warnings Section */}
            <PanelItem 
              title="Warnings" 
              value={`${totalWarnings} issue${totalWarnings !== 1 ? 's' : ''}`}
              isActive={activePanel === 'warnings'}
              onClick={() => togglePanel('warnings')}
              subtitle={loadWarnings.length > 0 ? 'Includes load warnings' : ''}
            >
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto custom-scrollbar">
                {totalWarnings > 0 ? (
                  <div className="space-y-2">
                    {[...planResult.warnings, ...loadWarnings].map((warning, index) => (
                      <div key={`warning-${index}`} className="bg-amber-500/10 p-2 rounded text-sm text-amber-300 border-l-2 border-amber-500/50 backdrop-blur-sm">
                        <div className="font-medium">Warning {index + 1}</div>
                        <div className="text-xs font-mono mt-1">{warning}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No warnings to display
                  </div>
                )}
              </div>
            </PanelItem>
            
            {/* Errors Section */}
            <PanelItem 
              title="Errors" 
              value={`${planResult.errors.length} issue${planResult.errors.length !== 1 ? 's' : ''}`}
              isActive={activePanel === 'errors'}
              onClick={() => togglePanel('errors')}
              subtitle={planResult.errors.length > 0 ? 'Critical issues found' : ''}
            >
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto custom-scrollbar">
                {planResult.errors.length > 0 ? (
                  <div className="space-y-2">
                    {planResult.errors.map((error: string, index: number) => (
                      <div key={`error-${index}`} className="bg-red-500/10 p-2 rounded text-sm text-red-300 border-l-2 border-red-500/50 backdrop-blur-sm">
                        <div className="font-medium">Error {index + 1}</div>
                        <div className="text-xs font-mono mt-1">{error}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No errors to display
                  </div>
                )}
              </div>
            </PanelItem>
            
            {/* Quick Actions */}
            <div className="pt-2 border-t border-gray-700/50 mt-4">
              <div className="flex justify-between text-xs gap-2">
                <button 
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1 hover:bg-gray-700/30 px-2 py-1 rounded"
                  onClick={() => {
                    const debugInfo = JSON.stringify({
                      timestamp: new Date().toISOString(),
                      cacheKey,
                      metrics: planResult.metrics,
                      warnings: [...planResult.warnings, ...loadWarnings],
                      errors: planResult.errors
                    }, null, 2);
                    navigator.clipboard.writeText(debugInfo);
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Debug Info
                </button>
                <button 
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1 hover:bg-gray-700/30 px-2 py-1 rounded"
                  onClick={() => window.location.reload()}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Animated bottom accent */}
        <div 
          className="h-px relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #f59e0b 20%, #ec4899 40%, #8b5cf6 60%, #3b82f6 80%, transparent 100%)',
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
              animation: 'shimmer 3s ease-in-out infinite reverse',
            }}
          />
        </div>

        {/* Component Details Modal */}
        <AnimatePresence>
          {selectedComponent && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ zIndex: 10000 }}
              onClick={() => setSelectedComponent(null)}
            >
              <motion.div 
                className="bg-gray-800/95 backdrop-blur-lg rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal top accent */}
                <div 
                  className="h-px relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, #3b82f6 20%, #8b5cf6 40%, #ec4899 60%, #f59e0b 80%, transparent 100%)',
                  }}
                >
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                      animation: 'shimmer 3s ease-in-out infinite',
                    }}
                  />
                </div>

                <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800/95 backdrop-blur-sm z-10">
                  <h3 className="text-lg font-medium text-gray-100">{selectedComponent.name || 'Component Details'}</h3>
                  <button 
                    onClick={() => setSelectedComponent(null)}
                    className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-700/30 p-3 rounded-lg backdrop-blur-sm">
                        <div className="text-xs text-gray-400 mb-1">Weight</div>
                        <div className="text-gray-100 font-medium">{selectedComponent.weight ?? 0}</div>
                      </div>
                      <div className="bg-gray-700/30 p-3 rounded-lg backdrop-blur-sm">
                        <div className="text-xs text-gray-400 mb-1">Type</div>
                        <div className="font-mono text-sm text-gray-300">{selectedComponent.type || 'Unknown'}</div>
                      </div>
                      <div className="bg-gray-700/30 p-3 rounded-lg backdrop-blur-sm col-span-1 sm:col-span-2">
                        <div className="text-xs text-gray-400 mb-1">ID</div>
                        <div className="font-mono text-sm text-gray-300 break-all">{selectedComponent.id || 'N/A'}</div>
                      </div>
                      {selectedComponent.variant && (
                        <div className="bg-gray-700/30 p-3 rounded-lg backdrop-blur-sm col-span-1 sm:col-span-2">
                          <div className="text-xs text-gray-400 mb-1">Variant</div>
                          <div className="font-mono text-sm text-gray-300">{selectedComponent.variant}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Props */}
                  {selectedComponent.props && Object.keys(selectedComponent.props).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Props ({Object.keys(selectedComponent.props).length})</h4>
                      <div className="bg-gray-700/30 p-3 rounded-lg backdrop-blur-sm">
                        <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto custom-scrollbar">
                          {JSON.stringify(selectedComponent.props, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Conditions */}
                  {selectedComponent.conditions && selectedComponent.conditions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-400 mb-2">Conditions ({selectedComponent.conditions.length})</h4>
                      <div className="space-y-2">
                        {selectedComponent.conditions.map((condition, i) => (
                          <div key={`condition-${i}`} className="bg-blue-900/20 p-3 rounded-lg text-sm border-l-4 border-blue-500/50 backdrop-blur-sm">
                            <div className="text-blue-400 font-mono">{condition}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {selectedComponent.constraints && selectedComponent.constraints.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-green-400 mb-2">Constraints ({selectedComponent.constraints.length})</h4>
                      <div className="space-y-2">
                        {selectedComponent.constraints.map((constraint, i) => (
                          <div key={`constraint-${i}`} className="bg-green-900/20 p-3 rounded-lg text-sm border-l-4 border-green-500/50 backdrop-blur-sm">
                            <div className="text-green-400 font-mono">{constraint}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-gray-500 text-sm">No constraints found</div>
                  )}

                  {/* Warnings */}
                  {selectedComponent.warnings && selectedComponent.warnings.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-yellow-400 mb-2">Warnings ({selectedComponent.warnings.length})</h4>
                      <div className="space-y-2">
                        {selectedComponent.warnings.map((warning, i) => (
                          <div key={`warning-${i}`} className="bg-yellow-900/20 p-3 rounded-lg text-sm border-l-4 border-yellow-500/50 backdrop-blur-sm">
                            <div className="text-yellow-400">{warning}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-gray-500 text-sm">No warnings found</div>
                  )}

                  {/* Errors */}
                  {selectedComponent.errors && selectedComponent.errors.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-red-400 mb-2">Errors ({selectedComponent.errors.length})</h4>
                      <div className="space-y-2">
                        {selectedComponent.errors.map((error, i) => (
                          <div key={`error-${i}`} className="bg-red-900/20 p-3 rounded-lg text-sm border-l-4 border-red-500/50 backdrop-blur-sm">
                            <div className="text-red-400">{error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-gray-500 text-sm">No errors found</div>
                  )}
                </div>

                {/* Modal bottom accent */}
                <div 
                  className="h-px relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, #f59e0b 20%, #ec4899 40%, #8b5cf6 60%, #3b82f6 80%, transparent 100%)',
                  }}
                >
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                      animation: 'shimmer 3s ease-in-out infinite reverse',
                    }}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// interface WarningsDisplayProps {
//   warnings: string[];
// }

// // /** Premium Warnings Display for Debug / Planning Mode */
// // export function WarningsDisplay({ warnings }: WarningsDisplayProps): ReactElement {
// //   return (
// //     <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3 pointer-events-none">
// //     <AnimatePresence>
// //       {warnings.map((warning, idx) => (
// //         <motion.div
// //           key={`warning-${idx}`}
// //           className="bg-yellow-800 text-yellow-100 p-3 rounded-xl shadow-xl pointer-events-auto w-72 backdrop-blur-sm border border-yellow-600"
// //           initial={{ opacity: 0, x: 50, scale: 0.95 }}
// //           animate={{ opacity: 1, x: 0, scale: 1 }}
// //           exit={{ opacity: 0, x: 50, scale: 0.95 }}
// //           transition={{ duration: 0.4, ease: "easeOut", delay: idx * 0.1 }}
// //         >
// //           <div className="flex items-center gap-2">
// //             <span className="text-lg">⚠️</span>
// //             <p className="text-sm font-medium">{warning}</p>
// //           </div>
// //         </motion.div>
// //       ))}
// //     </AnimatePresence>
// //   </div>  );
// // }

/** Error display for debug mode */
export function ErrorDisplay({ error, slug }: { error: Error; slug: string }): ReactElement {
  return (
    <div className="min-h-screen bg-red-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-red-800 mb-4">
          🚨 Rendering Failed
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow-lg border border-red-200">
          <div className="mb-4">
            <strong>Page:</strong> {slug}
          </div>
          
          <div className="mb-4">
            <strong>Error:</strong>
            <pre className="bg-gray-100 p-3 rounded mt-2 text-sm overflow-auto">
              {error.message}
            </pre>
          </div>
          
          {error.stack && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-red-700">
                Stack Trace
              </summary>
              <pre className="bg-gray-100 p-3 rounded mt-2 text-xs overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/** Planning error display */
export function PlanningErrorDisplay({
  errors,
  warnings
}: {
  errors: string[];
  warnings: string[];
}): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
  
        {/* Header Section */}
        <div className="mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-3 animate-pulse"></div>
            <span className="text-red-400 text-sm font-medium tracking-wider">CONSTRAINT VIOLATION</span>
          </div>
          
          <h1 className="text-5xl font-extralight text-white mb-4 tracking-tight leading-tight">
            Planning
            <span className="block text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text font-light">
              Constraints Failed
            </span>
          </h1>
          
          <p className="text-gray-400 text-lg font-light max-w-2xl leading-relaxed">
            Critical violations detected in your component configuration. Review and resolve the following issues to proceed.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8">
          {/* Errors Section */}
          <div className="group">
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-red-500/30 transition-all duration-300">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white tracking-tight">Critical Violations</h2>
                  <p className="text-gray-400 text-sm mt-1">{errors.length} issues require immediate attention</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {errors.map((error, index) => (
                  <div key={`error-${error}`} className="group/item flex items-start p-4 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200">
                    <div className="flex-shrink-0 w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center mr-4 mt-1">
                      <span className="text-red-400 text-xs font-bold">{index + 1}</span>
                    </div>
                    <p className="text-gray-200 leading-relaxed font-light">{error}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div className="group">
              <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-yellow-500/30 transition-all duration-300">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white tracking-tight">Advisory Warnings</h2>
                    <p className="text-gray-400 text-sm mt-1">{warnings.length} recommendations for optimization</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {warnings.map((warning, index) => (
                    <div key={`plan-warning-${warning}`} className="group/item flex items-start p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl hover:bg-yellow-500/10 hover:border-yellow-500/20 transition-all duration-200">
                      <div className="flex-shrink-0 w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center mr-4 mt-1">
                        <span className="text-yellow-400 text-xs font-bold">{index + 1}</span>
                      </div>
                      <p className="text-gray-200 leading-relaxed font-light">{warning}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Section */}
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/20 rounded-2xl p-8">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-6 flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Recommended Actions</h3>
                <p className="text-gray-300 leading-relaxed font-light mb-4">
                  Review your page constraints and component configurations to resolve these issues. 
                  Some components may have been automatically removed to satisfy critical constraints.
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <span className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-medium tracking-wide hover:bg-white/20 transition-colors cursor-pointer">
                    Review Configuration
                  </span>
                  <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm font-medium tracking-wide hover:bg-white/10 transition-colors cursor-pointer">
                    Check Dependencies
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center text-gray-500 text-sm">
            <div className="w-1 h-1 bg-gray-500 rounded-full mr-2"></div>
            System Status: Constraints Engine Active
            <div className="w-1 h-1 bg-gray-500 rounded-full ml-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
/** Fallback renderer for production errors */
export function FallbackRenderer({ slug: _slug }: { slug: string }): ReactElement {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Page Temporarily Unavailable
        </h1>
        <p className="text-gray-600 mb-6">
          We&apos;re working to resolve this issue. Please try again later.
        </p>
        <a 
          href={typeof window !== 'undefined' ? window.location.href : '/'}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reload Page
        </a>
      </div>
    </div>
  );
}