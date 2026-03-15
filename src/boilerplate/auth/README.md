# Authentication and Authorization System

A comprehensive authentication and authorization system for the JSON CMS Boilerplate with pluggable adapters, RBAC support, and session management.

## Features

- **Pluggable Authentication Adapters**: Support for JWT, NextAuth.js, Auth0, Clerk, and custom providers
- **Role-Based Access Control (RBAC)**: Flexible permission system with roles, permissions, and conditional access
- **Session Management**: JWT-based sessions with refresh tokens and automatic cleanup
- **Multi-Tenant Support**: Tenant-aware authentication and authorization
- **Security**: Input validation, rate limiting, and secure session handling
- **Middleware**: Route protection and API endpoint security
- **Testing**: Comprehensive test coverage with in-memory storage for development

## Quick Start

### Basic Setup

```typescript
import { AuthManager, JWTAdapter, JWTUtils, SessionManager, RBACManager } from '@/boilerplate/auth';
import { MemoryUserStorage, MemorySessionStorage, MemoryRBACStorage } from '@/boilerplate/auth/adapters';

// Setup storage (use database adapters in production)
const userStorage = new MemoryUserStorage();
const sessionStorage = new MemorySessionStorage();
const rbacStorage = new MemoryRBACStorage();

// Setup JWT utilities
const jwtUtils = new JWTUtils({
  secret: process.env.JWT_SECRET!,
  algorithm: 'HS256',
  issuer: 'your-app',
  defaultExpiresIn: 3600 // 1 hour
});

// Setup session manager
const sessionManager = new SessionManager({
  storage: sessionStorage,
  jwtUtils,
  sessionTTL: 24 * 60 * 60, // 24 hours
  enableRefreshTokens: true
});

// Setup RBAC manager
const rbacManager = new RBACManager(rbacStorage);

// Setup auth adapter
const authAdapter = new JWTAdapter(
  {
    secret: process.env.JWT_SECRET!,
    algorithm: 'HS256',
    expiresIn: '24h',
    allowRegistration: true
  },
  userStorage,
  sessionManager
);

// Setup auth manager
const authManager = new AuthManager({
  adapter: authAdapter,
  sessionManager,
  rbacManager
});

// Initialize default roles and permissions
await rbacManager.initializeDefaults();
```

### API Routes Setup

```typescript
// app/api/auth/[...auth]/route.ts
import { NextRequest } from 'next/server';
import { AuthRoutes } from '@/boilerplate/api/auth-routes';
import { authManager } from '@/lib/auth'; // Your auth manager instance

const authRoutes = new AuthRoutes({
  authManager,
  enableRegistration: true,
  sessionCookieName: 'auth-token'
});

const handlers = authRoutes.createRouteHandlers();

export async function POST(request: NextRequest, { params }: { params: { auth: string[] } }) {
  const [endpoint] = params.auth;
  
  switch (endpoint) {
    case 'login':
      return handlers.login(request);
    case 'register':
      return handlers.register(request);
    case 'logout':
      return handlers.logout(request);
    case 'refresh':
      return handlers.refresh(request);
    case 'change-password':
      return handlers.changePassword(request);
    case 'check-permission':
      return handlers.checkPermission(request);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { auth: string[] } }) {
  const [endpoint] = params.auth;
  
  switch (endpoint) {
    case 'me':
      return handlers.me(request);
    case 'permissions':
      return handlers.getPermissions(request);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { auth: string[] } }) {
  const [endpoint] = params.auth;
  
  switch (endpoint) {
    case 'me':
      return handlers.updateMe(request);
    default:
      return new Response('Not Found', { status: 404 });
  }
}
```

### Middleware Setup

