#!/usr/bin/env node
const fs = require('fs');
const { getUnifiedConfig } = require('../utils/config-helper');

(async () => {
  const config = await getUnifiedConfig('doctor');
  const dirs = {
    projectRoot: config.projectRoot,
    sourceDir: config.sourceDir,
    i18nDir: config.i18nDir,
    outputDir: config.outputDir,
  };

  console.log('i18ntk doctor');
  for (const [name, dir] of Object.entries(dirs)) {
    const exists = fs.existsSync(dir);
    console.log(`${name}: ${dir} ${exists ? '✅' : '❌'}`);
  }
})();
