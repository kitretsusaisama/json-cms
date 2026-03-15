import {
  createFrameworkRegistry,
  defaultFrameworkAdapters,
  frameworkIntelligenceAdapters,
  inspectProjectIntelligence,
} from "@upflame/installer-core";

export const frameworkRegistry = createFrameworkRegistry(defaultFrameworkAdapters);
const intelligenceRegistry = createFrameworkRegistry(frameworkIntelligenceAdapters);

export interface FrameworkDetectionResult {
  detected?: string;
  confidence?: number;
  supported: boolean;
}

export async function detectFrameworkFromProject(cwd: string): Promise<FrameworkDetectionResult> {
  const report = await inspectProjectIntelligence(cwd);
  const top = report.frameworkCandidates[0];

  if (!top) {
    return { supported: false };
  }

  const supported = intelligenceRegistry.get(top.id)?.supported ?? false;

  return {
    detected: top.id,
    confidence: top.confidence,
    supported,
  };
}
