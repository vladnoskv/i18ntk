const colors = require('./colors-new');
const { envManager } = require('./env-manager');

// Enhanced logger with TTY detection and proper stream handling
const logger = {
  // Basic log function with color support
  log: (message, color = '') => {
    const output = color ? color(message) : message;
    if (process.stdout.isTTY) {
      process.stdout.write(output + '\n');
    } else {
      console.log(output);
    }
  },
  
  // Error logging (goes to stderr)
  error: (message) => {
    const output = `❌ ${message}`;
    if (process.stderr.isTTY) {
      process.stderr.write(colors.bright(colors.red(output)) + '\n');
    } else {
      console.error(output);
    }
  },
  
  // Success logging
  success: (message) => {
    const output = `✅ ${message}`;
    logger.log(output, colors.green);
  },
  
  // Warning logging (goes to stderr)
  warn: (message) => {
    const output = `⚠️  ${message}`;
    if (process.stderr.isTTY) {
      process.stderr.write(colors.bright(colors.yellow(output)) + '\n');
    } else {
      console.warn(output);
    }
  },
  
  // Info logging
  info: (message) => {
    const output = `ℹ️  ${message}`;
    logger.log(output, colors.blue);
  },
  
  // Debug logging (only when DEBUG env var is set or log level is debug)
  debug: (message) => {
    const logLevel = envManager.get('I18NTK_LOG_LEVEL');
    const debugEnabled = process.env.DEBUG || logLevel === 'debug';
    
    if (debugEnabled) {
      const output = `[DEBUG] ${message}`;
      if (process.stderr.isTTY) {
        process.stderr.write(colors.gray(output) + '\n');
      } else {
        console.debug(output);
      }
    }
  }
};

module.exports = { colors, logger };
