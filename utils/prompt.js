const readline = require('readline');
const { logger } = require('./logger');

/**
 * Enhanced prompt utility for CLI interactions
 * Consolidated from prompt.js, prompt-new.js, and prompt-fixed.js
 */
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

  /**
   * Present a list of choices and let the user select one
   * @param {string} question - The question to ask
   * @param {Array<string>} choices - Array of choices
   * @returns {Promise<string>} The selected choice
   */
  async list(question, choices) {
    if (!choices || !choices.length) {
      throw new Error('No choices provided');
    }

    console.log(question);
    choices.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice}`);
    });

    while (true) {
      const answer = await this.question(`Select an option (1-${choices.length}): `);
      const index = parseInt(answer.trim(), 10) - 1;
      
      if (index >= 0 && index < choices.length) {
        return choices[index];
      }
      
      console.log('Invalid selection. Please try again.');
    }
  }
}

// Create a singleton instance
const prompt = new Prompt();

// Handle process termination
process.on('exit', () => {
  prompt.close();
});

module.exports = prompt;
