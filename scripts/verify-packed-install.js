'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;
const npm = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const random = crypto.randomBytes(8).toString('hex');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), `i18ntk-fresh-${random}-`));
const packDir = path.join(sandbox, 'pack');
const installDir = path.join(sandbox, 'consumer');
fs.mkdirSync(packDir); fs.mkdirSync(installDir);

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 120000 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.error?.stack || ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function runNpm(args, cwd, env) { return run(npm, npmCli ? [npmCli, ...args] : args, cwd, env); }

try {
  const npmEnv = { npm_config_cache: path.join(sandbox, '.npm-cache') };
  const output = runNpm(['pack', '--ignore-scripts', '--json', '--pack-destination', packDir], root, npmEnv);
  const metadataStart = output.match(/\[\s*\{\s*"id"\s*:/);
  const jsonStart = metadataStart ? metadataStart.index : -1;
  if (jsonStart < 0) throw new Error(`npm pack did not return JSON metadata:\n${output}`);
  const metadata = JSON.parse(output.slice(jsonStart));
  const tarball = path.join(packDir, metadata[0].filename);
  const manifest = fs.openSync(path.join(installDir, 'package.json'), 'w', 0o600);
  try { fs.writeSync(manifest, JSON.stringify({ name: `i18ntk-sandbox-${random}`, private: true })); }
  finally { fs.closeSync(manifest); }
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], installDir, npmEnv);
  const installed = path.join(installDir, 'node_modules', 'i18ntk');
  const pkg = require(path.join(installed, 'package.json'));
  require(installed);
  for (const target of Object.values(pkg.bin || {})) {
    const absolute = path.join(installed, target);
    try { fs.accessSync(absolute, fs.constants.R_OK); }
    catch { throw new Error(`Missing packed bin target: ${target}`); }
  }
  for (const required of ['LICENSE', 'COMMERCIAL-LICENSE.md']) {
    try { fs.accessSync(path.join(installed, required), fs.constants.R_OK); }
    catch { throw new Error(`Missing packed licensing document: ${required}`); }
  }
  if (pkg.license !== 'SEE LICENSE IN LICENSE') throw new Error(`Unexpected packed license metadata: ${pkg.license}`);
  for (const target of ['runtime/index.js', 'runtime/enhanced.js', 'utils/report-model.js']) require(path.join(installed, target));
  const markerApi = require(path.join(installed, 'utils/license-marker.js'));
  const marker = markerApi.createLicenseMarker({ licenseId: 'LIC-PACK-VERIFY', domains: ['example.com'] });
  if (!markerApi.validateLicenseMarker(marker, { domain: 'example.com' }).valid) throw new Error('Packed license marker API failed');
  process.stdout.write(`Verified ${pkg.name}@${pkg.version} from ${path.basename(tarball)} in randomized sandbox ${random}\n`);
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
