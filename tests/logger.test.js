const assert = require('assert');
const { describe, test } = require('node:test');

const {
  formatDuration,
  createBuildProgressReporter,
  createWorkerPoolMonitor
} = require('../utils/logger');

describe('Logger Utilities', () => {
  test('formatDuration normalizes ranges', () => {
    assert.strictEqual(formatDuration(12), 'instant');
    assert.strictEqual(formatDuration(120), '120ms');
    assert.strictEqual(formatDuration(1520), '1.5s');
    assert.strictEqual(formatDuration(72000), '1m12s');
  });

  test('build progress reports only at 10% buckets', () => {
    const originalLogLevel = process.env.I18NTK_LOG_LEVEL;
    process.env.I18NTK_LOG_LEVEL = 'info';
    const reporter = createBuildProgressReporter(100);
    const writes = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      writes.push(String(chunk));
      return true;
    };

    try {
      reporter.update(1);
      reporter.update(9);
      reporter.update(10);
      reporter.update(11);
      reporter.update(19);
      reporter.update(20);
    } finally {
      process.env.I18NTK_LOG_LEVEL = originalLogLevel;
      process.stdout.write = originalWrite;
    }

    const buildLines = writes.filter((line) => line.includes('[BUILD]'));
    assert.strictEqual(buildLines.length, 2);
    assert.ok(buildLines[0].includes('10%'));
    assert.ok(buildLines[1].includes('20%'));
  });

  test('worker monitor reports aggregate average', () => {
    const originalLogLevel = process.env.I18NTK_LOG_LEVEL;
    process.env.I18NTK_LOG_LEVEL = 'info';
    const monitor = createWorkerPoolMonitor(2);
    monitor.recordTask(1000);
    monitor.recordTask(1600);

    const writes = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      writes.push(String(chunk));
      return true;
    };

    try {
      const report = monitor.report();
      assert.strictEqual(report.workers, 2);
      assert.strictEqual(report.tasks, 2);
      assert.strictEqual(report.avgSecondsPerTask, 1.3);
    } finally {
      process.env.I18NTK_LOG_LEVEL = originalLogLevel;
      process.stdout.write = originalWrite;
    }

    const workerLine = writes.find((line) => line.includes('[WORKERS]'));
    assert.ok(workerLine);
    assert.ok(workerLine.includes('2 active'));
    assert.ok(workerLine.includes('1.3s/task'));
  });
});
