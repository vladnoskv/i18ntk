/**
 * Security Tests for i18ntk
 *
 * Tests security features including:
 * - Path traversal protection
 * - Input validation and sanitization
 * - File system security
 * - JSON parsing security
 * - Framework detection security
 */

const path = require('path');
const assert = require('assert');
const { describe, test } = require('node:test');
const fs = require('fs');
const SecurityUtils = require('../utils/security');

describe('Security Tests', () => {
  describe('Path Validation', () => {
    test('should prevent path traversal attacks', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'valid/path/../../../etc/passwd'
      ];

      maliciousPaths.forEach(maliciousPath => {
        const result = SecurityUtils.validatePath(maliciousPath, process.cwd());
        assert.strictEqual(result, null, `Path ${maliciousPath} should be rejected`);
      });
    });

    test('should allow safe relative paths', () => {
      const safePaths = [
        'locales/en.json',
        'src/locales/de.json',
        'config/i18n.js',
        './locales/fr.json',
        'app/i18n/locales/es.json'
      ];

      safePaths.forEach(safePath => {
        const result = SecurityUtils.validatePath(safePath, process.cwd());
        assert.ok(result !== null, `Path ${safePath} should be accepted`);
        // validatePath returns the full resolved path, not the original
        assert.ok(typeof result === 'string', 'Result should be a string path');
      });
    });

    test('should allow absolute paths when they remain inside base path', () => {
      const basePath = process.cwd();
      const absolutePathInsideBase = path.join(basePath, 'locales', 'en.json');
      const result = SecurityUtils.validatePath(absolutePathInsideBase, basePath);
      assert.ok(result !== null, `Path ${absolutePathInsideBase} should be accepted`);
    });

    test('should handle null and invalid inputs', () => {
      const invalidInputs = [null, undefined, '', 123, {}, []];

      invalidInputs.forEach(input => {
        const result = SecurityUtils.validatePath(input, process.cwd());
        assert.strictEqual(result, null, `Invalid input ${JSON.stringify(input)} should return null`);
      });
    });
  });

  describe('File System Security', () => {
    test('should safely check file existence', () => {
      const testFile = path.join(__dirname, 'fixtures', 'test.json');
      const result = SecurityUtils.safeExistsSync(testFile, __dirname);
      assert.strictEqual(typeof result, 'boolean', 'Result should be a boolean');
    });

    test('should safely read files with size limits', () => {
      const testFile = path.join(__dirname, 'fixtures', 'test.json');
      const result = SecurityUtils.safeReadFileSync(testFile, __dirname, 'utf8');

      if (result) {
        assert.strictEqual(typeof result, 'string', 'Result should be a string');
        assert.ok(result.length <= 10 * 1024 * 1024, 'File size should not exceed 10MB limit');
      }
    });

    test('should handle non-existent files gracefully', () => {
      const nonExistentFile = path.join(__dirname, 'fixtures', 'nonexistent.json');
      const result = SecurityUtils.safeReadFileSync(nonExistentFile, __dirname, 'utf8');
      assert.strictEqual(result, null, 'Non-existent file should return null');
    });

    test('should safely parse JSON', () => {
      const validJson = '{"test": "value"}';
      const result = SecurityUtils.safeParseJSON(validJson);
      assert.deepStrictEqual(result, { test: 'value' }, 'Valid JSON should parse correctly');

      const invalidJson = '{"test": invalid}';
      const invalidResult = SecurityUtils.safeParseJSON(invalidJson);
      assert.strictEqual(invalidResult, null, 'Invalid JSON should return null');
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize malicious input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '../../../etc/passwd',
        '"><img src=x onerror=alert(1)>',
        'eval(console.log("rce"))'
      ];

      maliciousInputs.forEach(input => {
        const result = SecurityUtils.sanitizeInput(input);
        assert.ok(!result.includes('<script'), `Result should not contain <script`);
        assert.ok(!result.includes('javascript:'), `Result should not contain javascript:`);
        assert.ok(!result.includes('eval('), `Result should not contain eval(`);
        assert.ok(!result.includes('onerror'), `Result should not contain onerror`);
      });
    });

    test('should preserve safe input', () => {
      const safeInputs = [
        'Hello World',
        'config/i18n.json',
        'Translation key with spaces',
        '123-456-789'
      ];

      safeInputs.forEach(input => {
        const result = SecurityUtils.sanitizeInput(input);
        assert.strictEqual(result, input, `Safe input should be preserved: ${input}`);
      });
    });

    test('should enforce length limits', () => {
      const longInput = 'a'.repeat(2000);
      const result = SecurityUtils.sanitizeInput(longInput, { maxLength: 100 });
      assert.strictEqual(result.length, 100, 'Result should be limited to maxLength');
    });
  });

  describe('Framework Detection Security', () => {
    test('should validate safe paths', () => {
      const validPaths = [
        'locales/en.json',
        'src/i18n/config.js',
        './config/i18n.json'
      ];

      validPaths.forEach(validPath => {
        const result = SecurityUtils.isSafePath(validPath);
        assert.strictEqual(result, true, `Path ${validPath} should be safe`);
      });
    });

    test('should reject dangerous paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam'
      ];

      dangerousPaths.forEach(dangerousPath => {
        const result = SecurityUtils.isSafePath(dangerousPath);
        assert.strictEqual(result, false, `Path ${dangerousPath} should be dangerous`);
      });
    });

    test('should handle malformed configuration', () => {
      // Test that validateConfig handles invalid data gracefully
      const invalidConfig = {
        sourceDir: '../../../etc/passwd',
        unknownProperty: 'malicious'
      };

      const result = SecurityUtils.validateConfig(invalidConfig);
      assert.ok(result, 'Should return a config object');
      assert.ok(!result.unknownProperty, 'Should remove unknown properties');
    });
  });

  describe('Security Event Logging', () => {
    test('should log security events without throwing', () => {
      // Capture console output
      const originalConsoleLog = console.log;
      const logs = [];
      console.log = (...args) => logs.push(args.join(' '));
      const originalLevel = process.env.SECURITY_LOG_LEVEL;
      process.env.SECURITY_LOG_LEVEL = 'info';

      try {
        SecurityUtils.logSecurityEvent('Test security event', 'info', { test: true });
        // Just verify it doesn't throw - logging implementation may vary
        assert.ok(true, 'logSecurityEvent should not throw');
      } finally {
        process.env.SECURITY_LOG_LEVEL = originalLevel;
        console.log = originalConsoleLog;
      }
    });

    test('should handle security event logging errors gracefully', () => {
      // This tests the error handling in logSecurityEvent
      const result = SecurityUtils.logSecurityEvent('Test event', 'info');
      assert.strictEqual(result, undefined, 'Should not throw and return undefined');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate secure configuration', () => {
      const validConfig = {
        sourceDir: './locales',
        outputDir: './reports',
        security: {
          adminPinEnabled: true,
          sessionTimeout: 1800000
        }
      };

      const result = SecurityUtils.validateConfig(validConfig);
      assert.ok(result, 'Should return a validated config');
      assert.ok(result.sourceDir, 'Should preserve sourceDir');
      assert.ok(result.outputDir, 'Should preserve outputDir');
    });

    test('should reject invalid configuration', () => {
      const invalidConfig = {
        sourceDir: '../../../etc/passwd',
        unknownProperty: 'malicious'
      };

      const result = SecurityUtils.validateConfig(invalidConfig);
      assert.ok(result, 'Should return a config object');
      assert.ok(!result.sourceDir || !result.sourceDir.includes('..'), 'Should not allow parent directory traversal');
      assert.ok(!result.unknownProperty, 'Should remove unknown properties');
    });
  });

  describe('Path Safety Checks', () => {
    test('should identify safe paths', () => {
      const safePaths = [
        'locales/en.json',
        'src/i18n/config.js',
        './config/i18n.json',
        'C:\\Windows\\System32\\config\\sam'  // Windows absolute paths are allowed
      ];

      safePaths.forEach(safePath => {
        const result = SecurityUtils.isSafePath(safePath);
        assert.strictEqual(result, true, `Path ${safePath} should be safe`);
      });
    });

    test('should identify dangerous paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'valid/path/../../../etc/passwd'
      ];

      dangerousPaths.forEach(dangerousPath => {
        const result = SecurityUtils.isSafePath(dangerousPath);
        assert.strictEqual(result, false, `Path ${dangerousPath} should be dangerous`);
      });
    });
  });
});
