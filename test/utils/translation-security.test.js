const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../../utils/security');
const { SecurityError } = require('../../utils/security');

describe('Translation Security Functions', () => {
  const testDir = path.join(__dirname, '..', 'temp-test-files');
  const basePath = path.dirname(testDir);

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('addMissingKeysToLanguage', () => {
    it('should securely add missing keys to language files', () => {
      const langDir = path.join(testDir, 'languages');
      fs.mkdirSync(path.join(langDir, 'en'), { recursive: true });
      
      const missingKeys = ['common.welcome', 'common.logout', 'errors.invalid'];
      const result = SecurityUtils.addMissingKeysToLanguage(langDir, 'en', missingKeys, { basePath });

      expect(result.securityValidated).toBe(true);
      expect(result.language).toBe('en');
      expect(result.errors).toHaveLength(0);
      expect(result.changes).toHaveLength(3);
    });

    it('should prevent path traversal attacks', () => {
      const maliciousDir = path.join(testDir, 'languages');
      const maliciousKeys = ['../../../etc/passwd', '..\\..\\config.json'];
      
      expect(() => {
        SecurityUtils.addMissingKeysToLanguage(maliciousDir, 'en', maliciousKeys, { basePath });
      }).toThrow(SecurityError);
    });

    it('should validate file extensions', () => {
      const langDir = path.join(testDir, 'languages');
      const maliciousKeys = ['config.js', 'index.html'];
      
      const result = SecurityUtils.addMissingKeysToLanguage(langDir, 'en', maliciousKeys, { basePath });
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid file path');
    });

    it('should handle dry run mode', () => {
      const langDir = path.join(testDir, 'languages');
      const missingKeys = ['common.test'];
      
      const result = SecurityUtils.addMissingKeysToLanguage(langDir, 'en', missingKeys, { 
        basePath, 
        dryRun: true 
      });

      expect(result.changes[0].preview).toBe(true);
      expect(fs.existsSync(path.join(langDir, 'en', 'common.json'))).toBe(false);
    });
  });

  describe('markWithCountryCode', () => {
    it('should mark string values with country code', () => {
      const marked = SecurityUtils.markWithCountryCode('Hello World', 'en');
      expect(marked).toBe('[EN] Hello World');
    });

    it('should mark nested object values', () => {
      const input = {
        greeting: 'Hello',
        farewell: 'Goodbye',
        nested: {
          message: 'Welcome'
        }
      };
      
      const marked = SecurityUtils.markWithCountryCode(input, 'fr');
      
      expect(marked.greeting).toBe('[FR] Hello');
      expect(marked.farewell).toBe('[FR] Goodbye');
      expect(marked.nested.message).toBe('[FR] Welcome');
    });

    it('should handle arrays', () => {
      const input = ['Hello', 'World'];
      const marked = SecurityUtils.markWithCountryCode(input, 'es');
      
      expect(marked[0]).toBe('[ES] Hello');
      expect(marked[1]).toBe('[ES] World');
    });

    it('should handle non-string values', () => {
      expect(SecurityUtils.markWithCountryCode(123, 'de')).toBe(123);
      expect(SecurityUtils.markWithCountryCode(null, 'it')).toBe(null);
      expect(SecurityUtils.markWithCountryCode(undefined, 'pt')).toBe(undefined);
    });
  });

  describe('mergeTranslations', () => {
    it('should securely merge translation objects', () => {
      const source = {
        common: { welcome: 'Hello', logout: 'Exit' },
        errors: { invalid: 'Invalid input' }
      };
      
      const existing = {
        common: { welcome: 'Hi' },
        profile: { name: 'Name' }
      };

      const result = SecurityUtils.mergeTranslations(source, existing, { 
        basePath,
        countryCode: 'en' 
      });

      expect(result.securityValidated).toBe(true);
      expect(result.merged.common.welcome).toBe('Hi'); // Existing value preserved
      expect(result.merged.common.logout).toBe('[EN] Exit'); // New value marked
      expect(result.merged.profile.name).toBe('Name'); // Existing preserved
      expect(result.addedKeys).toContain('common.logout');
      expect(result.addedKeys).toContain('errors.invalid');
    });

    it('should prevent path traversal in file paths', () => {
      const source = { test: 'value' };
      const existing = { test: 'existing' };
      
      const result = SecurityUtils.mergeTranslations(source, existing, {
        basePath,
        validatePaths: true,
        sourceTranslations: { filePath: '../../../etc/passwd' }
      });

      expect(result.securityValidated).toBe(false);
      expect(result.conflicts).toContain('Invalid file path: ../../../etc/passwd');
    });

    it('should handle empty objects', () => {
      const source = {};
      const existing = {};
      
      const result = SecurityUtils.mergeTranslations(source, existing, { basePath });
      
      expect(result.merged).toEqual({});
      expect(result.addedKeys).toHaveLength(0);
      expect(result.updatedKeys).toHaveLength(0);
    });

    it('should handle deep nested structures', () => {
      const source = {
        ui: {
          buttons: {
            save: 'Save',
            cancel: 'Cancel'
          }
        }
      };
      
      const existing = {
        ui: {
          buttons: {
            save: 'Speichern'
          }
        }
      };

      const result = SecurityUtils.mergeTranslations(source, existing, { 
        basePath,
        countryCode: 'de' 
      });

      expect(result.merged.ui.buttons.save).toBe('Speichern');
      expect(result.merged.ui.buttons.cancel).toBe('[DE] Cancel');
      expect(result.addedKeys).toContain('ui.buttons.cancel');
    });
  });

  describe('Integration Tests', () => {
    it('should work together in a secure workflow', () => {
      const langDir = path.join(testDir, 'secure-languages');
      
      // Create initial structure
      fs.mkdirSync(path.join(langDir, 'en'), { recursive: true });
      fs.mkdirSync(path.join(langDir, 'es'), { recursive: true });
      
      // Create initial English file
      const enContent = { common: { welcome: 'Welcome' } };
      fs.writeFileSync(
        path.join(langDir, 'en', 'common.json'),
        JSON.stringify(enContent, null, 2)
      );
      
      // Create initial Spanish file
      const esContent = { common: { welcome: 'Bienvenido' } };
      fs.writeFileSync(
        path.join(langDir, 'es', 'common.json'),
        JSON.stringify(esContent, null, 2)
      );
      
      // Add missing keys to Spanish
      const missingKeys = ['common.logout', 'errors.invalid'];
      const result = SecurityUtils.addMissingKeysToLanguage(langDir, 'es', missingKeys, { basePath });
      
      expect(result.securityValidated).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      // Verify file content
      const updatedContent = JSON.parse(
        fs.readFileSync(path.join(langDir, 'es', 'common.json'), 'utf8')
      );
      
      expect(updatedContent.common.logout).toBe('[ES] common.logout');
      expect(updatedContent.common.welcome).toBe('Bienvenido'); // Original preserved
    });

    it('should handle concurrent operations safely', () => {
      const langDir = path.join(testDir, 'concurrent-test');
      fs.mkdirSync(path.join(langDir, 'en'), { recursive: true });
      
      const operations = [
        () => SecurityUtils.addMissingKeysToLanguage(langDir, 'en', ['common.key1'], { basePath }),
        () => SecurityUtils.addMissingKeysToLanguage(langDir, 'en', ['common.key2'], { basePath }),
        () => SecurityUtils.addMissingKeysToLanguage(langDir, 'en', ['common.key3'], { basePath })
      ];
      
      const results = operations.map(op => op());
      
      results.forEach(result => {
        expect(result.securityValidated).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      // Verify all keys were added
      const content = JSON.parse(
        fs.readFileSync(path.join(langDir, 'en', 'common.json'), 'utf8')
      );
      
      expect(content.common.key1).toBe('[EN] common.key1');
      expect(content.common.key2).toBe('[EN] common.key2');
      expect(content.common.key3).toBe('[EN] common.key3');
    });
  });
});