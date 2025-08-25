const readline = require('readline');
const { logger } = require('./logger');

class Prompt {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  close() {
    this.rl.close();
  }

  async question(questionText) {
    return new Promise((resolve) => {
      this.rl.question(questionText, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async confirm(questionText, defaultValue = false) {
    const answer = await this.question(`${questionText} (${defaultValue ? 'Y/n' : 'y/N'}) `);
    if (answer === '') return defaultValue;
    return /^y|yes$/i.test(answer);
  }

  async select(questionText, choices, defaultIndex = 0) {
    logger.log(`\n${questionText}:`);
    choices.forEach((choice, index) => {
      logger.log(`  ${index + 1}. ${choice}`);
    });

    while (true) {
      const answer = await this.question(`\nSelect an option (1-${choices.length}): `);
      const selected = parseInt(answer, 10) - 1;
      if (!isNaN(selected) && selected >= 0 && selected < choices.length) {
        return selected;
      }
      logger.log('Invalid selection. Please try again.');
    }
  }

  async input(questionText, defaultValue = '') {
    const answer = await this.question(`${questionText}${defaultValue ? ` [${defaultValue}]` : ''}: `);
    return answer || defaultValue;
  }
}

const prompt = new Prompt();
process.on('exit', () => prompt.close());

module.exports = prompt;
