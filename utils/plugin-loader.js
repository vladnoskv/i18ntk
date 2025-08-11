const path = require('path');

function loadOptionalModule(name, cwd = process.cwd()) {
  try {
    const resolved = require.resolve(name, { paths: [cwd] });
    return require(resolved);
  } catch (err) {
    return null;
  }
}

module.exports = { loadOptionalModule };