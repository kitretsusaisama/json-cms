-- Initialize database for JSON CMS Boilerplate
-- This script sets up the basic database structure for development

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    subdomain VARCHAR(100),
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create pages table
CREATE TABLE IF NOT EXISTS cms_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    UNIQUE(tenant_id, slug)
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS cms_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    block_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    content JSONB NOT NULL,
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, block_id)
);

-- Create SEO table
CREATE TABLE IF NOT EXISTS cms_seo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    description TEXT,
    canonical VARCHAR(500),
    robots VARCHAR(100),
    meta_data JSONB DEFAULT '{}',
    structured_data JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, type, reference_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_tenant_slug ON cms_pages(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_blocks_tenant_category ON cms_blocks(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_seo_tenant_type_ref ON cms_seo(tenant_id, type, reference_id);

-- Insert default tenant for development
INSERT INTO tenants (name, domain, settings) 
VALUES ('Development Tenant', 'localhost:3000', '{"theme": "default", "features": {"multiTenant": true}}')
ON CONFLICT (domain) DO NOTHING;

-- Insert default admin user
INSERT INTO users (tenant_id, email, name, role, permissions)
SELECT t.id, 'admin@localhost', 'Admin User', 'admin', '["*"]'
FROM tenants t WHERE t.domain = 'localhost:3000'
ON CONFLICT (email) DO NOTHING;