#!/usr/bin/env node
/**
 * Test script for extracted service functionality
 * This script tests the basic functionality of the extracted services
 */

const path = require('path');

// Test FrameworkDetectionService
async function testFrameworkDetectionService() {
  console.log('🧪 Testing FrameworkDetectionService...');

  try {
    const FrameworkDetectionService = require('../main/manage/services/FrameworkDetectionService');
    const service = new FrameworkDetectionService();

    // Test basic instantiation
    if (!service) {
      throw new Error('Failed to instantiate FrameworkDetectionService');
    }

    // Test method existence
    if (typeof service.detectEnvironmentAndFramework !== 'function') {
      throw new Error('detectEnvironmentAndFramework method not found');
    }

    if (typeof service.getFrameworkSuggestions !== 'function') {
      throw new Error('getFrameworkSuggestions method not found');
    }

    if (typeof service.customGlob !== 'function') {
      throw new Error('customGlob method not found');
    }

    console.log('✅ FrameworkDetectionService basic tests passed');

    // Test framework suggestions
    const suggestions = service.getFrameworkSuggestions('javascript');
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('getFrameworkSuggestions returned invalid result');
    }

    console.log('✅ FrameworkDetectionService framework suggestions test passed');

  } catch (error) {
    console.error('❌ FrameworkDetectionService test failed:', error.message);
    return false;
  }

  return true;
}

// Test FileManagementService
async function testFileManagementService() {
  console.log('🧪 Testing FileManagementService...');

  try {
    const FileManagementService = require('../main/manage/services/FileManagementService');
    const service = new FileManagementService();

    // Test basic instantiation
    if (!service) {
      throw new Error('Failed to instantiate FileManagementService');
    }

    // Test method existence
    if (typeof service.customGlob !== 'function') {
      throw new Error('customGlob method not found');
    }

    if (typeof service.getAllReportFiles !== 'function') {
      throw new Error('getAllReportFiles method not found');
    }

    if (typeof service.getFilesToDeleteKeepLast !== 'function') {
      throw new Error('getFilesToDeleteKeepLast method not found');
    }

    console.log('✅ FileManagementService basic tests passed');

    // Test getAllReportFiles with a non-existent directory
    const files = service.getAllReportFiles('/non-existent-directory');
    if (!Array.isArray(files) || files.length !== 0) {
      throw new Error('getAllReportFiles should return empty array for non-existent directory');
    }

    console.log('✅ FileManagementService file operations test passed');

  } catch (error) {
    console.error('❌ FileManagementService test failed:', error.message);
    return false;
  }

  return true;
}

// Test AuthenticationService
async function testAuthenticationService() {
  console.log('🧪 Testing AuthenticationService...');

  try {
    const AuthenticationService = require('../main/manage/services/AuthenticationService');
    const service = new AuthenticationService();

    // Test basic instantiation
    if (!service) {
      throw new Error('Failed to instantiate AuthenticationService');
    }

    // Test method existence
    if (typeof service.isAuthRequired !== 'function') {
      throw new Error('isAuthRequired method not found');
    }

    if (typeof service.checkAdminAuth !== 'function') {
      throw new Error('checkAdminAuth method not found');
    }

    if (typeof service.parseArgs !== 'function') {
      throw new Error('parseArgs method not found');
    }

    console.log('✅ AuthenticationService basic tests passed');

    // Test parseArgs
    const originalArgv = process.argv;
    process.argv = ['node', 'test.js', '--admin-pin=test123', '--help'];

    const args = service.parseArgs();
    if (args.adminPin !== 'test123' || args.help !== true) {
      throw new Error('parseArgs did not parse arguments correctly');
    }

    // Restore original argv
    process.argv = originalArgv;

    console.log('✅ AuthenticationService argument parsing test passed');

  } catch (error) {
    console.error('❌ AuthenticationService test failed:', error.message);
    return false;
  }

  return true;
}

// Test ConfigurationService
async function testConfigurationService() {
  console.log('🧪 Testing ConfigurationService...');

  try {
    const ConfigurationService = require('../main/manage/services/ConfigurationService');
    const service = new ConfigurationService();

    // Test basic instantiation
    if (!service) {
      throw new Error('Failed to instantiate ConfigurationService');
    }

    // Test method existence
    if (typeof service.initialize !== 'function') {
      throw new Error('initialize method not found');
    }

    if (typeof service.parseArgs !== 'function') {
      throw new Error('parseArgs method not found');
    }

    if (typeof service.getConfig !== 'function') {
      throw new Error('getConfig method not found');
    }

    console.log('✅ ConfigurationService basic tests passed');

    // Test parseArgs
    const originalArgv = process.argv;
    process.argv = ['node', 'test.js', '--source-dir=./test', '--ui-language=en'];

    const args = service.parseArgs();
    if (args.sourceDir !== './test' || args.uiLanguage !== 'en') {
      throw new Error('parseArgs did not parse arguments correctly');
    }

    // Restore original argv
    process.argv = originalArgv;

    console.log('✅ ConfigurationService argument parsing test passed');

  } catch (error) {
    console.error('❌ ConfigurationService test failed:', error.message);
    return false;
  }

  return true;
}

// Test service integration
async function testServiceIntegration() {
  console.log('🧪 Testing service integration...');

  try {
    // Test that services can be imported together
    const FrameworkDetectionService = require('../main/manage/services/FrameworkDetectionService');
    const FileManagementService = require('../main/manage/services/FileManagementService');
    const AuthenticationService = require('../main/manage/services/AuthenticationService');
    const ConfigurationService = require('../main/manage/services/ConfigurationService');

    // Test that all services can be instantiated
    const frameworkService = new FrameworkDetectionService();
    const fileService = new FileManagementService();
    const authService = new AuthenticationService();
    const configService = new ConfigurationService();

    if (!frameworkService || !fileService || !authService || !configService) {
      throw new Error('Failed to instantiate one or more services');
    }

    // Test that services can initialize with a mock config manager
    const mockConfigManager = {
      loadSettings: () => ({}),
      saveSettings: () => Promise.resolve(),
      getConfig: () => ({})
    };

    frameworkService.initialize(mockConfigManager);
    fileService.initialize(mockConfigManager);
    authService.initialize(mockConfigManager);
    configService.initialize(mockConfigManager);

    console.log('✅ Service integration tests passed');

  } catch (error) {
    console.error('❌ Service integration test failed:', error.message);
    return false;
  }

  return true;
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting service extraction tests...\n');

  const results = await Promise.all([
    testFrameworkDetectionService(),
    testFileManagementService(),
    testAuthenticationService(),
    testConfigurationService(),
    testServiceIntegration()
  ]);

  const passed = results.filter(result => result === true).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All service extraction tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testFrameworkDetectionService,
  testFileManagementService,
  testAuthenticationService,
  testConfigurationService,
  testServiceIntegration,
  runTests
};