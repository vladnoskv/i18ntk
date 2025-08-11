# Enhanced Testing Guide

## Overview
The enhanced test suite provides comprehensive testing capabilities for the i18n Management Toolkit, including performance, security, edge cases, and all CLI commands.

## Available Test Scripts

### Quick Start
```bash
# Run the complete enhanced test suite
npm run test:local

# Run comprehensive testing (includes integration tests)
npm run test:comprehensive
```

### Individual Test Categories

#### Basic Testing
- `npm run test:local` - Complete enhanced test suite
- `npm run test:enhanced` - Alias for test:local

#### Performance Testing
- `npm run test:performance` - Performance benchmarks with large datasets
- `npm run test:memory` - Memory usage analysis and optimization testing

#### Security Testing
- `npm run test:security` - Security feature validation including PIN protection and path validation

#### Edge Cases
- `npm run test:edge-cases` - Tests with special characters, Unicode, nested structures, and malformed data

#### Script Validation
- `npm run test:all-scripts` - Tests all utility scripts
- `npm run test:bin-scripts` - Tests all CLI bin scripts

#### Package Validation
- `npm run validate:package` - Quick package validation without full testing

## Test Structure

### Test Categories
1. **Installation Tests** - Package installation and resolution
2. **CLI Command Tests** - All bin scripts and their help commands
3. **Basic Functionality** - Core features (init, analyze, validate)
4. **Performance Tests** - Large dataset processing (1000+ keys)
5. **Security Tests** - PIN protection and path validation
6. **Edge Case Tests** - Special characters, Unicode, nested structures
7. **Memory Tests** - Memory usage and garbage collection
8. **Script Tests** - All utility scripts

### Test Projects Created
The test suite creates several test projects:
- `test-i18ntk-local/test-projects/basic/` - Basic functionality tests
- `test-i18ntk-local/test-projects/performance/` - Performance testing
- `test-i18ntk-local/test-projects/security/` - Security testing
- `test-i18ntk-local/test-projects/edge-cases/` - Edge case testing

## Test Output

### Console Output
- Real-time progress with timestamps
- Success/failure indicators for each test
- Performance metrics and timing
- Memory usage statistics

### Test Report
- Comprehensive JSON report saved to `test-i18ntk-local/test-report.json`
- Includes all test results, performance metrics, and system information

## Cleanup

After testing, you can clean up test artifacts:

```bash
# Manual cleanup (recommended)
node cleanup-test.js

# Or via npm script
npm run test:cleanup-local
```

## Advanced Usage

### Custom Test Execution
```bash
# Run from project directory
node dev/test-local-package.js

# Run with custom test directory
TEST_DIR=my-custom-tests node dev/test-local-package.js
```

### Continuous Integration
The test suite is designed for CI/CD pipelines and provides:
- Exit codes for success/failure
- JSON reports for automated analysis
- Comprehensive logging for debugging

## Troubleshooting

### Common Issues
1. **Permission Errors**: Ensure Node.js has file system access
2. **Memory Issues**: Use `--max-old-space-size=4096` for large datasets
3. **Timeout Issues**: Increase timeout values in test configuration

### Debug Mode
```bash
# Enable verbose logging
DEBUG=i18ntk-test node dev/test-local-package.js
```

## Performance Expectations

### Test Duration
- **Basic Tests**: ~30-60 seconds
- **Performance Tests**: ~2-5 minutes (with large datasets)
- **Comprehensive Suite**: ~5-10 minutes

### Resource Usage
- **Memory**: ~100-200MB during testing
- **Disk**: ~50-100MB for test artifacts
- **Network**: Minimal (only for package resolution)

## Integration with Development Workflow

### Pre-commit Hook
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:local"
    }
  }
}
```

### CI/CD Pipeline
```yaml
# GitHub Actions example
- name: Run Enhanced Tests
  run: npm run test:comprehensive
```

## Best Practices

1. **Regular Testing**: Run `npm run test:local` before releases
2. **Performance Monitoring**: Use `npm run test:performance` for optimization
3. **Security Validation**: Run `npm run test:security` after security changes
4. **Edge Case Coverage**: Test `npm run test:edge-cases` with new features
5. **Memory Profiling**: Monitor with `npm run test:memory` for memory leaks