/**
 * Plugin Management API Routes
 * Provides REST endpoints for plugin lifecycle management
 */

import { NextRequest, NextResponse } from 'next/server';
import { CentralizedPluginManager } from '../plugins/plugin-manager';
import { pluginLoader, PluginSource } from '../plugins/plugin-loader';
import { APIEnvelope } from './envelope';
import { logger } from '../../lib/logger';

// Initialize plugin manager (in production, this would be a singleton)
let pluginManager: CentralizedPluginManager | null = null;

function getPluginManager(): CentralizedPluginManager {
  if (!pluginManager) {
    // TODO: Get content provider from dependency injection
    const contentProvider = {} as any; // Placeholder
    pluginManager = new CentralizedPluginManager('./plugins', contentProvider);
  }
  return pluginManager;
}

/**
 * GET /api/cms/plugins
 * List all plugins
 */
export async function handleListPlugins(req: NextRequest): Promise<NextResponse> {
  try {
    const manager = getPluginManager();
    const plugins = await manager.listPlugins();

    const response: APIEnvelope<typeof plugins> = {
      data: plugins,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        count: Object.keys(plugins).length
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to list plugins', { error });
    return NextResponse.json(
      {
        error: 'Failed to list plugins',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cms/plugins/[pluginId]
 * Get plugin information
 */
export async function handleGetPlugin(
  req: NextRequest,
  pluginId: string
): Promise<NextResponse> {
  try {
    const manager = getPluginManager();
    const plugin = await manager.getPlugin(pluginId);
    const state = await manager.getPluginState(pluginId);

    if (!plugin || !state) {
      return NextResponse.json(
        {
          error: 'Plugin not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        { status: 404 }
      );
    }

    const response: APIEnvelope<{ manifest: typeof plugin.manifest; state: typeof state }> = {
      data: {
        manifest: plugin.manifest,
        state
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get plugin', { pluginId, error });
    return NextResponse.json(
      {
        error: 'Failed to get plugin information',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms/plugins/install
 * Install a plugin
 */
export async function handleInstallPlugin(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { pluginId, source } = body;

    if (!pluginId || !source) {
      return NextResponse.json(
        {
          error: 'Missing required fields: pluginId, source',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        { status: 400 }
      );
    }

    // Load plugin from source
    const loadResult = await pluginLoader.loadPlugin(source as PluginSource);
    if (!loadResult.success) {
      return NextResponse.json(
        {
          error: `Failed to load plugin: ${loadResult.error}`,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        { status: 400 }
      );
    }

    // Install plugin
    const manager = getPluginManager();
    await manager.installPlugin(pluginId, source.location);

    const response: APIEnvelope<{ pluginId: string; status: string; warnings?: string[] }> = {
      data: {
        pluginId,
        status: 'installed',
        warnings: loadResult.warnings
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to install plugin', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to install plugin',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cms/plugins/[pluginId]
 * Uninstall a plugin
 */
export async function handleUninstallPlugin(
  req: NextRequest,
  pluginId: string
): Promise<NextResponse> {
  try {
    const manager = getPluginManager();
    await manager.uninstallPlugin(pluginId);

    const response: APIEnvelope<{ pluginId: string; status: string }> = {
      data: {
        pluginId,
        status: 'uninstalled'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to uninstall plugin', { pluginId, error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to uninstall plugin',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms/plugins/[pluginId]/activate
 * Activate a plugin
 */
export async function handleActivatePlugin(
  req: NextRequest,
  pluginId: string
): Promise<NextResponse> {
  try {
    const manager = getPluginManager();
    await manager.activatePlugin(pluginId);

    const response: APIEnvelope<{ pluginId: string; status: string }> = {
      data: {
        pluginId,
        status: 'activated'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to activate plugin', { pluginId, error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to activate plugin',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms/plugins/[pluginId]/deactivate
 * Deactivate a plugin
 */
export async function handleDeactivatePlugin(
  req: NextRequest,
  pluginId: string
): Promise<NextResponse> {
  try {
    const manager = getPluginManager();
    await manager.deactivatePlugin(pluginId);

    const response: APIEnvelope<{ pluginId: string; status: string }> = {
      data: {
        pluginId,
        status: 'deactivated'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to deactivate plugin', { pluginId, error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to deactivate plugin',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cms/plugins/[pluginId]
 * Update a plugin
 */
export async function handleUpdatePlugin(
  req: NextRequest,
  pluginId: string
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { version } = body;

    if (!version) {
      return NextResponse.json(
        {
          error: 'Missing required field: version',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        { status: 400 }
      );
    }

    const manager = getPluginManager();
    await manager.updatePlugin(pluginId, version);

    const response: APIEnvelope<{ pluginId: string; status: string; version: string }> = {
      data: {
        pluginId,
        status: 'updated',
        version
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to update plugin', { pluginId, error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update plugin',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cms/plugins/[pluginId]/health
 * Get plugin health status
 */
export async function handleGetPluginHealth(
  req: NextRequest,
  pluginId: string
): Promise<NextResponse> {
  try {
    const manager = getPluginManager();
    const health = await manager.getPluginHealth(pluginId);

    const response: APIEnvelope<typeof health> = {
      data: health,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get plugin health', { pluginId, error });
    return NextResponse.json(
      {
        error: 'Failed to get plugin health status',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cms/plugins/[pluginId]/dependencies
 * Get plugin dependencies
 */
export async function handleGetPluginDependencies(
  req: NextRequest,
  pluginId: string
): Promise<NextResponse> {
  try {
    const manager = getPluginManager();
    const dependencies = await manager.getDependencies(pluginId);

    const response: APIEnvelope<{ dependencies: string[] }> = {
      data: {
        dependencies
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get plugin dependencies', { pluginId, error });
    return NextResponse.json(
      {
        error: 'Failed to get plugin dependencies',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}