```typescript
// middleware.ts
import { NextRequest } from 'next/server';
import { createNextMiddleware } from '@/boilerplate/auth/middleware';
import { authManager } from '@/lib/auth';

const { protect } = createNextMiddleware(authManager);

export async function middleware(request: NextRequest) {
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return protect('/admin/*', {
      skipPaths: ['/admin/login'],
      redirectUrl: '/admin/login'
    })(request);
  }

  // Protect API routes
  if (request.nextUrl.pathname.startsWith('/api/cms')) {
    return protect('/api/cms/*')(request);
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/cms/:path*']
};
```

## Authentication Adapters

### JWT Adapter

Simple username/password authentication with JWT tokens:

```typescript
const jwtAdapter = new JWTAdapter(
  {
    secret: process.env.JWT_SECRET!,
    algorithm: 'HS256',
    expiresIn: '24h',
    allowRegistration: true,
    requireEmailVerification: false
  },
  userStorage,
  sessionManager
);

// Authenticate with email/password
const result = await authManager.authenticate({
  type: 'email',
  identifier: 'user@example.com',
  password: 'password123'
});
```

### NextAuth.js Adapter

Integration with NextAuth.js:

```typescript
const nextAuthAdapter = new NextAuthAdapter(
  {
    providers: [
      // Your NextAuth providers
    ],
    callbacks: {
      // Custom callbacks
    }
  },
  userStorage,
  sessionManager
);

// Get NextAuth config
const nextAuthConfig = nextAuthAdapter.getNextAuthConfig();
```

### Auth0 Adapter

Integration with Auth0:

```typescript
const auth0Adapter = new Auth0Adapter(
  {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    audience: process.env.AUTH0_AUDIENCE
  },
  userStorage,
  sessionManager
);

// Handle Auth0 callback
const result = await auth0Adapter.handleCallback(code, state);
```

### Clerk Adapter

Integration with Clerk:

```typescript
const clerkAdapter = new ClerkAdapter(
  {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!
  },
  userStorage,
  sessionManager
);

// Authenticate with Clerk session token
const result = await authManager.authenticate({
  type: 'token',
  identifier: '',
  token: clerkSessionToken
});
```

## RBAC System

### Default Roles and Permissions

The system comes with default roles:

- **viewer**: Can read pages and blocks
- **editor**: Can read and write pages and blocks
- **admin**: Full access (cms.admin permission)

Default permissions:
- `cms.pages.read`
- `cms.pages.write`
- `cms.pages.delete`
- `cms.blocks.read`
- `cms.blocks.write`
- `cms.admin` (wildcard permission)

### Custom Roles and Permissions

```typescript
// Create custom permission
const permission = await rbacManager.definePermission({
  name: 'blog.posts.publish',
  description: 'Publish blog posts',
  resource: 'blog',
  action: 'publish',
  isSystem: false
});

// Create custom role
const role = await rbacManager.defineRole({
  name: 'blog-publisher',
  description: 'Can publish blog posts',
  permissions: ['blog.posts.read', 'blog.posts.write', 'blog.posts.publish'],
  isSystem: false
});

// Assign role to user
await rbacManager.assignRole(userId, role.id);

// Check permission
const canPublish = await rbacManager.checkPermission(
  userId,
  'blog.posts.publish'
);
```

### Conditional Permissions

```typescript
// Create permission with conditions
const conditionalPermission = await rbacManager.definePermission({
  name: 'content.edit.own',
  description: 'Edit own content',
  resource: 'content',
  action: 'edit',
  conditions: [
    {
      field: 'authorId',
      operator: 'equals',
      value: '${user.id}' // Will be resolved at runtime
    }
  ],
  isSystem: false
});

// Check permission with context
const canEdit = await rbacManager.checkPermission(
  userId,
  'content.edit.own',
  { authorId: 'user-123' }
);
```

## Session Management

### Creating Sessions

```typescript
const session = await sessionManager.createSession(user, {
  loginMethod: 'email',
  userAgent: request.headers.get('user-agent'),
  ipAddress: getClientIP(request)
});
```

### Validating Sessions

