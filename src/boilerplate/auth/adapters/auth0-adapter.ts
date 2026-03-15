/**
 * Auth0 Adapter
 * 
 * Integration adapter for Auth0 authentication service.
 */

import {
  AuthResult,
  AuthCredentials,
  User,
  Session,
  Auth0Adapter as IAuth0Adapter
} from '../../interfaces/auth';
import { BaseAuthAdapter, UserStorage } from './base-adapter';
import { SessionManager } from '../session-manager';

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience?: string;
  scope?: string;
  redirectUri?: string;
  logoutUri?: string;
}

export class Auth0Adapter extends BaseAuthAdapter implements IAuth0Adapter {
  public domain: string;
  public clientId: string;
  public clientSecret: string;
  private config: Auth0Config;

  constructor(
    config: Auth0Config,
    userStorage: UserStorage,
    sessionManager?: SessionManager
  ) {
    super(userStorage, sessionManager);
    this.domain = config.domain;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.config = config;
  }

  /**
   * Authenticate using Auth0
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      switch (credentials.type) {
        case 'token':
          return this.authenticateWithAuth0Token(credentials);
        case 'oauth':
          return this.authenticateWithAuth0OAuth(credentials);
        default:
          return this.createAuthResult(
            false,
            undefined,
            undefined,
            `Unsupported credential type for Auth0: ${credentials.type}`
          );
      }
    } catch (error) {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Auth0 authentication failed'
      );
    }
  }

  /**
   * Authenticate with Auth0 access token
   */
  private async authenticateWithAuth0Token(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    if (!credentials.token) {
      return this.createAuthResult(false, undefined, undefined, 'Token required');
    }

    try {
      // Validate token with Auth0
      const auth0User = await this.validateAuth0Token(credentials.token);
      if (!auth0User) {
        return this.createAuthResult(false, undefined, undefined, 'Invalid Auth0 token');
      }

      // Sync user with CMS
      const user = await this.syncUserFromAuth0(auth0User);
      
      if (user.status !== 'active') {
        return this.createAuthResult(
          false,
          undefined,
          undefined,
          `Account is ${user.status}`
        );
      }

      // Create session
      const session = await this.createSession(user, {
        provider: 'auth0',
        auth0UserId: auth0User.sub,
        accessToken: credentials.token
      });

      return this.createAuthResult(true, user, session);
    } catch (error) {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        'Failed to validate Auth0 token'
      );
    }
  }

  /**
   * Authenticate with Auth0 OAuth flow
   */
  private async authenticateWithAuth0OAuth(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    // This would typically be handled by Auth0's OAuth flow
    // Return redirect URL for OAuth initiation
    const authUrl = this.getAuth0AuthorizationUrl();
    
    return this.createAuthResult(
      false,
      undefined,
      undefined,
      'OAuth flow required',
      authUrl
    );
  }

  /**
   * Validate Auth0 access token
   */
  private async validateAuth0Token(accessToken: string): Promise<any | null> {
    try {
      const response = await fetch(`https://${this.domain}/userinfo`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Auth0 API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Auth0 token validation failed:', error);
      return null;
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri?: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn: number;
  } | null> {
    try {
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: redirectUri || this.config.redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`Auth0 token exchange failed: ${response.status}`);
      }

      const tokens = await response.json();
      
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresIn: tokens.expires_in
      };
    } catch (error) {
      console.error('Auth0 code exchange failed:', error);
      return null;
    }
  }

  /**
   * Refresh Auth0 access token
   */
  async refreshAuth0Token(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  } | null> {
    try {
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`Auth0 token refresh failed: ${response.status}`);
      }

      const tokens = await response.json();
      
      return {
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in
      };
    } catch (error) {
      console.error('Auth0 token refresh failed:', error);
      return null;
    }
  }

  /**
   * Sync user from Auth0 to CMS user storage
   */
  private async syncUserFromAuth0(auth0User: any): Promise<User> {
    // Try to find existing user by Auth0 ID or email
    let user = await this.findUserByAuth0Id(auth0User.sub);
    
    if (!user && auth0User.email) {
      user = await this.getUserByEmail(auth0User.email);
    }

    if (user) {
      // Update existing user
      user = await this.updateUser(user.id, {
        name: auth0User.name || user.name,
        avatar: auth0User.picture || user.avatar,
        lastLoginAt: new Date().toISOString(),
        metadata: {
          ...user.metadata,
          auth0Id: auth0User.sub,
          auth0Profile: auth0User
        }
      });
    } else {
      // Create new user
      user = await this.createUser({
        email: auth0User.email,
        name: auth0User.name || auth0User.email,
        roles: ['viewer'], // Default role
        metadata: {
          auth0Id: auth0User.sub,
          auth0Profile: auth0User,
          avatar: auth0User.picture,
          emailVerified: auth0User.email_verified
        }
      });
    }

    return user;
  }

  /**
   * Find user by Auth0 ID
   */
  private async findUserByAuth0Id(auth0Id: string): Promise<User | null> {
    // This would require a more sophisticated query in the user storage
    // For demo purposes, we'll iterate through users
    const users = await this.listUsers();
    return users.find(user => user.metadata.auth0Id === auth0Id) || null;
  }

  /**
   * Get Auth0 authorization URL
   */
  getAuth0AuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.config.redirectUri || '',
      scope: this.config.scope || 'openid profile email',
      audience: this.config.audience || ''
    });

    if (state) {
      params.set('state', state);
    }

    return `https://${this.domain}/authorize?${params.toString()}`;
  }

  /**
   * Get Auth0 logout URL
   */
  getAuth0LogoutUrl(returnTo?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      returnTo: returnTo || this.config.logoutUri || ''
    });

    return `https://${this.domain}/v2/logout?${params.toString()}`;
  }

  /**
   * Create Auth0 user
   */
  async createAuth0User(userData: {
    email: string;
    password: string;
    name?: string;
    metadata?: Record<string, unknown>;
  }): Promise<any> {
    try {
      // Get management API token first
      const managementToken = await this.getManagementApiToken();
      
      const response = await fetch(`https://${this.domain}/api/v2/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection: 'Username-Password-Authentication',
          email: userData.email,
          password: userData.password,
          name: userData.name,
          user_metadata: userData.metadata
        })
      });

      if (!response.ok) {
        throw new Error(`Auth0 user creation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Auth0 user creation failed:', error);
      throw error;
    }
  }

  /**
   * Get Auth0 Management API token
   */
  private async getManagementApiToken(): Promise<string> {
    try {
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: `https://${this.domain}/api/v2/`
        })
      });

      if (!response.ok) {
        throw new Error(`Auth0 management token failed: ${response.status}`);
      }

      const tokens = await response.json();
      return tokens.access_token;
    } catch (error) {
      console.error('Auth0 management token failed:', error);
      throw error;
    }
  }

  /**
   * Handle Auth0 callback
   */
  async handleCallback(code: string, state?: string): Promise<AuthResult> {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code);
      if (!tokens) {
        return this.createAuthResult(false, undefined, undefined, 'Token exchange failed');
      }

      // Authenticate with access token
      return this.authenticate({
        type: 'token',
        identifier: '',
        token: tokens.accessToken,
        metadata: {
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
          expiresIn: tokens.expiresIn
        }
      });
    } catch (error) {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Auth0 callback failed'
      );
    }
  }
}