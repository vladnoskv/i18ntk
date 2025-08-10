const readline = require('readline');

async function promptPin({ rl, label = 'Enter 4-digit Admin PIN: ', length = 4, digitsOnly = true } = {}) {
  return rawMaskedPrompt(rl, label, { length, digitsOnly });
}

async function promptPinConfirm(rl, label1 = 'Enter new 4-digit Admin PIN: ', label2 = 'Confirm PIN: ') {
  const pin1 = await promptPin({ rl, label: label1 });
  const pin2 = await promptPin({ rl, label: label2 });
  if (pin1 !== pin2) throw new Error('PINs do not match');
  return pin1;
}

function rawMaskedPrompt(rl, promptText, { length = 4, digitsOnly = true } = {}) {
  return new Promise((resolve) => {
    const input = rl.input;
    const output = rl.output;

    const isRaw = input.isRaw;
    if (!isRaw) input.setRawMode && input.setRawMode(true);

    let buf = '';

    const onData = (chunk) => {
      const s = chunk.toString('utf8');

      if (s === '\r' || s === '\n') {
        if (buf.length === length) {
          output.write('\n');
          cleanup();
          return resolve(buf);
        }
        return;
      }

      if (s === '\u0003') {
        output.write('\n');
        cleanup();
        process.exit(130);
      }

      if (s === '\u0008' || s === '\u007f') {
        if (buf.length > 0) buf = buf.slice(0, -1);
        repaint();
        return;
      }

      const ch = s;
      if (digitsOnly) {
        if (/^\d$/.test(ch) && buf.length < length) {
          buf += ch;
          repaint();
        }
      } else if (buf.length < length) {
        buf += ch;
        repaint();
      }
    };

    const repaint = () => {
      output.cursorTo && output.cursorTo(0);
      output.clearLine && output.clearLine(1);
      output.write(promptText + '*'.repeat(buf.length));
    };

    const cleanup = () => {
      input.removeListener('data', onData);
      if (!isRaw) input.setRawMode && input.setRawMode(false);
    };

    output.write(promptText);
    input.on('data', onData);
  });
}

module.exports = { promptPin, promptPinConfirm };