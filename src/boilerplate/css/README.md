# CSS Isolation and Compatibility System

The CSS Isolation and Compatibility System provides comprehensive tools for preventing CSS conflicts when integrating CMS components into existing Next.js projects. It automatically detects CSS frameworks, analyzes potential conflicts, and generates isolation strategies to ensure your CMS components render correctly without affecting existing styles.

## Features

- **Automatic CSS Framework Detection**: Detects Tailwind CSS, Bootstrap, CSS Modules, styled-components, Emotion, and custom CSS
- **Conflict Analysis**: Identifies potential CSS conflicts and provides severity ratings
- **Multiple Isolation Strategies**: Supports namespace wrapping, CSS-in-JS, Shadow DOM, and CSS Modules
- **Auto-Fix Generation**: Automatically generates CSS fixes for common conflicts
- **CLI Integration**: Command-line tools for analysis, generation, and validation
- **React Component Wrapping**: Automatically wraps components with isolation containers

## Quick Start

### 1. Analyze Your Project

```bash
npm run dx css:analyze
```

This will scan your project for CSS frameworks and potential conflicts.

### 2. Generate Isolation CSS

```bash
npm run dx css:generate
```

This creates a CSS isolation file with compatibility layers for your detected frameworks.

### 3. Import the Generated CSS

Add the generated CSS file to your main application:

```tsx
// In your _app.tsx or layout.tsx
import '../styles/cms-isolation.css';
```

### 4. Wrap CMS Components

```tsx
import { createCSSManager } from '@/boilerplate/css';

const cssManager = createCSSManager();

// Wrap your CMS components
const IsolatedButton = cssManager.wrapComponent(Button, 'Button');
const IsolatedCard = cssManager.wrapComponent(Card, 'Card');
```

## CLI Commands

### `css:analyze`

Analyzes your project for CSS conflicts and compatibility issues.

```bash
npm run dx css:analyze [project-path] [options]

Options:
  -o, --output <path>    Output report file path
  -v, --verbose          Show detailed analysis
  -r, --report           Generate detailed JSON report
```

### `css:generate`

Generates CSS isolation and compatibility files.

```bash
npm run dx css:generate [project-path] [options]

Options:
  -o, --output <path>       Output CSS file path (default: src/styles/cms-isolation.css)
  -n, --namespace <name>    CSS namespace (default: cms)
  -p, --prefix <prefix>     CSS class prefix (default: cms-)
  -s, --strategy <strategy> Isolation strategy (namespace|css-in-js|shadow-dom|css-modules)
  --auto-fix               Generate auto-fixes for detected conflicts
```

### `css:validate`

Validates existing CSS isolation setup.

```bash
npm run dx css:validate [project-path] [options]

Options:
  -o, --output <path>    CSS isolation file path
  -v, --verbose          Show detailed validation output
```

### `css:setup`

Interactive setup wizard for CSS isolation.

```bash
npm run dx css:setup [project-path]
```

## Programmatic Usage

### Basic Setup

```tsx
import { 
  CSSManager, 
  createCSSManager, 
  detectCSSStrategies 
} from '@/boilerplate/css';

// Detect CSS strategies in your project
const cssStrategies = await detectCSSStrategies('./');

// Create CSS manager
const cssManager = createCSSManager(cssStrategies);

// Setup CSS isolation
const setup = await cssManager.setupCSSIsolation('./');
```

### Component Wrapping

```tsx
import React from 'react';
import { CSSIsolationManager } from '@/boilerplate/css';

const isolationConfig = {
  strategy: 'namespace' as const,
  namespace: 'cms',
  prefix: 'cms-',
  wrapperClass: 'cms-isolated',
  isolateGlobals: true
};

const isolationManager = new CSSIsolationManager(isolationConfig);

// Wrap a component
const MyComponent = () => <div>Hello World</div>;
const IsolatedComponent = isolationManager.wrapComponent(MyComponent, 'MyComponent');
```

### Conflict Detection

```tsx
import { CSSConflictDetector } from '@/boilerplate/css';

const conflictDetector = new CSSConflictDetector(cssStrategies, globalStyles);
const analysis = await conflictDetector.analyzeConflicts();

console.log(`Risk Score: ${analysis.riskScore}/100`);
console.log(`Conflicts: ${analysis.conflicts.length}`);
```

## Isolation Strategies

### 1. Namespace Strategy (Default)

Wraps components in containers with namespaced CSS classes.

```css
.cms-isolated {
  isolation: isolate;
  position: relative;
  z-index: 1;
}

.cms-isolated * {
  box-sizing: border-box;
}
```

### 2. CSS-in-JS Strategy

Uses inline styles and CSS-in-JS for complete isolation.

```tsx
const IsolatedComponent = ({ children }) => (
  <div style={{ isolation: 'isolate', position: 'relative' }}>
    {children}
  </div>
);
```

### 3. Shadow DOM Strategy

Uses Shadow DOM for complete style encapsulation (where supported).

```tsx
const ShadowComponent = ({ children }) => {
  // Creates shadow DOM boundary
  return <shadow-wrapper>{children}</shadow-wrapper>;
};
```

### 4. CSS Modules Strategy

Uses CSS Modules for scoped component styles.

