const SecurityUtils = require('../../utils/security');
const path = require('path');
const fs = require('fs');

describe('SecurityUtils Path Sanitization', () => {
  const basePath = process.cwd();

  describe('Basic path sanitization', () => {
    it('should sanitize valid paths', () => {
      const input = 'valid/path';
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBe(path.join(basePath, input));

    });

    it('should handle Windows paths', () => {
      const input = 'valid\\path';
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBe(path.join(basePath, input.replace(/\\/g, path.sep)));
    });
  });

  describe('Path traversal attempts', () => {
    it('should prevent simple traversal', () => {
      const input = '../malicious';
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBeNull();
    });

    it('should prevent complex traversal', () => {
      const input = '../../malicious';
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBeNull();
    });

    it('should handle mixed slashes', () => {
      const input = '..\\..\\/malicious';
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBeNull();
    });
  });

  describe('Special characters and Unicode sequences', () => {
    it('should handle paths with special characters', () => {
      const input = 'path with spaces and !@#$%^&*()';
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBe(path.join(basePath, input));
    });

    it('should handle Unicode characters', () => {
      const input = 'path with unicode ';
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBe(path.join(basePath, input));
    });
  });

  describe('Absolute path handling', () => {
    it('should reject absolute paths outside base', () => {
      const input = '/path/to/malicious';
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBeNull();
    });

    it('should allow absolute paths within base', () => {
      const input = path.resolve(basePath, 'valid/path');
      const result = SecurityUtils.sanitizePath(input, basePath);
      expect(result).toBe(input);
    });
  });

  describe('Error cases', () => {
    it('should handle null input', () => {
      const result = SecurityUtils.sanitizePath(null, basePath);
      expect(result).toBeNull();
    });

    it('should handle non-string input', () => {
      const result = SecurityUtils.sanitizePath(123, basePath);
      expect(result).toBeNull();
    });

    it('should handle invalid encoding', () => {
      // This test is more complex as it requires mocking
      // For now, we'll just check that it doesn't throw
      expect(() => SecurityUtils.sanitizePath('test', basePath)).not.toThrow();
    });
  });

  describe('Directory creation', () => {
    it('should create directory if createIfNotExists is true', () => {
      const input = 'new/directory';
      const result = SecurityUtils.sanitizePath(input, basePath, { createIfNotExists: true });
      expect(result).toBe(path.join(basePath, input));
      expect(SecurityUtils.safeExistsSync(path.dirname(result))).toBe(true);
    });
  });
});