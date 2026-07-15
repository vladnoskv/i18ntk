#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');
const { createLicenseMarker, validateLicenseMarker, createMetaTag, getDiscoveryQueries } = require('../utils/license-marker');

function valueAfter(args, flag) { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; }
function help() {
  console.log(`Usage:
  i18ntk-license generate --license-id <id> --domains <domains> [--output <file>] [--noncommercial]
  i18ntk-license verify --file <i18ntk-license.json> [--domain <domain>]
  i18ntk-license queries --license-id <id>

Generates and validates transparent public-deployment markers. No data is transmitted.`);
}

function run(argv = process.argv.slice(2)) {
  const [command] = argv;
  if (!command || argv.includes('--help') || argv.includes('-h')) { help(); return 0; }
  if (command === 'generate') {
    const marker = createLicenseMarker({
      licenseId: valueAfter(argv, '--license-id'), domains: valueAfter(argv, '--domains'),
      licenseType: argv.includes('--noncommercial') ? 'noncommercial' : 'commercial', productVersion: require('../package.json').version
    });
    const output = path.resolve(valueAfter(argv, '--output') || 'i18ntk-license.json');
    if (!SecurityUtils.safeWriteFileSync(output, JSON.stringify(marker, null, 2) + '\n', process.cwd(), 'utf8')) throw new Error(`Unable to write ${output}`);
    console.log(`Created ${output}`);
    console.log(createMetaTag(marker));
    return 0;
  }
  if (command === 'verify') {
    const file = path.resolve(valueAfter(argv, '--file') || 'i18ntk-license.json');
    const content = SecurityUtils.safeReadFileSync(file, process.cwd(), 'utf8');
    if (!content) throw new Error(`Unable to read ${file}`);
    const result = validateLicenseMarker(SecurityUtils.safeParseJSON(content), { domain: valueAfter(argv, '--domain') });
    console.log(JSON.stringify(result, null, 2));
    return result.valid ? 0 : 1;
  }
  if (command === 'queries') {
    console.log(getDiscoveryQueries(valueAfter(argv, '--license-id')).join('\n'));
    return 0;
  }
  help(); return 2;
}

if (require.main === module) {
  try { process.exitCode = run(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { run };
