const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const files = ['index.html', 'auth-mock.js', 'app.js', 'styles.css', 'logo.jpg'];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of files) {
  const source = path.join(root, file);
  if (file === 'index.html') {
    const html = fs.readFileSync(source, 'utf8')
      .replaceAll('href="/', 'href="')
      .replaceAll('src="/', 'src="');
    fs.writeFileSync(path.join(output, file), html);
  } else {
    fs.copyFileSync(source, path.join(output, file));
  }
}

console.log('GitHub Pages files are ready in dist/.');
