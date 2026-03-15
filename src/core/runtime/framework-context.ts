let activeFramework = process.env.JSONCMS_FRAMEWORK ?? "nextjs";

export function setRuntimeFramework(framework: string): void {
  if (framework && framework.trim()) {
    activeFramework = framework.trim();
  }
}

export function getRuntimeFramework(): string {
  return activeFramework;
}
