#!/usr/bin/env node
'use strict';

class ReportCommand {
  constructor(config = {}, ui = null) {
    this.config = config;
    this.ui = ui;
  }

  async execute() {
    const reportCli = require('../../i18ntk-report');
    await reportCli.run(process.argv.slice(2));
    return { success: true, command: 'report' };
  }

  getMetadata() {
    return {
      name: 'report',
      description: 'Generate a stable i18ntk JSON, Markdown, or HTML report',
      category: 'analysis',
      aliases: [],
      usage: 'report [--json] [--markdown] [--html] [--out <dir>]',
      examples: [
        'report --json',
        'report --markdown --out=./i18ntk-reports',
        'report --json --markdown --html --out=./i18ntk-reports'
      ]
    };
  }
}

module.exports = ReportCommand;
