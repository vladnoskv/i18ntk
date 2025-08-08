# Contributing to i18n Management Toolkit

**Version:** 1.5.2  
**Last Updated:** 2025-08-06  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

Thank you for your interest in contributing to the i18n Management Toolkit! This document provides comprehensive guidelines for contributors, including setup instructions, contribution processes, and community standards.

## Development Setup

### Prerequisites
- Node.js >= 16.0.0
- npm >= 10.0.0
- Git

### Installation
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/vladnoskv/i18ntk.git
   cd i18ntk
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Install git hooks:
   ```bash
   npm run prepare
   ```

## Development Workflow

### Issue and PR Templates

We provide templates to help structure your contributions:

- **Bug Reports**: Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- **Feature Requests**: Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml)
- **Pull Requests**: Use the [PR template](.github/pull_request_template.md)

### Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to enable automated versioning and changelog generation.

**Format:**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(i18n): add Portuguese language support
fix(analyze): resolve MODULE_NOT_FOUND error
docs(readme): update installation instructions
style(ui): improve console output formatting
```

### Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit using conventional commits

3. Run tests:
   ```bash
   npm test
   npm run verify-package
   ```

4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request on GitHub

### Automated Release Process

The project uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning and releases:

- **Patch releases**: Commits with `fix:` type
- **Minor releases**: Commits with `feat:` type
- **Major releases**: Commits with `BREAKING CHANGE:` in footer

### Testing

#### Test Types
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and workflows
- **Security Tests**: Automated security scanning and vulnerability checks
- **E2E Tests**: Complete user journey testing
- **Performance Tests**: Benchmarking and performance regression testing

#### Running Tests
```bash
npm test                        # Run all tests
npm run test:quick              # Run quick tests
npm run test:comprehensive      # Run comprehensive tests
npm run security:check          # Run security checks
npm run security:audit          # Security vulnerability audit
npm run security:fix            # Auto-fix security issues
npm run benchmark               # Run performance benchmarks
npm run benchmark:ci            # Run CI performance tests
npm run benchmark:baseline      # Update performance baselines
```

#### Security Guidelines

##### Security First Development
- **Never commit secrets**: Use environment variables and `.env` files
- **Input validation**: Always validate and sanitize user input
- **Dependency management**: Regularly update dependencies and run security audits
- **Code review**: Security review is part of every PR

##### Security Commands
```bash
# Run comprehensive security audit
npm run security:audit

# Fix security issues automatically
npm run security:fix

# Generate secure configuration
npm run security:config

# Check security status
npm run security:check
```

##### Reporting Security Issues
- **Do not** create public issues for security vulnerabilities
- Email security concerns to the maintainers
- Follow our [Security Policy](SECURITY.md)

### Code Style

- Follow existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure all new code is covered by tests

## Translation Contributions

### Adding New Languages

1. Add language files in `ui-locales/[language-code]/`
3. Update language support documentation
4. Test the new language thoroughly and ensure the same .json file is updated in all 8 languages.

### Updating Translations

1. Use the interactive management tool:
   ```bash
   npm start
   # Navigate to Settings → Language → Select language to update
   ```

### Documentation Contributions

When contributing to documentation:

1. **Accuracy**: Ensure all information is current and accurate
2. **Clarity**: Use clear, concise language
3. **Examples**: Include practical examples where helpful
4. **Links**: Update cross-references and links
5. **Formatting**: Follow markdown best practices
6. **Screenshots**: Update UI screenshots following [UI Screenshot Guide](./docs/screenshots/UI_SCREENSHOT_GUIDE.md)

### Testing Documentation

When adding new features or fixing bugs, ensure:

1. **Test descriptions** are clear and comprehensive
2. **Expected behavior** is documented
3. **Edge cases** are covered
4. **Performance implications** are noted

### Zero Dependencies Architecture

The i18n Management Toolkit has achieved **zero runtime dependencies** for maximum compatibility and performance:

#### Benefits of Zero Dependencies
- **Universal compatibility** - Works with any i18n framework or vanilla JavaScript
- **Faster installation** - No additional packages to download
- **Smaller footprint** - 15.7% package size reduction
- **Enhanced security** - Reduced attack surface
- **Simplified maintenance** - No dependency conflicts or version issues

#### Framework Compatibility
- **React** - Compatible with react-i18next, react-intl, or custom solutions
- **Vue** - Works with vue-i18n or custom implementations
- **Angular** - Compatible with ngx-translate or custom i18n
- **Next.js** - Works with next-i18next or built-in i18n routing
- **Vanilla JavaScript** - Direct usage without framework dependencies

#### Testing Framework Compatibility
When contributing, ensure compatibility across:
- **Node.js** versions 16+ (current LTS and latest)
- **npm** versions 8+
- **Windows**, **macOS**, and **Linux** environments
- **CI/CD environments** (GitHub Actions, GitLab CI, etc.)

### CI/CD Integration

The project includes comprehensive CI/CD workflows:

#### GitHub Actions Workflows
- **Release automation** - Automated versioning and publishing
- **Security scanning** - Vulnerability detection and reporting
- **Performance regression** - Prevents performance degradation
- **Cross-platform testing** - Validates on Windows, macOS, and Linux

#### Performance Benchmarking
- **Automated benchmarking** - Runs on every PR
- **Regression detection** - Fails builds if performance degrades
- **Baseline management** - Tracks performance over time
- **Multi-scale testing** - Tests against various dataset sizes

### UI Documentation

When making UI changes:

1. **Screenshots**: Capture and update relevant screenshots
2. **Consistency**: Follow the screenshot guidelines in [UI Screenshot Guide](./docs/screenshots/UI_SCREENSHOT_GUIDE.md)
3. **Alt Text**: Provide descriptive alt text for accessibility
4. **File Naming**: Use consistent naming conventions
5. **Testing**: Verify all image links work correctly

## Reporting Issues

### Bug Reports

Include:
- i18ntk version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation approach
- Any relevant examples or mockups

## Release Notes

When contributing, be aware that:
- All commits are analyzed for release notes
- Breaking changes must be clearly marked with `BREAKING CHANGE:` in commit footer
- Documentation changes are included in release notes
- Performance improvements are highlighted

## Getting Help

- Check existing [issues](https://github.com/vladnoskv/i18ntk/issues)
- Review [documentation](INDEX.md)
- Join [GitHub Discussions](https://github.com/vladnoskv/i18ntk/discussions)

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We aim to create a welcoming environment for contributors of all experience levels.