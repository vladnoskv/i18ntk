const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const backupCli = path.resolve(__dirname, '..', 'main', 'i18ntk-backup.js');

function hashContent(content) {
  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function runBackupCli(cwd, args) {
  return spawnSync(process.execPath, [backupCli, ...args], {
    cwd,
    encoding: 'utf8'
  });
}

test('incremental verify compares manifest hashes against reconstructed backup state', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-backup-verify-'));

  try {
    const backupDir = path.join(tempRoot, 'i18ntk-backups');
    const fullName = 'backup-2026-05-21T00-00-00-000Z.json';
    const incName = 'backup-2026-05-21T00-00-01-000Z.json';
    const enV1 = { greeting: 'Hello' };
    const enV2 = { greeting: 'Hallo' };
    const deV1 = { greeting: 'Hallo' };

    writeJson(path.join(backupDir, fullName), {
      _meta: {
        type: 'full',
        parent: null,
        chainDepth: 0,
        hashes: {
          'en.json': hashContent(enV1),
          'de.json': hashContent(deV1)
        }
      },
      'en.json': enV1,
      'de.json': deV1
    });

    writeJson(path.join(backupDir, incName), {
      _meta: {
        type: 'incremental',
        parent: fullName,
        chainDepth: 1,
        hashes: {
          'en.json': hashContent(enV2),
          'de.json': '0'.repeat(64)
        }
      },
      'en.json': enV2
    });

    const result = runBackupCli(tempRoot, ['verify', path.join('i18ntk-backups', incName)]);
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0);
    assert.match(output, /Hash mismatch: de\.json/);
    assert.match(output, /Backup chain verification FAILED/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('backup cleanup preserves full parent chain for kept incrementals', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-backup-cleanup-'));

  try {
    const backupDir = path.join(tempRoot, 'i18ntk-backups');
    const fullName = 'backup-2026-05-21T00-00-00-000Z.json';
    const inc1Name = 'backup-2026-05-21T00-00-01-000Z.json';
    const inc2Name = 'backup-2026-05-21T00-00-02-000Z.json';

    writeJson(path.join(backupDir, fullName), {
      _meta: { type: 'full', parent: null, chainDepth: 0, hashes: {} }
    });
    writeJson(path.join(backupDir, inc1Name), {
      _meta: { type: 'incremental', parent: fullName, chainDepth: 1, hashes: {} }
    });
    writeJson(path.join(backupDir, inc2Name), {
      _meta: { type: 'incremental', parent: inc1Name, chainDepth: 2, hashes: {} }
    });

    const baseTime = new Date('2026-05-21T00:00:00.000Z');
    fs.utimesSync(path.join(backupDir, fullName), baseTime, baseTime);
    fs.utimesSync(path.join(backupDir, inc1Name), new Date(baseTime.getTime() + 1000), new Date(baseTime.getTime() + 1000));
    fs.utimesSync(path.join(backupDir, inc2Name), new Date(baseTime.getTime() + 2000), new Date(baseTime.getTime() + 2000));

    const result = runBackupCli(tempRoot, ['cleanup', '--keep', '1']);
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 0, output);
    assert.equal(fs.existsSync(path.join(backupDir, inc2Name)), true);
    assert.equal(fs.existsSync(path.join(backupDir, inc1Name)), true);
    assert.equal(fs.existsSync(path.join(backupDir, fullName)), true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
