# Contributing to i18n Management Toolkit

**Version:** 1.6.0 | **GitHub:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

Thank you for contributing! This toolkit is a zero-dependency, high-performance i18n management system.

## 🚀 Quick Setup

```bash
git clone https://github.com/vladnoskv/i18ntk.git
cd i18ntk
npm install
npm test
```

## 📋 Contribution Guidelines

### Commit Convention
Use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(i18n): add Portuguese support
fix(security): resolve path validation
docs(readme): update installation steps
```

### Pull Request Process
1. Create feature branch: `git checkout -b feature/name`
2. Run tests: `npm test && npm run security:check`
3. Push and create PR
4. Ensure 80%+ test coverage

### Testing
```bash
npm test                    # All tests
npm run benchmark          # Performance tests
npm run security:audit     # Security scan
npm run security:fix       # Auto-fix issues
```

## 🔒 Security
- **Never commit secrets** - Use environment variables
- **Input validation** - All inputs must be sanitized
- **Report vulnerabilities** - Email maintainers privately

## 🌍 Translation Contributions

### Adding Languages
1. Add files: `ui-locales/[language-code]/`
2. Update all 8 language packs
3. Test thoroughly

### Documentation
- Keep examples current
- Update screenshots
- Maintain cross-references

## 📊 Performance Standards
- **Target:** <50ms for 200k keys
- **Memory:** <2MB usage
- **Zero dependencies** maintained

## 🆘 Support
- **Issues:** GitHub Issues
- **Security:** Email maintainers
- **Questions:** GitHub Discussions

---
*Zero runtime dependencies • 97% performance improvement • Enterprise-grade security*