
const defaultFormat = require('./formats/json');

class FormatManager {
  constructor() {
    this.formats = new Map();
    this.registerFormat(defaultFormat);
  }

  registerFormat(format) {
    if (!format || !Array.isArray(format.extensions)) return;
    format.extensions.forEach(ext => {
      this.formats.set(ext, format);
    });
  }

  getFormat(ext) {
    return this.formats.get(ext) || this.formats.get('.json');
  }
}

// Export both the class and utility functions
module.exports = FormatManager;
module.exports.getFormatAdapter = function(format) {
  const manager = new FormatManager();
  const adapter = manager.getFormat(format);
  // Ensure we always return a valid adapter with all required methods
  return adapter || {
    extension: '.json',
    read: (content) => JSON.parse(content),
    write: (data) => JSON.stringify(data, null, 2),
    serialize: (data) => JSON.stringify(data, null, 2),
    deserialize: (content) => JSON.parse(content)
  };
};