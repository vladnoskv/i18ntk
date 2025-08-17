#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Test core commands functionality for i18ntk v1.10.0
 */
class CoreCommandsTester {
  constructor() {
    this.testResults = [];
    this.testDir = path.join(__dirname, 'test-projects', 'vue-project');
  }

  /**
   * Run a command and capture results
   */
  async runCommand(command, description) {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   Command: ${command}`);
    
    try {
      const output = execSync(command, { 
        cwd: __dirname,
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });
      
      const result = {
        command,
        description,
        status: 'PASS',
        output: output.trim(),
        error: null
      };
      
      console.log(`   ✅ Status: PASS`);
      if (output.trim()) {
        console.log(`   Output: ${output.trim().substring(0, 200)}...`);
      }
      
      this.testResults.push(result);
      return result;
      
    } catch (error) {
      const result = {
        command,
        description,
        status: 'FAIL',
        output: error.stdout?.trim() || '',
        error: error.message
      };
      
      console.log(`   ❌ Status: FAIL`);
      console.log(`   Error: ${error.message.substring(0, 200)}...`);
      
      this.testResults.push(result);
      return result;
    }
  }

  /**
   * Test all core commands
   */
  async testAllCommands() {
    console.log('🚀 Testing i18ntk v1.10.0 Core Commands\n');
    console.log('='.repeat(60));

    // Test basic help commands
    await this.runCommand('node main/i18ntk-manage.js --help', 'Main CLI help');
    await this.runCommand('node main/i18ntk-setup.js --help', 'Setup command help');
    await this.runCommand('node main/i18ntk-analyze.js --help', 'Analyze command help');
    await this.runCommand('node main/i18ntk-validate.js --help', 'Validate command help');

    // Test setup command with test project
    if (fs.existsSync(this.testDir)) {
      await this.runCommand(
        `node main/i18ntk-setup.js --source-dir ${this.testDir} --dry-run`,
        'Setup command with Vue project (dry run)'
      );
    }

    // Test analyze command with test project
    if (fs.existsSync(this.testDir)) {
      await this.runCommand(
        `node main/i18ntk-analyze.js --source-dir ${this.testDir} --dry-run`,
        'Analyze command with Vue project (dry run)'
      );
    }

    // Test validate command
    await this.runCommand('node main/i18ntk-validate.js --help', 'Validate command help');

    // Test backup command help
    await this.runCommand('node main/i18ntk-backup.js --help', 'Backup command help');

    // Test doctor command
    await this.runCommand('node main/i18ntk-doctor.js --help', 'Doctor command help');

    // Test language-specific commands
    await this.runCommand('node main/i18ntk-js.js --help', 'JavaScript command help');
    await this.runCommand('node main/i18ntk-py.js --help', 'Python command help');
    await this.runCommand('node main/i18ntk-java.js --help', 'Java command help');
    await this.runCommand('node main/i18ntk-php.js --help', 'PHP command help');
    await this.runCommand('node main/i18ntk-go.js --help', 'Go command help');

    // Test utility commands
    await this.runCommand('node main/i18ntk-fixer.js --help', 'Fixer command help');
    await this.runCommand('node main/i18ntk-scanner.js --help', 'Scanner command help');

    // Test version info
    await this.runCommand('node main/i18ntk-manage.js --version', 'Version check');

    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;

    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`   - ${result.description}: ${result.error}`);
        });
    }

    if (passed === total) {
      console.log('\n🎉 All core commands tested successfully!');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CoreCommandsTester();
  tester.testAllCommands().catch(console.error);
}

module.exports = { CoreCommandsTester };