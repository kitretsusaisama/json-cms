export interface AdapterLifecycleHooks {
  beforeSetup?: () => Promise<void> | void;
  afterSetup?: () => Promise<void> | void;
  beforeRegisterRoutes?: () => Promise<void> | void;
  afterRegisterRoutes?: () => Promise<void> | void;
  beforeRegisterCMS?: () => Promise<void> | void;
  afterRegisterCMS?: () => Promise<void> | void;
  beforeInjectComponents?: () => Promise<void> | void;
  afterInjectComponents?: () => Promise<void> | void;
  onError?: (error: unknown) => Promise<void> | void;
}

export interface AdapterDiagnostics {
  adapterName: string;
  adapterVersion?: string;
  productionReady: boolean;
  capabilities?: Record<string, boolean>;
  details?: Record<string, unknown>;
}

export interface AdapterV1<
  SetupContext = unknown,
  RouteContext = unknown,
  CMSContext = unknown,
  ComponentContext = unknown,
> {
  setup(context: SetupContext): Promise<void> | void;
  registerRoutes(context: RouteContext): Promise<void> | void;
  registerCMS(context: CMSContext): Promise<void> | void;
  injectComponents(context: ComponentContext): Promise<void> | void;
  lifecycle?: AdapterLifecycleHooks;
  getDiagnostics?: () => AdapterDiagnostics;
}
