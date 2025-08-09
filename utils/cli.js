const readline = require('readline');

async function flushStdout() {
  await new Promise(resolve => setImmediate(resolve));
}

async function ask(query) {
  await flushStdout();
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function askHidden(query) {
  await flushStdout();
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });

    // Mask user input by replacing characters with asterisks
    rl.stdoutMuted = true;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write('*');
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

module.exports = { ask, askHidden, flushStdout };