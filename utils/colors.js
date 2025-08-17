/**
 * Simple color utility using ANSI escape codes
 * Replaces chalk for basic terminal coloring
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  
  // Text styles
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  inverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strike: '\x1b[9m'
};

// Create color functions
const colorFunctions = {};
});

// Support for chaining (e.g., colors.red.bgWhite.bold)
Object.entries(colors).forEach(([name]) => {
  colorFunctions[name] = {
    ...colorFunctions,
    [name]: colorFunctions[name],
    // Add bold modifier
    bold: (text) => `${colors.bright}${colorFunctions[name](text)}`,
    // Add dim modifier
    dim: (text) => `${colors.dim}${colorFunctions[name](text)}`,
    // Add underscore modifier
    underscore: (text) => `${colors.underscore}${colorFunctions[name](text)}`,
  };
});

// Check if colors are supported
const isColorSupported = !process.env.NO_COLOR && (
  process.env.FORCE_COLOR ||
  process.platform === 'win32' ||
  process.stdout.isTTY && process.env.TERM && process.env.TERM !== 'dumb'
);

// If colors are not supported, return empty strings
if (!isColorSupported) {
  Object.keys(colors).forEach(key => {
    colors[key] = '';
  });
  
  Object.keys(colorFunctions).forEach(key => {
    if (typeof colorFunctions[key] === 'function') {
      colorFunctions[key] = (text) => text;
    } else {
      const obj = {};
      Object.keys(colorFunctions[key]).forEach(subKey => {
        obj[subKey] = (text) => text;
      });
      colorFunctions[key] = obj;
    }
  });
}

// Create the main export object
const result = {
  // Export colors as well in case someone needs them
  colors,
  // Helper to strip color codes
  stripColor: (text) => text.replace(/\x1b\[[0-9;]*m/g, ''),
};

// Add all color functions to the export object
Object.entries(colors).forEach(([name, code]) => {
  result[name] = (text) => `${code}${text}${colors.reset}`;
  
  // Add chainable methods
  result[name] = {
    ...result,
    [name]: (text) => `${code}${text}${colors.reset}`,
    bold: (text) => `${colors.bright}${code}${text}${colors.reset}`,
    dim: (text) => `${colors.dim}${code}${text}${colors.reset}`,
    underscore: (text) => `${colors.underscore}${code}${text}${colors.reset}`,
  };
});

module.exports = result;
