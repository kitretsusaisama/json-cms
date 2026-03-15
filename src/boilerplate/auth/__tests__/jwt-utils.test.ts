/**
 * JWT Utils Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JWTUtils } from '../jwt-utils';

describe('JWTUtils', () => {
  let jwtUtils: JWTUtils;

  beforeEach(() => {
    jwtUtils = new JWTUtils({
      secret: 'test-secret-key-for-jwt-signing',
      algorithm: 'HS256',
      issuer: 'test-issuer',
      audience: 'test-audience',
      defaultExpiresIn: 3600
    });
  });

  describe('token signing and verification', () => {
    it('should sign and verify JWT token', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user']
      };

      const token = await jwtUtils.sign(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const verified = await jwtUtils.verify(token);
      expect(verified).toBeDefined();
      expect(verified!.userId).toBe('user-123');
      expect(verified!.email).toBe('test@example.com');
      expect(verified!.roles).toEqual(['user']);
    });

    it('should sign token with custom options', async () => {
      const payload = { userId: 'user-456' };
      const options = {
        expiresIn: 1800,
        subject: 'user-456',
        jwtId: 'jwt-123'
      };

      const token = await jwtUtils.sign(payload, options);
      const verified = await jwtUtils.verify(token);

      expect(verified).toBeDefined();
      expect(verified!.sub).toBe('user-456');
      expect(verified!.jti).toBe('jwt-123');
    });

    it('should fail verification with invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';
      const verified = await jwtUtils.verify(invalidToken);
      expect(verified).toBeNull();
    });

    it('should fail verification with wrong secret', async () => {
      const payload = { userId: 'user-789' };
      const token = await jwtUtils.sign(payload);

      const wrongJwtUtils = new JWTUtils({
        secret: 'wrong-secret',
        algorithm: 'HS256'
      });

      const verified = await wrongJwtUtils.verify(token);
      expect(verified).toBeNull();
    });
  });

  describe('token decoding', () => {
    it('should decode token without verification', async () => {
      const payload = {
        userId: 'user-decode',
        email: 'decode@example.com'
      };

      const token = await jwtUtils.sign(payload);
      const decoded = jwtUtils.decode(token);

      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe('user-decode');
      expect(decoded!.email).toBe('decode@example.com');
    });

    it('should return null for invalid token format', () => {
      const invalidToken = 'not.a.valid.jwt.format.token';
      const decoded = jwtUtils.decode(invalidToken);
      expect(decoded).toBeNull();
    });
  });

  describe('token expiration', () => {
    it('should check if token is expired', async () => {
      // Create expired token
      const payload = { userId: 'user-expired' };
      const expiredToken = await jwtUtils.sign(payload, { expiresIn: -1 });

      const isExpired = jwtUtils.isExpired(expiredToken);
      expect(isExpired).toBe(true);

      // Create valid token
      const validToken = await jwtUtils.sign(payload, { expiresIn: 3600 });
      const isValidExpired = jwtUtils.isExpired(validToken);
      expect(isValidExpired).toBe(false);
    });

    it('should get token expiration time', async () => {
      const payload = { userId: 'user-exp-time' };
      const token = await jwtUtils.sign(payload, { expiresIn: 3600 });

      const expirationTime = jwtUtils.getExpirationTime(token);
      expect(expirationTime).toBeDefined();
      expect(expirationTime).toBeInstanceOf(Date);

      const now = new Date();
      const timeDiff = expirationTime!.getTime() - now.getTime();
      expect(timeDiff).toBeGreaterThan(3500000); // Should be close to 1 hour
      expect(timeDiff).toBeLessThan(3700000);
    });

    it('should get token issued time', async () => {
      const beforeSign = new Date();
      const payload = { userId: 'user-issued' };
      const token = await jwtUtils.sign(payload);
      const afterSign = new Date();

      const issuedTime = jwtUtils.getIssuedTime(token);
      expect(issuedTime).toBeDefined();
      expect(issuedTime).toBeInstanceOf(Date);
      
      // Allow for some timing variance (1 second)
      const timeDiff = Math.abs(issuedTime!.getTime() - beforeSign.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should get time to expiry', async () => {
      const payload = { userId: 'user-ttl' };
      const token = await jwtUtils.sign(payload, { expiresIn: 1800 });

      const timeToExpiry = jwtUtils.getTimeToExpiry(token);
      expect(timeToExpiry).toBeDefined();
      expect(timeToExpiry).toBeGreaterThan(1700); // Should be close to 30 minutes
      expect(timeToExpiry).toBeLessThan(1900);
    });
  });

  describe('specialized token creation', () => {
    it('should create access token', async () => {
      const accessToken = await jwtUtils.createAccessToken(
        'user-123',
        'tenant-456',
        ['editor', 'viewer'],
        ['read', 'write'],
        { custom: 'data' }
      );

      const verified = await jwtUtils.verify(accessToken);
      expect(verified).toBeDefined();
      expect(verified!.sub).toBe('user-123');
      expect(verified!.tenantId).toBe('tenant-456');
      expect(verified!.roles).toEqual(['editor', 'viewer']);
      expect(verified!.permissions).toEqual(['read', 'write']);
      expect(verified!.type).toBe('access');
      expect(verified!.custom).toBe('data');
    });

    it('should create refresh token', async () => {
      const refreshToken = await jwtUtils.createRefreshToken(
        'user-789',
        'session-123',
        7 * 24 * 3600 // 7 days
      );

      const verified = await jwtUtils.verify(refreshToken);
      expect(verified).toBeDefined();
      expect(verified!.sub).toBe('user-789');
      expect(verified!.sessionId).toBe('session-123');
      expect(verified!.type).toBe('refresh');
    });

    it('should validate access token', async () => {
      const accessToken = await jwtUtils.createAccessToken(
        'user-validate',
        'tenant-validate',
        ['admin'],
        ['cms.admin']
      );

      const validation = await jwtUtils.validateAccessToken(accessToken);
      expect(validation).toBeDefined();
      expect(validation!.userId).toBe('user-validate');
      expect(validation!.tenantId).toBe('tenant-validate');
      expect(validation!.roles).toEqual(['admin']);
      expect(validation!.permissions).toEqual(['cms.admin']);
    });

    it('should validate refresh token', async () => {
      const refreshToken = await jwtUtils.createRefreshToken(
        'user-refresh',
        'session-refresh'
      );

      const validation = await jwtUtils.validateRefreshToken(refreshToken);
      expect(validation).toBeDefined();
      expect(validation!.userId).toBe('user-refresh');
      expect(validation!.sessionId).toBe('session-refresh');
    });

    it('should reject invalid access token type', async () => {
      const refreshToken = await jwtUtils.createRefreshToken('user-123');
      const validation = await jwtUtils.validateAccessToken(refreshToken);
      expect(validation).toBeNull();
    });

    it('should reject invalid refresh token type', async () => {
      const accessToken = await jwtUtils.createAccessToken('user-123');
      const validation = await jwtUtils.validateRefreshToken(accessToken);
      expect(validation).toBeNull();
    });
  });

  describe('token refresh logic', () => {
    it('should refresh token if needed', async () => {
      let refreshCallCount = 0;
      const refreshCallback = async (payload: any) => {
        refreshCallCount++;
        return jwtUtils.createAccessToken(payload.sub, payload.tenantId);
      };

      // Create token that expires soon
      const shortLivedToken = await jwtUtils.createAccessToken('user-refresh', undefined, [], [], undefined);
      
      // Mock the token to be close to expiry by creating one with very short expiry
      const almostExpiredToken = await jwtUtils.sign(
        { sub: 'user-refresh', type: 'access' },
        { expiresIn: 200 } // 200 seconds
      );

      const refreshedToken = await jwtUtils.refreshIfNeeded(
        almostExpiredToken,
        300, // 5 minutes threshold
        refreshCallback
      );

      expect(refreshCallCount).toBe(1);
      expect(refreshedToken).not.toBe(almostExpiredToken);

      // Verify the refreshed token
      const validation = await jwtUtils.validateAccessToken(refreshedToken);
      expect(validation).toBeDefined();
      expect(validation!.userId).toBe('user-refresh');
    });

    it('should not refresh token if not needed', async () => {
      let refreshCallCount = 0;
      const refreshCallback = async (payload: any) => {
        refreshCallCount++;
        return jwtUtils.createAccessToken(payload.sub);
      };

      const longLivedToken = await jwtUtils.createAccessToken('user-no-refresh');

      const result = await jwtUtils.refreshIfNeeded(
        longLivedToken,
        300, // 5 minutes threshold
        refreshCallback
      );

      expect(refreshCallCount).toBe(0);
      expect(result).toBe(longLivedToken);
    });
  });
});