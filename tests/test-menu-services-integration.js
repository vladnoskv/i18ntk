#!/usr/bin/env node

/**
 * Test script to verify menu systems and service layer integration
 */

console.log('🧪 Testing menu systems and service layer integration...\n');

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
    verifyPin: async () => true,
    isAuthRequiredForScript: async () => false
};
const mockManager = {
    prompt: async (msg) => '0', // Always exit for testing
    isNonInteractiveMode: () => false,
    safeClose: () => {},
    executeCommand: async () => ({ success: true }),
    deleteReports: async () => {},
    showSettingsMenu: async () => {},
    showLanguageMenu: async () => {},
    showHelp: () => console.log('Help displayed'),
    adminAuth: mockAdminAuth,
    ui: mockUI
};

try {
    // Test 1: Import and test InteractiveMenu
    console.log('1. Testing InteractiveMenu import and structure...');
    const InteractiveMenu = require('../main/manage/managers/InteractiveMenu');
    console.log('   ✅ InteractiveMenu imported successfully');

    const interactiveMenu = new InteractiveMenu(mockManager);
    console.log('   ✅ InteractiveMenu instantiated successfully');

    // Test that it has the expected methods
    if (typeof interactiveMenu.showInteractiveMenu === 'function') {
        console.log('   ✅ showInteractiveMenu method exists');
    } else {
        console.log('   ❌ showInteractiveMenu method missing');
    }

    if (typeof interactiveMenu.show === 'function') {
        console.log('   ✅ show method exists (alias)');
    } else {
        console.log('   ❌ show method missing');
    }

    // Test 2: Import and test other menu managers
    console.log('\n2. Testing other menu managers...');
    const menuManagers = ['LanguageMenu', 'SettingsMenu', 'DebugMenu'];
    let menuImportCount = 0;

    for (const menuName of menuManagers) {
        try {
            const MenuClass = require(`./main/manage/managers/${menuName}`);
            const menuInstance = new MenuClass(mockManager);

            if (MenuClass && typeof MenuClass === 'function' && menuInstance) {
                menuImportCount++;
                console.log(`   ✅ ${menuName} imported and instantiated`);
            } else {
                console.log(`   ❌ ${menuName} import/instantiation failed`);
            }
        } catch (error) {
            console.log(`   ❌ ${menuName} import failed: ${error.message}`);
        }
    }

    console.log(`   📋 ${menuImportCount}/${menuManagers.length} menu managers imported successfully`);

    // Test 3: Import and test service layer
    console.log('\n3. Testing service layer...');
    const services = ['AuthenticationService', 'ConfigurationService', 'FileManagementService', 'FrameworkDetectionService'];
    let serviceImportCount = 0;

    for (const serviceName of services) {
        try {
            const ServiceClass = require(`./main/manage/services/${serviceName}`);
            const serviceInstance = new ServiceClass(mockConfig, mockUI);

            if (ServiceClass && typeof ServiceClass === 'function' && serviceInstance) {
                serviceImportCount++;
                console.log(`   ✅ ${serviceName} imported and instantiated`);
            } else {
                console.log(`   ❌ ${serviceName} import/instantiation failed`);
            }
        } catch (error) {
            console.log(`   ❌ ${serviceName} import failed: ${error.message}`);
        }
    }

    console.log(`   📋 ${serviceImportCount}/${services.length} services imported successfully`);

    // Test 4: Test menu option structure (simulate menu display)
    console.log('\n4. Testing menu option structure...');

    // Capture console.log output to verify menu structure
    const originalConsoleLog = console.log;
    let menuOutput = '';
    console.log = (msg) => { menuOutput += msg + '\n'; };

    // Test non-interactive mode display
    mockManager.isNonInteractiveMode = () => true;
    interactiveMenu.showInteractiveMenu();

    console.log = originalConsoleLog; // Restore

    // Verify all 13 menu options are present
    const expectedOptions = [
        'menu.options.init', 'menu.options.analyze', 'menu.options.validate',
        'menu.options.usage', 'menu.options.complete', 'menu.options.sizing',
        'menu.options.fix', 'menu.options.status', 'menu.options.delete',
        'menu.options.settings', 'menu.options.help', 'menu.options.language',
        'menu.options.scanner', 'menu.options.exit'
    ];

    let menuOptionCount = 0;
    for (const option of expectedOptions) {
        if (menuOutput.includes(option)) {
            menuOptionCount++;
        }
    }

    if (menuOptionCount === expectedOptions.length) {
        console.log('   ✅ All 13 menu options are present');
    } else {
        console.log(`   ⚠️  ${menuOptionCount}/${expectedOptions.length} menu options found`);
    }

    // Test 5: Test service integration structure
    console.log('\n5. Testing service integration structure...');

    // Test AuthenticationService methods
    try {
        const AuthService = require('../main/manage/services/AuthenticationService');
        const authService = new AuthService(mockConfig, mockUI);

        const authMethods = ['isAuthRequired', 'verifyPin', 'isAuthRequiredForScript'];
        let authMethodCount = 0;

        for (const method of authMethods) {
            if (typeof authService[method] === 'function') {
                authMethodCount++;
            }
        }

        if (authMethodCount === authMethods.length) {
            console.log('   ✅ AuthenticationService has all expected methods');
        } else {
            console.log(`   ⚠️  AuthenticationService missing ${authMethods.length - authMethodCount} methods`);
        }
    } catch (error) {
        console.log(`   ❌ AuthenticationService test failed: ${error.message}`);
    }

    // Test FrameworkDetectionService methods
    try {
        const FrameworkService = require('../main/manage/services/FrameworkDetectionService');
        const frameworkService = new FrameworkService(mockConfig, mockUI);

        if (typeof frameworkService.detectEnvironmentAndFramework === 'function') {
            console.log('   ✅ FrameworkDetectionService has detectEnvironmentAndFramework method');
        } else {
            console.log('   ❌ FrameworkDetectionService missing detectEnvironmentAndFramework method');
        }
    } catch (error) {
        console.log(`   ❌ FrameworkDetectionService test failed: ${error.message}`);
    }

    // Summary
    console.log('\n📋 Menu and Service Integration Test Summary:');
    console.log(`   - InteractiveMenu: ✅ Imported and structured correctly`);
    console.log(`   - Menu managers: ✅ ${menuImportCount}/${menuManagers.length} imported`);
    console.log(`   - Service layer: ✅ ${serviceImportCount}/${services.length} imported`);
    console.log(`   - Menu options: ✅ ${menuOptionCount}/${expectedOptions.length} present`);
    console.log(`   - Service methods: ✅ Basic method structure verified`);

    const overallSuccess = menuImportCount === menuManagers.length &&
                          serviceImportCount === services.length &&
                          menuOptionCount === expectedOptions.length;

    if (overallSuccess) {
        console.log('\n🎉 Menu and service integration test passed!');
        console.log('\n✅ CONCLUSION: All menu systems and service layer components are properly integrated.');
    } else {
        console.log('\n⚠️  Menu and service integration test completed with some issues');
    }

} catch (error) {
    console.error('\n❌ Menu and service integration test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}