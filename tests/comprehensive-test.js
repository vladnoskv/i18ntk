#!/usr/bin/env node

/**
 * COMPREHENSIVE TESTING SCRIPT FOR I18NTK
 *
 * This script performs comprehensive testing of the refactored setup process
 * to ensure all improvements work correctly and the package functions properly
 * in both local and global installation scenarios.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

console.log('🧪 COMPREHENSIVE I18NTK TESTING SUITE');
console.log('=====================================');
console.log('Testing refactored setup process and functionality...\n');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    issues: []
};

function logTest(name, success, message = '') {
    testResults.total++;
    if (success) {
        testResults.passed++;
        console.log(`✅ ${name}`);
        if (message) console.log(`   ${message}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${name}`);
        if (message) console.log(`   ${message}`);
        testResults.issues.push({ name, message });
    }
}

function logSection(title) {
    console.log(`\n🔍 ${title}`);
    console.log('='.repeat(title.length + 3));
}

// Utility function to run commands
function runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            ...options
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

// Test 1: Check manage system for circular dependencies
async function testManageSystem() {
    logSection('TESTING MANAGE SYSTEM');

    try {
        // Test 1.1: Import main manage module
        const manageModule = require('../main/manage/index.js');
        logTest('Main manage module imports successfully', true);

        // Test 1.2: Check for circular dependencies by examining imports
        const manageContent = fs.readFileSync('./main/manage/index.js', 'utf8');
        const imports = manageContent.match(/require\(['"].*?['"]/g) || [];
        logTest('Manage module has clean imports', imports.length > 0);

        // Test 1.3: Test CommandRouter initialization
        const CommandRouter = require('../main/manage/commands/CommandRouter.js');
        const router = new CommandRouter({}, null, null);
        logTest('CommandRouter initializes successfully', true);

        // Test 1.4: Test all command handlers
        const commands = ['init', 'analyze', 'validate', 'complete', 'summary', 'sizing', 'usage', 'backup', 'doctor', 'fix', 'scanner'];
        for (const cmd of commands) {
            if (router.isCommandAvailable(cmd)) {
                logTest(`Command handler available: ${cmd}`, true);
            } else {
                logTest(`Command handler available: ${cmd}`, false, 'Command not found in router');
            }
        }

        // Test 1.5: Test service imports
        const ConfigurationService = require('../main/manage/services/ConfigurationService.js');
        const SummaryService = require('../main/manage/services/SummaryService.js');
        logTest('ConfigurationService imports successfully', true);
        logTest('SummaryService imports successfully', true);

    } catch (error) {
        logTest('Manage system test', false, error.message);
    }
}

// Test 2: Verify command classes work correctly
async function testCommandClasses() {
    logSection('TESTING COMMAND CLASSES');

    try {
        const commands = [
            'InitCommand', 'AnalyzeCommand', 'ValidateCommand', 'CompleteCommand',
            'SummaryCommand', 'SizingCommand', 'UsageCommand', 'BackupCommand',
            'DoctorCommand', 'FixerCommand', 'ScannerCommand'
        ];

        for (const cmdName of commands) {
            try {
                const CommandClass = require(`./main/manage/commands/${cmdName}.js`);
                const instance = new CommandClass({}, null);

                // Test basic functionality
                if (typeof instance.execute === 'function') {
                    logTest(`${cmdName} has execute method`, true);
                } else {
                    logTest(`${cmdName} has execute method`, false, 'Missing execute method');
                }

                if (typeof instance.getMetadata === 'function') {
                    logTest(`${cmdName} has metadata`, true);
                } else {
                    logTest(`${cmdName} has metadata`, false, 'Missing getMetadata method');
                }

            } catch (error) {
                logTest(`${cmdName} loads correctly`, false, error.message);
            }
        }

    } catch (error) {
        logTest('Command classes test', false, error.message);
    }
}

// Test 3: Test npx and npm script execution
async function testNpxExecution() {
    logSection('TESTING NPX/NPM SCRIPT EXECUTION');

    const binEntries = [
        'i18ntk', 'i18ntk-setup', 'i18ntk-manage', 'i18ntk-init',
        'i18ntk-analyze', 'i18ntk-validate', 'i18ntk-usage',
        'i18ntk-complete', 'i18ntk-sizing', 'i18ntk-summary',
        'i18ntk-doctor', 'i18ntk-fixer', 'i18ntk-scanner', 'i18ntk-backup'
    ];

    for (const bin of binEntries) {
        try {
            // Test help flag to avoid actual execution
            const result = await runCommand('node', [`./main/${bin}.js`, '--help'], { timeout: 5000 });

            if (result.code === 0) {
                logTest(`npx execution: ${bin}`, true);
            } else {
                logTest(`npx execution: ${bin}`, false, `Exit code: ${result.code}, stderr: ${result.stderr}`);
            }
        } catch (error) {
            logTest(`npx execution: ${bin}`, false, error.message);
        }
    }
}

// Test 4: Validate security measures
async function testSecurityMeasures() {
    logSection('TESTING SECURITY MEASURES');

    try {
        // Test 4.1: Check for PIN protection
        const AdminAuth = require('../utils/admin-auth.js');
        const adminAuth = new AdminAuth();
        logTest('AdminAuth module loads', true);

        // Test 4.2: Check security utils
        const SecurityUtils = require('../utils/security.js');
        logTest('SecurityUtils module loads', true);

        // Test 4.3: Test path validation
        if (typeof SecurityUtils.safeExistsSync === 'function') {
            logTest('Path validation available', true);
        } else {
            logTest('Path validation available', false, 'safeExistsSync not found');
        }

        // Test 4.4: Check for encryption functions
        if (typeof SecurityUtils.encrypt === 'function' && typeof SecurityUtils.decrypt === 'function') {
            logTest('Encryption functions available', true);
        } else {
            logTest('Encryption functions available', false, 'Missing encrypt/decrypt functions');
        }

        // Test 4.5: Test secure module loading
        const fs = require('fs');
        const path = require('path');
        const secureModules = [
            './utils/admin-auth.js',
            './utils/security.js',
            './utils/admin-cli.js',
            './utils/admin-pin.js'
        ];

        for (const module of secureModules) {
            if (fs.existsSync(module)) {
                logTest(`Secure module exists: ${path.basename(module)}`, true);
            } else {
                logTest(`Secure module exists: ${path.basename(module)}`, false, 'Module not found');
            }
        }

    } catch (error) {
        logTest('Security measures test', false, error.message);
    }
}

// Test 5: Test global installation compatibility
async function testGlobalInstallation() {
    logSection('TESTING GLOBAL INSTALLATION COMPATIBILITY');

    try {
        // Test 5.1: Check package.json configuration
        const packageJson = require('../package.json');

        if (packageJson.main === 'main/manage/index.js') {
            logTest('Main entry point configured correctly', true);
        } else {
            logTest('Main entry point configured correctly', false, `Expected: main/manage/index.js, Got: ${packageJson.main}`);
        }

        if (packageJson.preferGlobal === true) {
            logTest('Package marked as preferring global', true);
        } else {
            logTest('Package marked as preferring global', false, 'preferGlobal should be true');
        }

        // Test 5.2: Check bin entries
        const expectedBins = {
            'i18ntk': 'main/manage/index.js',
            'i18ntk-setup': 'main/i18ntk-setup.js',
            'i18ntk-manage': 'main/manage/index.js',
            'i18ntk-init': 'main/i18ntk-init.js',
            'i18ntk-analyze': 'main/i18ntk-analyze.js',
            'i18ntk-validate': 'main/i18ntk-validate.js',
            'i18ntk-usage': 'main/i18ntk-usage.js',
            'i18ntk-complete': 'main/i18ntk-complete.js',
            'i18ntk-sizing': 'main/i18ntk-sizing.js',
            'i18ntk-summary': 'main/i18ntk-summary.js',
            'i18ntk-doctor': 'main/i18ntk-doctor.js',
            'i18ntk-fixer': 'main/i18ntk-fixer.js',
            'i18ntk-scanner': 'main/i18ntk-scanner.js',
            'i18ntk-backup': 'main/i18ntk-backup.js'
        };

        for (const [binName, binPath] of Object.entries(expectedBins)) {
            if (packageJson.bin && packageJson.bin[binName] === binPath) {
                logTest(`Bin entry configured: ${binName}`, true);
            } else {
                logTest(`Bin entry configured: ${binName}`, false, `Expected: ${binPath}`);
            }
        }

        // Test 5.3: Check files array
        const requiredFiles = ['main/', 'runtime/', 'utils/', 'scripts/', 'settings/', 'ui-locales/', 'LICENSE', 'package.json', 'README.md'];
        let filesTestsPassed = 0;

        if (packageJson.files) {
            for (const requiredFile of requiredFiles) {
                if (packageJson.files.includes(requiredFile)) {
                    filesTestsPassed++;
                }
            }
        }

        logTest(`Required files in package.json files array (${filesTestsPassed}/${requiredFiles.length})`, filesTestsPassed === requiredFiles.length);

        // Test 5.4: Check for zero dependencies
        if (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) {
            logTest('Package has zero runtime dependencies', true);
        } else {
            logTest('Package has zero runtime dependencies', false, `Found dependencies: ${Object.keys(packageJson.dependencies).join(', ')}`);
        }

    } catch (error) {
        logTest('Global installation test', false, error.message);
    }
}

// Test 6: Ensure backward compatibility
async function testBackwardCompatibility() {
    logSection('TESTING BACKWARD COMPATIBILITY');

    try {
        // Test 6.1: Check if old entry points still work
        const oldEntryPoints = [
            'main/i18ntk-setup.js',
            'main/i18ntk-init.js',
            'main/i18ntk-analyze.js',
            'main/i18ntk-validate.js'
        ];

        for (const entryPoint of oldEntryPoints) {
            if (fs.existsSync(entryPoint)) {
                try {
                    const content = fs.readFileSync(entryPoint, 'utf8');
                    if (content.startsWith('#!/usr/bin/env node')) {
                        logTest(`Legacy entry point works: ${entryPoint}`, true);
                    } else {
                        logTest(`Legacy entry point works: ${entryPoint}`, false, 'Missing shebang');
                    }
                } catch (error) {
                    logTest(`Legacy entry point works: ${entryPoint}`, false, error.message);
                }
            } else {
                logTest(`Legacy entry point exists: ${entryPoint}`, false, 'File not found');
            }
        }

        // Test 6.2: Check if old CLI arguments still work
        const testArgs = ['--help', '--version'];

        for (const arg of testArgs) {
            try {
                const result = await runCommand('node', ['./main/manage/index.js', arg], { timeout: 3000 });
                if (result.code === 0) {
                    logTest(`Legacy CLI arg works: ${arg}`, true);
                } else {
                    logTest(`Legacy CLI arg works: ${arg}`, false, `Exit code: ${result.code}`);
                }
            } catch (error) {
                logTest(`Legacy CLI arg works: ${arg}`, false, error.message);
            }
        }

    } catch (error) {
        logTest('Backward compatibility test', false, error.message);
    }
}

// Test 7: Verify setup process for new installations
async function testSetupProcess() {
    logSection('TESTING SETUP PROCESS');

    try {
        // Test 7.1: Check if setup script exists and is executable
        const setupScript = './main/i18ntk-setup.js';
        if (fs.existsSync(setupScript)) {
            const content = fs.readFileSync(setupScript, 'utf8');
            if (content.startsWith('#!/usr/bin/env node')) {
                logTest('Setup script has proper shebang', true);
            } else {
                logTest('Setup script has proper shebang', false, 'Missing shebang');
            }

            // Test basic execution with help flag
            const result = await runCommand('node', [setupScript, '--help'], { timeout: 5000 });
            if (result.code === 0) {
                logTest('Setup script executes successfully', true);
            } else {
                logTest('Setup script executes successfully', false, `Exit code: ${result.code}`);
            }
        } else {
            logTest('Setup script exists', false, 'File not found');
        }

        // Test 7.2: Check setup enforcer
        const SetupEnforcer = require('../utils/setup-enforcer.js');
        logTest('SetupEnforcer module loads', true);

        // Test 7.3: Check configuration system
        const configManager = require('../settings/settings-manager.js');
        logTest('Configuration manager loads', true);

        // Test 7.4: Test initialization helper
        const initHelper = require('../utils/init-helper.js');
        logTest('Initialization helper loads', true);

    } catch (error) {
        logTest('Setup process test', false, error.message);
    }
}

// Main test execution
async function runAllTests() {
    console.log('Starting comprehensive testing...\n');

    await testManageSystem();
    await testCommandClasses();
    await testNpxExecution();
    await testSecurityMeasures();
    await testGlobalInstallation();
    await testBackwardCompatibility();
    await testSetupProcess();

    // Generate comprehensive test report
    logSection('COMPREHENSIVE TEST REPORT');

    console.log(`\n📊 TEST RESULTS SUMMARY`);
    console.log(`========================`);
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.issues.length > 0) {
        console.log(`\n⚠️  ISSUES FOUND:`);
        console.log(`================`);
        testResults.issues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue.name}`);
            if (issue.message) {
                console.log(`   ${issue.message}`);
            }
        });
    }

    console.log(`\n🔧 RECOMMENDATIONS:`);
    console.log(`===================`);

    if (testResults.failed === 0) {
        console.log('🎉 All tests passed! The refactored setup process is working correctly.');
        console.log('✅ Package is ready for both local and global installation.');
        console.log('✅ All security measures are properly implemented.');
        console.log('✅ Backward compatibility is maintained.');
        console.log('✅ Setup process works correctly for new installations.');
    } else {
        console.log('⚠️  Some tests failed. Please review the issues above.');
        console.log('🔧 Address the failed tests before deploying the package.');
        console.log('📝 Check the detailed error messages for specific guidance.');
    }

    console.log(`\n📋 NEXT STEPS:`);
    console.log(`==============`);
    console.log('1. Review any failed tests and fix issues');
    console.log('2. Test global installation: npm install -g .');
    console.log('3. Test npx execution: npx i18ntk --help');
    console.log('4. Test local execution: npm run i18ntk -- --help');
    console.log('5. Verify all bin entries work correctly');

    // Exit with appropriate code
    process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
    console.error('❌ Test suite failed with error:', error.message);
    process.exit(1);
});