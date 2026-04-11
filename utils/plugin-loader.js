function loadOptionalModule(name) {
  // Security hardening: allow only known built-in optional plugins.
  // This avoids dynamic runtime require of arbitrary package names.
  const builtinPlugins = {
    regex: () => require('./extractors/regex'),
    'i18ntk-extractor-regex': () => require('./extractors/regex')
  };

  const direct = builtinPlugins[name];
  if (direct) {
    try {
      return direct();
    } catch {
      return null;
    }
  }

  // Sanitize the module name to prevent path traversal
  const sanitizedName = name.replace(/[^a-zA-Z0-9@/_-]/g, '');
  if (sanitizedName !== name) {
    // If the name was changed, it was invalid
    return null;
  }

  // Unknown optional modules are disabled by default.
  // Register plugins programmatically through PluginLoader.registerPlugin instead.
  return null;
}
class PluginLoader {
  constructor() {
    this.plugins = {};
  }

  registerPlugin(plugin) {
    if (!plugin || !plugin.type) return;
    const type = plugin.type;
    if (!this.plugins[type]) {
      this.plugins[type] = [];
    }
    this.plugins[type].push(plugin);
  }

  getPlugins(type) {
    return this.plugins[type] || [];
  }
}

module.exports = PluginLoader;
module.exports.loadOptionalModule = loadOptionalModule;
