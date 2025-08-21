/**
 * Simple color utility using ANSI escape codes
 * Replaces chalk for basic terminal coloring
 */

const colors = {
  // Text colors
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

// Check if colors are supported
const isColorSupported = !process.env.NO_COLOR && (
  process.env.FORCE_COLOR ||
  process.platform === 'win32' ||
  process.stdout.isTTY && process.env.TERM && process.env.TERM !== 'dumb'
);

// Create color functions with smart TTY detection
const colorFunctions = {};

// Add color functions
Object.entries(colors).forEach(([name, code]) => {
  colorFunctions[name] = (text) => {
    if (isColorSupported && process.stdout.isTTY) {
      return `${code}${text}${colors.reset}`;
    }
    return text; // No colors if not in a TTY or not supported
  };
});

// Add chainable API
Object.entries(colors).forEach(([name, code]) => {
  if (!colorFunctions[name]) {
    colorFunctions[name] = function(text) {
      if (isColorSupported && process.stdout.isTTY) {
        return `${code}${text}${colors.reset}`;
      }
      return text;
    };
  }
  
  // Enable chaining
  Object.entries(colors).forEach(([chainName, chainCode]) => {
    if (chainName !== name && chainName !== 'reset') {
      colorFunctions[name][chainName] = function(text) {
        if (isColorSupported && process.stdout.isTTY) {
          return `${code}${chainCode}${text}${colors.reset}`;
        }
        return text;
      };
    }
  });
});

// Add utility functions
const stripColor = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

// Export the consolidated color utility
module.exports = {
  ...colorFunctions,
  colors,
  stripColor,
  isColorSupported
};
