# I18N Management Toolkit - Configuration Guide

**Version:** 1.6.3  
**Last Updated:** 27/07/2025  
**Maintainer:** Vladimir Noskov  

## 📋 Overview

This guide provides comprehensive information about configuring the I18N Management Toolkit for optimal performance and functionality in your project.

## 🔧 Configuration Files

### Primary Configuration Files

#### `user-config.json`
**Location:** Project root directory  
**Purpose:** User-specific settings and preferences  
**Auto-generated:** Yes (on first run)  

```json
{
  "version": "1.6.3",
  "lastUpdated": "2025-07-27",
  "project": {
    "name": "My Project",
    "type": "react",
    "framework": "react-i18next"
  },
  "directories": {
    "source": "./src",
    "locales": "./locales",
    "reports": "./i18ntk-reports",
    "backups": "./backups"
  },
  "languages": {
    "default": "en",
    "supported": ["en", "es", "fr", "de", "ru"],
    "fallback": "en"
  },
  "features": {
    "autoTranslate": false,
    "autoValidate": true,
    "autoBackup": true,
    "strictMode": false
  },
  "translation": {
    "provider": "google",
    "apiKey": "",
    "batchSize": 50,
    "rateLimit": 100
  },
  "validation": {
    "strict": true,
    "autoFix": false,
    "checkSyntax": true,
    "checkConsistency": true,
    "checkCompleteness": true
  },
  "reporting": {
    "format": "html",
    "includeCharts": true,
    "includeStatistics": true,
    "autoOpen": false
  },
  "ui": {
    "language": "en",
    "theme": "default",
    "showProgress": true,
    "verboseOutput": false
  }
}
```

#### `admin-config.json`
**Location:** Project root directory  
**Purpose:** Administrative settings and security configuration  
**Auto-generated:** Yes (when admin features are enabled)  

```json
{
  "version": "1.6.3",
  "lastUpdated": "2025-07-27",
  "security": {
    "adminMode": false,
    "encryptionEnabled": true,
    "securityLevel": "standard",
    "sessionTimeout": 3600,
    "maxLoginAttempts": 3
  },
  "backup": {
    "enabled": true,
    "retention": 30,
    "compression": true,
    "location": "./backups"
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "auditTrail": true,
    "maxLogSize": "10MB",
    "logRotation": true
  },
  "api": {
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 60,
      "burstLimit": 10
    },
    "cors": {
      "enabled": false,
      "origins": []
    }
  },
  "maintenance": {
    "autoCleanup": true,
    "cleanupInterval": "24h",
    "tempFileRetention": "1h"
  }
}
```

### Package Configuration

#### `package.json` Integration
**Required Scripts:** Already configured in package.json  

```json
{
  "scripts": {
    "i18ntk": "node main/i18ntk-manage.js",
    "i18ntk:init": "node main/i18ntk-init.js",
    "i18ntk:analyze": "node main/i18ntk-analyze.js",
    "i18ntk:validate": "node main/i18ntk-validate.js",
    "i18ntk:usage": "node main/i18ntk-usage.js",
    "i18ntk:complete": "node main/i18ntk-complete.js",
    "i18ntk:sizing": "node main/i18ntk-sizing.js",
    "i18ntk:summary": "node main/i18ntk-summary.js",
    "i18ntk:autorun": "node main/i18ntk-autorun.js"
  }
}
```

## 🌍 Environment Variables

