const readline = require('readline');

function isInteractive(opts={}) {
  const envSilent = process.env.CI === 'true' || process.env.I18NTK_SILENT === '1' || (process.env.npm_config_loglevel||'').toLowerCase()==='silent';
  if (opts.noPrompt) return false;
  if (envSilent) return false;
  return process.stdin.isTTY === true;
}

class NoopPrompt {
  question(_q) { return Promise.resolve(''); }
  close() {}
  async pressEnterToContinue() { return; }
}

class RLPrompt {
  constructor() {
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    this.closed = false;
  }
  question(q) {
    if (this.closed) return Promise.resolve('');
    return new Promise(res => this.rl.question(q, ans => res(ans)));
  }
  close() { if (!this.closed) { this.rl.close(); this.closed = true; } }
  async pressEnterToContinue(msg='\nPress Enter to continue...') {
    if (this.closed) return;
    await this.question(msg);
  }
}

function createPrompt(opts={}) {
  return isInteractive(opts) ? new RLPrompt() : new NoopPrompt();
}

module.exports = { createPrompt, isInteractive };