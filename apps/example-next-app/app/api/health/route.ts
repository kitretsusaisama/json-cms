import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@workspace/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: boolean;
    redis: boolean;
    filesystem: boolean;
    memory: {
      used: number;
      limit: number;
      percentage: number;
    };
    integrations: {
      [key: string]: boolean;
    };
  };
  metadata: {
    nodeVersion: string;
    nextVersion: string;
    hostname: string;
    region?: string;
  };
}

async function checkDatabase(): Promise<boolean> {
  try {
    // Add your database connection check here
    // For example: await prisma.$queryRaw`SELECT 1`
    return true;
  } catch (error) {
    logger.error({ message: 'Database health check failed', error });
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    // Add your Redis connection check here
    // For example: await redis.ping()
    return true;
  } catch (error) {
    logger.error({ message: 'Redis health check failed', error });
    return false;
  }
}

async function checkFilesystem(): Promise<boolean> {
  try {
    // Check if critical directories are accessible
    const { promises: fs } = await import('fs');
    await fs.access('./data/settings');
    return true;
  } catch (error) {
    logger.error({ message: 'Filesystem health check failed', error });
    return false;
  }
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  const limit = parseInt(process.env.MEMORY_LIMIT || '512') * 1024 * 1024; // Default 512MB
  return {
    used: usage.heapUsed,
    limit: limit,
    percentage: Math.round((usage.heapUsed / limit) * 100)
  };
}

async function checkIntegrations() {
  const integrations: { [key: string]: boolean } = {};
  
  // Check Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      // Add Stripe health check
      integrations.stripe = true;
    } catch {
      integrations.stripe = false;
    }
  }
  
  // Check SendGrid
  if (process.env.SENDGRID_API_KEY) {
    try {
      // Add SendGrid health check
      integrations.sendgrid = true;
    } catch {
      integrations.sendgrid = false;
    }
  }
  
  // Check AWS S3
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      // Add S3 health check
      integrations.aws_s3 = true;
    } catch {
      integrations.aws_s3 = false;
    }
  }
  
  return integrations;
}

export async function GET(_request: NextRequest): Promise<NextResponse<HealthStatus | { status: string; timestamp: string; error: string; version: string; environment: string }>> {
  const startTime = Date.now();
  
  try {
    // Perform health checks
    const [databaseHealthy, redisHealthy, filesystemHealthy, integrations] = await Promise.all([
      checkDatabase(),
      checkRedis(), 
      checkFilesystem(),
      checkIntegrations()
    ]);
    
    const memory = getMemoryUsage();
    
    // Determine overall status
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (!databaseHealthy || !filesystemHealthy) {
      status = 'unhealthy';
    } else if (!redisHealthy || memory.percentage > 90 || Object.values(integrations).includes(false)) {
      status = 'degraded';
    }
    
    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        database: databaseHealthy,
        redis: redisHealthy,
        filesystem: filesystemHealthy,
        memory,
        integrations
      },
      metadata: {
        nodeVersion: process.version,
nextVersion: (await import('next/package.json')).version,
        hostname: (await import('os')).hostname(),
        region: process.env.AWS_REGION
      }
    };
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(healthStatus, {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Response-Time': `${responseTime}ms`
      }
    });
    
  } catch (error) {
    logger.error({ message: 'Health check failed', error });
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

// Liveness probe - simpler check for container orchestration
export async function HEAD(_request: NextRequest): Promise<NextResponse<null>> {
  try {
    // Quick check - just verify the application is running
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
