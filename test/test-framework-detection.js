const { detectFramework } = require('../utils/framework-detector');
const path = require('path');

async function testFrameworkDetection() {
  const testProjects = [
    'test-projects/vue-project',
    'test-projects/react-project', 
    'test-projects/python-project',
    'test-projects/java-project',
    'test-projects/php-project',
    'test-projects/go-project'
  ];

  console.log('Testing framework detection across different project types:\n');

  for (const projectPath of testProjects) {
    try {
      const fullPath = path.resolve(projectPath);
      console.log(`Testing: ${projectPath}`);
      const framework = await detectFramework(fullPath);
      
      if (framework) {
        console.log(`  ✓ Detected: ${framework.name} (confidence: ${framework.confidence})`);
        console.log(`  Version: ${framework.version}`);
        console.log(`  Framework ID: ${framework.id}`);
      } else {
        console.log(`  ✗ No framework detected`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
    console.log('');
  }
}

if (require.main === module) {
  testFrameworkDetection();
}

module.exports = { testFrameworkDetection };