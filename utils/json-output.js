/**
 * JSON Output Utility for i18ntk commands
 * Provides consistent machine-readable output format for CI/CD integration
 */

class JsonOutput {
  constructor(command) {
    this.command = command;
    this.version = this.getPackageVersion();
    this.startTime = Date.now();
    this.data = {
      command: this.command,
      version: this.version,
      status: 'ok',
      stats: {},
      issues: [],
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0
      }
    };
  }

  getPackageVersion() {
    try {
      const packageJson = require('../package.json');
      return packageJson.version;
    } catch (error) {
      return '1.8.1';
    }
  }

  /**
   * Set the overall status
   * @param {'ok'|'warn'|'error'} status 
   */
  setStatus(status) {
    this.data.status = status;
  }

  /**
   * Add statistics to the output
   * @param {Object} stats 
   */
  setStats(stats) {
    this.data.stats = { ...this.data.stats, ...stats };
  }

  /**
   * Add an issue to the output
   * @param {Object} issue 
   */
  addIssue(issue) {
    this.data.issues.push({
      file: issue.file || '',
      key: issue.key || '',
      type: issue.type || 'unknown',
      message: issue.message || '',
      severity: issue.severity || 'info'
    });
  }

  /**
   * Add metadata information
   * @param {Object} metadata 
   */
  addMetadata(metadata) {
    this.data.metadata = { ...this.data.metadata, ...metadata };
  }

  /**
   * Finalize and output the JSON
   */
  output() {
    this.data.metadata.duration = Date.now() - this.startTime;
    
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(this.data, null, 2));
    }
    
    return this.data;
  }

  /**
   * Output error in JSON format
   * @param {Error} error 
   */
  outputError(error) {
    this.setStatus('error');
    this.addIssue({
      type: 'error',
      message: error.message,
      severity: 'error'
    });
    this.output();
  }
}

module.exports = JsonOutput;