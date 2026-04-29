const { getGlobalReadline, closeGlobalReadline, ask } = require('./cli');
const { envManager } = require('./env-manager');

function isInteractive(opts={}) {
  const envSilent = envManager.getBoolean('CI') ||
    envManager.getBoolean('I18NTK_SILENT') ||
    envManager.get('npm_config_loglevel') === 'silent';
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
    this.rl = getGlobalReadline();
    this.closed = false;
  }
  question(q) {
    if (this.closed) return Promise.resolve('');
    return new Promise(res => this.rl.question(q, ans => res(ans)));
  }
  close() { 
    if (!this.closed) { 
      closeGlobalReadline(); 
      this.closed = true; 
    } 
  }
  async pressEnterToContinue(msg='\nPress Enter to continue...') {
    if (this.closed) return;
    await ask(msg);
  }
}

function createPrompt(opts={}) {
  return isInteractive(opts) ? new RLPrompt() : new NoopPrompt();
}

module.exports = { createPrompt, isInteractive };
