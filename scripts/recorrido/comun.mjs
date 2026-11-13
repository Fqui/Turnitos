// Cosas compartidas por los scripts del recorrido.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

export const SITE = 'https://www.turnitoslr.com';
// Perfil del navegador con la sesión del SuperAdmin (queda solo en esta PC, fuera del repo)
export const PERFIL = path.join(process.env.LOCALAPPDATA || os.homedir(), 'turnitos-recorrido', 'perfil-superadmin');

// Playwright del proyecto, o el que dejó npx en la caché
function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch { /* sigue */ }
  const roots = [path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx'), path.join(os.homedir(), '.npm', '_npx')].filter(d => d && fs.existsSync(d));
  const found = roots.flatMap(d => fs.readdirSync(d).map(x => path.join(d, x, 'node_modules', 'playwright')))
    .filter(d => fs.existsSync(path.join(d, 'package.json')))
    .map(d => ({ d, v: JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')).version }))
    .filter(x => !x.v.includes('alpha'))
    .sort((a, b) => b.v.localeCompare(a.v, undefined, { numeric: true }));
  if (!found.length) throw new Error('No encuentro Playwright. Corré una vez: npx playwright@latest --version');
  return req(found[0].d);
}
const pw = loadPlaywright();
export const chromium = pw.chromium;
export const devices = pw.devices;
