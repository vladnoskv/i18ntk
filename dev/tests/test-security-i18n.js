#!/usr/bin/env node

const assert = require('assert');

function freshSecurity() {
  delete require.cache[require.resolve('../../utils/security')];
  return require('../../utils/security');
}

async function testSafeReadFileSync() {
  const SecurityUtils = freshSecurity();
  const result = SecurityUtils.safeReadFileSync('nonexistent.txt', __dirname);
  assert.strictEqual(result, null);
}

async function testValidateCommandArgs() {
  const SecurityUtils = freshSecurity();
  const result = await SecurityUtils.validateCommandArgs({ 'source-dir': 'src', foo: 'bar' });
  assert.deepStrictEqual(result, { 'source-dir': 'src' });
}

function testSanitizeInput() {
  const SecurityUtils = freshSecurity();
  const input = 'a'.repeat(1000) + '😊';
  const sanitized = SecurityUtils.sanitizeInput(input, { maxLength: 2000 });
  assert.strictEqual(typeof sanitized, 'string');
}

function testLogSecurityEvent() {
  const SecurityUtils = freshSecurity();
  const configManager = require('../../utils/config-manager');
  const originalGetConfig = configManager.getConfig;
  configManager.getConfig = () => { throw new Error('fail'); };
  SecurityUtils.logSecurityEvent('CRITICAL_TEST');
  configManager.getConfig = originalGetConfig;
}

(async () => {
  await testSafeReadFileSync();
  await testValidateCommandArgs();
  testSanitizeInput();
  testLogSecurityEvent();
  console.log('Security i18n tests passed');
})();
