#!/usr/bin/env node

console.error('Refusing to pack or publish the development manifest.');
console.error('Use `npm run publish:public` so the package is staged with package.public.json.');
process.exit(1);
