import type { AdapterDiagnostics, AdapterLifecycleHooks, AdapterV1 } from "@upflame/adapter-contract";
import type { DetectedFrameworkId } from "./project-detection";

export type SupportedFramework = DetectedFrameworkId | "vite";

export interface FrameworkCapabilities {
  ssr: boolean;
  ssg: boolean;
  apiRoutes: boolean;
  serverComponents: boolean;
  streaming: boolean;
}

export interface FrameworkRuntimeHooks {
  beforeBootstrap?: () => Promise<void> | void;
  afterBootstrap?: () => Promise<void> | void;
}

export interface FrameworkAdapterContext {
  rootDir?: string;
}

export interface FrameworkAdapter
  extends AdapterV1<FrameworkAdapterContext, FrameworkAdapterContext, FrameworkAdapterContext, FrameworkAdapterContext> {
  name: SupportedFramework;
  productionReady: boolean;
  capabilities: FrameworkCapabilities;
  detect(rootDir?: string): Promise<boolean>;
  bootstrap(rootDir?: string): Promise<{
    rootDir: string;
    dataRoot: string;
    ready: boolean;
  }>;
  resolveDataRoot(rootDir?: string): string;
  createRuntimeHooks(): FrameworkRuntimeHooks;
  lifecycle?: AdapterLifecycleHooks;
  getDiagnostics?: () => AdapterDiagnostics;
}

export interface FrameworkDetectionResult {
  framework: SupportedFramework;
  adapter: FrameworkAdapter;
}
