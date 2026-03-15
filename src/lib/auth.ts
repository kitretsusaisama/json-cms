/**
 * Authentication utilities for secure user authentication and authorization.
 * Includes JWT handling, session management, and permission checking.
 */

import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError, handleError } from './errors';
import { logger } from './logger';

// Types
export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface AuthResult {
  user: UserSession;
  token: string;
}

interface CookieStore {
  get: (name: string) => { value: string } | undefined;
  set: (options: {
    name: string;
    value: string;
    httpOnly?: boolean;
    secure?: boolean;
    path?: string;
    maxAge?: number;
    sameSite?: 'strict' | 'lax' | 'none';
  }) => void;
  delete: (name: string) => void;
}

// Constants
const TOKEN_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_development_only'
);
const TOKEN_EXPIRY = '8h';
const COOKIE_NAME = 'auth_token';

/**
 * Create a JWT token for a user
 */
export async function createToken(
  user: Omit<UserSession, 'iat' | 'exp'>,
  options?: { expiresIn?: string | number }
): Promise<string> {
  try {
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(options?.expiresIn ?? TOKEN_EXPIRY)
      .sign(TOKEN_SECRET);

    return token;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create authentication token';
    throw handleError(new AuthError(errorMessage, { code: 'TOKEN_CREATION_FAILED' }));    
  }
}

/**
 * Verify a JWT token and return the decoded user session
 */
export async function verifyToken(token: string): Promise<UserSession> {
  try {
    const { payload } = await jwtVerify(token, TOKEN_SECRET, {
      algorithms: ['HS256'],
    });

    return payload as unknown as UserSession;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
    logger.warn({
      message: 'Token verification failed',
      error: errorMessage,
    });

    if (error instanceof Error && 'code' in error && error.code === 'ERR_JWT_EXPIRED') {
      throw new AuthError('Your session has expired. Please log in again.', { code: 'TOKEN_EXPIRED' });
    }
    throw new AuthError('Invalid authentication token', { code: 'INVALID_TOKEN' });    
  }
}
/**
 * Type guard to check if a value is a Promise
 */
function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/**
 * Get the cookie store (handles both sync/async cases)
 */
async function getCookieStore(): Promise<CookieStore> {
  const maybePromise = cookies() as unknown as CookieStore | Promise<CookieStore>;
  return isPromise<CookieStore>(maybePromise) ? await maybePromise : maybePromise;
}

/**
 * Set the authentication token as an HTTP-only cookie
 */
export async function setAuthCookie(
  token: string,
  response?: NextResponse,
  maxAgeSeconds?: number
): Promise<void> {
  const cookieStore = await getCookieStore();
  const secure = process.env.NODE_ENV === "production";
  const maxAge = typeof maxAgeSeconds === "number" ? maxAgeSeconds : 60 * 60 * 8; // default 8 hours

  const cookieOptions = {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure,
    path: "/",
    maxAge,
    sameSite: "lax" as const,
  };

  if (response) {
    // For edge runtime
    response.cookies.set(cookieOptions);
  } else {
    // For server components
    cookieStore.set(cookieOptions);
  }
}

/**
 * Clear the authentication cookie
 */
export async function clearAuthCookie(response?: NextResponse): Promise<void> {
  const cookieStore = await getCookieStore();

  if (response) {
    response.cookies.delete(COOKIE_NAME);
  } else {
    cookieStore.delete(COOKIE_NAME);
  }
}

/**
 * Get the current user session from the request
 */
export async function getUserFromRequest(request: NextRequest): Promise<UserSession | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: UserSession | null, permission: string): boolean {
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: UserSession | null, permissions: string[]): boolean {
  if (!user) {
    return false;
  }

  // Super admin has all permissions
  if (user.role === 'admin') {
    return true;
  }

  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: UserSession | null, permissions: string[]): boolean {
  if (!user) {
    return false;
  }

  // Super admin has all permissions
  if (user.role === 'admin') {
    return true;
  }

  return permissions.every(permission => user.permissions.includes(permission));
}                    