### Core Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|----------|
| `I18N_SOURCE_DIR` | Source directory path | `./src` | `./app/src` |
| `I18N_LOCALES_DIR` | Locales directory path | `./locales` | `./public/locales` |
| `I18N_DEFAULT_LANG` | Default language code | `en` | `en-US` |
| `I18N_SUPPORTED_LANGS` | Supported languages (comma-separated) | `en,es,fr,de` | `en,es,fr,de,ru,ja` |
| `I18N_FRAMEWORK` | i18n framework | `react-i18next` | `vue-i18n` |
| `I18N_STRICT_MODE` | Enable strict validation | `false` | `true` |
| `I18N_AUTO_BACKUP` | Enable automatic backups | `true` | `false` |
| `I18N_REPORT_FORMAT` | Default report format | `html` | `json` |
| `I18N_UI_LANGUAGE` | UI language | `en` | `es` |
| `I18N_VERBOSE` | Enable verbose output | `false` | `true` |

### Translation Service Variables

| Variable | Description | Required | Provider |
|----------|-------------|----------|----------|
| `GOOGLE_TRANSLATE_API_KEY` | Google Translate API key | For Google Translate | Google |
| `DEEPL_API_KEY` | DeepL API key | For DeepL | DeepL |
| `OPENAI_API_KEY` | OpenAI API key | For AI translation | OpenAI |
| `AZURE_TRANSLATOR_KEY` | Azure Translator key | For Azure | Microsoft |
| `AWS_TRANSLATE_ACCESS_KEY` | AWS Translate access key | For AWS | Amazon |
| `AWS_TRANSLATE_SECRET_KEY` | AWS Translate secret key | For AWS | Amazon |

### Security Variables

| Variable | Description | Default | Security Level |
|----------|-------------|---------|----------------|
| `I18N_ADMIN_MODE` | Enable admin features | `false` | High |
| `I18N_ENCRYPTION_KEY` | Encryption key for sensitive data | Auto-generated | High |
| `I18N_SESSION_SECRET` | Session secret key | Auto-generated | Medium |
| `I18N_AUDIT_LOGGING` | Enable audit logging | `true` | Medium |
| `I18N_SECURE_MODE` | Enable secure mode | `false` | High |

## 🏗️ Framework-Specific Configuration

### React i18next Configuration

#### Required Dependencies
```json
{
  "dependencies": {
    "react-i18next": "^15.6.1",
    "i18next": "^23.0.0"
  }
}
```

#### Framework Detection
The toolkit automatically detects React i18next by:
- Checking `package.json` dependencies
- Looking for `i18next` configuration files
- Scanning for React i18next usage patterns

#### Configuration Example
```javascript
// i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: require('./locales/en/common.json')
      }
    }
  });

export default i18n;
```

### Vue i18n Configuration

#### Required Dependencies
```json
{
  "dependencies": {
    "vue-i18n": "^9.0.0"
  }
}
```

#### Configuration Example
```javascript
// i18n.js
import { createI18n } from 'vue-i18n';

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: require('./locales/en/common.json')
  }
});

export default i18n;
```

### Angular i18n Configuration

#### Required Dependencies
```json
{
  "dependencies": {
    "@angular/localize": "^16.0.0"
  }
}
```

#### Configuration Example
```json
// angular.json
{
  "projects": {
    "app": {
      "i18n": {
        "sourceLocale": "en",
        "locales": {
          "es": "src/locales/es.json",
          "fr": "src/locales/fr.json"
        }
      }
    }
  }
}
```

## 📁 Directory Structure Configuration

### Recommended Structure

```
project-root/
├── src/                          # Source code directory
│   ├── components/
│   ├── pages/
│   └── utils/
├── locales/                      # Translation files
│   ├── en/
│   │   ├── common.json
│   │   ├── auth.json
│   │   └── validation.json
│   ├── es/
│   ├── fr/
│   └── de/
├── i18ntk-reports/              # Generated reports
│   ├── analysis/
│   ├── validation/
│   ├── usage/
│   ├── sizing/
│   └── summary/
├── backups/                     # Configuration backups
├── docs/                        # Documentation
├── user-config.json             # User configuration
├── admin-config.json            # Admin configuration
└── package.json
```

### Custom Directory Configuration

