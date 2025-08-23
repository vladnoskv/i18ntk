const path = require('path');

function loadOptionalModule(name, cwd = process.cwd()) {
  // Sanitize the module name to prevent path traversal
  const sanitizedName = name.replace(/[^a-zA-Z0-9@/_-]/g, '');
  if (sanitizedName !== name) {
    // If the name was changed, it was invalid
    return null;
  }

  try {
    const resolved = require.resolve(sanitizedName, { paths: [cwd] });
    return require(resolved);
 } catch {
    return null;
  }
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
