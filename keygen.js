// keygen.js — Developer tool to generate license keys
// Usage: node keygen.js <INSTALL_ID>
// The INSTALL_ID is shown on the license screen when the app is first opened.

const crypto = require('crypto');
const SECRET = 'HC-AMC-2026-WAKEEL-MADINAMEDICAL';

const installId = (process.argv[2] || '').toUpperCase().trim();
if (!installId) {
  console.log('\n  Usage: node keygen.js <INSTALL_ID>');
  console.log('  Example: node keygen.js A1B2C3D4\n');
  process.exit(1);
}

const raw = crypto.createHash('sha256')
  .update(SECRET + installId)
  .digest('hex').substring(0, 16).toUpperCase();

const key = raw.match(/.{4}/g).join('-');

console.log('\n  ┌─────────────────────────────────────┐');
console.log(`  │  Install ID  : ${installId.padEnd(20)} │`);
console.log(`  │  License Key : ${key.padEnd(20)} │`);
console.log('  └─────────────────────────────────────┘\n');
