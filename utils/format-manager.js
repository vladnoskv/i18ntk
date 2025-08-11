const { loadOptionalModule } = require('./plugin-loader');
const defaultFormat = require('./formats/json');

function getFormatAdapter(name) {
  if (name && name !== 'json') {
    const plugin = loadOptionalModule(name) || loadOptionalModule(`i18ntk-format-${name}`);
    if (plugin && typeof plugin.read === 'function' && typeof plugin.serialize === 'function') {
      return plugin;
    }
  }
  return defaultFormat;
}

module.exports = { getFormatAdapter };