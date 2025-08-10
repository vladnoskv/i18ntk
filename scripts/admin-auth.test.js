const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AdminAuth = require('../utils/admin-auth');

(async () => {
  const configPath = path.join(process.cwd(), 'settings', '.i18n-admin-config.json');
  const auth = new AdminAuth();

  try {
    for (const pin of ['1234', '12345', '123456']) {
      await auth.setupPin(pin);
      const result = await auth.verifyPin(pin);
      assert.strictEqual(result, true, `${pin.length}-digit PIN should be verified`);
    }
    console.log('admin-auth pin format tests passed');
  } finally {
    await auth.cleanup();
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  }
})();