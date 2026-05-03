#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const SecurityUtils = require('../utils/security');

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
  if (!SecurityUtils.safeExistsSync(absolute, root)) {
    return false;
  }
  try {
    SecurityUtils.safeUnlinkSync(absolute, root);
  } catch (_) {
    // Directory or inaccessible, use recursive removal
    try {
      fs.rmSync(absolute, { recursive: true, force: true });
    } catch (_) {
      return false;
    }
  }
  return true;
}

function run(command, args) {
  let executable;
  let commandArgs;
  
  if (command === 'npm') {
    const npmPath = process.env.npm_execpath || null;
    if (npmPath && SecurityUtils.safeExistsSync(npmPath, root)) {
      executable = process.execPath;
      commandArgs = [npmPath, ...args];
    } else {
      executable = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
      commandArgs = args;
    }
  } else {
    executable = command;
    commandArgs = args;
  }
  
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: typeof executable === 'string' && /\.cmd$/i.test(executable)
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

try {
  for (const entry of fs.readdirSync(root)) {
    if (removeGlobs.some((pattern) => pattern.test(entry))) {
      if (rm(entry)) removed.push(entry);
    }
  }
} catch (_) {
  // Root directory not accessible
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
