#!/usr/bin/env node

/**
 * Test Runner Helper for Enhanced i18ntk Testing
 * Provides command-line options for running specific test categories
 */

const { execSync } = require('child_process');
const path = require('path');

class TestRunnerHelper {
  constructor() {
    this.args = process.argv.slice(2);
    this.testScript = path.join(__dirname, 'test-local-package.js');
  }

  log(message) {
    console.log(`[TEST-HELPER] ${message}`);
  }

  error(message) {
    console.error(`[ERROR] ${message}`);
    process.exit(1);
  }

  runCommand(command) {
    try {
      console.log(`Running: ${command}`);
      const result = execSync(command, { stdio: 'inherit', shell: true });
      return true;
    } catch (error) {
      console.error(`Command failed: ${error.message}`);
      return false;
    }
  }

  showHelp() {
    console.log(`
Enhanced i18ntk Test Runner Helper

Usage: node test-runner-helper.js [options]

Options:
  --performance     Run performance tests only
  --security        Run security tests only
  --edge-cases      Run edge case tests only
  --memory          Run memory usage tests only
  --all-scripts     Test all utility scripts
  --bin-scripts     Test all CLI bin scripts
  --validate-only   Quick package validation
  --help            Show this help message

Examples:
  node test-runner-helper.js --performance
  node test-runner-helper.js --security
  npm run test:local
  npm run test:comprehensive
`);
  }

  run() {
    if (this.args.includes('--help')) {
      this.showHelp();
      return;
    }

    let testCommand = `node "${this.testScript}"`;

    // Add specific test flags
    if (this.args.includes('--performance')) {
      testCommand += ' --performance';
    }
    if (this.args.includes('--security')) {
      testCommand += ' --security';
    }
    if (this.args.includes('--edge-cases')) {
      testCommand += ' --edge-cases';
    }
    if (this.args.includes('--memory')) {
      testCommand += ' --memory';
    }
    if (this.args.includes('--all-scripts')) {
      testCommand += ' --all-scripts';
    }
    if (this.args.includes('--bin-scripts')) {
      testCommand += ' --bin-scripts';
    }
    if (this.args.includes('--validate-only')) {
      testCommand += ' --validate-only';
    }

    this.log(`Executing: ${testCommand}`);
    this.runCommand(testCommand);
  }
}

// Run if called directly
if (require.main === module) {
  const helper = new TestRunnerHelper();
  helper.run();
}

module.exports = TestRunnerHelper;