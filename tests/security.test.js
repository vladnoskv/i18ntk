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
const os = require('os');
const SecurityUtils = require('../utils/security');
const AdminAuth = require('../utils/admin-auth');
const configManager = require('../utils/config-manager');
const FixerCommand = require('../main/manage/commands/FixerCommand');
const TranslateCommand = require('../main/manage/commands/TranslateCommand');
const {
  analyzeEnglishContent,
  detectTranslationContentRisks,
  hasSecretLikeValue
} = require('../utils/validation-risk');
const {
  protectText,
  restoreText,
  shouldPreserveWholeValue
} = require('../utils/translate/protection');

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

    test('should whitelist internal absolute paths based on package roots', () => {
      const internalPath = path.join(process.cwd(), 'locales', 'en');
      const result = SecurityUtils.validatePath(internalPath, path.join(process.cwd(), 'tmp'));
      assert.ok(result !== null, `Internal path ${internalPath} should be accepted`);
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

  describe('Auto Translate source directory resolution', () => {
    test('should resolve locale root to source language folder when root has no JSON files', () => {
      const tempRoot = fs.mkdtempSync(path.join(process.cwd(), 'tmp-translate-root-'));
      try {
        const localeRoot = path.join(tempRoot, 'locales');
        const englishDir = path.join(localeRoot, 'en');
        fs.mkdirSync(englishDir, { recursive: true });
        fs.writeFileSync(path.join(englishDir, 'home.json'), '{"title":"Home"}\n', 'utf8');

        const command = new TranslateCommand();
        const resolved = command.resolveSourceDirectoryForLanguage(localeRoot, 'en', { log: false });

        assert.strictEqual(resolved.ok, true);
        assert.strictEqual(resolved.sourceDir, englishDir);
        assert.deepStrictEqual(resolved.jsonFiles, ['home.json']);
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });

    test('should keep selected source directory when it contains JSON files directly', () => {
      const tempRoot = fs.mkdtempSync(path.join(process.cwd(), 'tmp-translate-direct-'));
      try {
        fs.writeFileSync(path.join(tempRoot, 'common.json'), '{"title":"Common"}\n', 'utf8');
        fs.mkdirSync(path.join(tempRoot, 'en'), { recursive: true });
        fs.writeFileSync(path.join(tempRoot, 'en', 'home.json'), '{"title":"Home"}\n', 'utf8');

        const command = new TranslateCommand();
        const resolved = command.resolveSourceDirectoryForLanguage(tempRoot, 'en', { log: false });

        assert.strictEqual(resolved.ok, true);
        assert.strictEqual(resolved.sourceDir, tempRoot);
        assert.deepStrictEqual(resolved.jsonFiles, ['common.json']);
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
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

    test('safeJoin should reject sibling paths with shared prefixes', () => {
      const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-safejoin-'));
      const base = path.join(parent, 'base');
      fs.mkdirSync(base);

      try {
        const siblingName = `${path.basename(base)}-sibling`;
        const result = SecurityUtils.safeJoin(base, '..', siblingName, 'file.json');
        assert.strictEqual(result, false, 'Sibling path with shared prefix should be rejected');

        const inside = SecurityUtils.safeJoin(base, 'nested', 'file.json');
        assert.ok(inside && inside.startsWith(base), 'Nested path should be accepted');
      } finally {
        fs.rmSync(parent, { recursive: true, force: true });
      }
    });
  });

  describe('Admin Authentication', () => {
    test('verifyPin should fail closed when admin config is missing', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-admin-missing-'));
      const auth = new AdminAuth();

      try {
        auth.configPath = path.join(dir, '.i18n-admin-config.json');
        const result = await auth.verifyPin('1234');
        assert.strictEqual(result, false, 'Missing admin config must not authenticate');
      } finally {
        await auth.cleanup();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test('verifyPin should fail closed when admin config is disabled', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-admin-disabled-'));
      const auth = new AdminAuth();

      try {
        auth.configPath = path.join(dir, '.i18n-admin-config.json');
        fs.writeFileSync(auth.configPath, JSON.stringify({
          enabled: false,
          pinHash: null,
          salt: null
        }));

        const result = await auth.verifyPin('1234');
        assert.strictEqual(result, false, 'Disabled admin config must not authenticate through verifyPin');
      } finally {
        await auth.cleanup();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test('auth-required checks should fail closed when PIN auth is enabled but config is missing', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-admin-required-'));
      const auth = new AdminAuth();
      const originalLoadSettings = configManager.loadSettings;

      try {
        auth.configPath = path.join(dir, '.i18n-admin-config.json');
        configManager.loadSettings = () => ({
          security: {
            adminPinEnabled: true,
            pinProtection: {
              enabled: true,
              protectedScripts: {}
            }
          }
        });

        assert.strictEqual(await auth.isAuthRequired(), true, 'Global PIN setting should require auth even if config is broken');
        assert.strictEqual(await auth.isAuthRequiredForScript('settingsMenu'), true, 'Protected script should require auth even if config is broken');
        assert.strictEqual(await auth.verifyPin('1234'), false, 'Broken config should still fail verification');
      } finally {
        configManager.loadSettings = originalLoadSettings;
        await auth.cleanup();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test('should clean up expired sessions using the stored expires field', async () => {
      const auth = new AdminAuth();
      try {
        auth.activeSessions.set('expired', {
          id: 'expired',
          created: new Date(Date.now() - 10000).toISOString(),
          lastActivity: new Date(Date.now() - 10000).toISOString(),
          expires: new Date(Date.now() - 1000).toISOString()
        });

        auth.cleanupExpiredSessions();
        assert.strictEqual(auth.activeSessions.has('expired'), false, 'Expired session should be removed');
      } finally {
        await auth.cleanup();
      }
    });

    test('should clean up expired sessions using the stored expiresAt field', async () => {
      const auth = new AdminAuth();
      try {
        auth.activeSessions.set('expired-at', {
          id: 'expired-at',
          created: new Date(Date.now() - 10000).toISOString(),
          lastActivity: new Date(Date.now() - 10000).toISOString(),
          expiresAt: Date.now() - 1000
        });

        auth.cleanupExpiredSessions();
        assert.strictEqual(auth.activeSessions.has('expired-at'), false, 'Expired expiresAt session should be removed');
      } finally {
        await auth.cleanup();
      }
    });

    test('created sessions should store expires and expiresAt consistently', async () => {
      const auth = new AdminAuth();
      try {
        const sessionId = await auth.createSession('session-with-expiry');
        const session = auth.activeSessions.get(sessionId);

        assert.strictEqual(typeof session.expires, 'string');
        assert.strictEqual(typeof session.expiresAt, 'number');
        assert.ok(Number.isFinite(Date.parse(session.expires)));
        assert.ok(session.expiresAt > Date.now());
      } finally {
        await auth.cleanup();
      }
    });
  });

  describe('Fixer Command', () => {
    test('should write applied fixes to the target translation file', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-fixer-'));
      fs.mkdirSync(path.join(dir, 'en'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'de'), { recursive: true });

      const targetFile = path.join(dir, 'de', 'common.json');
      fs.writeFileSync(path.join(dir, 'en', 'common.json'), JSON.stringify({
        hello: 'Hello',
        nested: { value: 'Value' }
      }, null, 2));
      fs.writeFileSync(targetFile, JSON.stringify({
        hello: '',
        nested: {}
      }, null, 2));

      try {
        const command = new FixerCommand({
          sourceDir: dir,
          sourceLanguage: 'en',
          backup: { enabled: false },
          notTranslatedMarker: 'NOT_TRANSLATED'
        });
        command.sourceDir = dir;
        command.dryRun = false;

        const result = await command.fixLanguage('de');
        const updated = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

        assert.strictEqual(result.fixedIssues, 2);
        assert.strictEqual(updated.hello, 'Hello');
        assert.strictEqual(updated.nested.value, 'Value');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('Validation Risk Detection', () => {
    test('should use configured allowed terms for project-specific copy', () => {
      const value = 'ExampleTerm is intentionally left in translated copy.';
      const issues = detectTranslationContentRisks(value, {
        allowedEnglishTerms: ['ExampleTerm'],
        keyPath: 'about.overview.body',
        sourceLanguage: 'en',
        targetLanguage: 'de'
      });

      assert.strictEqual(issues.length, 0);
    });

    test('should allow short acronym and configured term titles', () => {
      const issues = detectTranslationContentRisks('ABC CustomTerm API', {
        allowedEnglishTerms: ['CustomTerm'],
        keyPath: 'product.hero.title',
        sourceLanguage: 'en',
        targetLanguage: 'tr'
      });

      assert.deepStrictEqual(issues, []);
    });

    test('should flag likely untranslated English content with percentage details', () => {
      const issues = detectTranslationContentRisks('Predict outcomes, challenge other players, and build public history.', {
        keyPath: 'about.hero.subtitle',
        sourceLanguage: 'en',
        targetLanguage: 'de'
      });

      assert.strictEqual(issues.length, 1);
      assert.strictEqual(issues[0].type, 'english_content');
      assert.strictEqual(issues[0].englishThresholdPercent, 10);
      assert.ok(issues[0].englishPercentage > 10);
      assert.ok(issues[0].englishWordCount >= 3);
    });

    test('should detect secret-like content without warning on explanatory secret words', () => {
      assert.strictEqual(hasSecretLikeValue('Never share your secret recovery phrase.', 'settings.secretHelp'), false);
    });

    test('should report URLs and email addresses with specific issue types', () => {
      const issues = detectTranslationContentRisks('Contact support@example.com or visit https://example.com/help', {
        keyPath: 'support.contact',
        sourceLanguage: 'en',
        targetLanguage: 'fr'
      });

      assert.deepStrictEqual(issues.map(issue => issue.type), ['url', 'email']);
    });

    test('should ignore acronyms and configured allowed English terms', () => {
      const analysis = analyzeEnglishContent('ABC API CustomTerm', {
        allowedEnglishTerms: ['CustomTerm']
      });

      assert.strictEqual(analysis.englishPercentage, 0);
      assert.strictEqual(analysis.totalWordCount, 0);
    });
  });

  describe('Auto Translate Protection', () => {
    test('should mask and restore configured protected terms', () => {
      const protection = {
        enabled: true,
        terms: ['BrandName'],
        keys: [],
        values: [],
        patterns: [],
        compiledPatterns: []
      };

      const protectedText = protectText('Welcome to BrandName today', protection);
      assert.notStrictEqual(protectedText.value, 'Welcome to BrandName today');
      assert.ok(protectedText.value.includes('__I18NTK_KEEP_0__'));
      const translatedAroundToken = protectedText.value
        .replace('Welcome to ', 'Bienvenue a ')
        .replace(' today', '');
      assert.strictEqual(restoreText(translatedAroundToken, protectedText.map), 'Bienvenue a BrandName');
    });

    test('should preserve configured key and exact value rules', () => {
      const protection = {
        enabled: true,
        terms: [],
        keys: ['app.brand', 'legal.*'],
        values: ['BrandName Ltd'],
        patterns: [],
        compiledPatterns: []
      };

      assert.strictEqual(shouldPreserveWholeValue('app.brand', 'Any value', protection), true);
      assert.strictEqual(shouldPreserveWholeValue('legal.company', 'Any value', protection), true);
      assert.strictEqual(shouldPreserveWholeValue('footer.company', 'BrandName Ltd', protection), true);
      assert.strictEqual(shouldPreserveWholeValue('footer.copy', 'Translate this', protection), false);
    });
  });
});
