const assert = require('assert');
const path = require('path');

// Preserve original env variable
const originalLogLevel = process.env.npm_config_loglevel;

const SecurityChecker = require('../../utils/security-check');

function testSilentMode() {
  process.env.npm_config_loglevel = 'silent';
  const checker = new SecurityChecker();
  assert.strictEqual(checker.isSilent, true, 'isSilent should be true when npm_config_loglevel is silent');

  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);
  checker.log('should not appear');
  console.log = originalLog;
  assert.strictEqual(logs.length, 0, 'log should not output in silent mode');
}

function testNormalMode() {
  delete process.env.npm_config_loglevel;
  const checker = new SecurityChecker();
  assert.strictEqual(checker.isSilent, false, 'isSilent should be false when npm_config_loglevel is not set to silent');

  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);
  checker.log('visible');
  console.log = originalLog;
  assert.deepStrictEqual(logs, ['visible'], 'log should output when not silent');
}

try {
  testSilentMode();
  testNormalMode();
  console.log('SecurityChecker silent mode tests passed.');
} catch (err) {
  console.error('SecurityChecker silent mode tests failed.');
  console.error(err);
  process.exit(1);
} finally {
  if (originalLogLevel !== undefined) {
    process.env.npm_config_loglevel = originalLogLevel;
  } else {
    delete process.env.npm_config_loglevel;
  }
}