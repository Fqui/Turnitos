#!/usr/bin/env node
// Abre una ventana para que Fernando entre al SuperAdmin una sola vez.
// La sesión queda guardada en el perfil de la notebook y la usa generar-recorrido.mjs
// para abrir el panel de cada negocio con "Abrir Portal", sin escribir contraseñas.
// Uso: node scripts/recorrido/sesion-superadmin.mjs
import { chromium, PERFIL, SITE } from './comun.mjs';

const ctx = await chromium.launchPersistentContext(PERFIL, { headless: false, viewport: { width: 1280, height: 860 } });
const p = ctx.pages()[0] || await ctx.newPage();
await p.goto(`${SITE}/login`);
console.log('· Entrá al SuperAdmin en la ventana que se abrió. Espero hasta 15 minutos...');
const t0 = Date.now();
while (Date.now() - t0 < 15 * 60 * 1000) {
  if (p.isClosed()) break;
  if (/\/admin\/super/.test(p.url())) { console.log('· Sesión guardada en', PERFIL); await p.waitForTimeout(3000); break; }
  await p.waitForTimeout(1500);
}
await ctx.close();
