'use strict';

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('./security');

const EXTENSIONS = {
  markdown: '.md',
  md: '.md',
  json: '.json',
  text: '.txt',
  txt: '.txt',
};

function normalizeReportFormat(format) {
  const normalized = String(format || 'markdown').trim().toLowerCase();
  if (normalized === 'md') return 'markdown';
  if (normalized === 'txt') return 'text';
  return Object.prototype.hasOwnProperty.call(EXTENSIONS, normalized) ? normalized : 'markdown';
}

function extensionForReportFormat(format) {
  return EXTENSIONS[normalizeReportFormat(format)] || '.md';
}

function buildReportFile(baseName, format) {
  const safeBase = String(baseName || 'i18ntk-report').replace(/[^\w.-]/g, '_').replace(/\.+$/g, '') || 'i18ntk-report';
  return {
    fileName: `${safeBase}${extensionForReportFormat(format)}`,
    format: normalizeReportFormat(format),
  };
}

function objectToMarkdown(value, heading = 'Report', depth = 0) {
  if (depth === 0) {
    return [`# ${heading}`, '', objectToMarkdown(value, heading, depth + 1)].join('\n').trimEnd();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '- (none)';
    return value.map(item => {
      if (item && typeof item === 'object') {
        return `- ${JSON.stringify(item)}`;
      }
      return `- ${String(item)}`;
    }).join('\n');
  }

  if (value && typeof value === 'object') {
    const lines = [];
    for (const [key, item] of Object.entries(value)) {
      if (item && typeof item === 'object') {
        lines.push(`${'#'.repeat(Math.min(depth + 1, 6))} ${key}`);
        lines.push('');
        lines.push(objectToMarkdown(item, key, depth + 1));
        lines.push('');
      } else {
        lines.push(`- **${key}:** ${String(item)}`);
      }
    }
    return lines.join('\n').trimEnd();
  }

  return String(value ?? '');
}

function formatReportContent(report, format = 'markdown', options = {}) {
  const normalized = normalizeReportFormat(format);

  if (normalized === 'json') {
    const payload = typeof report === 'string' ? { report } : report;
    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  if (typeof report === 'string') {
    return report.endsWith('\n') ? report : `${report}\n`;
  }

  if (normalized === 'text') {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  return `${objectToMarkdown(report, options.title || 'I18NTK Report')}\n`;
}

async function writeReportFile(outputDir, baseName, report, options = {}) {
  const format = normalizeReportFormat(options.format);
  const { fileName } = buildReportFile(baseName, format);
  const resolvedOutputDir = path.resolve(outputDir || './i18ntk-reports');
  const reportPath = path.join(resolvedOutputDir, fileName);
  const validatedOutputDir = SecurityUtils.validatePath(resolvedOutputDir, process.cwd());
  if (!validatedOutputDir) {
    throw new Error(`Invalid report output directory: ${outputDir}`);
  }
  fs.mkdirSync(validatedOutputDir, { recursive: true });
  const content = formatReportContent(report, format, options);
  const success = await SecurityUtils.safeWriteFile(reportPath, content, validatedOutputDir, 'utf8');
  if (!success) {
    throw new Error(`Failed to write report: ${reportPath}`);
  }
  return reportPath;
}

module.exports = {
  buildReportFile,
  extensionForReportFormat,
  formatReportContent,
  normalizeReportFormat,
  writeReportFile,
};
