#!/usr/bin/env node
const SetupEnforcer = require('../utils/setup-enforcer');
const SettingsCLI = require('../settings/settings-cli');

(async () => {
  try {
    await SetupEnforcer.checkSetupCompleteAsync();
  } catch (error) {
    console.error('Setup check failed:', error.message);
    process.exit(1);
  }
})();

async function run() {
  const cli = new SettingsCLI();
  await cli.run();
}

if (require.main === module) {
  run();
}

module.exports = { run };