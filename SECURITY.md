# Security Policy

## Security Advisory: Path Traversal Vulnerability Resolution

### Overview

**Vulnerability:** Path Traversal (Directory Traversal)  
**Severity:** High  
**Status:** **RESOLVED** ✅  
**Affected Versions:** < 1.10.0  
**Fixed Version:** 1.10.0  

### Vulnerability Details

The i18ntk toolkit was vulnerable to directory traversal attacks where unsanitized user input could be used to access files outside the intended directory structure. This affected file system operations in multiple components:

- **File Reading Operations** - `fs.readFileSync()`, `fs.readdirSync()`
- **File Writing Operations** - `fs.writeFileSync()`, `fs.appendFileSync()`
- **Backup Operations** - Backup creation and restoration
- **Translation File Processing** - JSON/PO/MO file handling

### Attack Vector

An attacker could potentially:
- Access sensitive system files using `../../../etc/passwd` patterns
- Write malicious files to arbitrary locations
- Bypass intended directory restrictions
- Potentially execute arbitrary code in certain contexts

### Resolution

**Comprehensive Fix Implemented in v1.10.0:**

1. **SecurityUtils Integration**
   - Added `SecurityUtils.safeSanitizePath()` for all user input sanitization
   - Implemented `SecurityUtils.safeReadFile()` and `SecurityUtils.safeWriteFile()`
   - Integrated path validation in all file operations

2. **Path Validation**
   - All file paths are validated against base directory
   - Prevents directory traversal using `..` sequences
   - Validates symlink targets to prevent symlink attacks
   - Ensures all operations stay within allowed directories

3. **Input Sanitization**
   - All user inputs are sanitized before file operations
   - Special characters and path separators are properly escaped
   - Whitelist-based validation for allowed file extensions

4. **Safe File Operations**
   - Replaced direct `fs` calls with secure wrapper functions
   - Added comprehensive error handling for invalid paths
   - Implemented logging for security-related operations

### Technical Implementation

```javascript
// Before (vulnerable)
const fs = require('fs');
const content = fs.readFileSync(userInputPath);

// After (secure)
const { SecurityUtils } = require('./utils/security');
const safePath = SecurityUtils.safeSanitizePath(userInputPath, baseDir);
const content = SecurityUtils.safeReadFile(safePath);
```

### Files Updated

- `utils/security.js` - Added comprehensive path validation
- `utils/secure-errors.js` - Enhanced error handling with rate limiting
- `i18ntk-backup.js` - Secured backup operations
- `i18ntk-analyze.js` - Secured file analysis operations
- `i18ntk-fixer.js` - Secured file modification operations
- `i18ntk-init.js` - Secured initialization operations

### Security Testing

**Validation Completed:**
- ✅ All path traversal test cases passed
- ✅ Boundary testing for path validation
- ✅ Symlink attack prevention verified
- ✅ Cross-platform compatibility (Windows, macOS, Linux)
- ✅ Zero false positives in security scanning
- ✅ Snyk security audit passed with 0 vulnerabilities
- ✅ Socket Dev 100 score.

### Upgrade Instructions

**Immediate Action Required:**

1. **Update to v1.10.0 or later:**
   ```bash
   npm update i18ntk
   # or
   npm install i18ntk@latest
   ```

2. **Verify Installation:**
   ```bash
   npx i18ntk --version
   npx i18ntk --security-check
   ```

3. **Run Security Validation:**
   ```bash
   npx i18ntk validate --security
   ```

### Security Best Practices

**For Developers:**
- Always use `SecurityUtils` for file operations
- Validate all user inputs before processing
- Implement proper error handling for invalid paths
- Regular security audits using `npx i18ntk --security-check`

**For Users:**
- Keep i18ntk updated to the latest version
- Use strong admin PINs for sensitive operations
- Regular backup verification
- Monitor security logs for unusual activity

### Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Email:** security@i18ntk.dev
2. **GitHub Security:** Use GitHub's security advisory system
3. **Include:** Detailed reproduction steps and impact assessment

### Security Contact

- **Security Team:** security@i18ntk.dev
- **Emergency:** Create a GitHub security issue with "URGENT" in title
- **Updates:** Subscribe to security announcements at github.com/vladnoskv/i18ntk/security

### Acknowledgments

We thank the security research community for responsibly reporting this vulnerability and working with us to ensure a secure resolution.

### Timeline

- **2025-08-15:** Vulnerability discovered and reported
- **2025-08-16:** Fix implemented and tested
- **2025-08-16:** Security patch released in v1.10.0
- **2025-08-16:** Security advisory published

---

**Last Updated:** 2025-08-16  
**Version:** 1.10.0  
**Status:** All security issues resolved ✅