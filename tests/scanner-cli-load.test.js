'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

test('scanner CLI loads and filters non-user-facing module specifiers', () => {
  const Scanner = require('../main/i18ntk-scanner');
  const scanner = new Scanner();

  assert.equal(scanner.isNonUserFacingLiteral('/api/health'), true);
  assert.equal(scanner.isNonUserFacingLiteral('@scope/package'), true);
  assert.equal(scanner.isNonUserFacingLiteral('Welcome back'), false);
});
