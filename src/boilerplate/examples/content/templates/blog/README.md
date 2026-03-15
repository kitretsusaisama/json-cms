# Blog Template

A modern blog platform built with the JSON CMS Boilerplate system. This template provides everything needed to launch a professional blog with content management, author profiles, and reader engagement features.

## Features

### Content Management
- **Article System** - Rich article creation with markdown support
- **Category Organization** - Hierarchical category structure
- **Tag Management** - Flexible tagging system for content discovery
- **Author Profiles** - Multi-author support with individual profiles
- **Editorial Workflow** - Draft, review, and publish workflow
- **Content Scheduling** - Schedule posts for future publication

### Reader Experience
- **Responsive Design** - Mobile-optimized reading experience
- **Search Functionality** - Full-text search across all content
- **Related Articles** - Intelligent content recommendations
- **Reading Progress** - Visual reading progress indicator
- **Social Sharing** - Easy sharing on social platforms
- **Comments System** - Engage with readers through comments

### SEO & Discovery
- **SEO Optimization** - Automatic meta tags and structured data
- **Sitemap Generation** - Dynamic XML sitemap creation
- **RSS Feeds** - Category and author-specific RSS feeds
- **Open Graph** - Rich social media previews
- **Schema Markup** - Article and author structured data

### Engagement Features
- **Newsletter Integration** - Email subscription and campaigns
- **Reading Lists** - Bookmark articles for later reading
- **Author Following** - Follow favorite authors
- **Article Ratings** - Reader feedback and ratings
- **Popular Posts** - Trending and most-read content

## Quick Start

### 1. Copy Template Files

```bash
# Copy template to your project
cp -r src/boilerplate/examples/content/templates/blog/* ./

# Install additional dependencies
npm install @tailwindcss/typography remark remark-html gray-matter
```

### 2. Environment Configuration

Copy and configure environment variables:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database Configuration
DATABASE_URL=postgresql://...

# Email Configuration (for newsletters)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourblog.com

# Analytics (optional)
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
MIXPANEL_TOKEN=your_mixpanel_token

# Comments (optional - using Disqus)
NEXT_PUBLIC_DISQUS_SHORTNAME=your-disqus-shortname

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME="Your Blog Name"
NEXT_PUBLIC_SITE_DESCRIPTION="Your blog description"
```

### 3. Content Setup

Initialize sample content:

```bash
# Create sample blog posts
npm run seed:blog

# Generate author profiles
npm run seed:authors

# Set up categories and tags
npm run seed:taxonomy
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your blog.

## Template Structure

### Pages

- **Homepage** (`/`) - Latest posts and featured content
- **Blog Index** (`/blog`) - Paginated article listing
- **Article Detail** (`/blog/[slug]`) - Individual article pages
- **Category Pages** (`/category/[slug]`) - Category-specific listings
- **Author Pages** (`/author/[slug]`) - Author profile and articles
- **Tag Pages** (`/tag/[slug]`) - Tag-based article collections
- **Search Results** (`/search`) - Article search results
- **About** (`/about`) - Blog and author information

### Components

#### Article Components
- `ArticleCard` - Article preview in listings
- `ArticleHeader` - Article title, meta, and author info
- `ArticleContent` - Formatted article body with typography
- `ArticleFooter` - Tags, sharing, and related articles
- `ReadingProgress` - Visual reading progress indicator

#### Navigation Components
- `BlogNav` - Main blog navigation menu
- `CategoryNav` - Category browsing interface
- `TagCloud` - Popular tags display
- `Breadcrumbs` - Navigation breadcrumbs
- `SearchBar` - Article search input

#### Author Components
- `AuthorCard` - Author profile display
- `AuthorBio` - Detailed author information
- `AuthorArticles` - Author's article listing
- `FollowButton` - Author following functionality

#### Engagement Components
- `CommentSection` - Article comments interface
- `SocialShare` - Social media sharing buttons
- `NewsletterSignup` - Email subscription form
- `RelatedArticles` - Content recommendations

### Blocks

#### Homepage Blocks
- `hero.blog` - Blog hero with featured article
- `featured-posts` - Highlighted article showcase
- `recent-posts` - Latest articles grid
- `popular-posts` - Most-read articles
- `categories.featured` - Featured category highlights
- `newsletter.blog` - Blog-specific newsletter signup

#### Article Blocks
- `article.header` - Article title and metadata
- `article.content` - Main article content
- `article.author` - Author information and bio
- `article.related` - Related article suggestions
- `article.comments` - Comment system integration

#### Category Blocks
- `category.header` - Category page header
- `article.grid` - Article listing grid
- `category.description` - Category information
- `subcategories` - Child category navigation

## Customization

### Adding New Content Types

