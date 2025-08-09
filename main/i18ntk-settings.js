#!/usr/bin/env node
const SettingsCLI = require('../settings/settings-cli');

async function run() {
  const cli = new SettingsCLI();
  await cli.run();
}

if (require.main === module) {
  run();
}

module.exports = { run };