```json
{
  "directories": {
    "source": "./app/src",           # Custom source directory
    "locales": "./public/i18n",      # Custom locales directory
    "reports": "./reports/i18n",     # Custom reports directory
    "backups": "./data/backups",     # Custom backups directory
    "temp": "./tmp",                # Temporary files directory
    "logs": "./logs"                # Log files directory
  }
}
```

## 🔍 Validation Configuration

### Validation Rules

```json
{
  "validation": {
    "strict": true,                 # Enable strict validation
    "autoFix": false,              # Auto-fix common issues
    "rules": {
      "syntax": {
        "enabled": true,
        "checkJSON": true,
        "checkYAML": true,
        "allowComments": false
      },
      "consistency": {
        "enabled": true,
        "checkKeys": true,
        "checkValues": true,
        "caseSensitive": true
      },
      "completeness": {
        "enabled": true,
        "requireAllKeys": true,
        "allowEmpty": false,
        "threshold": 95
      },
      "quality": {
        "enabled": true,
        "checkLength": true,
        "maxLength": 500,
        "checkSpecialChars": true,
        "checkEncoding": true
      }
    },
    "ignore": {
      "files": ["test.json", "temp.json"],
      "keys": ["debug.*", "temp.*"],
      "patterns": ["*.test.json"]
    }
  }
}
```

## 📊 Reporting Configuration

### Report Settings

```json
{
  "reporting": {
    "format": "html",              # Default format: html, json, csv, pdf
    "template": "default",         # Report template
    "includeCharts": true,         # Include visual charts
    "includeStatistics": true,     # Include statistical data
    "includeDetails": true,        # Include detailed information
    "autoOpen": false,             # Auto-open reports in browser
    "compression": true,           # Compress large reports
    "retention": 30,               # Days to keep reports
    "customFields": [              # Custom report fields
      "projectName",
      "version",
      "buildDate"
    ],
    "export": {
      "enabled": true,
      "formats": ["html", "json", "csv"],
      "location": "./exports"
    }
  }
}
```

### Chart Configuration

```json
{
  "charts": {
    "enabled": true,
    "library": "chartjs",          # Chart library: chartjs, d3, plotly
    "theme": "default",            # Chart theme
    "colors": {
      "primary": "#007bff",
      "secondary": "#6c757d",
      "success": "#28a745",
      "warning": "#ffc107",
      "danger": "#dc3545"
    },
    "types": {
      "completeness": "pie",       # Chart type for completeness
      "progress": "bar",           # Chart type for progress
      "trends": "line",            # Chart type for trends
      "distribution": "doughnut"   # Chart type for distribution
    }
  }
}
```

## 🔄 Workflow Configuration

### Automated Workflow Settings

```json
{
  "workflow": {
    "enabled": true,
    "schedule": {
      "enabled": false,
      "cron": "0 2 * * *",          # Daily at 2 AM
      "timezone": "UTC"
    },
    "steps": [
      {
        "name": "analyze",
        "enabled": true,
        "config": {
          "detailed": true,
          "threshold": 90
        }
      },
      {
        "name": "validate",
        "enabled": true,
        "config": {
          "strict": true,
          "autoFix": false
        }
      },
      {
        "name": "usage",
        "enabled": true,
        "config": {
          "checkUnused": true,
          "checkMissing": true
        }
      },
      {
        "name": "complete",
        "enabled": false,
        "config": {
          "auto": false,
          "provider": "google"
        }
      },
      {
        "name": "summary",
        "enabled": true,
        "config": {
          "format": "html",
          "includeCharts": true
        }
      }
    ],
    "notifications": {
      "enabled": false,
      "email": {
        "enabled": false,
        "recipients": [],
        "smtp": {}
      },
      "webhook": {
        "enabled": false,
        "url": "",
        "method": "POST"
      }
    }
  }
}
```

## 🔐 Security Configuration

### Security Settings

