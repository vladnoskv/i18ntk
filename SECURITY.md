# Security Guide

**Version:** 1.6.0 
**Last Updated:** 2025-08-08  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

This document outlines the security measures and best practices implemented in the i18n Management Toolkit.

## 🔐 PIN / Secret Handling

### Current Implementation
- **Secure Hashing**: Uses `scrypt` (with `pbkdf2` fallback) for password hashing
- **Salt Generation**: 32-byte cryptographically secure random salt for each PIN
- **Constant-Time Comparison**: Prevents timing attacks during PIN verification
- **Weak PIN Detection**: Warns users about common weak PINs

### Security Features
- **Adaptive Hashing**: `scrypt` with N=16384, r=8, p=1 parameters
- **Rate Limiting**: Account locks after 3 failed attempts for 5 minutes
- **Secure Storage**: PINs never stored in plaintext
- **Environment Variables**: Support for reading secrets from environment variables

### Key Lifecycle
1. **Generation**: Created during PIN setup with secure random salt
2. **Storage**: Hashed PIN stored in encrypted JSON file
3. **Rotation**: Manual reset required (PIN forgotten = data inaccessible)
4. **Disposal**: File deletion removes all PIN-related data

## 🔒 AES-256-GCM Encryption

### Implementation Details
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256-bit (32 bytes) cryptographically secure random key
- **IV Generation**: 96-bit (12 bytes) unique random IV per operation
- **Authentication**: 128-bit authentication tag for integrity verification

### Security Measures
- **Unique IVs**: Each encryption operation uses a new random IV
- **AAD (Additional Authenticated Data)**: Version info included for context
- **Key Derivation**: PBKDF2 with SHA-256 for key stretching
- **Forward Secrecy**: Keys are ephemeral and not reused

### Key Management
- **Key Generation**: `crypto.randomBytes(32)` for 256-bit keys
- **Key Storage**: Keys stored encrypted alongside data
- **Key Rotation**: Automatic rotation during PIN changes
- **Key Destruction**: Secure deletion when PIN is reset

## 🛡️ Dependency & Supply Chain Security

### Automated Scanning
- **npm audit**: Runs on every CI build
- **Severity Threshold**: Fails builds on high/critical vulnerabilities
- **Automated Fixes**: `npm audit fix` with breaking change prevention
- **Weekly Scans**: Scheduled vulnerability re-scanning

### Security Policies
- **Package Pinning**: Exact versions in package-lock.json
- **Update Strategy**: Security patches prioritized over feature updates
- **Review Process**: Manual review for major dependency updates
- **Monitoring**: Security advisories monitored via GitHub Dependabot

## 🚨 Security Best Practices

### For Users
1. **Use Strong PINs**: Avoid common patterns, use 6+ characters
2. **Environment Variables**: Store sensitive data in `.env` files (git-ignored)
3. **Regular Updates**: Keep dependencies updated for security patches
4. **Access Control**: Limit admin access to trusted users only

### For Developers
1. **Code Review**: All security-related changes require review
2. **Testing**: Security features tested with unit/integration tests
3. **Documentation**: Security decisions documented in code comments
4. **Incident Response**: Clear process for handling security issues

## 📋 Security Checklist

### Before Deployment
- [ ] Run `npm audit` and address all high/critical issues
- [ ] Verify all secrets use environment variables
- [ ] Test PIN verification with timing attack resistance
- [ ] Review dependency tree for known vulnerabilities

### Regular Maintenance
- [ ] Weekly security scan results review
- [ ] Monitor security advisories for used packages
- [ ] Test backup/restore procedures for encrypted data
- [ ] Review access logs for suspicious activity

## 🔍 Vulnerability Reporting

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: vladno@hotmail.co.uk
3. Provide detailed reproduction steps
4. Allow reasonable time for response before disclosure

## 📚 References

- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)
- [npm Security Best Practices](https://docs.npmjs.com/security)

## 🔧 Security Configuration

### Environment Variables
```bash
# PIN storage location (optional)
I18NTK_PIN_FILE=/secure/path/admin-pin.json

# Master encryption key (for advanced users)
I18NTK_MASTER_KEY=your-256-bit-hex-key

# Security log level
I18NTK_SECURITY_LOG=verbose
```

### Security Headers
When deploying as a web application, implement:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

**Last Updated**: 2025-08-08
**Version**: 1.6.0
**Maintainer**: i18n Management Toolkit Team