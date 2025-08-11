
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

module.exports = FormatManager;