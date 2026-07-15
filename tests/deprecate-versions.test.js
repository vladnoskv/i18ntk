const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function makeFakeNpm(binDir, logPath) {
  const fakeNpm = path.join(binDir, process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const script = process.platform === 'win32'
    ? `@echo off
echo %*>>"${logPath}"
if "%1"=="view" (
  if "%2"=="i18ntk" (
    echo ["4.3.0","4.3.1"]
    exit /b 0
  )
  echo {}
  exit /b 0
)
if "%1"=="deprecate" (
  exit /b 0
)
exit /b 1
`
    : `#!/bin/sh
echo "$*" >> "${logPath}"
if [ "$1" = "view" ]; then
  if [ "$2" = "i18ntk" ]; then
    printf '%s\\n' '["4.3.0","4.3.1"]'
    exit 0
  fi
  printf '%s\\n' '{}'
  exit 0
fi
if [ "$1" = "deprecate" ]; then
  exit 0
fi
exit 1
`;
  fs.writeFileSync(fakeNpm, script, 'utf8');
  if (process.platform !== 'win32') {
    fs.chmodSync(fakeNpm, 0o755);
  }
}

test('release metadata marks vulnerable releases as deprecated in favor of current', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.deepStrictEqual(manifest.versionInfo.deprecations, ['4.3.0', '4.3.1', '4.3.2', '4.3.3', '4.7.2']);
  assert.match(manifest.versionInfo.deprecationMessage, /4\.3\.x/);
  assert.match(manifest.versionInfo.deprecationMessage, /path traversal/i);
  assert.ok(manifest.versionInfo.deprecationMessage.includes(manifest.version));
});

test('deprecation script targets vulnerable releases with the current upgrade message', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-deprecate-'));
  const binDir = path.join(tmpDir, 'bin');
  const logPath = path.join(tmpDir, 'npm.log');
  fs.mkdirSync(binDir);
  makeFakeNpm(binDir, logPath);

  const env = {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`
  };
  const result = spawnSync(process.execPath, ['scripts/deprecate-versions.js', '--yes'], {
    cwd: root,
    env,
    encoding: 'utf8'
  });

  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const log = fs.readFileSync(logPath, 'utf8');
  assert.match(log, /security/i);
  assert.ok(log.includes(manifest.version));
  assert.match(log, /4\.3\.x/);
  assert.doesNotMatch(log, /1\.10\.0/);
});
