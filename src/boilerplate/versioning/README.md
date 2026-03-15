# Content Versioning and Audit System

This module provides comprehensive content versioning, audit trails, and approval workflows for the JSON CMS boilerplate system.

## Features

### 1. Content Version Tracking
- **Version Management**: Track all changes to content with automatic version numbering
- **Diff Generation**: Generate detailed diffs between content versions
- **Rollback Support**: Rollback to any previous version
- **Content Restoration**: Restore deleted or archived content

### 2. Audit Trail System
- **Comprehensive Logging**: Log all content operations with detailed metadata
- **Compliance Reporting**: Generate compliance reports for audit purposes
- **Security Monitoring**: Detect and report suspicious activities
- **Data Export**: Export audit logs in multiple formats (JSON, CSV, XLSX)

### 3. Approval Workflows
- **Multi-step Approvals**: Configure multi-step approval processes
- **Role-based Approvals**: Assign approvers based on roles and permissions
- **Workflow Management**: Track approval status and manage workflow lifecycle
- **Escalation Support**: Escalate overdue approvals to higher authorities

## Quick Start

```typescript
import { createVersioningSystem } from '@/boilerplate/versioning';

// Create versioning system with default configuration
const versioningSystem = createVersioningSystem({
  maxVersionsPerContent: 50,
  approvalRequired: true,
  defaultApprovers: ['admin@example.com']
});

// Create a new content version
const result = await versioningSystem.createContentVersion(
  'page-123',
  'page',
  { title: 'My Page', content: '...' },
  'user-456',
  {
    title: 'Updated page content',
    description: 'Added new section',
    requireApproval: true,
    approvers: ['editor@example.com', 'admin@example.com']
  }
);

console.log('Version created:', result.version.id);
console.log('Audit entry:', result.auditEntry.id);
console.log('Workflow created:', result.workflow?.id);
```

## Core Components

### ContentVersioningSystem

The main class that integrates all versioning functionality:

```typescript
const system = new ContentVersioningSystem(
  versionStorage,    // Version storage adapter
  auditStorage,      // Audit storage adapter  
  approvalStorage,   // Approval storage adapter
  config            // Configuration options
);
```

### Version Manager

Handles content version tracking and management:

```typescript
// Create version
const version = await versionManager.createVersion(
  contentId, 
  contentType, 
  content, 
  metadata, 
  userId
);

// Compare versions
const diff = await versionManager.compareVersions(versionId1, versionId2);

// Rollback to version
const newVersion = await versionManager.rollbackToVersion(
  contentId, 
  targetVersionId, 
  userId
);
```

### Audit Manager

Manages audit trails and compliance reporting:

```typescript
// Log action
const auditEntry = await auditManager.logAction(
  'update',
  'page',
  'page-123',
  'user-456',
  { changes: diff }
);

// Generate compliance report
const report = await auditManager.generateComplianceReport(
  tenantId,
  startDate,
  endDate
);
```

### Approval Manager

Handles approval workflows:

```typescript
// Create workflow
const workflow = await approvalManager.createWorkflow(
  contentId,
  contentType,
  versionId,
  requestedBy,
  approvers
);

// Approve step
const updatedWorkflow = await approvalManager.approveStep(
  workflowId,
  stepId,
  approverId,
  'Looks good!'
);
```

## Configuration

```typescript
interface VersioningConfig {
  maxVersionsPerContent: number;     // Maximum versions to keep per content
  autoCleanupEnabled: boolean;       // Enable automatic cleanup of old versions
  cleanupAfterDays: number;         // Days after which to cleanup old versions
  compressionEnabled: boolean;       // Enable content compression
  diffAlgorithm: 'json' | 'text' | 'semantic'; // Diff algorithm to use
  auditRetentionDays: number;       // Days to retain audit logs
  approvalRequired: boolean;         // Require approval for all changes
  defaultApprovers: string[];       // Default approvers when none specified
}
```

## Storage Adapters

The system supports pluggable storage adapters:

### In-Memory Storage (Default)
```typescript
import { 
  InMemoryVersionStorage, 
  InMemoryAuditStorage, 
  InMemoryApprovalStorage 
} from '@/boilerplate/versioning';

const system = createVersioningSystemWithStorages(
  new InMemoryVersionStorage(),
  new InMemoryAuditStorage(),
  new InMemoryApprovalStorage()
);
```

### Database Storage (Custom Implementation)
```typescript
import { 
  DatabaseVersionStorage, 
  DatabaseAuditStorage, 
  DatabaseApprovalStorage 
} from './custom-storage';

const system = createVersioningSystemWithStorages(
  new DatabaseVersionStorage(dbConnection),
  new DatabaseAuditStorage(dbConnection),
  new DatabaseApprovalStorage(dbConnection)
);
```

## API Integration

### REST API Endpoints

The versioning system can be integrated with REST API endpoints:

