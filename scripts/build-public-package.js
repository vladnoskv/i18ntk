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
  const executable = command === 'npm' && process.env.npm_execpath ? process.execPath : command;
  const commandArgs = command === 'npm' && process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd,
    stdio: 'inherit'
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
  const stats = fs.statSync(source);
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  if (stats.isDirectory()) {
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
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function prepareStage() {
  const manifest = readJson(publicManifestPath);

  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });

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
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(path.relative(stageDir, fullPath).replace(/\\/g, '/'));
    }
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
    /^node_modules\//,
    /^package\.dev\.json$/,
    /^package\.public\.json$/,
    /^\.npmignore$/,
    /^\.gitignore$/,
    /^\.i18ntk-config/,
    /^i18ntk-\d+\.\d+\.\d+\.tgz$/,
    /(^|\/)admin-pin\.json$/,
    /(^|\/)\.i18n-admin-config\.json$/,
    /^settings\/i18ntk-config\.json$/,
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
