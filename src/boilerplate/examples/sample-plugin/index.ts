/**
 * Sample Plugin Implementation
 * Demonstrates how to create a plugin for the boilerplate system
 */

import { Plugin, PluginContext } from '../../interfaces/plugin';
import { logger } from '../../../lib/logger';

class SamplePlugin implements Plugin {
  manifest: any; // Will be set by the plugin loader

  /**
   * Install the plugin
   */
  async install(context: PluginContext): Promise<void> {
    context.logger.info('Installing sample plugin...');
    
    // Perform installation tasks
    // - Create database tables
    // - Set up initial configuration
    // - Register components
    
    // Example: Register a component
    if (this.manifest.components) {
      for (const component of this.manifest.components) {
        context.logger.info(`Registering component: ${component.key}`);
        // Component registration is handled by the plugin manager
      }
    }

    // Example: Set up configuration
    context.config.set('initialized', true);
    context.config.set('installDate', new Date().toISOString());

    context.logger.info('Sample plugin installed successfully');
  }

  /**
   * Uninstall the plugin
   */
  async uninstall(context: PluginContext): Promise<void> {
    context.logger.info('Uninstalling sample plugin...');
    
    // Perform cleanup tasks
    // - Remove database tables
    // - Clean up configuration
    // - Unregister components
    
    // Example: Clean up configuration
    context.config.delete('initialized');
    context.config.delete('installDate');

    context.logger.info('Sample plugin uninstalled successfully');
  }

  /**
   * Activate the plugin
   */
  async activate(context: PluginContext): Promise<void> {
    context.logger.info('Activating sample plugin...');
    
    // Perform activation tasks
    // - Start background services
    // - Register event handlers
    // - Enable features
    
    // Example: Register hooks
    context.hooks.on('before-render', async (data) => {
      context.logger.debug('Sample plugin: before-render hook triggered', data);
    });

    // Example: Set activation status
    context.config.set('active', true);
    context.config.set('activatedAt', new Date().toISOString());

    context.logger.info('Sample plugin activated successfully');
  }

  /**
   * Deactivate the plugin
   */
  async deactivate(context: PluginContext): Promise<void> {
    context.logger.info('Deactivating sample plugin...');
    
    // Perform deactivation tasks
    // - Stop background services
    // - Unregister event handlers
    // - Disable features
    
    // Example: Remove hooks
    context.hooks.off('before-render', async () => {});

    // Example: Set deactivation status
    context.config.set('active', false);
    context.config.delete('activatedAt');

    context.logger.info('Sample plugin deactivated successfully');
  }

  /**
   * Update the plugin
   */
  async update(context: PluginContext, fromVersion: string): Promise<void> {
    context.logger.info(`Updating sample plugin from version ${fromVersion} to ${this.manifest.version}`);
    
    // Perform version-specific updates
    if (fromVersion === '0.9.0' && this.manifest.version === '1.0.0') {
      // Example migration
      context.logger.info('Migrating from 0.9.0 to 1.0.0');
      // - Update database schema
      // - Migrate configuration
      // - Update component registrations
    }

    context.config.set('lastUpdated', new Date().toISOString());
    context.logger.info('Sample plugin updated successfully');
  }

  /**
   * Validate plugin configuration
   */
  validateConfig(config: unknown): boolean {
    // Example configuration validation
    if (typeof config !== 'object' || config === null) {
      return false;
    }

    const configObj = config as Record<string, unknown>;
    
    // Check required configuration fields
    if (configObj.apiKey && typeof configObj.apiKey !== 'string') {
      return false;
    }

    if (configObj.maxItems && typeof configObj.maxItems !== 'number') {
      return false;
    }

    return true;
  }

  /**
   * Get plugin health status
   */
  async getHealth(): Promise<{ healthy: boolean; message?: string; details?: Record<string, unknown> }> {
    try {
      // Perform health checks
      // - Check database connectivity
      // - Verify external service availability
      // - Validate configuration
      
      const details = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      return {
        healthy: true,
        message: 'Sample plugin is healthy',
        details
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          error: error instanceof Error ? error.stack : 'Unknown error'
        }
      };
    }
  }
}

// Export the plugin instance
export default new SamplePlugin();