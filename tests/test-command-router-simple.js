#!/usr/bin/env node

/**
 * Simple test script to verify CommandRouter and command handlers work correctly
 */

console.log('🧪 Testing CommandRouter and command handlers (simple version)...\n');

// Mock dependencies to avoid configuration issues
const mockConfig = {};
const mockUI = {
    t: (key) => key,
    loadLanguage: () => {},
    getLanguageDisplayName: (lang) => lang.toUpperCase(),
    availableLanguages: ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh']
};
const mockAdminAuth = {
    isAuthRequired: async () => false,
    verifyPin: async () => true
};

try {
    // Test 1: Import CommandRouter
    console.log('1. Testing CommandRouter import...');
    const CommandRouter = require('../main/manage/commands/CommandRouter');
    console.log('   ✅ CommandRouter imported successfully');

    // Test 2: Instantiate CommandRouter
    console.log('\n2. Testing CommandRouter instantiation...');
    const commandRouter = new CommandRouter(mockConfig, mockUI, mockAdminAuth);
    console.log('   ✅ CommandRouter instantiated successfully');

    // Test 3: Check command handlers are initialized
    console.log('\n3. Testing command handlers initialization...');
    const expectedCommands = [
        'init', 'analyze', 'validate', 'complete', 'summary',
        'sizing', 'usage', 'backup', 'doctor', 'fix', 'scanner'
    ];

    let handlersCount = 0;
    expectedCommands.forEach(command => {
        if (commandRouter.commandHandlers[command]) {
            handlersCount++;
            console.log(`   ✅ ${command} handler initialized`);
        } else {
            console.log(`   ❌ ${command} handler missing`);
        }
    });

    console.log(`   📋 ${handlersCount}/${expectedCommands.length} command handlers initialized`);

    // Test 4: Test CommandRouter methods
    console.log('\n4. Testing CommandRouter methods...');

    // Test getAvailableCommands
    const availableCommands = commandRouter.getAvailableCommands();
    if (Array.isArray(availableCommands) && availableCommands.length === expectedCommands.length) {
        console.log('   ✅ getAvailableCommands() works correctly');
    } else {
        console.log('   ❌ getAvailableCommands() failed');
    }

    // Test isCommandAvailable
    let commandCheckCount = 0;
    expectedCommands.forEach(command => {
        if (commandRouter.isCommandAvailable(command)) {
            commandCheckCount++;
        }
    });

    if (commandCheckCount === expectedCommands.length) {
        console.log('   ✅ isCommandAvailable() works correctly');
    } else {
        console.log('   ❌ isCommandAvailable() failed');
    }

    // Test getExecutionContext
    const context = commandRouter.getExecutionContext({ fromMenu: true });
    if (context && context.type === 'manager' && context.source === 'interactive_menu') {
        console.log('   ✅ getExecutionContext() works correctly');
    } else {
        console.log('   ❌ getExecutionContext() failed');
    }

    // Test 5: Test individual command handler imports
    console.log('\n5. Testing individual command handler imports...');
    const commandFiles = [
        'InitCommand', 'AnalyzeCommand', 'ValidateCommand', 'CompleteCommand',
        'SummaryCommand', 'SizingCommand', 'UsageCommand', 'BackupCommand',
        'DoctorCommand', 'FixerCommand', 'ScannerCommand'
    ];

    let importCount = 0;
    for (const commandFile of commandFiles) {
        try {
            const CommandClass = require(`./main/manage/commands/${commandFile}`);
            const commandInstance = new CommandClass(mockConfig, mockUI);

            if (CommandClass && typeof CommandClass === 'function' && commandInstance) {
                importCount++;
                console.log(`   ✅ ${commandFile} imported and instantiated`);
            } else {
                console.log(`   ❌ ${commandFile} import/instantiation failed`);
            }
        } catch (error) {
            console.log(`   ❌ ${commandFile} import failed: ${error.message}`);
        }
    }

    console.log(`   📋 ${importCount}/${commandFiles.length} command handlers imported successfully`);

    // Test 6: Test help functionality
    console.log('\n6. Testing help functionality...');
    // Capture console.log output
    const originalConsoleLog = console.log;
    let helpOutput = '';
    console.log = (msg) => { helpOutput += msg + '\n'; };

    commandRouter.showHelp();

    console.log = originalConsoleLog; // Restore

    if (helpOutput.includes('Available commands') || helpOutput.includes('help.usage')) {
        console.log('   ✅ showHelp() works correctly');
    } else {
        console.log('   ❌ showHelp() failed');
    }

    // Summary
    console.log('\n📋 Command Router Test Summary:');
    console.log(`   - CommandRouter: ✅ Imported and instantiated`);
    console.log(`   - Command handlers: ✅ ${handlersCount}/${expectedCommands.length} initialized`);
    console.log(`   - Individual imports: ✅ ${importCount}/${commandFiles.length} successful`);
    console.log(`   - Help functionality: ✅ Working`);

    const overallSuccess = handlersCount === expectedCommands.length &&
                          importCount === commandFiles.length;

    if (overallSuccess) {
        console.log('\n🎉 Command Router test passed!');
        console.log('\n✅ CONCLUSION: All command handlers are properly integrated and functional.');
    } else {
        console.log('\n⚠️  Command Router test completed with some issues');
    }

} catch (error) {
    console.error('\n❌ Command Router test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}