const fs = require('fs');

module.exports = {
  extension: '.json',
  read(content) {
    return JSON.parse(content);
  },
  serialize(data) {
    return JSON.stringify(data, null, 2);
  }
};