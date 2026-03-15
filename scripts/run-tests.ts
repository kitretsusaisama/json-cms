#!/usr/bin/env tsx

/**
 * Comprehensive Test Runner for JSON CMS Boilerplate
 * Runs unit tests, integration tests, E2E tests, and performance tests
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import chalk from 'chalk';

interface TestSuite {
  name: string;
  command: string;
  description: string;
  required: boolean;
  timeout?: number;
}

interface TestResults {
  suite: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'unit',
    command: 'vitest run --reporter=verbose --coverage',
    description: 'Unit tests for all components and utilities',
    required: true,
    timeout: 300000 // 5 minutes
  },
  {
    name: 'integration',
    command: 'vitest run --config vitest.integration.config.ts',
    description: 'Integration tests for API endpoints and database operations',
    required: true,
    timeout: 600000 // 10 minutes
  },
  {
    name: 'e2e',
    command: 'playwright test --config playwright.config.ts',
    description: 'End-to-end tests for complete user workflows',
    required: false,
    timeout: 900000 // 15 minutes
  },
  {
    name: 'performance',
    command: 'vitest run --config vitest.performance.config.ts',
    description: 'Performance tests for caching and optimization',
    required: false,
    timeout: 600000 // 10 minutes
  }
];

class TestRunner {
  private results: TestResults[] = [];
  private startTime: number = 0;

  constructor(private options: {
    suites?: string[];
    parallel?: boolean;
    bail?: boolean;
    verbose?: boolean;
  } = {}) {}

  async run(): Promise<void> {
    this.startTime = Date.now();
    
    console.log(chalk.blue.bold('🧪 JSON CMS Boilerplate Test Suite'));
    console.log(chalk.gray('Running comprehensive tests...\n'));

    // Filter test suites based on options
    const suitesToRun = testSuites.filter(suite => {
      if (this.options.suites && this.options.suites.length > 0) {
        return this.options.suites.includes(suite.name);
      }
      return true;
    });

    // Check prerequisites
    await this.checkPrerequisites();

    // Run tests
    if (this.options.parallel) {
      await this.runParallel(suitesToRun);
    } else {
      await this.runSequential(suitesToRun);
    }

    // Generate report
    this.generateReport();
  }

  private async checkPrerequisites(): Promise<void> {
    console.log(chalk.yellow('🔍 Checking prerequisites...'));

    // Check if vitest config exists
    if (!existsSync('vitest.config.ts')) {
      console.log(chalk.red('❌ vitest.config.ts not found'));
      process.exit(1);
    }

    // Check if test setup exists
    if (!existsSync('src/test-setup.ts')) {
      console.log(chalk.red('❌ src/test-setup.ts not found'));
      process.exit(1);
    }

    // Check if playwright is configured (for E2E tests)
    if (this.shouldRunSuite('e2e') && !existsSync('playwright.config.ts')) {
      console.log(chalk.yellow('⚠️  playwright.config.ts not found, skipping E2E tests'));
      this.options.suites = this.options.suites?.filter(s => s !== 'e2e') || 
                           testSuites.filter(s => s.name !== 'e2e').map(s => s.name);
    }

    console.log(chalk.green('✅ Prerequisites check passed\n'));
  }

  private shouldRunSuite(suiteName: string): boolean {
    return !this.options.suites || this.options.suites.includes(suiteName);
  }

  private async runSequential(suites: TestSuite[]): Promise<void> {
    for (const suite of suites) {
      const result = await this.runSuite(suite);
      this.results.push(result);

      if (this.options.bail && !result.passed) {
        console.log(chalk.red(`\n💥 Test suite '${suite.name}' failed, stopping execution`));
        break;
      }
    }
  }

  private async runParallel(suites: TestSuite[]): Promise<void> {
    console.log(chalk.blue('🚀 Running test suites in parallel...\n'));

    const promises = suites.map(suite => this.runSuite(suite));
    this.results = await Promise.all(promises);
  }

  private async runSuite(suite: TestSuite): Promise<TestResults> {
    const startTime = Date.now();
    
    console.log(chalk.blue(`\n📋 Running ${suite.name} tests`));
    console.log(chalk.gray(`   ${suite.description}`));
    console.log(chalk.gray(`   Command: ${suite.command}\n`));

    try {
      const output = execSync(suite.command, {
        encoding: 'utf8',
        timeout: suite.timeout || 300000,
        stdio: this.options.verbose ? 'inherit' : 'pipe'
      });

      const duration = Date.now() - startTime;
      
      console.log(chalk.green(`✅ ${suite.name} tests passed (${this.formatDuration(duration)})`));
      
      return {
        suite: suite.name,
        passed: true,
        duration,
        output: this.options.verbose ? undefined : output
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.log(chalk.red(`❌ ${suite.name} tests failed (${this.formatDuration(duration)})`));
      
      if (this.options.verbose && error.stdout) {
        console.log(chalk.gray('Output:'));
        console.log(error.stdout);
      }
      
      if (error.stderr) {
        console.log(chalk.red('Error:'));
        console.log(error.stderr);
      }

      return {
        suite: suite.name,
        passed: false,
        duration,
        error: error.message,
        output: error.stdout
      };
    }
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(chalk.blue.bold('\n📊 Test Results Summary'));
    console.log(chalk.gray('=' .repeat(50)));

    // Individual suite results
    this.results.forEach(result => {
      const status = result.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      const duration = this.formatDuration(result.duration);
      console.log(`${status} ${result.suite.padEnd(12)} ${duration}`);
    });

    console.log(chalk.gray('-'.repeat(50)));

    // Overall summary
    const overallStatus = failed === 0 ? chalk.green('✅ ALL PASSED') : chalk.red(`❌ ${failed} FAILED`);
    console.log(`${overallStatus} ${passed}/${total} suites passed`);
    console.log(chalk.gray(`Total duration: ${this.formatDuration(totalDuration)}`));

    // Coverage information (if available)
    if (this.results.some(r => r.suite === 'unit' && r.passed)) {
      console.log(chalk.blue('\n📈 Coverage Report'));
      console.log(chalk.gray('Detailed coverage report available in coverage/ directory'));
    }

    // Performance metrics (if available)
    const perfResult = this.results.find(r => r.suite === 'performance');
    if (perfResult && perfResult.passed) {
      console.log(chalk.blue('\n⚡ Performance Metrics'));
      console.log(chalk.gray('Performance test results logged above'));
    }

    // Recommendations
    this.generateRecommendations();

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }

  private generateRecommendations(): void {
    const failedSuites = this.results.filter(r => !r.passed);
    
    if (failedSuites.length === 0) {
      console.log(chalk.green('\n🎉 All tests passed! Your code is ready for production.'));
      return;
    }

    console.log(chalk.yellow('\n💡 Recommendations'));
    console.log(chalk.gray('-'.repeat(30)));

    failedSuites.forEach(result => {
      switch (result.suite) {
        case 'unit':
          console.log(chalk.yellow('• Fix unit test failures before proceeding'));
          console.log(chalk.gray('  Unit tests ensure individual components work correctly'));
          break;
        case 'integration':
          console.log(chalk.yellow('• Resolve integration test issues'));
          console.log(chalk.gray('  Check API endpoints and database connections'));
          break;
        case 'e2e':
          console.log(chalk.yellow('• E2E test failures may indicate UX issues'));
          console.log(chalk.gray('  Verify complete user workflows work as expected'));
          break;
        case 'performance':
          console.log(chalk.yellow('• Performance tests failed - check for bottlenecks'));
          console.log(chalk.gray('  Review caching strategies and optimization'));
          break;
      }
    });

    console.log(chalk.gray('\nRun individual test suites with:'));
    console.log(chalk.gray('  npm run test:unit'));
    console.log(chalk.gray('  npm run test:integration'));
    console.log(chalk.gray('  npm run test:e2e'));
    console.log(chalk.gray('  npm run test:performance'));
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: any = {
    suites: [],
    parallel: false,
    bail: false,
    verbose: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--suites':
        options.suites = args[++i]?.split(',') || [];
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--bail':
        options.bail = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.log(chalk.red(`Unknown option: ${arg}`));
          process.exit(1);
        }
        // Treat as suite name
        options.suites.push(arg);
    }
  }

  const runner = new TestRunner(options);
  await runner.run();
}

function printHelp() {
  console.log(chalk.blue.bold('JSON CMS Boilerplate Test Runner'));
  console.log('\nUsage: npm run test:all [options] [suites...]');
  console.log('\nOptions:');
  console.log('  --suites <list>    Comma-separated list of test suites to run');
  console.log('  --parallel         Run test suites in parallel');
  console.log('  --bail             Stop on first failure');
  console.log('  --verbose          Show detailed output');
  console.log('  --help             Show this help message');
  console.log('\nAvailable test suites:');
  testSuites.forEach(suite => {
    console.log(`  ${suite.name.padEnd(12)} ${suite.description}`);
  });
  console.log('\nExamples:');
  console.log('  npm run test:all                    # Run all tests');
  console.log('  npm run test:all unit integration   # Run specific suites');
  console.log('  npm run test:all --parallel         # Run in parallel');
  console.log('  npm run test:all --bail --verbose   # Stop on failure with details');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Test runner failed:'), error);
    process.exit(1);
  });
}

export { TestRunner };