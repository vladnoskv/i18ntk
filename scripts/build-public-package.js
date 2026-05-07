#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const SecurityUtils = require('../utils/security');

const root = path.resolve(__dirname, '..');
const publicManifestPath = path.join(root, 'package.public.json');
const stageDir = path.join(root, '.release', 'i18ntk-public');

function readJson(filePath) {
  const raw = SecurityUtils.safeReadFileSync(filePath, root, 'utf8');
  if (!raw) {
    throw new Error(`Unable to read JSON file: ${path.relative(root, filePath)}`);
  }
  return JSON.parse(raw);
}

function run(command, args, cwd = root) {
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
    cwd,
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

function copyEntry(entry) {
  if (entry.startsWith('!')) {
    return;
  }

  const source = path.join(root, entry);
  if (!SecurityUtils.safeExistsSync(source, root)) {
    throw new Error(`Public package file is missing: ${entry}`);
  }

  const destination = path.join(stageDir, entry);
  const destDir = path.dirname(destination);
  SecurityUtils.safeMkdirSync(destDir, stageDir, { recursive: true });

  const stat = SecurityUtils.safeStatSync(source, root);
  if (!stat) {
    throw new Error(`Unable to stat: ${entry}`);
  }

  if (stat.isDirectory()) {
    fs.cpSync(source, destination, {
      recursive: true,
      filter: (src) => !src.includes(`${path.sep}node_modules${path.sep}`)
    });
  } else {
    fs.copyFileSync(source, destination);
  }
}

function removeIfExists(relativePath) {
  const target = path.join(stageDir, relativePath);
  if (SecurityUtils.safeExistsSync(target, stageDir)) {
    try {
      SecurityUtils.safeUnlinkSync(target, stageDir);
    } catch (_) {
      // If it's a directory, use recursive removal
      try {
        fs.rmSync(target, { recursive: true, force: true });
      } catch (_) {
        // Best-effort removal
      }
    }
  }
}

function prepareStage() {
  const manifest = readJson(publicManifestPath);

  try {
    if (SecurityUtils.safeExistsSync(stageDir, root)) {
      fs.rmSync(stageDir, { recursive: true, force: true });
    }
  } catch (_) {
    // Best-effort cleanup of staging directory
  }
  SecurityUtils.safeMkdirSync(stageDir, root, { recursive: true });

  for (const entry of manifest.files || []) {
    copyEntry(entry);
  }

  removeIfExists('main/manage/index-fixed.js');
  const wroteManifest = SecurityUtils.safeWriteFileSync(
    path.join(stageDir, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    stageDir,
    'utf8'
  );
  if (!wroteManifest) {
    throw new Error('Unable to write staged public package manifest');
  }

  return manifest;
}

function assertPublicManifest(manifest) {
  const forbiddenFields = [
    'scripts',
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
    'private',
    'manifestRole'
  ];
  for (const field of forbiddenFields) {
    if (Object.prototype.hasOwnProperty.call(manifest, field)) {
      throw new Error(`Public manifest must not contain ${field}`);
    }
  }
}

function walkFiles(dirPath) {
  const results = [];
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of items) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkFiles(fullPath));
      } else if (entry.isFile()) {
        results.push(path.relative(stageDir, fullPath).replace(/\\/g, '/'));
      }
    }
  } catch (_) {
    // Directory not accessible
  }

  return results;
}

function assertStageContents() {
  const forbiddenPatterns = [
    /^scripts\//,
    /^tests\//,
    /^benchmarks\//,
    /^docs\//,
    /^\.release\//,
    /^\.kilo\//,
    /^node_modules\//,
    /^package\.dev\.json$/,
    /^package\.public\.json$/,
    /^package-lock\.json$/,
    /^i18ntk-auto-translate\.json$/,
    /^AGENTS\.md$/,
    /^\.npmignore$/,
    /^\.gitignore$/,
    /^\.i18ntk-config/,
    /^\.i18ntk-settings$/,
    /^debug-security-utils\.js$/,
    /^i18ntk-\d+\.\d+\.\d+\.tgz$/,
    /(^|\/)admin-pin\.json$/,
    /(^|\/)\.i18n-admin-config\.json$/,
    /^settings\/i18ntk-config\.json$/,
    /^settings\/security-config\.json$/,
    /\.(key|pem|p12|pfx|private)$/
  ];

  const blocked = walkFiles(stageDir).filter(filePath =>
    forbiddenPatterns.some(pattern => pattern.test(filePath))
  );

  if (blocked.length > 0) {
    throw new Error(`Public package staging contains forbidden file(s): ${blocked.join(', ')}`);
  }
}

function main() {
  const mode = process.argv.includes('--publish') ? 'publish' : process.argv.includes('--pack') ? 'pack' : 'dry-run';
  const manifest = prepareStage();
  assertPublicManifest(manifest);
  assertStageContents();

  if (mode === 'publish') {
    run('npm', ['whoami']);
    run('npm', ['publish', stageDir, '--access', 'public']);
    return;
  }

  const args = ['pack', stageDir];
  if (mode === 'dry-run') {
    args.push('--dry-run');
  } else {
    args.push('--pack-destination', root);
  }
  run('npm', args);
}

main();
