#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const SecurityUtils = require('../utils/security');

const root = path.resolve(__dirname, '..');
const rootManifestPath = path.join(root, 'package.json');
const publicManifestPath = path.join(root, 'package.public.json');
const stageDir = path.join(root, '.release', 'i18ntk-public');

function readJson(filePath) {
  const raw = SecurityUtils.safeReadFileSync(filePath, root, 'utf8');
  if (!raw) {
    throw new Error(`Unable to read JSON file: ${path.relative(root, filePath)}`);
  }
  return JSON.parse(raw);
}

function stableJson(value) {
  return JSON.stringify(value);
}

function assertManifestSync(rootManifest, publicManifest) {
  const syncedFields = [
    'name',
    'version',
    'description',
    'keywords',
    'homepage',
    'bugs',
    'repository',
    'funding',
    'license',
    'author',
    'type',
    'main',
    'types',
    'exports',
    'bin',
    'files',
    'sideEffects',
    'engines',
    'publishConfig',
    'preferGlobal',
    'versionInfo'
  ];

  for (const field of syncedFields) {
    if (stableJson(rootManifest[field]) !== stableJson(publicManifest[field])) {
      throw new Error(`package.public.json is out of sync with package.json for field "${field}"`);
    }
  }

  if (rootManifest.scripts?.prepublishOnly !== 'node scripts/prevent-root-publish.js') {
    throw new Error('Root package.json must keep prepublishOnly wired to scripts/prevent-root-publish.js');
  }
  if (rootManifest.scripts?.prepack !== 'node scripts/prevent-root-publish.js') {
    throw new Error('Root package.json must keep prepack wired to scripts/prevent-root-publish.js');
  }
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
  const rootManifest = readJson(rootManifestPath);
  const manifest = readJson(publicManifestPath);
  assertManifestSync(rootManifest, manifest);

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
  const readmePath = path.join(stageDir, 'README.md');
  const readme = SecurityUtils.safeReadFileSync(readmePath, stageDir, 'utf8');
  if (!readme || readme.trim().length < 100) {
    throw new Error('Public package staging is missing a non-empty README.md');
  }

  const stagedManifest = {
    ...manifest,
    readme,
    readmeFilename: 'README.md'
  };
  const wroteManifest = SecurityUtils.safeWriteFileSync(
    path.join(stageDir, 'package.json'),
    `${JSON.stringify(stagedManifest, null, 2)}\n`,
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

  if (!Array.isArray(manifest.files) || !manifest.files.includes('README.md')) {
    throw new Error('Public manifest must include README.md so npm can render the package readme');
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
  const readmePath = path.join(stageDir, 'README.md');
  const readme = SecurityUtils.safeReadFileSync(readmePath, stageDir, 'utf8');
  if (!readme || readme.trim().length < 100) {
    throw new Error('Public package staging is missing a non-empty README.md');
  }

  const manifestPath = path.join(stageDir, 'package.json');
  const manifest = readJson(manifestPath);
  if (manifest.readmeFilename !== 'README.md') {
    throw new Error('Public package staging package.json must set readmeFilename to README.md');
  }
  if (typeof manifest.readme !== 'string' || manifest.readme.trim().length < 100) {
    throw new Error('Public package staging package.json must include README content for npm metadata');
  }

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
  const wantsPublish = process.argv.includes('--publish');
  const wantsPack = process.argv.includes('--pack');
  const wantsDryRun = process.argv.includes('--dry-run') || process.env.npm_config_dry_run === 'true';
  const mode = wantsPublish ? 'publish' : wantsPack ? 'pack' : 'dry-run';
  const manifest = prepareStage();
  assertPublicManifest(manifest);
  assertStageContents();

  if (mode === 'publish') {
    if (wantsDryRun) {
      run('npm', ['publish', '--access', 'public', '--dry-run'], stageDir);
      return;
    }

    run('npm', ['whoami']);
    run('npm', ['publish', '--access', 'public'], stageDir);
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