```typescript
// GET /api/cms/content/:id/versions
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { versions, auditTrail } = await versioningSystem.getContentHistory(
    params.id,
    { includeAuditTrail: true }
  );
  
  return Response.json({ versions, auditTrail });
}

// POST /api/cms/content/:id/rollback
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { targetVersionId, reason } = await request.json();
  const userId = getUserFromRequest(request);
  
  const result = await versioningSystem.rollbackContent(
    params.id,
    targetVersionId,
    userId,
    reason
  );
  
  return Response.json(result);
}
```

### Middleware Integration

```typescript
import { auditMiddleware } from '@/boilerplate/versioning/middleware';

// Apply audit middleware to track all API calls
app.use('/api/cms', auditMiddleware(versioningSystem));
```

## Workflow Examples

### Content Creation with Approval
```typescript
// 1. Create content version
const { version, workflow } = await versioningSystem.createContentVersion(
  'article-123',
  'article',
  articleData,
  authorId,
  {
    title: 'New article draft',
    requireApproval: true,
    approvers: ['editor@example.com', 'admin@example.com']
  }
);

// 2. Editor approves
await versioningSystem.approveWorkflowStep(
  workflow.id,
  workflow.approvers[0].id,
  'editor@example.com',
  'Content looks good, approved for publication'
);

// 3. Admin approves
await versioningSystem.approveWorkflowStep(
  workflow.id,
  workflow.approvers[1].id,
  'admin@example.com',
  'Final approval granted'
);

// 4. Publish content
await versioningSystem.publishContent(version.id, authorId);
```

### Content Rollback
```typescript
// 1. Get version history
const { versions } = await versioningSystem.getContentHistory('page-123');

// 2. Find target version
const targetVersion = versions.find(v => v.version === 5);

// 3. Rollback
const { version, auditEntry } = await versioningSystem.rollbackContent(
  'page-123',
  targetVersion.id,
  userId,
  'Reverting problematic changes'
);

console.log(`Rolled back to version ${targetVersion.version}`);
```

### Compliance Reporting
```typescript
// Generate monthly compliance report
const report = await versioningSystem.generateComplianceReport(
  tenantId,
  '2024-01-01T00:00:00Z',
  '2024-01-31T23:59:59Z',
  adminUserId
);

console.log(`Total actions: ${report.summary.totalActions}`);
console.log(`Violations found: ${report.violations?.length || 0}`);
console.log(`Recommendations: ${report.recommendations?.length || 0}`);
```

## Security Considerations

1. **Access Control**: Ensure proper authentication and authorization before allowing version operations
2. **Data Sanitization**: Sanitize all content before storing versions
3. **Audit Integrity**: Protect audit logs from tampering
4. **Compliance**: Ensure audit retention meets regulatory requirements
5. **Privacy**: Handle PII appropriately in audit logs and version history

## Performance Optimization

1. **Compression**: Enable content compression for large versions
2. **Cleanup**: Configure automatic cleanup of old versions
3. **Indexing**: Index frequently queried fields in storage
4. **Caching**: Cache frequently accessed versions
5. **Pagination**: Use pagination for large version lists

## Testing

```typescript
import { createVersioningSystem } from '@/boilerplate/versioning';

describe('Content Versioning', () => {
  let system: ContentVersioningSystem;

  beforeEach(() => {
    system = createVersioningSystem();
  });

  test('should create version with audit trail', async () => {
    const result = await system.createContentVersion(
      'test-content',
      'page',
      { title: 'Test' },
      'user-123'
    );

    expect(result.version).toBeDefined();
    expect(result.auditEntry).toBeDefined();
    expect(result.version.version).toBe(1);
  });

  test('should generate diff between versions', async () => {
    // Create first version
    const v1 = await system.createContentVersion(
      'test-content',
      'page',
      { title: 'Original' },
      'user-123'
    );

    // Create second version
    const v2 = await system.updateContent(
      'test-content',
      'page',
      { title: 'Updated' },
      'user-123'
    );

    // Compare versions
    const diff = await system.compareVersions(
      v1.version.id,
      v2.version.id,
      'user-123'
    );

    expect(diff.summary.totalChanges).toBeGreaterThan(0);
  });
});
```

## Migration from Existing Systems

If you have existing content without versioning:

```typescript
// Migrate existing content to versioning system
async function migrateExistingContent() {
  const existingContent = await getExistingContent();
  
  for (const content of existingContent) {
    await versioningSystem.createContentVersion(
      content.id,
      content.type,
      content.data,
      'system-migration',
      {
        title: 'Initial version from migration',
        description: 'Migrated from existing system'
      }
    );
  }
}
```

## Troubleshooting

### Common Issues

1. **Version Limit Exceeded**: Increase `maxVersionsPerContent` or enable auto-cleanup
2. **Approval Workflow Stuck**: Check approver availability and escalate if needed
3. **Large Audit Logs**: Implement log rotation and archival
4. **Performance Issues**: Enable compression and optimize storage queries

### Debug Mode

```typescript
const system = createVersioningSystem({
  // Enable debug logging
  debugMode: true
});
```

## Contributing

When contributing to the versioning system:

1. Add comprehensive tests for new features
2. Update documentation for API changes
3. Consider backward compatibility
4. Follow security best practices
5. Add performance benchmarks for storage operations