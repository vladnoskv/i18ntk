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
const SecurityUtils = require('../utils/security');
const { detectFramework } = require('../utils/framework-detector');

describe('Security Tests', () => {
  describe('Path Validation', () => {
    test('should prevent path traversal attacks', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\sam',
        'valid/path/../../../etc/passwd'
      ];

      maliciousPaths.forEach(maliciousPath => {
        const result = SecurityUtils.validatePath(maliciousPath, process.cwd());
        expect(result).toBeNull();
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
        expect(result).toBeTruthy();
        expect(result).toContain(safePath.replace('./', ''));
      });
    });

    test('should handle null and invalid inputs', () => {
      const invalidInputs = [null, undefined, '', 123, {}, []];

      invalidInputs.forEach(input => {
        const result = SecurityUtils.validatePath(input, process.cwd());
        expect(result).toBeNull();
      });
    });
  });

  describe('File System Security', () => {
    test('should safely check file existence', () => {
      const testFile = path.join(__dirname, 'fixtures', 'test.json');
      const result = SecurityUtils.safeExistsSync(testFile, __dirname);
      expect(typeof result).toBe('boolean');
    });

    test('should safely read files with size limits', () => {
      const testFile = path.join(__dirname, 'fixtures', 'test.json');
      const result = SecurityUtils.safeReadFileSync(testFile, __dirname, 'utf8');

      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeLessThanOrEqual(10 * 1024 * 1024); // 10MB limit
      }
    });

    test('should handle non-existent files gracefully', () => {
      const nonExistentFile = path.join(__dirname, 'fixtures', 'nonexistent.json');
      const result = SecurityUtils.safeReadFileSync(nonExistentFile, __dirname, 'utf8');
      expect(result).toBeNull();
    });

    test('should safely parse JSON', () => {
      const validJson = '{"test": "value"}';
      const result = SecurityUtils.safeParseJSON(validJson);
      expect(result).toEqual({ test: 'value' });

      const invalidJson = '{"test": invalid}';
      const invalidResult = SecurityUtils.safeParseJSON(invalidJson);
      expect(invalidResult).toBeNull();
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
        expect(result).not.toContain('<script');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('eval(');
        expect(result).not.toContain('onerror');
      });
    });

    test('should preserve safe input', () => {
      const safeInputs = [
        'Hello World',
        'user@example.com',
        'config/i18n.json',
        'Translation key with spaces',
        '123-456-789'
      ];

      safeInputs.forEach(input => {
        const result = SecurityUtils.sanitizeInput(input);
        expect(result).toBe(input);
      });
    });

    test('should enforce length limits', () => {
      const longInput = 'a'.repeat(2000);
      const result = SecurityUtils.sanitizeInput(longInput, { maxLength: 100 });
      expect(result.length).toBe(100);
    });
  });

  describe('Framework Detection Security', () => {
    test('should handle invalid project paths', () => {
      const invalidPaths = [null, undefined, '', 123, {}, []];

      invalidPaths.forEach(invalidPath => {
        expect(() => detectFramework(invalidPath)).toThrow();
      });
    });

    test('should handle non-existent package.json', () => {
      const nonExistentPath = path.join(__dirname, 'nonexistent');
      const result = detectFramework(nonExistentPath);
      expect(result).toBeNull();
    });

    test('should handle malformed package.json', () => {
      // This would require creating a temporary malformed package.json
      // For now, we test the error handling path
      const invalidJsonPath = path.join(__dirname, 'fixtures', 'invalid.json');
      // Create a temporary invalid JSON file for testing
      const fs = require('fs');
      const tempDir = path.join(__dirname, 'temp');
      const tempPackageJson = path.join(tempDir, 'package.json');

      try {
        if (!SecurityUtils.safeExistsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        SecurityUtils.safeWriteFileSync(tempPackageJson, '{"invalid": json}');

        const result = detectFramework(tempDir);
        expect(result).toBeNull();
      } finally {
        // Cleanup
        if (SecurityUtils.safeExistsSync(tempPackageJson)) {
          fs.unlinkSync(tempPackageJson);
        }
        if (SecurityUtils.safeExistsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });
  });

  describe('Security Event Logging', () => {
    test('should log security events', () => {
      const originalConsoleLog = console.log;
      const logs = [];
      console.log = (...args) => logs.push(args.join(' '));

      try {
        SecurityUtils.logSecurityEvent('Test security event', 'info', { test: true });
        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0]).toContain('Test security event');
      } finally {
        console.log = originalConsoleLog;
      }
    });

    test('should handle security event logging errors gracefully', () => {
      // This tests the error handling in logSecurityEvent
      const result = SecurityUtils.logSecurityEvent('Test event', 'info');
      expect(result).toBeUndefined(); // Should not throw
    });
  });

  describe('Command Argument Validation', () => {
    test('should validate command arguments', async () => {
      const validArgs = {
        'source-dir': './locales',
        'output-dir': './reports',
        'strict': true
      };

      const result = await SecurityUtils.validateCommandArgs(validArgs);
      expect(result).toEqual(validArgs);
    });

    test('should reject unknown command arguments', async () => {
      const originalConsoleWarn = console.warn;
      const warnings = [];
      console.warn = (...args) => warnings.push(args.join(' '));

      try {
        const argsWithUnknown = {
          'source-dir': './locales',
          'unknown-arg': 'malicious'
        };

        const result = await SecurityUtils.validateCommandArgs(argsWithUnknown);
        expect(result).not.toHaveProperty('unknown-arg');
        expect(warnings.length).toBeGreaterThan(0);
      } finally {
        console.warn = originalConsoleWarn;
      }
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
      expect(result).toEqual(validConfig);
    });

    test('should reject invalid configuration', () => {
      const invalidConfig = {
        sourceDir: '../../../etc/passwd',
        unknownProperty: 'malicious'
      };

      const result = SecurityUtils.validateConfig(invalidConfig);
      expect(result.sourceDir).not.toContain('..');
      expect(result).not.toHaveProperty('unknownProperty');
    });
  });

  describe('Path Safety Checks', () => {
    test('should identify safe paths', () => {
      const safePaths = [
        'locales/en.json',
        'src/i18n/config.js',
        './config/i18n.json'
      ];

      safePaths.forEach(safePath => {
        const result = SecurityUtils.isSafePath(safePath);
        expect(result).toBe(true);
      });
    });

    test('should identify dangerous paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\sam',
        'valid/path/../../../etc/passwd'
      ];

      dangerousPaths.forEach(dangerousPath => {
        const result = SecurityUtils.isSafePath(dangerousPath);
        expect(result).toBe(false);
      });
    });
  });
});