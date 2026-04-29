#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

const removePaths = [
  '.i18ntk-config',
  '.i18ntk-config.lock',
  '.i18n-admin-config.json',
  '.i18ntk-settings',
  'i18ntk-setup-report.json',
  'settings/admin-pin.json',
  'settings/.i18n-admin-config.json',
  'settings/admin-config.json',
  'settings/security-config.json',
  'settings/backups',
  'backups',
  'i18ntk-backups',
  'i18ntk-reports',
  'reports'
];

const removeGlobs = [
  /^\.i18ntk-config\.temp-/,
  /^\.i18ntk-config\..*\.tmp$/,
  /^i18ntk-\d+\.\d+\.\d+\.tgz$/,
  /^i18ntk-.*\.tgz$/
];

function rm(target) {
  const absolute = path.join(root, target);
  try {
    fs.accessSync(absolute);
  } catch {
    return false;
  }
  fs.rmSync(absolute, { recursive: true, force: true });
  return true;
}

function run(command, args) {
  const executable = command === 'npm' && process.env.npm_execpath ? process.execPath : command;
  const commandArgs = command === 'npm' && process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    if (result.error) {
      throw result.error;
    }
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

const removed = [];
for (const target of removePaths) {
  if (rm(target)) removed.push(target);
}

for (const entry of fs.readdirSync(root)) {
  if (removeGlobs.some((pattern) => pattern.test(entry))) {
    if (rm(entry)) removed.push(entry);
  }
}

run('npm', ['run', 'test:all']);
run('npm', ['run', 'lint:locales']);
run('npm', ['audit', '--omit=dev']);
run('npm', ['run', 'package:public']);

console.log('');
console.log('Release state reset complete.');
console.log(`Removed ${removed.length} local runtime artifact(s).`);
if (removed.length) {
  for (const item of removed) {
    console.log(`- ${item}`);
  }
}
