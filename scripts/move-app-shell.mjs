// Vercel serves dist/index.html for "/" before any rewrite runs, so the root of a
// business subdomain (the bio page) would never reach api/page.js. With the shell
// renamed, "/" has no file and the rewrites in vercel.json decide what to serve.
import fs from 'node:fs';

fs.renameSync('dist/index.html', 'dist/app.html');
console.log('dist/index.html -> dist/app.html');
