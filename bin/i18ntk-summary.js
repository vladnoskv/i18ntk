#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');
const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'main', 'i18ntk-summary.js'), ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
