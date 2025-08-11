const { loadOptionalModule } = require('./plugin-loader');
const defaultExtractor = require('./extractors/regex');

function getExtractor(name) {
  if (name) {
    const plugin = loadOptionalModule(name) || loadOptionalModule(`i18ntk-extractor-${name}`);
    if (plugin && typeof plugin.extract === 'function') {
      return plugin;
    }
  }
  return defaultExtractor;
}

module.exports = { getExtractor };