```json
{
  "security": {
    "encryption": {
      "enabled": true,
      "algorithm": "aes-256-gcm",
      "keyDerivation": "pbkdf2",
      "iterations": 100000
    },
    "authentication": {
      "enabled": false,
      "method": "local",            # local, oauth, ldap
      "sessionTimeout": 3600,
      "maxAttempts": 3,
      "lockoutDuration": 900
    },
    "authorization": {
      "enabled": false,
      "roles": ["admin", "user", "viewer"],
      "permissions": {
        "admin": ["*"],
        "user": ["read", "write"],
        "viewer": ["read"]
      }
    },
    "audit": {
      "enabled": true,
      "logLevel": "info",
      "includeData": false,
      "retention": 90
    }
  }
}
```

## 🎨 UI Configuration

### User Interface Settings

```json
{
  "ui": {
    "language": "en",              # UI language
    "theme": "default",            # UI theme: default, dark, light
    "dateFormat": "YYYY-MM-DD",    # Date format
    "timeFormat": "HH:mm:ss",      # Time format
    "timezone": "UTC",             # Timezone
    "pagination": {
      "enabled": true,
      "pageSize": 50,
      "maxPages": 100
    },
    "progress": {
      "enabled": true,
      "style": "bar",              # bar, spinner, dots
      "showPercentage": true,
      "showETA": true
    },
    "notifications": {
      "enabled": true,
      "position": "top-right",     # Position for notifications
      "duration": 5000,            # Duration in milliseconds
      "sound": false
    }
  }
}
```

## 🔧 Performance Configuration

### Performance Optimization

```json
{
  "performance": {
    "caching": {
      "enabled": true,
      "ttl": 3600,                 # Cache TTL in seconds
      "maxSize": "100MB",          # Maximum cache size
      "strategy": "lru"            # Cache strategy: lru, fifo, lfu
    },
    "concurrency": {
      "maxWorkers": 4,             # Maximum worker threads
      "batchSize": 100,            # Batch processing size
      "timeout": 30000             # Operation timeout in ms
    },
    "memory": {
      "maxHeapSize": "512MB",      # Maximum heap size
      "gcInterval": 60000,         # Garbage collection interval
      "monitoring": true           # Enable memory monitoring
    },
    "io": {
      "bufferSize": 8192,          # I/O buffer size
      "maxFileSize": "10MB",       # Maximum file size
      "compression": true          # Enable compression
    }
  }
}
```

## 📝 Configuration Validation

### Validation Rules

The toolkit automatically validates configuration files on startup:

1. **Schema Validation** - Ensures all required fields are present
2. **Type Validation** - Checks data types for all fields
3. **Range Validation** - Validates numeric ranges and limits
4. **Path Validation** - Verifies directory and file paths exist
5. **Dependency Validation** - Checks for required dependencies

### Configuration Errors

Common configuration errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid source directory` | Directory doesn't exist | Create directory or update path |
| `Missing API key` | Translation service key not set | Add API key to environment variables |
| `Invalid language code` | Unsupported language code | Use ISO 639-1 language codes |
| `Permission denied` | Insufficient file permissions | Update file/directory permissions |
| `Invalid JSON syntax` | Malformed configuration file | Fix JSON syntax errors |

## 🔄 Configuration Migration

### Version Migration

When upgrading to version 1.4.6, the toolkit automatically:

1. **Backs up** existing configuration files
2. **Migrates** settings to new format
3. **Validates** migrated configuration
4. **Reports** any migration issues

### Manual Migration

For manual migration:

```bash
# Backup current configuration
npm run i18ntk:settings -- --export ./config-backup.json

# Reset to defaults
npm run i18ntk:settings -- --reset

# Import backed up settings
npm run i18ntk:settings -- --import ./config-backup.json
```

---

**Note:** This configuration guide is maintained for version 1.4.6. For the latest configuration options, refer to the [API Reference](./API_REFERENCE.md) and [Components Documentation](./COMPONENTS.md).