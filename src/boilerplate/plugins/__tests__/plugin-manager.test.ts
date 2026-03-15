/**
 * Tests for Plugin Manager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CentralizedPluginManager } from '../plugin-manager';
import { Plugin, PluginManifest } from '../../interfaces/plugin';

// Mock dependencies
vi.mock('../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn()
}));

describe('CentralizedPluginManager', () => {
  let pluginManager: CentralizedPluginManager;
  let mockContentProvider: any;
  let mockPlugin: Plugin;
  let mockManifest: PluginManifest;

  beforeEach(() => {
    mockContentProvider = {
      getPage: vi.fn(),
      setPage: vi.fn()
    };

    mockManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: 'Test Author',
      components: [
        {
          key: 'test-component',
          path: './components/TestComponent.tsx'
        }
      ]
    };

    mockPlugin = {
      manifest: mockManifest,
      install: vi.fn(),
      uninstall: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      update: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      getHealth: vi.fn().mockResolvedValue({ healthy: true })
    };

    pluginManager = new CentralizedPluginManager('./test-plugins', mockContentProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Plugin Installation', () => {
    it('should install a plugin successfully', async () => {
      const pluginId = 'test-plugin';
      const pluginPath = './test-plugins/test-plugin';

      // Mock loadPlugin to return our mock plugin
      vi.spyOn(pluginManager, 'loadPlugin').mockResolvedValue(mockPlugin);

      await pluginManager.installPlugin(pluginId, pluginPath);

      expect(mockPlugin.install).toHaveBeenCalled();
      
      const state = await pluginManager.getPluginState(pluginId);
      expect(state).toMatchObject({
        installed: true,
        activated: false,
        version: '1.0.0'
      });
    });

    it('should fail to install incompatible plugin', async () => {
      const pluginId = 'incompatible-plugin';
      const pluginPath = './test-plugins/incompatible-plugin';

      const incompatiblePlugin = {
        ...mockPlugin,
        manifest: {
          ...mockManifest,
          boilerplate: {
            minVersion: '999.0.0' // Incompatible version
          }
        }
      };

      vi.spyOn(pluginManager, 'loadPlugin').mockResolvedValue(incompatiblePlugin);

      await expect(pluginManager.installPlugin(pluginId, pluginPath))
        .rejects.toThrow('not compatible');
    });
  });

  describe('Plugin Activation', () => {
    beforeEach(async () => {
      const pluginId = 'test-plugin';
      const pluginPath = './test-plugins/test-plugin';

      vi.spyOn(pluginManager, 'loadPlugin').mockResolvedValue(mockPlugin);
      await pluginManager.installPlugin(pluginId, pluginPath);
    });

    it('should activate an installed plugin', async () => {
      const pluginId = 'test-plugin';

      await pluginManager.activatePlugin(pluginId);

      expect(mockPlugin.activate).toHaveBeenCalled();
      
      const state = await pluginManager.getPluginState(pluginId);
      expect(state?.activated).toBe(true);
    });

    it('should fail to activate non-existent plugin', async () => {
      await expect(pluginManager.activatePlugin('non-existent'))
        .rejects.toThrow('not found');
    });

    it('should fail to activate already activated plugin', async () => {
      const pluginId = 'test-plugin';
      
      await pluginManager.activatePlugin(pluginId);
      
      await expect(pluginManager.activatePlugin(pluginId))
        .rejects.toThrow('already activated');
    });
  });

  describe('Plugin Deactivation', () => {
    beforeEach(async () => {
      const pluginId = 'test-plugin';
      const pluginPath = './test-plugins/test-plugin';

      vi.spyOn(pluginManager, 'loadPlugin').mockResolvedValue(mockPlugin);
      await pluginManager.installPlugin(pluginId, pluginPath);
      await pluginManager.activatePlugin(pluginId);
    });

    it('should deactivate an activated plugin', async () => {
      const pluginId = 'test-plugin';

      await pluginManager.deactivatePlugin(pluginId);

      expect(mockPlugin.deactivate).toHaveBeenCalled();
      
      const state = await pluginManager.getPluginState(pluginId);
      expect(state?.activated).toBe(false);
    });

    it('should fail to deactivate non-activated plugin', async () => {
      const pluginId = 'test-plugin';
      
      await pluginManager.deactivatePlugin(pluginId);
      
      await expect(pluginManager.deactivatePlugin(pluginId))
        .rejects.toThrow('not activated');
    });
  });

  describe('Plugin Uninstallation', () => {
    beforeEach(async () => {
      const pluginId = 'test-plugin';
      const pluginPath = './test-plugins/test-plugin';

      vi.spyOn(pluginManager, 'loadPlugin').mockResolvedValue(mockPlugin);
      await pluginManager.installPlugin(pluginId, pluginPath);
    });

    it('should uninstall a plugin', async () => {
      const pluginId = 'test-plugin';

      await pluginManager.uninstallPlugin(pluginId);

      expect(mockPlugin.uninstall).toHaveBeenCalled();
      
      const state = await pluginManager.getPluginState(pluginId);
      expect(state).toBeNull();
    });

    it('should deactivate before uninstalling if activated', async () => {
      const pluginId = 'test-plugin';
      
      await pluginManager.activatePlugin(pluginId);
      await pluginManager.uninstallPlugin(pluginId);

      expect(mockPlugin.deactivate).toHaveBeenCalled();
      expect(mockPlugin.uninstall).toHaveBeenCalled();
    });
  });

  describe('Plugin Validation', () => {
    it('should validate plugin with all required methods', async () => {
      const isValid = await pluginManager.validatePlugin(mockPlugin);
      expect(isValid).toBe(true);
    });

    it('should fail validation for plugin missing required methods', async () => {
      const invalidPlugin = {
        ...mockPlugin,
        install: undefined
      } as any;

      const isValid = await pluginManager.validatePlugin(invalidPlugin);
      expect(isValid).toBe(false);
    });

    it('should validate plugin configuration if method exists', async () => {
      const isValid = await pluginManager.validatePlugin(mockPlugin);
      expect(isValid).toBe(true);
      expect(mockPlugin.validateConfig).toHaveBeenCalled();
    });
  });

  describe('Plugin Health Checks', () => {
    beforeEach(async () => {
      const pluginId = 'test-plugin';
      const pluginPath = './test-plugins/test-plugin';

      vi.spyOn(pluginManager, 'loadPlugin').mockResolvedValue(mockPlugin);
      await pluginManager.installPlugin(pluginId, pluginPath);
      await pluginManager.activatePlugin(pluginId);
    });

    it('should return health status for activated plugin', async () => {
      const pluginId = 'test-plugin';
      
      const health = await pluginManager.getPluginHealth(pluginId);
      
      expect(health.healthy).toBe(true);
      expect(mockPlugin.getHealth).toHaveBeenCalled();
    });

    it('should return unhealthy for non-activated plugin', async () => {
      const pluginId = 'test-plugin';
      
      await pluginManager.deactivatePlugin(pluginId);
      
      const health = await pluginManager.getPluginHealth(pluginId);
      expect(health.healthy).toBe(false);
      expect(health.message).toBe('Plugin not activated');
    });

    it('should return unhealthy for non-existent plugin', async () => {
      const health = await pluginManager.getPluginHealth('non-existent');
      expect(health.healthy).toBe(false);
      expect(health.message).toBe('Plugin not found');
    });
  });

  describe('Plugin Listing', () => {
    it('should list all plugins', async () => {
      const pluginId = 'test-plugin';
      const pluginPath = './test-plugins/test-plugin';

      vi.spyOn(pluginManager, 'loadPlugin').mockResolvedValue(mockPlugin);
      await pluginManager.installPlugin(pluginId, pluginPath);

      const plugins = await pluginManager.listPlugins();
      
      expect(plugins).toHaveProperty(pluginId);
      expect(plugins[pluginId]).toMatchObject({
        installed: true,
        activated: false,
        version: '1.0.0'
      });
    });

    it('should return empty object when no plugins installed', async () => {
      const plugins = await pluginManager.listPlugins();
      expect(plugins).toEqual({});
    });
  });
});