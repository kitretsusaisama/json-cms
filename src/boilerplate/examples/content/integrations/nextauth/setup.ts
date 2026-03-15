/**
 * NextAuth.js Integration Example
 * Complete setup for authentication with multiple providers
 */

import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '../../../lib/prisma';

export const authOptions: NextAuthOptions = {
  // Configure authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],

  // Database adapter for session persistence
  adapter: PrismaAdapter(prisma),

  // Configure session strategy
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user',
  },

  // Callbacks for customizing behavior
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist additional user data in JWT
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
        token.tenantId = user.tenantId;
      }

      // Handle account linking
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }

      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.accessToken = token.accessToken as string;
      }

      return session;
    },

    async signIn({ user, account, profile, email, credentials }) {
      // Custom sign-in logic
      try {
        // Check if user is allowed to sign in
        if (user.email && isEmailBlocked(user.email)) {
          return false;
        }

        // Auto-assign tenant based on email domain
        if (user.email && !user.tenantId) {
          const domain = user.email.split('@')[1];
          const tenant = await findTenantByDomain(domain);
          if (tenant) {
            user.tenantId = tenant.id;
          }
        }

        return true;
      } catch (error) {
        console.error('Sign-in error:', error);
        return false;
      }
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  // Events for logging and analytics
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('User signed in:', { userId: user.id, isNewUser });
      
      // Track sign-in event
      await trackEvent('user_sign_in', {
        userId: user.id,
        provider: account?.provider,
        isNewUser,
      });
    },

    async signOut({ token }) {
      console.log('User signed out:', { userId: token?.id });
      
      // Track sign-out event
      await trackEvent('user_sign_out', {
        userId: token?.id,
      });
    },

    async createUser({ user }) {
      console.log('New user created:', { userId: user.id });
      
      // Initialize user profile
      await initializeUserProfile(user.id);
      
      // Send welcome email
      await sendWelcomeEmail(user.email);
      
      // Track user creation
      await trackEvent('user_created', {
        userId: user.id,
      });
    },
  },

  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',

  // Security configuration
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env.NEXTAUTH_COOKIE_PREFIX || 'next-auth'}.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

// Helper functions

function isEmailBlocked(email: string): boolean {
  const blockedDomains = process.env.BLOCKED_EMAIL_DOMAINS?.split(',') || [];
  const domain = email.split('@')[1];
  return blockedDomains.includes(domain);
}

async function findTenantByDomain(domain: string) {
  // Implementation to find tenant by email domain
  return await prisma.tenant.findFirst({
    where: {
      allowedDomains: {
        has: domain,
      },
    },
  });
}

async function initializeUserProfile(userId: string) {
  // Create default user profile and settings
  await prisma.userProfile.create({
    data: {
      userId,
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true,
      },
    },
  });
}

async function sendWelcomeEmail(email: string) {
  // Send welcome email to new users
  // Implementation depends on your email service
  console.log('Sending welcome email to:', email);
}

async function trackEvent(event: string, data: Record<string, any>) {
  // Track events for analytics
  // Implementation depends on your analytics service
  console.log('Tracking event:', event, data);
}

export default NextAuth(authOptions);