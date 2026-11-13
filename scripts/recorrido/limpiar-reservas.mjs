#!/usr/bin/env node
// Cancela las reservas de prueba que deja el recorrido (clientes de NOMBRES_PRUEBA) en el panel de un negocio.
// Uso: node scripts/recorrido/limpiar-reservas.mjs "<Nombre del negocio>"
import { chromium, PERFIL, SITE } from './comun.mjs';

// Clientes de prueba que usa generar-recorrido.mjs (uno al azar por corrida)
export const NOMBRES_PRUEBA = [['Laura', 'Gómez'], ['Martín', 'Díaz'], ['Sofía', 'Herrera'], ['Lucas', 'Romero'], ['Camila', 'Torres'], ['Julián', 'Paz']];
const RE_PRUEBA = new RegExp(NOMBRES_PRUEBA.map(([n, a]) => `${n} ${a}`).join('|'));

export async function cancelarReservasDePrueba(ctx, p, log = console.log) {
  p.on('dialog', d => d.accept('Reserva de prueba del recorrido').catch(() => {})); // Cancelar pide el motivo con prompt()
  let n = 0;
  for (let i = 0; i < 6; i++) {
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
    await p.locator('button').filter({ hasText: /^Reservas/ }).last().click(); await p.waitForTimeout(1500);
    await p.getByRole('button', { name: 'Próximas' }).click().catch(() => {}); await p.waitForTimeout(1800);
    // las canceladas siguen en la lista: filtra las que esperan confirmación
    await p.locator('button').filter({ hasText: /^Sin confirmar/ }).first().click().catch(() => {}); await p.waitForTimeout(1500);
    const card = p.getByText(RE_PRUEBA).filter({ visible: true }).first();
    if (!(await card.count())) break;
    await card.click(); await p.waitForTimeout(1800);
    const cancel = p.getByRole('button', { name: /^(Cancelar|Cancelar Reserva)$/ }).first();
    if (!(await cancel.count())) { log('no encontré el botón Cancelar'); break; }
    await cancel.click(); await p.waitForTimeout(1500);
    // algunos paneles confirman con un modal propio en vez de prompt()
    const yes = p.getByRole('button', { name: /^(Sí, cancelar|Confirmar cancelación|Cancelar reserva|Sí)$/i }).last();
    if (await yes.count()) { await yes.click().catch(() => {}); }
    await p.waitForTimeout(2500); n++;
  }
  return n;
}

export async function abrirPanel(bizName, opts = {}) {
  const ctx = await chromium.launchPersistentContext(PERFIL, { headless: true, viewport: { width: 1280, height: 860 }, deviceScaleFactor: opts.scale || 2 });
  const s = ctx.pages()[0] || await ctx.newPage();
  await s.goto(`${SITE}/admin/super`, { waitUntil: 'networkidle' }); await s.waitForTimeout(1500);
  if (!/\/admin\/super/.test(s.url())) { await ctx.close(); throw new Error('la sesión del SuperAdmin venció: corré sesion-superadmin.mjs'); }
  await s.getByRole('button', { name: /^Negocios/ }).first().click(); await s.waitForTimeout(1200);
  await s.getByPlaceholder(/Buscar negocio/).fill(bizName); await s.waitForTimeout(1500);
  const [p] = await Promise.all([ctx.waitForEvent('page'), s.getByRole('button', { name: /Abrir Portal/ }).first().click()]);
  await p.setViewportSize({ width: 390, height: 844 });
  if (opts.init) await p.addInitScript(opts.init);
  await p.waitForLoadState('networkidle'); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  return { ctx, p };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('limpiar-reservas.mjs')) {
  const name = process.argv[2];
  if (!name) { console.error('Uso: node scripts/recorrido/limpiar-reservas.mjs "<Nombre del negocio>"'); process.exit(1); }
  const { ctx, p } = await abrirPanel(name);
  const n = await cancelarReservasDePrueba(ctx, p);
  console.log(`· ${n} reserva(s) de prueba cancelada(s) en ${name}`);
  await ctx.close();
}
