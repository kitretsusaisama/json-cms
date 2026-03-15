#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Import schemas (we'll need to compile TypeScript or use a different approach)
// For now, we'll create a simple validation function

const { z } = require('zod');

// Basic schemas for validation
const SeoRecordSchema = z.object({
  id: z.string(),
  type: z.enum([
    "page", "post", "product", "category", "brand", "tag", "author", "collection", "event", "service"
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  canonical: z.string().url().optional(),
  robots: z.string().optional(),
  alternates: z.record(z.string(), z.string().url()).optional(),
  meta: z.array(z.object({
    name: z.string().optional(),
    property: z.string().optional(),
    content: z.string(),
  })).default([]),
  openGraph: z.object({
    type: z.string().default("website"),
    title: z.string().optional(),
    description: z.string().optional(),
    url: z.string().url().optional(),
    images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).optional(),
  }).optional(),
  twitter: z.object({
    card: z.enum(["summary", "summary_large_image"]).default("summary"),
    site: z.string().optional(),
    creator: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().url().optional(),
  }).optional(),
  structuredData: z.array(z.any()).default([]),
  updatedAt: z.string(),
});

const PageDefinitionSchema = z.object({
  version: z.literal(1),
  seoRef: z.object({ type: z.string(), id: z.string() }).optional(),
  components: z.array(z.object({
    key: z.string().min(1),
    type: z.string().min(1),
    props: z.record(z.any()).default({}),
    children: z.array(z.lazy(() => z.any())).optional(),
    visible: z.object({
      roleIn: z.array(z.string()).optional(),
      featureFlag: z.string().optional(),
      whenEnv: z.array(z.enum(["development", "preview", "production"])).optional(),
    }).optional(),
  })),
  guards: z.array(z.string()).optional(),
  featureFlags: z.array(z.string()).optional(),
});

async function validateFile(filePath, schema, type) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let data;
    
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      console.error(`❌ ${type}: ${filePath}`);
      console.error(`   - Invalid JSON: ${parseError.message}`);
      return false;
    }

    try {
      schema.parse(data);
      console.log(`✅ ${type}: ${path.relative(process.cwd(), filePath)}`);
      return true;
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error(`❌ ${type}: ${path.relative(process.cwd(), filePath)}`);
        validationError.errors.forEach((err, i) => {
          if (i < 5) { // Limit to 5 errors per file
            console.error(`   - ${err.path.join('.') || 'root'}: ${err.message}`);
          } else if (i === 5) {
            console.error(`   - ... and ${validationError.errors.length - 5} more errors`);
          }
        });
      } else {
        console.error(`❌ ${type}: ${path.relative(process.cwd(), filePath)}`);
        console.error(`   - ${validationError.message}`);
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return false;
  }
}

async function validateDirectory(dirPath, schema, type) {
  try {
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(file => file.endsWith('.json') || file.endsWith('.jsonc'));

    if (jsonFiles.length === 0) {
      console.warn(`⚠️  No JSON files found in ${path.relative(process.cwd(), dirPath)}`);
      return { validCount: 0, totalCount: 0 };
    }

    let validCount = 0;
    const results = [];

    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file);
      const isValid = await validateFile(filePath, schema, type);
      if (isValid) validCount++;
    }

    return { 
      validCount, 
      totalCount: jsonFiles.length,
      path: dirPath
    };
  } catch (error) {
    console.error(`❌ Error reading directory ${path.relative(process.cwd(), dirPath)}:`, error.message);
    return { 
      validCount: 0, 
      totalCount: 0,
      path: dirPath,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 Validating JSON schemas...\n');
  const dataDir = path.join(process.cwd(), 'src/data');
  
  const results = [];
  let totalValid = 0;
  let totalFiles = 0;

  // Function to process a directory with error handling
  async function processDirectory(dirPath, schema, type) {
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        console.warn(`⚠️  Not a directory: ${path.relative(process.cwd(), dirPath)}`);
        return;
      }
      
      const result = await validateDirectory(dirPath, schema, type);
      results.push(result);
      totalValid += result.validCount;
      totalFiles += result.totalCount;
      
    } catch (error) {
      console.error(`❌ Error processing ${path.relative(process.cwd(), dirPath)}:`, error.message);
    }
  }

  // Validate SEO files
  const seoBaseDir = path.join(dataDir, 'seoData');
  try {
    const seoTypes = await fs.readdir(seoBaseDir);
    for (const type of seoTypes) {
      const typeDir = path.join(seoBaseDir, type);
      await processDirectory(typeDir, SeoRecordSchema, `SEO/${type}`);
    }
  } catch (error) {
    console.warn(`⚠️  SEO directory not found or inaccessible: ${seoBaseDir}`);
  }

  // Validate page definitions
  const pagesDir = path.join(dataDir, 'pages');
  await processDirectory(pagesDir, PageDefinitionSchema, 'Page');
  
  // Check for site-demo pages
  const siteDemoPagesDir = path.join(dataDir, 'overlays/site-demo/pages');
  await processDirectory(siteDemoPagesDir, PageDefinitionSchema, 'SiteDemo/Page');

  console.log(`\n📊 Validation Summary:`);
  console.log(`   Total Files: ${totalFiles}`);
  console.log(`   Valid: ${totalValid}`);
  console.log(`   Invalid: ${totalFiles - totalValid}`);

  if (totalValid === totalFiles && totalFiles > 0) {
    console.log('✅ All files are valid!');
    process.exit(0);
  } else if (totalFiles === 0) {
    console.warn('⚠️  No files were validated - check your paths');
    process.exit(1);
  } else {
    console.error('❌ Some files have validation errors');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateFile, validateDirectory }; 