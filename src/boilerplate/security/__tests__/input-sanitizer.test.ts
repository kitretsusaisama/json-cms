import { describe, it, expect, beforeEach } from 'vitest';
import { InputSanitizer } from '../input-sanitizer';
import { z } from 'zod';

describe('InputSanitizer', () => {
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    sanitizer = new InputSanitizer();
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizer.sanitizeHtml(input);
      expect(result).toBe('<p>Hello</p>');
    });

    it('should preserve allowed tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizer.sanitizeHtml(input);
      expect(result).toBe('<p>Hello <strong>world</strong></p>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<p onclick="alert()">Hello</p>';
      const result = sanitizer.sanitizeHtml(input);
      expect(result).toBe('<p>Hello</p>');
    });

    it('should handle empty input', () => {
      expect(sanitizer.sanitizeHtml('')).toBe('');
      expect(sanitizer.sanitizeHtml(null as any)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('HelloWorld');
    });

    it('should remove control characters', () => {
      const input = 'Hello\x01\x02World';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('HelloWorld');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('validateAndSanitize', () => {
    it('should validate valid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      const data = { name: 'John', age: 30 };
      const result = sanitizer.validateAndSanitize(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toEqual(data);
    });

    it('should reject invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      const data = { name: 'John', age: 'thirty' };
      const result = sanitizer.validateAndSanitize(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('detectAttacks', () => {
    it('should detect XSS attempts', () => {
      const input = '<script>alert("xss")</script>';
      const attacks = sanitizer.detectAttacks(input);
      
      expect(attacks.length).toBeGreaterThan(0);
      expect(attacks[0].name).toBe('XSS Script Injection');
      expect(attacks[0].severity).toBe('critical');
    });

    it('should detect SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --";
      const attacks = sanitizer.detectAttacks(input);
      
      expect(attacks.length).toBeGreaterThan(0);
      expect(attacks.some(a => a.name === 'SQL Injection')).toBe(true);
    });

    it('should detect path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const attacks = sanitizer.detectAttacks(input);
      
      expect(attacks.length).toBeGreaterThan(0);
      expect(attacks.some(a => a.name === 'Path Traversal')).toBe(true);
    });

    it('should return empty array for safe input', () => {
      const input = 'Hello World';
      const attacks = sanitizer.detectAttacks(input);
      expect(attacks).toHaveLength(0);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: 'John<script>alert()</script>',
        profile: {
          bio: 'Developer\x00'
        },
        tags: ['web', 'security\x01']
      };

      const result = sanitizer.sanitizeObject(input) as any;
      
      expect(result.name).toBe('John');
      expect(result.profile.bio).toBe('Developer');
      expect(result.tags[0]).toBe('web');
      expect(result.tags[1]).toBe('security');
    });

    it('should handle null and undefined values', () => {
      expect(sanitizer.sanitizeObject(null)).toBe(null);
      expect(sanitizer.sanitizeObject(undefined)).toBe(undefined);
    });

    it('should preserve numbers and booleans', () => {
      const input = { age: 30, active: true };
      const result = sanitizer.sanitizeObject(input);
      expect(result).toEqual(input);
    });
  });

  describe('sanitizeFilePath', () => {
    it('should remove path traversal sequences', () => {
      const input = '../../../etc/passwd';
      const result = sanitizer.sanitizeFilePath(input);
      expect(result).toBe('etc/passwd');
    });

    it('should remove invalid filename characters', () => {
      const input = 'file<name>with:invalid|chars';
      const result = sanitizer.sanitizeFilePath(input);
      expect(result).toBe('filenamewithinvalidchars');
    });

    it('should remove leading slashes', () => {
      const input = '///path/to/file';
      const result = sanitizer.sanitizeFilePath(input);
      expect(result).toBe('path/to/file');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTPS URLs', () => {
      const input = 'https://example.com/path';
      const result = sanitizer.sanitizeUrl(input);
      expect(result).toBe(input);
    });

    it('should reject javascript: URLs', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizer.sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should check against allowed domains', () => {
      const input = 'https://malicious.com/path';
      const result = sanitizer.sanitizeUrl(input, ['example.com']);
      expect(result).toBe('');
    });

    it('should allow subdomains of allowed domains', () => {
      const input = 'https://api.example.com/path';
      const result = sanitizer.sanitizeUrl(input, ['example.com']);
      expect(result).toBe(input);
    });
  });

  describe('content schemas', () => {
    it('should validate page content', () => {
      const schemas = InputSanitizer.createContentSchemas();
      const pageData = {
        title: 'Test Page',
        description: 'A test page',
        content: '<p>Hello world</p>',
        slug: 'test-page',
        tags: ['test', 'page']
      };

      const result = schemas.pageContent.safeParse(pageData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid slug format', () => {
      const schemas = InputSanitizer.createContentSchemas();
      const pageData = {
        title: 'Test Page',
        content: '<p>Hello world</p>',
        slug: 'invalid slug with spaces'
      };

      const result = schemas.pageContent.safeParse(pageData);
      expect(result.success).toBe(false);
    });

    it('should sanitize HTML in title', () => {
      const schemas = InputSanitizer.createContentSchemas();
      const pageData = {
        title: 'Test <script>alert()</script> Page',
        content: '<p>Hello world</p>',
        slug: 'test-page'
      };

      const result = schemas.pageContent.safeParse(pageData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test  Page');
      }
    });
  });
});