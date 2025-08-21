#!/usr/bin/env node

console.log('=== Module Loading Debug ===');

// Environment snapshot
console.log(`[Node ${process.version} | ${process.platform}-${process.arch}] cwd=${process.cwd()} | __dirname=${__dirname}`);

let failures = 0;

function test(label, id, namedExport) {
  console.log(`${label} Testing ${id}...`);
  try {
    const t0 = process.hrtime.bigint();
    const mod = require(id);
    if (namedExport && !(namedExport in mod)) {
      throw new Error(`Missing named export "${namedExport}" (exports: ${Object.keys(mod)})`);
    }
    let resolved = '<unresolved>';
    try { resolved = require.resolve(id); } catch {}
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`✓ ${id} loaded (${resolved}) in ${ms.toFixed(1)}ms`);
  } catch (e) {
    failures += 1;
    console.error(`✗ ${id} failed: ${e.message}`);
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error(e.stack);
    }
  }
}

function main() {
  test('1.', 'fs');
  test('2.', 'path');
  test('3.', 'os');
  test('4.', './utils/security');
  test('5.', './utils/config-manager');
  test('6.', './.i18ntk-settings/settings-manager', 'SettingsManager');
  console.log('=== Debug Complete ===');
  if (failures > 0) process.exitCode = 1;
}

if (require.main === module) {
  main();
}