const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const output = path.join(root, 'dist');

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));

const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) {
  fs.cpSync(assets, path.join(output, 'assets'), { recursive: true });
}

console.log('Build concluído: arquivos publicados em ./dist');
