const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

function runNode(args, cwd = repoRoot) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
  });
}

test('setup --help prints help without running setup side effects', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-setup-help-'));
  const result = runNode([path.join(repoRoot, 'main', 'i18ntk-setup.js'), '--help'], cwd);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /i18ntk-setup/);
  assert.doesNotMatch(result.stdout, /Detecting environment/);
  assert.equal(fs.existsSync(path.join(cwd, 'i18ntk-setup-report.json')), false);
});

test('settings --list-languages is non-interactive', () => {
  const result = runNode([path.join(repoRoot, 'settings', 'settings-cli.js'), '--list-languages']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Available languages:/);
  assert.match(result.stdout, /\ben\b.*English/);
  assert.doesNotMatch(result.stdout, /Select an option:/);
});

test('settings --language-status is non-interactive', () => {
  const result = runNode([path.join(repoRoot, 'settings', 'settings-cli.js'), '--language-status']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Language status:/);
  assert.match(result.stdout, /UI language:/);
  assert.match(result.stdout, /Source language:/);
  assert.doesNotMatch(result.stdout, /Select an option:/);
});
