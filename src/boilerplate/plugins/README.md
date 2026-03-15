# Plugin System

The boilerplate plugin system provides a comprehensive architecture for extending CMS functionality through plugins. Plugins can register components, API endpoints, routes, hooks, and permissions.

## Architecture Overview

The plugin system consists of several key components:

- **Plugin Manager**: Core lifecycle management for plugins
- **Plugin Loader**: Loading and validation of plugins from various sources
- **Plugin Registry**: Component registration and management
- **Plugin Hooks**: Event system for plugin interaction
- **API Routes**: REST endpoints for plugin management

## Plugin Structure

A plugin is a directory containing:

```
my-plugin/
├── plugin.json          # Plugin manifest
├── index.ts             # Plugin entry point
├── components/          # React components (optional)
├── handlers/            # API handlers (optional)
├── hooks/              # Hook handlers (optional)
└── README.md           # Plugin documentation
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "author": "Your Name",
  "license": "MIT",
  "boilerplate": {
    "minVersion": "1.0.0"
  },
  "components": [
    {
      "key": "my-component",
      "path": "./components/MyComponent.tsx",
      "metadata": {
        "name": "My Component",
        "description": "A sample component",
        "category": "content"
      }
    }
  ],
  "apiEndpoints": [
    {
      "path": "/api/my-plugin",
      "methods": ["GET", "POST"],
      "handler": "./handlers/api.js"
    }
  ],
  "hooks": [
    {
      "name": "before-render",
      "handler": "./hooks/beforeRender.js"
    }
  ]
}
```

### Plugin Implementation

```typescript
import { Plugin, PluginContext } from '@/boilerplate/interfaces/plugin';

class MyPlugin implements Plugin {
  manifest: any;

  async install(context: PluginContext): Promise<void> {
    // Installation logic
    context.logger.info('Installing plugin...');
  }

  async uninstall(context: PluginContext): Promise<void> {
    // Cleanup logic
    context.logger.info('Uninstalling plugin...');
  }

  async activate(context: PluginContext): Promise<void> {
    // Activation logic
    context.logger.info('Activating plugin...');
  }

  async deactivate(context: PluginContext): Promise<void> {
    // Deactivation logic
    context.logger.info('Deactivating plugin...');
  }
}

export default new MyPlugin();
```

## Plugin Lifecycle

1. **Install**: Plugin is loaded and installed into the system
2. **Activate**: Plugin is activated and its features become available
3. **Deactivate**: Plugin is deactivated but remains installed
4. **Uninstall**: Plugin is completely removed from the system

## Component Registration

Plugins can register React components that become available in the component registry:

```typescript
// In your component file
export default function MyComponent({ title, content }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
}

export const metadata = {
  name: 'My Component',
  description: 'A sample component',
  category: 'content',
  props: {
    title: { type: 'string', required: true },
    content: { type: 'string', required: false }
  }
};
```

## API Endpoints

Plugins can register custom API endpoints:

```typescript
// In your handler file
export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Hello from plugin!' });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Handle POST request
  return NextResponse.json({ success: true });
}
```

## Hooks System

Plugins can listen to and emit events:

```typescript
// In your plugin
async activate(context: PluginContext): Promise<void> {
  // Listen to events
  context.hooks.on('before-render', async (data) => {
    console.log('Page is about to render:', data);
  });

  // Emit events
  await context.hooks.emit('plugin-activated', { pluginId: context.pluginId });
}
```

## Configuration Management

Plugins have access to a configuration system:

```typescript
async activate(context: PluginContext): Promise<void> {
  // Set configuration
  context.config.set('apiKey', 'your-api-key');
  
  // Get configuration
  const apiKey = context.config.get('apiKey');
  
  // Check if configuration exists
  if (context.config.has('apiKey')) {
    // Use the API key
  }
}
```

## Plugin Management API

### List Plugins
```
GET /api/cms/plugins
```

### Get Plugin Info
```
GET /api/cms/plugins/{pluginId}
```

### Install Plugin
```
POST /api/cms/plugins?action=install
{
  "pluginId": "my-plugin",
  "source": {
    "type": "directory",
    "location": "./plugins/my-plugin"
  }
}
```

### Activate Plugin
```
POST /api/cms/plugins/{pluginId}/activate
```

### Deactivate Plugin
```
POST /api/cms/plugins/{pluginId}/deactivate
```

### Uninstall Plugin
```
DELETE /api/cms/plugins/{pluginId}
```

### Get Plugin Health
```
GET /api/cms/plugins/{pluginId}/health
```

## Best Practices

1. **Validation**: Always validate plugin configuration and inputs
2. **Error Handling**: Implement proper error handling and logging
3. **Dependencies**: Clearly specify plugin dependencies
4. **Versioning**: Use semantic versioning for your plugins
5. **Documentation**: Provide clear documentation for your plugin
6. **Testing**: Include tests for your plugin functionality
7. **Security**: Validate all inputs and implement proper permissions

## Example Plugin

See the sample plugin in `src/boilerplate/examples/sample-plugin/` for a complete example implementation.

## Development Workflow

1. Create plugin directory structure
2. Define plugin manifest (plugin.json)
3. Implement plugin class with required methods
4. Create components, handlers, and hooks as needed
5. Test plugin installation and activation
6. Document plugin functionality

## Troubleshooting

### Plugin Won't Load
- Check plugin.json syntax
- Verify all required fields are present
- Check file paths in manifest

### Component Not Registering
- Verify component export structure
- Check component metadata
- Ensure plugin is activated

### API Endpoints Not Working
- Check handler file paths
- Verify HTTP methods are correct
- Check for permission requirements

### Hooks Not Firing
- Verify hook registration in activate method
- Check event names match exactly
- Ensure plugin is activated