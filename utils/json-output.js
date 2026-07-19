const packageJson = require('../package.json');
const { envManager } = require('./env-manager');

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
      return packageJson.version;
    } catch (error) {
      return '1.8.3';
    }
  }

  /**
   * Set the overall status
   * @param {'ok'|'warn'|'error'} status 
   */
  setStatus(status, message) {
    this.data.status = status;
    if (message !== undefined) this.data.message = message;
  }

  /**
   * Add statistics to the output
   * @param {Object} stats 
   */
  setStats(stats) {
    this.data.stats = { ...this.data.stats, ...stats };
  }

  addStats(stats) {
    this.setStats(stats);
  }

  addData(data) {
    this.data.data = { ...(this.data.data || {}), ...(data || {}) };
  }

  getOutput(sortKeys = false) {
    this.data.metadata.duration = Date.now() - this.startTime;
    if (!sortKeys) return this.data;
    const sortObject = value => {
      if (Array.isArray(value)) return value.map(sortObject);
      if (!value || typeof value !== 'object') return value;
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = sortObject(value[key]);
        return result;
      }, {});
    };
    return sortObject(this.data);
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
    const output = this.getOutput();
    
    if (envManager.get('NODE_ENV') !== 'test') {
      console.log(JSON.stringify(output, null, 2));
    }
    
    return output;
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
