#!/usr/bin/env node

const AdminAuth = require('../../utils/admin-auth');

(async () => {
  const auth = new AdminAuth();

  // Setup valid PIN and verify
  let result = await auth.setupPin('1234');
  if (!result) {
    console.error('Failed to set up valid PIN');
    process.exit(1);
  }
  result = await auth.verifyPin('1234');
  if (!result) {
    console.error('Valid PIN should pass');
    process.exit(1);
  }

  // Ensure invalid PIN format is rejected
  result = await auth.setupPin('12345');
  if (result) {
    console.error('Five-digit PIN should be rejected');
    process.exit(1);
  }

  // Lockout after repeated failures
  for (let i = 0; i < auth.maxAttempts; i++) {
    await auth.verifyPin('0000');
  }
  if (!auth.isLockedOut('local')) {
    console.error('Should be locked out after max attempts');
    process.exit(1);
  }

  // Clearing attempts removes lockout
  auth.clearFailedAttempts('local');
  if (auth.isLockedOut('local')) {
    console.error('Should not be locked out after clearing attempts');
    process.exit(1);
  }

  // Session creation provides info
  const sessionId = await auth.createSession();
  const info = auth.getCurrentSessionInfo();
  if (!info || info.sessionId !== sessionId) {
    console.error('Session info should be available');
    process.exit(1);
  }

  clearInterval(auth.cleanupInterval);
  console.log('✅ Basic admin PIN edge tests passed');
  process.exit(0);
})();