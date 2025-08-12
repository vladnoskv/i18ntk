
      const fs = require('fs');
      const path = require('path');
      
      const testDir = 'test-i18ntk-local';
      if (fs.existsSync(testDir)) {
        console.log('Cleaning up test directory...');
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log('Cleanup completed');
      } else {
        console.log('Test directory not found');
      }
    