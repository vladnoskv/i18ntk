const ultraSettings = {
  processing: {
    batchSize: 500,
    concurrency: 12,
    timeout: 10000,
    retryAttempts: 1,
    maxFileSize: 1048576,
    validateOnLoad: false,
    cacheTTL: 300000,
    fileFilter: "**/*.json"
  },
  backup: {
    enabled: false,
    directory: "backups",
    maxBackups: 3,
    compression: true
  }
};

const extremeSettings = {
  processing: {
    batchSize: 1000,
    concurrency: 16,
    timeout: 8000,
    retryAttempts: 0,
    maxFileSize: 524288,
    validateOnLoad: false,
    cacheTTL: 600000,
    fileFilter: "**/*.json"
  },
  backup: {
    enabled: false,
    directory: "backups",
    maxBackups: 1,
    compression: false
  }
};

module.exports = { ultraSettings, extremeSettings };