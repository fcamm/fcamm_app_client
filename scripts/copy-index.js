const fs = require('fs');
const path = require('path');

const distRoot = path.join(__dirname, '..', 'dist', 'fcamm_editor_front');
const browserRoot = path.join(distRoot, 'browser');
const csrIndex = path.join(browserRoot, 'index.csr.html');
const indexHtml = path.join(browserRoot, 'index.html');

if (!fs.existsSync(csrIndex)) {
  console.error(`Missing ${csrIndex}. Build likely failed or output mode changed.`);
  process.exit(1);
}

fs.copyFileSync(csrIndex, indexHtml);
console.log(`Copied ${csrIndex} -> ${indexHtml}`);
