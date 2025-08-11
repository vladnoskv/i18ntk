const readline = require('readline');

async function flushStdout() {
  await new Promise(resolve => setImmediate(resolve));
}

// Global readline interface to prevent conflicts
let globalReadline = null;

function getGlobalReadline() {
  if (!globalReadline) {
    globalReadline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 0
    });
    // Store globally for other modules to check
    global.activeReadlineInterface = globalReadline;
  }
  return globalReadline;
}

function closeGlobalReadline() {
  if (globalReadline) {
    try {
      globalReadline.close();
    } catch (_) {}
    globalReadline = null;
    global.activeReadlineInterface = null;
  }
  
  // Ensure terminal is properly reset
  if (process.stdin && process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    } catch (_) {}
  }
}

async function ask(query) {
  await flushStdout();
  const rl = getGlobalReadline();
  
  return new Promise(resolve => {
    rl.question(query, answer => {
      // Ensure terminal is reset after input
      if (process.stdin && process.stdin.isTTY) {
        try {
          process.stdin.setRawMode(false);
        } catch (_) {}
      }
      resolve(answer.trim());
    });
  });
}

async function askHidden(query) {
  await flushStdout();
  
  const stdin = process.stdin;
  const stdout = process.stdout;
  const isTTY = stdin && stdin.isTTY;
  
  // Temporarily pause any existing readline
  if (globalReadline) {
    try {
      globalReadline.pause();
    } catch (_) {}
  }

  return new Promise(resolve => {
    let value = '';
    let rawModeSet = false;

    const cleanup = () => {
      try {
        stdin.removeListener('data', onData);
        if (rawModeSet && isTTY) {
          stdin.setRawMode(false);
        }
        stdin.pause();
      } catch (_) {}
      
      // Resume existing readline
      if (globalReadline) {
        try {
          globalReadline.resume();
        } catch (_) {}
      }
    };

    const onData = (char) => {
      char = String(char);
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          stdout.write('\n');
          cleanup();
          return resolve(value.trim());
          
        case '\u0003': // Ctrl+C
          stdout.write('\n');
          cleanup();
          process.exit(1);
          
        case '\u007f': // Backspace
        case '\b':
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          return;
          
        default:
          // Accept only digits for PIN-like inputs
          if (char >= '0' && char <= '9') {
            value += char;
            stdout.write('*');
          }
          return;
      }
    };

    // Print prompt
    stdout.write(query);

    // Set up raw mode for hidden input
    if (isTTY) {
      try {
        stdin.setRawMode(true);
        rawModeSet = true;
        stdin.resume();
        stdin.setEncoding('utf8');
      } catch (_) {}
    }

    stdin.on('data', onData);
  });
}

module.exports = { ask, askHidden, flushStdout, closeGlobalReadline, getGlobalReadline };
