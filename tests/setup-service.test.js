'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const SetupService = require('../main/manage/services/SetupService');

test('setup uses the shared framework detector and reports only verified prerequisites', async () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-setup-service-'));
  const originalCwd = process.cwd();
  try {
    fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({
      name: 'next-fixture', dependencies: { next: '15.0.0', react: '19.0.0' }
    }), 'utf8');
    process.chdir(project);
    const service = new SetupService();
    await service.detectEnvironment();
    await service.validatePrerequisites();

    assert.equal(service.config.detectedFramework, 'next');
    assert.equal(service.config.detectedLanguage, 'javascript');
    assert.equal(service.config.prerequisites.hasPackageJson, true);
    assert.equal('hasGit' in service.config.prerequisites, false);
    assert.equal('hasNpm' in service.config.prerequisites, false);
    assert.equal('hasPython' in service.config.prerequisites, false);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(project, { recursive: true, force: true });
  }
});
