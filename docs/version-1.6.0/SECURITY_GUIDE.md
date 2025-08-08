# Security Guide: v1.6.0

## 🛡️ **Security Features**

- **Input sanitization** for all user inputs
- **Path validation** preventing directory traversal
- **Translation key validation** ensuring safe key names
- **Memory-safe operations** preventing buffer overflows

## 🔒 **Quick Setup**

```bash
# Run security validation
i18ntk validate --security

# Set up admin PIN
i18ntk admin --setup-pin
```

## 🔧 **Configuration**

```javascript
// .i18ntk.config.js
module.exports = {
  security: {
    adminPinEnabled: true,
    sessionTimeout: 1800000,
    maxFailedAttempts: 3,
    validateInputs: true,
    sanitizePaths: true
  }
};
```

## 🚨 **Security Commands**

```bash
# Security audit
i18ntk audit --security --report-format=json

# Check vulnerabilities
i18ntk check --vulnerabilities --strict
```

---
*See README.md for complete security specifications*