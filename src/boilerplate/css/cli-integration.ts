/**
 * CLI Integration for CSS Isolation System
 * 
 * Provides command-line utilities for CSS conflict detection and resolution
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { CSSManager, createCSSManager, detectCSSStrategies } from './index';

export interface CSSCliOptions {
  projectPath: string;
  outputPath?: string;
  namespace?: string;
  prefix?: string;
  strategy?: 'namespace' | 'css-in-js' | 'shadow-dom' | 'css-modules';
  generateReport?: boolean;
  autoFix?: boolean;
  verbose?: boolean;
}

export class CSSCliIntegration {
  private options: CSSCliOptions;

  constructor(options: CSSCliOptions) {
    this.options = options;
  }

  /**
   * Analyze CSS conflicts in the project
   */
  async analyzeCSSConflicts(): Promise<void> {
    if (this.options.verbose) {
      console.log('🔍 Analyzing CSS strategies and conflicts...');
    }

    try {
      // Detect CSS strategies
      const cssStrategies = await detectCSSStrategies(this.options.projectPath);
      
      if (this.options.verbose) {
        console.log(`Found ${cssStrategies.length} CSS strategies:`);
        cssStrategies.forEach(strategy => {
          console.log(`  - ${strategy.type}${strategy.configFile ? ` (${strategy.configFile})` : ''}`);
        });
      }

      // Create CSS manager
      const cssManager = createCSSManager(cssStrategies);
      
      // Get conflict analysis
      const conflictReport = await cssManager.getConflictReport();
      
      // Display results
      this.displayConflictReport(conflictReport);
      
      // Generate report file if requested
      if (this.options.generateReport) {
        await this.generateReportFile(conflictReport, cssStrategies);
      }

    } catch (error) {
      console.error('❌ Error analyzing CSS conflicts:', error);
      process.exit(1);
    }
  }

  /**
   * Generate CSS isolation files
   */
  async generateCSSIsolation(): Promise<void> {
    if (this.options.verbose) {
      console.log('🎨 Generating CSS isolation files...');
    }

    try {
      // Detect CSS strategies
      const cssStrategies = await detectCSSStrategies(this.options.projectPath);
      
      // Create CSS manager with custom config
      const cssManager = this.createCustomCSSManager(cssStrategies);
      
      // Setup CSS isolation
      const setup = await cssManager.setupCSSIsolation(this.options.projectPath);
      
      // Generate CSS file
      const outputPath = this.options.outputPath || 'src/styles/cms-isolation.css';
      const cssContent = await cssManager.createCSSFile(this.options.projectPath, cssStrategies, outputPath);
      
      // Write CSS file
      await this.ensureDirectoryExists(dirname(join(this.options.projectPath, outputPath)));
      await writeFile(join(this.options.projectPath, outputPath), cssContent);
      
      console.log(`✅ CSS isolation file generated: ${outputPath}`);
      
      // Display recommendations
      if (setup.recommendations.length > 0) {
        console.log('\n📋 Recommendations:');
        setup.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }

      // Generate auto-fixes if requested
      if (this.options.autoFix && setup.conflictAnalysis.conflicts.length > 0) {
        await this.generateAutoFixes(cssManager, setup.conflictAnalysis);
      }

    } catch (error) {
      console.error('❌ Error generating CSS isolation:', error);
      process.exit(1);
    }
  }

  /**
   * Validate existing CSS isolation
   */
  async validateCSSIsolation(): Promise<void> {
    if (this.options.verbose) {
      console.log('🔍 Validating CSS isolation...');
    }

    try {
      const cssStrategies = await detectCSSStrategies(this.options.projectPath);
      const cssManager = createCSSManager(cssStrategies);
      
      const setup = await cssManager.setupCSSIsolation(this.options.projectPath);
      
      // Check if isolation file exists
      const isolationPath = this.options.outputPath || 'src/styles/cms-isolation.css';
      
      try {
        const { stat } = await import('fs/promises');
        await stat(join(this.options.projectPath, isolationPath));
        console.log('✅ CSS isolation file found');
      } catch {
        console.log('⚠️  CSS isolation file not found - run generate command first');
      }
      
      // Display conflict analysis
      if (setup.conflictAnalysis.riskScore > 0) {
        console.log(`\n⚠️  Risk Score: ${setup.conflictAnalysis.riskScore}/100`);
        
        if (setup.conflictAnalysis.conflicts.length > 0) {
          console.log('\n🚨 Conflicts detected:');
          setup.conflictAnalysis.conflicts.forEach(conflict => {
            const emoji = this.getSeverityEmoji(conflict.severity);
            console.log(`  ${emoji} ${conflict.description}`);
          });
        }
      } else {
        console.log('✅ No CSS conflicts detected');
      }

    } catch (error) {
      console.error('❌ Error validating CSS isolation:', error);
      process.exit(1);
    }
  }

  /**
   * Interactive CSS setup wizard
   */
  async runSetupWizard(): Promise<void> {
    console.log('🧙‍♂️ CSS Isolation Setup Wizard');
    console.log('================================\n');

    try {
      // Step 1: Analyze project
      console.log('Step 1: Analyzing your project...');
      const cssStrategies = await detectCSSStrategies(this.options.projectPath);
      
      if (cssStrategies.length === 0) {
        console.log('✅ No CSS frameworks detected - minimal isolation needed');
      } else {
        console.log(`Found ${cssStrategies.length} CSS strategies:`);
        cssStrategies.forEach(strategy => {
          console.log(`  • ${strategy.type}`);
        });
      }

      // Step 2: Conflict analysis
      console.log('\nStep 2: Analyzing potential conflicts...');
      const cssManager = createCSSManager(cssStrategies);
      const conflictReport = await cssManager.getConflictReport();
      
      if (conflictReport.riskScore > 50) {
        console.log(`⚠️  High risk score detected: ${conflictReport.riskScore}/100`);
        console.log('   Recommendation: Implement CSS isolation');
      } else if (conflictReport.riskScore > 0) {
        console.log(`⚠️  Medium risk score: ${conflictReport.riskScore}/100`);
        console.log('   Recommendation: Consider CSS isolation for safety');
      } else {
        console.log('✅ Low risk - CSS isolation still recommended for CMS components');
      }

      // Step 3: Generate isolation
      console.log('\nStep 3: Generating CSS isolation...');
      await this.generateCSSIsolation();

      // Step 4: Next steps
      console.log('\n🎉 Setup complete! Next steps:');
      console.log('  1. Import the generated CSS file in your main application');
      console.log('  2. Wrap CMS components with the CSS isolation manager');
      console.log('  3. Test your components to ensure proper styling');
      console.log('  4. Run validation periodically to check for new conflicts');

    } catch (error) {
      console.error('❌ Setup wizard failed:', error);
      process.exit(1);
    }
  }

  // Private helper methods

  private createCustomCSSManager(cssStrategies: any[]): CSSManager {
    const isolationConfig = {
      strategy: this.options.strategy || 'namespace',
      namespace: this.options.namespace || 'cms',
      prefix: this.options.prefix || 'cms-',
      wrapperClass: 'cms-isolated',
      isolateGlobals: true
    } as any;

    const compatibilityConfig = {
      namespace: this.options.namespace || 'cms',
      prefix: this.options.prefix || 'cms-',
      isolationStrategy: 'wrapper',
      preserveFrameworks: ['tailwind', 'bootstrap'],
      generateUtilities: true
    } as any;

    return new CSSManager(isolationConfig, compatibilityConfig, cssStrategies);
  }

  private displayConflictReport(conflictReport: any): void {
    console.log('\n📊 CSS Conflict Analysis Report');
    console.log('================================');
    
    console.log(`Risk Score: ${conflictReport.riskScore}/100`);
    
    if (conflictReport.conflicts.length === 0) {
      console.log('✅ No conflicts detected');
    } else {
      console.log(`\n🚨 ${conflictReport.conflicts.length} conflicts detected:`);
      
      conflictReport.conflicts.forEach((conflict: any, index: number) => {
        const emoji = this.getSeverityEmoji(conflict.severity);
        console.log(`\n${index + 1}. ${emoji} ${conflict.description}`);
        console.log(`   Type: ${conflict.type}`);
        console.log(`   Severity: ${conflict.severity}`);
        
        if (conflict.resolution.autoFixable) {
          console.log('   ✨ Auto-fixable');
        }
        
        if (conflict.resolution.steps.length > 0) {
          console.log('   Resolution steps:');
          conflict.resolution.steps.forEach((step: string) => {
            console.log(`     • ${step}`);
          });
        }
      });
    }

    if (conflictReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      conflictReport.recommendations.forEach((rec: string) => {
        console.log(`  • ${rec}`);
      });
    }

    // Compatibility matrix
    console.log('\n🔄 Framework Compatibility:');
    Object.entries(conflictReport.compatibilityMatrix).forEach(([framework, level]) => {
      const emoji = this.getCompatibilityEmoji(level as string);
      console.log(`  ${emoji} ${framework}: ${level}`);
    });
  }

  private async generateReportFile(conflictReport: any, cssStrategies: any[]): Promise<void> {
    const reportPath = join(this.options.projectPath, 'css-conflict-report.json');
    
    const report = {
      generatedAt: new Date().toISOString(),
      projectPath: this.options.projectPath,
      cssStrategies: cssStrategies.map(s => ({
        type: s.type,
        configFile: s.configFile,
        globalFiles: s.globalFiles
      })),
      conflictAnalysis: conflictReport,
      recommendations: [
        'Import generated CSS isolation file',
        'Wrap CMS components with isolation manager',
        'Test components in isolation',
        'Monitor for new conflicts regularly'
      ]
    };

    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved: css-conflict-report.json`);
  }

  private async generateAutoFixes(cssManager: CSSManager, conflictAnalysis: any): Promise<void> {
    console.log('\n🔧 Generating auto-fixes...');
    
    const autoFixes = cssManager.generateAutoFixes();
    
    // Write auto-fix CSS
    const autoFixPath = join(this.options.projectPath, 'src/styles/cms-auto-fixes.css');
    await this.ensureDirectoryExists(dirname(autoFixPath));
    
    const autoFixContent = `/**
 * Auto-generated CSS fixes for detected conflicts
 * 
 * Generated on: ${new Date().toISOString()}
 */

${autoFixes.css}

/* Additional conflict resolutions */
${conflictAnalysis.conflicts
  .filter((c: any) => c.resolution.autoFixable)
  .map((c: any) => `/* Fix for: ${c.description} */`)
  .join('\n')}
`;

    await writeFile(autoFixPath, autoFixContent);
    console.log(`✅ Auto-fixes generated: src/styles/cms-auto-fixes.css`);
    
    console.log('\n📋 Auto-fix recommendations:');
    autoFixes.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  private getCompatibilityEmoji(level: string): string {
    switch (level) {
      case 'compatible': return '✅';
      case 'minor-conflicts': return '🟡';
      case 'major-conflicts': return '🟠';
      case 'incompatible': return '🔴';
      default: return '⚪';
    }
  }
}

/**
 * CLI command implementations
 */
export async function analyzeCSSCommand(options: CSSCliOptions): Promise<void> {
  const cli = new CSSCliIntegration(options);
  await cli.analyzeCSSConflicts();
}

export async function generateCSSCommand(options: CSSCliOptions): Promise<void> {
  const cli = new CSSCliIntegration(options);
  await cli.generateCSSIsolation();
}

export async function validateCSSCommand(options: CSSCliOptions): Promise<void> {
  const cli = new CSSCliIntegration(options);
  await cli.validateCSSIsolation();
}

export async function setupCSSWizard(options: CSSCliOptions): Promise<void> {
  const cli = new CSSCliIntegration(options);
  await cli.runSetupWizard();
}

export default CSSCliIntegration;