```typescript
const session = await sessionManager.validateSession(token);
if (session) {
  const user = await authManager.getAdapter().getUser(session.userId);
  // User is authenticated
}
```

### Refresh Tokens

```typescript
const refreshedSession = await sessionManager.refreshSession(refreshToken);
if (refreshedSession) {
  // Session refreshed successfully
}
```

## Middleware Usage

### Route Protection

```typescript
import { AuthMiddleware } from '@/boilerplate/auth/middleware';

const middleware = new AuthMiddleware({ authManager });

// Require authentication
app.use('/protected', middleware.requireAuth());

// Require specific permission
app.use('/admin', middleware.requirePermission('cms.admin'));

// Require specific role
app.use('/editor', middleware.requireRole('editor'));

// Optional authentication
app.use('/public', middleware.optionalAuth());
```

### API Route Protection

```typescript
const apiMiddleware = middleware.createAPIMiddleware();

export async function GET(request: NextRequest) {
  const authContext = await apiMiddleware.requireAuth()(request);
  
  if (authContext instanceof NextResponse) {
    return authContext; // Error response
  }
  
  // User is authenticated, proceed with request
  return NextResponse.json({ user: authContext.user });
}
```

## Testing

The system includes comprehensive tests and in-memory storage for development:

```typescript
import { 
  MemoryUserStorage, 
  MemorySessionStorage, 
  MemoryRBACStorage 
} from '@/boilerplate/auth/adapters/memory-storage';

// Setup test environment
const userStorage = new MemoryUserStorage();
const sessionStorage = new MemorySessionStorage();
const rbacStorage = new MemoryRBACStorage();

// Run tests
describe('Auth System', () => {
  beforeEach(() => {
    userStorage.clear();
    sessionStorage.clear();
    rbacStorage.clear();
  });
  
  // Your tests here
});
```

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=24h

# Auth0 Configuration (if using Auth0)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=your-api-audience

# Clerk Configuration (if using Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Session Configuration
SESSION_COOKIE_NAME=auth-token
SESSION_SECURE_COOKIES=true
SESSION_TTL=86400
REFRESH_TOKEN_TTL=604800
```

## Security Best Practices

1. **Use strong JWT secrets** (at least 32 characters)
2. **Enable HTTPS in production** for secure cookies
3. **Implement rate limiting** on auth endpoints
4. **Validate all inputs** using Zod schemas
5. **Use secure session storage** (Redis in production)
6. **Implement proper CORS** configuration
7. **Log security events** for monitoring
8. **Regular security audits** of permissions

## Production Considerations

1. **Database Storage**: Replace memory storage with database adapters
2. **Redis Sessions**: Use Redis for session storage in production
3. **Load Balancing**: Ensure session consistency across instances
4. **Monitoring**: Implement comprehensive logging and monitoring
5. **Backup**: Regular backups of user and permission data
6. **Performance**: Optimize permission checks with caching
7. **Compliance**: Ensure GDPR/privacy compliance for user data

## API Reference

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh session token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update current user
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/permissions` - Get user permissions
- `POST /api/auth/check-permission` - Check specific permission

### Error Codes

- `AUTH_FAILED` - Authentication failed
- `AUTH_REQUIRED` - Authentication required
- `INVALID_REFRESH_TOKEN` - Invalid refresh token
- `USER_EXISTS` - User already exists
- `USER_NOT_FOUND` - User not found
- `VALIDATION_ERROR` - Request validation failed
- `REGISTRATION_DISABLED` - Registration is disabled
- `NOT_SUPPORTED` - Feature not supported by adapter

## Contributing

When adding new authentication adapters:

1. Extend `BaseAuthAdapter`
2. Implement required methods
3. Add comprehensive tests
4. Update documentation
5. Follow security best practices

For RBAC extensions:

1. Consider backward compatibility
2. Add migration scripts if needed
3. Test permission inheritance
4. Document new permission patterns