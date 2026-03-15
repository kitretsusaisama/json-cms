#!/usr/bin/env tsx

import { validateContent } from '../src/lib/compose/validator';
import { planPage } from '../src/lib/compose/planner';
import { loadResolvedPage } from '../src/lib/compose/resolve';

const args = process.argv.slice(2);
const command = args[0];
const target = args[1];

async function main() {
  try {
    switch (command) {
      case 'validate':
        if (!target) {
          console.log('Usage: tsx scripts/validate.ts validate <page-id>');
          process.exit(1);
        }
        
        console.log(`🔍 Validating page: ${target}`);
        const result = await validateContent('page', target);
        
        if (result.valid) {
          console.log('✅ Page is valid');
        } else {
          console.log('❌ Validation errors:');
          result.errors.forEach(error => {
            console.log(`  - ${error.path}: ${error.message}`);
          });
        }
        
        if (result.warnings.length > 0) {
          console.log('⚠️  Warnings:');
          result.warnings.forEach(warning => {
            console.log(`  - ${warning.path}: ${warning.message}`);
          });
        }
        break;
        
      case 'plan':
        if (!target) {
          console.log('Usage: tsx scripts/validate.ts plan <page-id>');
          process.exit(1);
        }
        
        console.log(`📋 Planning page: ${target}`);
        
        const ctx = {
          device: 'desktop',
          locale: 'en',
          abBucket: 0
        };
        
        const loadedData = await loadResolvedPage(target, ctx, {});
        
        // Fix: Pass arguments as an options object
        const planResult = planPage({
          page: loadedData.page,
          ctx: ctx,
          globalConstraints: [],
          blocks: loadedData.blocks
        });
        
        console.log('✅ Planning completed');
        console.log(`Components: ${planResult.components.length}`);
        console.log(`Variants selected: ${planResult.metrics.variantsSelected}`);
        console.log(`Total weight: ${planResult.metrics.totalWeight}`);
        console.log(`Fold weight: ${planResult.metrics.foldWeight}`);
        console.log(`Constraints: ✅ ${planResult.metrics.constraintsPassed} ❌ ${planResult.metrics.constraintsFailed}`);
        
        if (planResult.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          planResult.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (planResult.errors.length > 0) {
          console.log('\n❌ Errors:');
          planResult.errors.forEach(error => console.log(`  - ${error}`));
        }
        break;
        
      default:
        console.log('Available commands:');
        console.log('  validate <page-id> - Validate a page JSON file');
        console.log('  plan <page-id>     - Test planning for a page');
        console.log('');
        console.log('Examples:');
        console.log('  tsx scripts/validate.ts validate privacy');
        console.log('  tsx scripts/validate.ts plan home');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();