#!/usr/bin/env node
const SetupEnforcer = require('../utils/setup-enforcer');
const SettingsCLI = require('../settings/settings-cli');

SetupEnforcer.checkSetupComplete();

async function run() {
  const cli = new SettingsCLI();
  await cli.run();
}

if (require.main === module) {
  run();
}

module.exports = { run };