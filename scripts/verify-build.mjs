// Checks that the production build in dist/ is a complete, installable PWA with both pages.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const problems = [];
const need = (file) => {
  if (!existsSync(join(dist, file))) problems.push(`missing dist/${file}`);
};

['index.html', 'sprachtest.html', 'manifest.webmanifest', 'sw.js', 'logo.svg', 'favicon.ico',
  'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png', 'apple-touch-icon-180x180.png'].forEach(need);

if (!problems.length) {
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
  if (manifest.name !== 'Speed-Mathe') problems.push('manifest name');
  for (const icon of manifest.icons) need(icon.src);

  const index = readFileSync(join(dist, 'index.html'), 'utf8');
  if (!index.includes('manifest.webmanifest')) problems.push('index.html does not link the manifest');
  if (!/<script[^>]+src="[^"]*assets\/[^"]+\.js"/.test(index)) problems.push('index.html has no bundled script');
  if (!index.includes('id="keypad"')) problems.push('index.html is not the game page');

  const sw = readFileSync(join(dist, 'sw.js'), 'utf8');
  for (const page of ['index.html', 'sprachtest.html']) {
    if (!sw.includes(page)) problems.push(`service worker does not precache ${page}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('build verification passed');