```css
/* component.module.css */
.wrapper {
  isolation: isolate;
}
```

## Framework Compatibility

### Tailwind CSS

- **Detection**: Looks for `tailwind.config.js` and `@tailwind` directives
- **Conflicts**: Utility class naming, CSS reset conflicts
- **Resolution**: Namespace prefixing, utility preservation

```css
/* Tailwind Compatibility */
.cms-isolated .tw-flex { display: flex; }
.cms-isolated .tw-grid { display: grid; }
```

### Bootstrap

- **Detection**: Looks for Bootstrap dependencies and grid classes
- **Conflicts**: Grid system, utility classes, global resets
- **Resolution**: Component isolation, grid preservation

```css
/* Bootstrap Compatibility */
.cms-isolated .container {
  width: 100%;
  padding-right: 15px;
  padding-left: 15px;
}
```

### CSS Modules

- **Detection**: Looks for `.module.css` files
- **Conflicts**: Minimal - already scoped
- **Resolution**: Preserve existing scoping

### styled-components / Emotion

- **Detection**: Looks for dependencies and generated class names
- **Conflicts**: Minimal - already scoped
- **Resolution**: Preserve CSS-in-JS styles

## Configuration

### CSS Isolation Config

```tsx
interface CSSIsolationConfig {
  strategy: 'css-modules' | 'css-in-js' | 'namespace' | 'shadow-dom';
  namespace?: string;
  prefix?: string;
  wrapperClass?: string;
  isolateGlobals?: boolean;
}
```

### Compatibility Config

```tsx
interface CompatibilityConfig {
  namespace: string;
  prefix: string;
  isolationStrategy: 'wrapper' | 'reset' | 'custom-properties' | 'shadow-dom';
  preserveFrameworks: string[];
  generateUtilities: boolean;
}
```

## Best Practices

### 1. Run Analysis First

Always analyze your project before generating isolation CSS:

```bash
npm run dx css:analyze --verbose --report
```

### 2. Use Consistent Naming

Stick to a consistent namespace and prefix across your project:

```tsx
const config = {
  namespace: 'cms',
  prefix: 'cms-'
};
```

### 3. Test Components in Isolation

Validate that your components work correctly with isolation:

```tsx
const report = await cssManager.validateComponent(MyComponent);
console.log(report.isIsolated); // true
```

### 4. Monitor for New Conflicts

Regularly run validation to catch new conflicts:

```bash
npm run dx css:validate --verbose
```

### 5. Use CSS Custom Properties

Leverage CSS custom properties for consistent theming:

```css
:root {
  --cms-primary-color: #007bff;
  --cms-text-color: #333;
}

.cms-component {
  color: var(--cms-text-color);
}
```

## Troubleshooting

### High Risk Score

If you get a high risk score (>50), consider:

1. Consolidating CSS frameworks
2. Using more aggressive isolation strategies
3. Refactoring global styles to be more specific

### Components Not Isolated

If components aren't properly isolated:

1. Check that the CSS file is imported
2. Verify component wrapping is applied
3. Use browser dev tools to inspect generated classes

### Style Conflicts Persist

If conflicts still occur:

1. Increase CSS specificity in isolation rules
2. Use `!important` sparingly for critical overrides
3. Consider Shadow DOM for complete isolation

### Performance Issues

If isolation affects performance:

1. Use CSS Modules instead of runtime wrapping
2. Minimize the number of wrapped components
3. Consider code splitting for large isolation CSS

## API Reference

### CSSManager

Main orchestrator for CSS isolation functionality.

```tsx
class CSSManager {
  setupCSSIsolation(projectPath: string): Promise<SetupResult>
  wrapComponent(component: React.ComponentType, name: string): React.ComponentType
  generateIntegrationCSS(projectPath: string, strategies: CSSStrategy[]): Promise<string>
  validateComponent(component: React.ComponentType): Promise<IsolationReport>
  getConflictReport(): Promise<ConflictAnalysis>
}
```

### CSSIsolationManager

Handles component wrapping and isolation strategies.

```tsx
class CSSIsolationManager {
  detectGlobalStyles(projectPath: string): Promise<GlobalStyleInfo[]>
  generateNamespacing(componentName: string): string
  wrapComponent(component: React.ComponentType, namespace: string): React.ComponentType
  validateIsolation(component: React.ComponentType): Promise<IsolationReport>
}
```

### CSSConflictDetector

Analyzes and detects CSS conflicts.

```tsx
class CSSConflictDetector {
  analyzeConflicts(): Promise<ConflictAnalysis>
  generateAutoFix(conflict: CSSConflict): string | null
}
```

### CSSCompatibilityLayer

Generates framework-specific compatibility CSS.

```tsx
class CSSCompatibilityLayer {
  generateCompatibilityCSS(strategies: CSSStrategy[]): string
  wrapSelectors(css: string, namespace: string): string
  generateThemeProperties(): string
  createIsolationWrapper(): string
}
```

## Contributing

When adding new framework support:

1. Create a new adapter implementing `FrameworkAdapter`
2. Add detection logic to `CSSAnalyzer`
3. Register the adapter in `CSSCompatibilityLayer`
4. Add tests for the new framework
5. Update documentation

## License

This CSS isolation system is part of the JSON CMS Boilerplate project.