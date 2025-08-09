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

    const stdin = process.stdin;
    const onData = char => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          rl.output.write('\n');
          rl.close();
          resolve(value.trim());
          break;
        case '\u0003':
          process.exit();
          break;
        default:
          rl.output.write('*');
          value += char;
          break;
      }
    };
    let value = '';
    stdin.on('data', onData);
    rl.question(query, () => {});
  });
}

module.exports = { ask, askHidden, flushStdout };