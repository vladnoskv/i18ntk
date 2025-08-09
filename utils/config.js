const configManager = require('./config-manager');

let config = {};
try {
  config = configManager.getConfig();
} catch (e) {
  config = {};
}

const session = {
  frameworkWarned: false,
};

module.exports = { config, session };