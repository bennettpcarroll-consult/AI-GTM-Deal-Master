// Writes public/version.json before each build. The app compares it with the build id baked into
// its JavaScript, so a tab left open across a deploy reloads instead of running stale code.
import { mkdirSync, writeFileSync } from 'node:fs';

const id = process.env.GITHUB_SHA || `local-${Date.now()}`;
mkdirSync('public', { recursive: true });
writeFileSync('public/version.json', `${JSON.stringify({ id })}\n`);
console.log(`version.json: ${id}`);
