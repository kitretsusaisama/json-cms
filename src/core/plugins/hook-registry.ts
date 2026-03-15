export type PluginHookHandler = (payload: unknown) => Promise<unknown> | unknown;

interface RegisteredHook {
  pluginId: string;
  priority: number;
  handler: PluginHookHandler;
}

export class PluginHookRegistry {
  private readonly hooks = new Map<string, RegisteredHook[]>();

  register(
    pluginId: string,
    hookName: string,
    handler: PluginHookHandler,
    priority = 100
  ): () => void {
    const current = this.hooks.get(hookName) ?? [];
    current.push({ pluginId, priority, handler });
    current.sort((left, right) => left.priority - right.priority);
    this.hooks.set(hookName, current);

    return () => this.unregister(pluginId, hookName, handler);
  }

  unregister(pluginId: string, hookName: string, handler: PluginHookHandler): void {
    const current = this.hooks.get(hookName);
    if (!current) {
      return;
    }

    this.hooks.set(
      hookName,
      current.filter(
        (registered) => registered.pluginId !== pluginId || registered.handler !== handler
      )
    );
  }

  unregisterPlugin(pluginId: string): void {
    for (const [hookName, handlers] of this.hooks.entries()) {
      this.hooks.set(
        hookName,
        handlers.filter((registered) => registered.pluginId !== pluginId)
      );
    }
  }

  async run(hookName: string, payload?: unknown): Promise<unknown[]> {
    const handlers = this.hooks.get(hookName) ?? [];
    const settled = await Promise.allSettled(
      handlers.map((registered) => Promise.resolve(registered.handler(payload)))
    );

    return settled
      .filter(
        (result): result is PromiseFulfilledResult<unknown> => result.status === "fulfilled"
      )
      .map((result) => result.value);
  }
}

export const pluginHookRegistry = new PluginHookRegistry();