1. **Define Content Schema**
   ```typescript
   // types/content.ts
   export interface Tutorial extends Article {
     difficulty: 'beginner' | 'intermediate' | 'advanced';
     duration: number;
     prerequisites: string[];
   }
   ```

2. **Create Content Components**
   ```tsx
   // components/content/TutorialCard.tsx
   export function TutorialCard({ tutorial }) {
     // Implementation with difficulty badges, duration, etc.
   }
   ```

3. **Update Content Pages**
   ```json
   // data/pages/tutorials/[slug].json
   {
     "blocks": [
       "tutorial.header",
       "tutorial.prerequisites",
       "tutorial.content",
       "tutorial.next-steps"
     ]
   }
   ```

### Customizing Article Layout

1. **Modify Article Structure**
   ```json
   // data/blocks/article-layout.json
   {
     "components": [
       "article-header",
       "table-of-contents",
       "article-content",
       "author-bio",
       "related-articles"
     ]
   }
   ```

2. **Add Custom Article Elements**
   ```tsx
   // components/articles/CalloutBox.tsx
   export function CalloutBox({ type, title, content }) {
     // Implementation for article callouts
   }
   ```

### Styling and Theming

1. **Update Typography**
   ```css
   /* styles/typography.css */
   .prose {
     --tw-prose-headings: theme('colors.gray.900');
     --tw-prose-body: theme('colors.gray.700');
   }
   ```

2. **Customize Article Styles**
   ```tsx
   // components/articles/ArticleContent.tsx
   const articleStyles = {
     prose: 'prose prose-lg max-w-none',
     headings: 'font-bold text-gray-900',
     links: 'text-blue-600 hover:text-blue-800',
   };
   ```

## Content Creation

### Writing Articles

1. **Create Article File**
   ```markdown
   ---
   title: "Your Article Title"
   excerpt: "Brief description of the article"
   author: "author-slug"
   category: "category-slug"
   tags: ["tag1", "tag2"]
   publishedAt: "2024-01-15"
   featured: false
   ---

   # Your Article Content

   Write your article content here using Markdown.
   ```

2. **Add Article Metadata**
   ```json
   // data/articles/your-article.json
   {
     "id": "your-article",
     "title": "Your Article Title",
     "slug": "your-article-slug",
     "excerpt": "Brief description",
     "content": "path/to/content.md",
     "author": "author-id",
     "category": "category-id",
     "tags": ["tag1", "tag2"],
     "publishedAt": "2024-01-15T10:00:00Z",
     "featured": false,
     "seo": {
       "title": "SEO optimized title",
       "description": "SEO description"
     }
   }
   ```

### Managing Authors

1. **Create Author Profile**
   ```json
   // data/authors/john-doe.json
   {
     "id": "john-doe",
     "name": "John Doe",
     "slug": "john-doe",
     "bio": "John is a software developer...",
     "avatar": "/images/authors/john-doe.jpg",
     "social": {
       "twitter": "johndoe",
       "linkedin": "johndoe",
       "github": "johndoe"
     },
     "expertise": ["JavaScript", "React", "Node.js"]
   }
   ```

## Integrations

### Newsletter Integration

The template includes newsletter features:
- Email subscription forms
- Automated welcome emails
- Weekly digest emails
- Subscriber management

### Analytics Integration

Built-in analytics tracking:
- Article view events
- Reading completion rates
- Popular content tracking
- User engagement metrics

### Comment System

Integrated comment features:
- Disqus integration
- Comment moderation
- Reply threading
- Spam protection

## SEO Optimization

### Automatic SEO Features

- **Meta Tags** - Automatic title and description generation
- **Structured Data** - Article and author schema markup
- **Sitemap** - Dynamic XML sitemap generation
- **RSS Feeds** - Category and author-specific feeds
- **Open Graph** - Social media preview optimization

### SEO Best Practices

1. **Article Optimization**
   - Use descriptive titles (50-60 characters)
   - Write compelling meta descriptions (150-160 characters)
   - Include relevant keywords naturally
   - Use proper heading hierarchy (H1, H2, H3)

2. **Image Optimization**
   - Use descriptive alt text
   - Optimize image file sizes
   - Include captions when relevant
   - Use appropriate image formats

## Testing

Run the test suite:

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Content validation tests
npm run test:content
```

## Deployment

### Production Checklist

1. **Content Review**
   - Proofread all articles
   - Verify author information
   - Check category organization

2. **SEO Setup**
   - Configure Google Analytics
   - Set up Google Search Console
   - Submit sitemap to search engines

3. **Performance**
   - Optimize images
   - Enable caching
   - Configure CDN

### Deployment Commands

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Generate static export
npm run export
```

## Support

For blog template support:
- Check the [content guide](./docs/content-guide.md)
- Review [SEO best practices](./docs/seo-guide.md)
- Consult the [customization guide](./docs/customization.md)

## License

This template is part of the JSON CMS Boilerplate system and follows the same license terms.