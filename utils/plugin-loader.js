const path = require('path');

function loadOptionalModule(name, cwd = process.cwd()) {
  try {
    const resolved = require.resolve(name, { paths: [cwd] });
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