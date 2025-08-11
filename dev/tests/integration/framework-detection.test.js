#!/usr/bin/env node

/**
 * Integration tests for framework detection
 * Tests framework fingerprinting for:
 * - i18next detection
 * - Lingui detection  
 * - FormatJS detection
 * - Tailored glob patterns
 * - Key syntax recognition
 * - Ignore rules application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

class FrameworkDetectionTests {
  constructor() {
    this.testDir = path.join(__dirname, '..', 'temp', 'framework-detection');
    this.usagePath = path.join(__dirname, '..', '..', '..', 'main', 'i18ntk-usage.js');
    this.initPath = path.join(__dirname, '..', '..', '..', 'main', 'i18ntk-init.js');
  }

  setup() {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.testDir, { recursive: true });
  }

  teardown() {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  runCommand(cmd, cwd = this.testDir) {
    try {
      const output = execSync(cmd, { 
        cwd, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return { success: true, output, exitCode: 0 };
    } catch (error) {
      return { 
        success: false, 
        output: error.stdout || error.stderr, 
        exitCode: error.status || 1 
      };
    }
  }

  async testI18nextDetection() {
    console.log('🔍 Testing i18next framework detection...');
    
    // Create i18next project structure
    const srcDir = path.join(this.testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    // Create React component with i18next
    const componentContent = `
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';

function WelcomeMessage({ user }) {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('welcome.title', { name: user.name })}</h1>
      <p>{t('welcome.message')}</p>
      <Trans i18nKey="welcome.description">
        Welcome to our <strong>amazing</strong> platform!
      </Trans>
    </div>
  );
}

export default WelcomeMessage;
`;

    fs.writeFileSync(path.join(srcDir, 'WelcomeMessage.jsx'), componentContent);
    
    // Create package.json with i18next dependencies
    const packageJson = {
      name: 'test-i18next-app',
      dependencies: {
        'react-i18next': '^11.16.9',
        'i18next': '^21.8.13'
      }
    };
    
    fs.writeFileSync(path.join(this.testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create locales
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    
    ['en', 'es', 'fr'].forEach(lang => {
      const langDir = path.join(localesDir, lang);
      fs.mkdirSync(langDir, { recursive: true });
      
      const translations = {
        welcome: {
          title: lang === 'en' ? 'Welcome {{name}}!' : 
                 lang === 'es' ? '¡Bienvenido {{name}}!' : 
                 'Bienvenue {{name}}!',
          message: lang === 'en' ? 'We are glad to have you here.' :
                   lang === 'es' ? 'Nos alegra tenerte aquí.' :
                   'Nous sommes heureux de vous avoir ici.',
          description: lang === 'en' ? 'Welcome to our <1>amazing</1> platform!' :
                         lang === 'es' ? '¡Bienvenido a nuestra <1>increíble</1> plataforma!' :
                         'Bienvenue sur notre <1>incroyable</1> plateforme!'
        }
      };
      
      fs.writeFileSync(path.join(langDir, 'common.json'), JSON.stringify(translations, null, 2));
    });
    
    const result = this.runCommand(`node "${this.usagePath}" --source-dir="${srcDir}" --i18n-dir="${localesDir}" --json`);
    
    assert.strictEqual(result.exitCode, 0, 'Should detect i18next successfully');
    
    const output = JSON.parse(result.output);
    assert.strictEqual(output.framework, 'i18next', 'Should identify i18next framework');
    assert.strictEqual(Array.isArray(output.usedKeys), true, 'Should extract keys');
    assert.strictEqual(output.usedKeys.includes('welcome.title'), true, 'Should find nested keys');
    assert.strictEqual(output.usedKeys.includes('welcome.message'), true, 'Should find nested keys');
    
    console.log('✅ i18next detection test passed');
  }

  async testLinguiDetection() {
    console.log('🔍 Testing Lingui framework detection...');
    
    const srcDir = path.join(this.testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    // Create React component with Lingui
    const componentContent = `
import React from 'react';
import { Trans, t } from '@lingui/macro';
import { useLingui } from '@lingui/react';

function UserProfile({ user }) {
  const { i18n } = useLingui();
  
  return (
    <div>
      <h1><Trans>user.profile.title</Trans></h1>
      <p>
        <Trans>
          Hello {user.name}, you have {user.messages} new messages
        </Trans>
      </p>
      <button>{t('user.profile.edit')}</button>
    </div>
  );
}

export default UserProfile;
`;

    fs.writeFileSync(path.join(srcDir, 'UserProfile.jsx'), componentContent);
    
    // Create package.json with Lingui dependencies
    const packageJson = {
      name: 'test-lingui-app',
      dependencies: {
        '@lingui/react': '^3.14.0',
        '@lingui/macro': '^3.14.0'
      }
    };
    
    fs.writeFileSync(path.join(this.testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create locales with Lingui format
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    
    ['en', 'es'].forEach(lang => {
      const langDir = path.join(localesDir, lang);
      fs.mkdirSync(langDir, { recursive: true });
      
      const translations = {
        'user.profile.title': lang === 'en' ? 'User Profile' : 'Perfil de Usuario',
        'Hello {userName}, you have {messageCount} new messages': 
          lang === 'en' ? 'Hello {userName}, you have {messageCount} new messages' :
          'Hola {userName}, tienes {messageCount} mensajes nuevos',
        'user.profile.edit': lang === 'en' ? 'Edit Profile' : 'Editar Perfil'
      };
      
      fs.writeFileSync(path.join(langDir, 'messages.po'), this.createPoFile(translations, lang));
    });
    
    const result = this.runCommand(`node "${this.usagePath}" --source-dir="${srcDir}" --i18n-dir="${localesDir}" --json`);
    
    assert.strictEqual(result.exitCode, 0, 'Should detect Lingui successfully');
    
    const output = JSON.parse(result.output);
    assert.strictEqual(output.framework, 'lingui', 'Should identify Lingui framework');
    assert.strictEqual(Array.isArray(output.usedKeys), true, 'Should extract keys');
    
    console.log('✅ Lingui detection test passed');
  }

  createPoFile(translations, lang) {
    let content = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: ${lang}\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

`;
    
    Object.entries(translations).forEach(([key, value]) => {
      content += `msgid "${key}"
msgstr "${value}"

`;
    });
    
    return content;
  }

  async testFormatJSDetection() {
    console.log('🔍 Testing FormatJS detection...');
    
    const srcDir = path.join(this.testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    // Create React component with FormatJS
    const componentContent = `
import React from 'react';
import { FormattedMessage, useIntl, defineMessages } from 'react-intl';

const messages = defineMessages({
  welcome: {
    id: 'app.welcome',
    defaultMessage: 'Welcome {name}!'
  },
  description: {
    id: 'app.description',
    defaultMessage: 'You have {count, plural, =0 {no messages} one {1 message} other {{count} messages}}'
  }
});

function WelcomeComponent({ user }) {
  const intl = useIntl();
  
  return (
    <div>
      <h1>
        <FormattedMessage 
          id="app.welcome" 
          defaultMessage="Welcome {name}!"
          values={{ name: user.name }}
        />
      </h1>
      <p>
        <FormattedMessage 
          id="app.description" 
          defaultMessage="You have {count} messages"
          values={{ count: user.messages }}
        />
      </p>
    </div>
  );
}

export default WelcomeComponent;
`;

    fs.writeFileSync(path.join(srcDir, 'WelcomeComponent.jsx'), componentContent);
    
    // Create package.json with FormatJS dependencies
    const packageJson = {
      name: 'test-formatjs-app',
      dependencies: {
        'react-intl': '^6.0.0'
      }
    };
    
    fs.writeFileSync(path.join(this.testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create locales with FormatJS format
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    
    ['en', 'es', 'fr'].forEach(lang => {
      const langDir = path.join(localesDir, lang);
      fs.mkdirSync(langDir, { recursive: true });
      
      const translations = {
        'app.welcome': lang === 'en' ? 'Welcome {name}!' :
                       lang === 'es' ? '¡Bienvenido {name}!' :
                       'Bienvenue {name}!',
        'app.description': lang === 'en' ? 
          'You have {count, plural, =0 {no messages} one {1 message} other {{count} messages}}' :
          lang === 'es' ?
          'Tienes {count, plural, =0 {no mensajes} one {1 mensaje} other {{count} mensajes}}' :
          'Vous avez {count, plural, =0 {aucun message} one {1 message} other {{count} messages}}'
      };
      
      fs.writeFileSync(path.join(langDir, 'messages.json'), JSON.stringify(translations, null, 2));
    });
    
    const result = this.runCommand(`node "${this.usagePath}" --source-dir="${srcDir}" --i18n-dir="${localesDir}" --json`);
    
    assert.strictEqual(result.exitCode, 0, 'Should detect FormatJS successfully');
    
    const output = JSON.parse(result.output);
    assert.strictEqual(output.framework, 'formatjs', 'Should identify FormatJS framework');
    assert.strictEqual(Array.isArray(output.usedKeys), true, 'Should extract keys');
    assert.strictEqual(output.usedKeys.includes('app.welcome'), true, 'Should find keys');
    
    console.log('✅ FormatJS detection test passed');
  }

  async testTailoredGlobPatterns() {
    console.log('🔍 Testing tailored glob patterns...');
    
    const srcDir = path.join(this.testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    // Create various file types
    const files = [
      { path: 'components/Header.jsx', content: "import { useTranslation } from 'react-i18next'; const { t } = useTranslation();" },
      { path: 'utils/helpers.js', content: "const message = t('helpers.message');" },
      { path: 'styles/app.css', content: ".welcome { color: blue; }" },
      { path: 'README.md', content: "# My App\nThis app uses i18next for translations." }
    ];
    
    files.forEach(file => {
      const fullPath = path.join(srcDir, file.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content);
    });
    
    // Create package.json with i18next
    const packageJson = {
      name: 'test-glob-patterns',
      dependencies: {
        'react-i18next': '^11.0.0'
      }
    };
    
    fs.writeFileSync(path.join(this.testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    const result = this.runCommand(`node "${this.usagePath}" --source-dir="${srcDir}" --json`);
    
    assert.strictEqual(result.exitCode, 0, 'Should analyze with tailored patterns');
    
    const output = JSON.parse(result.output);
    assert.strictEqual(output.framework, 'i18next', 'Should detect i18next');
    assert.strictEqual(output.filesAnalyzed.length > 0, true, 'Should analyze relevant files');
    assert.strictEqual(output.filesAnalyzed.includes('components/Header.jsx'), true, 'Should include JSX files');
    assert.strictEqual(output.filesAnalyzed.includes('utils/helpers.js'), true, 'Should include JS files');
    assert.strictEqual(output.filesAnalyzed.includes('styles/app.css'), false, 'Should exclude CSS files');
    assert.strictEqual(output.filesAnalyzed.includes('README.md'), false, 'Should exclude markdown files');
    
    console.log('✅ Tailored glob patterns test passed');
  }

  async testKeySyntaxRecognition() {
    console.log('🔍 Testing key syntax recognition...');
    
    const srcDir = path.join(this.testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    // Create component with various i18next key syntaxes
    const componentContent = `
import React from 'react';
import { useTranslation } from 'react-i18next';

function ComplexComponent() {
  const { t } = useTranslation();
  
  // Different key syntaxes
  const simpleKey = t('simple.key');
  const nestedKey = t('nested.deep.key');
  const parameterizedKey = t('user.greeting', { name: 'John' });
  const pluralKey = t('message.count', { count: 5 });
  const contextKey = t('button.save', { context: 'form' });
  
  return (
    <div>
      <p>{simpleKey}</p>
      <p>{nestedKey}</p>
      <p>{parameterizedKey}</p>
      <p>{pluralKey}</p>
      <p>{contextKey}</p>
    </div>
  );
}

export default ComplexComponent;
`;

    fs.writeFileSync(path.join(srcDir, 'ComplexComponent.jsx'), componentContent);
    
    // Create package.json
    const packageJson = {
      name: 'test-key-syntax',
      dependencies: {
        'react-i18next': '^11.0.0'
      }
    };
    
    fs.writeFileSync(path.join(this.testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    const result = this.runCommand(`node "${this.usagePath}" --source-dir="${srcDir}" --json`);
    
    assert.strictEqual(result.exitCode, 0, 'Should parse key syntaxes successfully');
    
    const output = JSON.parse(result.output);
    assert.strictEqual(output.framework, 'i18next', 'Should detect i18next');
    
    const expectedKeys = [
      'simple.key',
      'nested.deep.key',
      'user.greeting',
      'message.count',
      'button.save'
    ];
    
    expectedKeys.forEach(key => {
      assert.strictEqual(output.usedKeys.includes(key), true, `Should find key: ${key}`);
    });
    
    console.log('✅ Key syntax recognition test passed');
  }

  async testIgnoreRules() {
    console.log('🔍 Testing ignore rules...');
    
    const srcDir = path.join(this.testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    // Create files that should be ignored
    const files = [
      { path: 'components/Header.jsx', content: "import { useTranslation } from 'react-i18next'; const { t } = useTranslation();" },
      { path: 'node_modules/some-package/index.js', content: "const message = t('should.be.ignored');" },
      { path: 'dist/bundle.js', content: "const ignored = t('dist.should.be.ignored');" },
      { path: 'build/static/js/app.js', content: "const buildIgnored = t('build.should.be.ignored');" }
    ];
    
    files.forEach(file => {
      const fullPath = path.join(this.testDir, file.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content);
    });
    
    // Create package.json
    const packageJson = {
      name: 'test-ignore-rules',
      dependencies: {
        'react-i18next': '^11.0.0'
      }
    };
    
    fs.writeFileSync(path.join(this.testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    const result = this.runCommand(`node "${this.usagePath}" --source-dir="${srcDir}" --json`);
    
    assert.strictEqual(result.exitCode, 0, 'Should apply ignore rules successfully');
    
    const output = JSON.parse(result.output);
    assert.strictEqual(output.framework, 'i18next', 'Should detect i18next');
    assert.strictEqual(output.filesAnalyzed.includes('components/Header.jsx'), true, 'Should include src files');
    assert.strictEqual(output.filesAnalyzed.some(f => f.includes('node_modules')), false, 'Should ignore node_modules');
    assert.strictEqual(output.filesAnalyzed.some(f => f.includes('dist/')), false, 'Should ignore dist');
    assert.strictEqual(output.filesAnalyzed.some(f => f.includes('build/')), false, 'Should ignore build');
    
    console.log('✅ Ignore rules test passed');
  }

  async runAll() {
    console.log('🔍 Framework Detection Tests\n');
    console.log('='.repeat(50));
    
    this.setup();
    
    try {
      await this.testI18nextDetection();
      await this.testLinguiDetection();
      await this.testFormatJSDetection();
      await this.testTailoredGlobPatterns();
      await this.testKeySyntaxRecognition();
      await this.testIgnoreRules();
      
      console.log('\n🎉 All Framework detection tests passed!');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      throw error;
    } finally {
      this.teardown();
    }
  }
}

// Run tests
if (require.main === module) {
  const tests = new FrameworkDetectionTests();
  tests.runAll().catch(console.error);
}

module.exports = FrameworkDetectionTests;