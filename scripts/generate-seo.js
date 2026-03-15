#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// SEO templates for different entity types
const templates = {
  page: {
    id: "{{id}}",
    type: "page",
    title: "{{title}}",
    description: "{{description}}",
    canonical: "https://albata.com/{{path}}",
    robots: "index,follow",
    alternates: {
      "en": "https://albata.com/{{path}}",
      "es": "https://albata.com/es/{{path}}"
    },
    meta: [
      {
        "name": "keywords",
        "content": "{{keywords}}"
      }
    ],
    openGraph: {
      "type": "website",
      "title": "{{title}}",
      "description": "{{description}}",
      "url": "https://albata.com/{{path}}"
    },
    twitter: {
      "card": "summary_large_image",
      "title": "{{title}}",
      "description": "{{description}}"
    },
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "{{title}}",
        "description": "{{description}}",
        "url": "https://albata.com/{{path}}"
      }
    ],
    updatedAt: new Date().toISOString()
  },

  product: {
    id: "{{id}}",
    type: "product",
    title: "{{title}} - Premium Product",
    description: "{{description}}",
    canonical: "https://albata.com/product/{{id}}",
    robots: "index,follow",
    alternates: {
      "en": "https://albata.com/product/{{id}}",
      "es": "https://albata.com/es/product/{{id}}"
    },
    meta: [
      {
        "name": "keywords",
        "content": "{{keywords}}"
      },
      {
        "name": "price",
        "content": "{{price}}"
      }
    ],
    openGraph: {
      "type": "product",
      "title": "{{title}}",
      "description": "{{description}}",
      "url": "https://albata.com/product/{{id}}"
    },
    twitter: {
      "card": "summary_large_image",
      "title": "{{title}}",
      "description": "{{description}}"
    },
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "{{title}}",
        "description": "{{description}}",
        "brand": {
          "@type": "Brand",
          "name": "Albata"
        },
        "offers": {
          "@type": "Offer",
          "price": "{{price}}",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": "https://albata.com/product/{{id}}"
        }
      }
    ],
    updatedAt: new Date().toISOString()
  }
};

function replaceTemplateVars(template, vars) {
  let json = JSON.stringify(template, null, 2);

  Object.entries(vars).forEach(([key, value]) => {
    json = json.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return JSON.parse(json);
}

async function generateSeoFile(type, id, vars = {}) {
  const template = templates[type];
  if (!template) {
    console.error(`No template found for type: ${type}`);
    process.exit(1);
  }

  const seoData = replaceTemplateVars(template, { id, ...vars });
  const filePath = path.join(process.cwd(), 'data', 'seo', type, `${id}.json`);

  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // Write file
  await fs.writeFile(filePath, JSON.stringify(seoData, null, 2));

  console.log(`✅ Generated SEO file: ${filePath}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node generate-seo.js <type> <id> [title] [description] [keywords] [price]');
    console.log('Example: node generate-seo.js product cosmos-chair "Cosmos Chair" "Premium ergonomic chair" "ergonomic,office,chair" "599.99"');
    process.exit(1);
  }

  const [type, id, title = id, description = `Description for ${id}`, keywords = type, price = "0.00"] = args;

  const vars = {
    title,
    description,
    keywords,
    price,
    path: type === 'product' ? `product/${id}` : id
  };

  try {
    await generateSeoFile(type, id, vars);
  } catch (error) {
    console.error('Error generating SEO file:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateSeoFile }; 