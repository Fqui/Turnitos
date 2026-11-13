#!/usr/bin/env node
// Genera el recorrido interactivo de un negocio en public/recorrido/<slug>/
// Uso: node scripts/recorrido/generar-recorrido.mjs <slug> [--sin-panel]
// Lee el negocio de producción (turnitoslr.com), saca capturas, graba los videos
// de reserva, tienda y panel, ubica los recuadros leyendo la página y arma el index.html
// sobre scripts/recorrido/plantilla.html. Ver scripts/recorrido/README.md.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices, PERFIL, SITE } from './comun.mjs';
import { abrirPanel, cancelarReservasDePrueba } from './limpiar-reservas.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const W = 390, H = 844, SHOT_SCALE = 600 / 390, VID_SCALE = 2;

const slug = process.argv[2];
if (!slug || slug.startsWith('-')) {
  console.error('Uso: node scripts/recorrido/generar-recorrido.mjs <slug> [--sin-panel]');
  process.exit(1);
}
// Con la sesión del SuperAdmin guardada (sesion-superadmin.mjs) la reserva del video se confirma
// y se graba el panel; al final la reserva de prueba se cancela. Sin sesión, frena antes de confirmar.
// Solo en negocios de simulación: en uno real la reserva de prueba le llegaría al dueño.
let CON_PANEL = !process.argv.includes('--sin-panel') && fs.existsSync(PERFIL);
const OUT = path.join(ROOT, 'public', 'recorrido', slug);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'recorrido-'));
const log = (...a) => console.log('·', ...a);
// teléfono distinto en cada corrida: la web limita las reservas por teléfono y por día
const TEL = '38049' + String(Math.floor(Math.random() * 1e5)).padStart(5, '0');

// ---------- Datos del negocio ----------
function env() {
  const txt = ['.env.local', '.env'].map(f => path.join(ROOT, f)).filter(fs.existsSync).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const get = k => (txt.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
  return { url: get('VITE_SUPABASE_URL'), key: get('VITE_SUPABASE_ANON_KEY') };
}
async function loadBusiness() {
  const { url, key } = env();
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local');
  const r = await fetch(`${url}/rest/v1/businesses_public?slug=eq.${encodeURIComponent(slug)}&select=*`, { headers: { apikey: key } });
  const [b] = await r.json();
  if (!b) throw new Error(`No existe el negocio ${slug}`);
  return b;
}
const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

function kindOf(b) {
  const t = (b.type || '').toLowerCase();
  if (t === 'sport') return 'canchas';
  if (t === 'alquiler' || t === 'venue') return 'alquiler';
  return 'servicios';
}

// ---------- Utilidades de página ----------
const tapJS = `addEventListener('pointerdown',e=>{const d=document.createElement('div');d.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(62,207,142,.35);border:3px solid #3ECF8E;left:'+e.clientX+'px;top:'+e.clientY+'px;transition:all .5s ease-out;transform:scale(.6);opacity:1';document.documentElement.appendChild(d);requestAnimationFrame(()=>{d.style.transform='scale(1.3)';d.style.opacity='0'});setTimeout(()=>d.remove(),700)},true);`;
const ctxOpts = (dsf) => ({ ...devices['iPhone 13'], viewport: { width: W, height: H }, deviceScaleFactor: dsf });

async function settle(p) {
  for (let y = 0; y < 6000; y += 600) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(200); }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1000);
}
// posición (en px CSS de página) del primer título que empieza con alguno de los textos
async function headTop(p, texts) {
  return p.evaluate((texts) => {
    const el = [...document.querySelectorAll('h1,h2,h3,h4')].find(e => texts.some(t => e.innerText.trim().replace(/^[^\p{L}]+/u, '').toLowerCase().startsWith(t.toLowerCase())));
    return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null;
  }, texts);
}
async function footerTop(p) {
  return p.evaluate(() => { const f = document.querySelector('footer'); return f ? Math.round(f.getBoundingClientRect().top + scrollY) : document.documentElement.scrollHeight; });
}
const spot = (a, b, max = 520) => (a == null ? null : [Math.max(0, a - 14), Math.min(max, Math.max(90, (b ?? a + 300) - a))]);

// Grabación por CDP (cuadros a 2x) y armado con ffmpeg
async function startRec(p, name) {
  const dir = path.join(TMP, name); fs.mkdirSync(dir, { recursive: true });
  const cdp = await p.context().newCDPSession(p); const ts = [];
  cdp.on('Page.screencastFrame', async f => {
    fs.writeFileSync(path.join(dir, String(ts.length).padStart(5, '0') + '.jpg'), Buffer.from(f.data, 'base64'));
    ts.push(f.metadata.timestamp);
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W * VID_SCALE, maxHeight: H * VID_SCALE });
  const t0 = Date.now(); const caps = [];
  return {
    cap: (t) => caps.push([+((Date.now() - t0) / 1000).toFixed(1), t]),
    stop: async (tail = 2.5) => {
      await p.waitForTimeout(tail * 1000);
      await cdp.send('Page.stopScreencast');
      const frames = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
      const end = (Date.now() - t0) / 1000 + ts[0];
      const lines = frames.map((f, i) => `file '${f}'\nduration ${Math.max(0.001, (ts[i + 1] ?? end) - ts[i]).toFixed(4)}`);
      lines.push(`file '${frames.at(-1)}'`);
      fs.writeFileSync(path.join(dir, 'list.txt'), lines.join('\n'));
      const mp4 = path.join(OUT, 'vid', name + '.mp4');
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
        '-vf', `fps=30,scale=${W * VID_SCALE}:${H * VID_SCALE}:force_original_aspect_ratio=decrease,pad=${W * VID_SCALE}:${H * VID_SCALE}:(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p`,
        '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', mp4]);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', '0.3', '-i', mp4, '-frames:v', '1', '-q:v', '3', path.join(OUT, 'vid', name + '.jpg')]);
      return caps;
    },
  };
}
async function smoothTo(p, texts, offset = 110) {
  await p.evaluate(({ texts, offset }) => {
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(e => texts.some(t => e.innerText.includes(t)));
    if (h) scrollTo({ top: h.getBoundingClientRect().top + scrollY - offset, behavior: 'smooth' });
  }, { texts, offset });
  await p.waitForTimeout(1300);
}
async function fillContact(p) {
  const fill = async (re, val) => { const i = p.getByPlaceholder(re).first(); if (await i.count()) { await i.click(); await p.keyboard.type(val, { delay: 80 }); } };
  await fill(/nombre/i, 'Laura'); await fill(/apellido/i, 'Gómez'); await fill(/3804|Ej: 380|tel/i, TEL);
  await p.waitForTimeout(700);
}
const visibleText = (p) => p.evaluate(() => [...document.querySelectorAll('button,h2,h3')].filter(e => e.offsetParent && e.getBoundingClientRect().top < innerHeight && e.getBoundingClientRect().bottom > 0).map(e => e.innerText.trim()).join(' | '));

// Avanza los pasos del modal de reserva. Con CON_PANEL confirma la reserva (para verla en el panel);
// si no, frena en la pantalla de "Confirmar Reserva".
async function advanceModal(p, rec, labels) {
  let filled = false;
  const confirm = async () => {
    if (!CON_PANEL) return;
    await p.waitForTimeout(1500);
    rec.cap('Confirma: ¡turno reservado!'); await p.getByRole('button', { name: /Confirmar Reserva/ }).click();
    await p.waitForTimeout(4500);
    rec.confirmed = !/No pudimos|máximo de reservas|Hubo un error|Error al/i.test(await p.evaluate(() => document.body.innerText));
    if (!rec.confirmed) log('la web no guardó la reserva de prueba (la web permite 5 reservas por día desde la misma conexión): sin video del panel');
  };
  for (let k = 0; k < 6; k++) {
    const txt = await visibleText(p);
    if (/Tus Datos|Datos de Contacto/i.test(txt) && !filled) { rec.cap(labels.datos); await fillContact(p); filled = true; }
    if (/Confirmar Reserva/.test(txt)) {
      if (/Datos de Pago|seña/i.test(txt)) { rec.cap(labels.pago); await p.waitForTimeout(1500); }
      return confirm();
    }
    const nx = p.getByRole('button', { name: /^(Siguiente|Continuar)/ }).last();
    if (!(await nx.count())) return;
    await nx.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await nx.click({ force: true }); await p.waitForTimeout(1600);
    const t2 = await visibleText(p);
    if (/Resumen de Reserva/.test(t2)) { rec.cap(labels.resumen); await p.waitForTimeout(1600); }
    if (/Datos de Pago/.test(t2)) { rec.cap(labels.pago); await p.waitForTimeout(2500); return confirm(); }
  }
}

// Panel del dueño: entra con "Abrir Portal" del SuperAdmin (sesión guardada), muestra la reserva
// de prueba y los mensajes de WhatsApp listos, y al final la cancela (ver limpiar-reservas.mjs).
async function panelFlow(bizName) {
  const { ctx, p } = await abrirPanel(bizName, { scale: VID_SCALE, init: tapJS });
  try {
    p.on('popup', pop => pop.close().catch(() => {}));
    const rec = await startRec(p, 'panel');
    rec.cap('Abrís tu panel'); await p.waitForTimeout(2200);
    rec.cap('Te avisa que hay reservas nuevas'); await p.locator('button').filter({ hasText: /^Reservas/ }).last().click(); await p.waitForTimeout(1800);
    await p.getByRole('button', { name: 'Próximas' }).click().catch(() => {}); await p.waitForTimeout(1500);
    await p.locator('button').filter({ hasText: /^Sin confirmar/ }).first().click().catch(() => {}); await p.waitForTimeout(1500);
    rec.cap('Las que esperan tu confirmación');
    await p.getByText('Laura Gómez').filter({ visible: true }).first().click(); await p.waitForTimeout(2200);
    rec.cap('Ves sus datos y la seña'); await p.waitForTimeout(2500);
    const quick = p.getByRole('button', { name: /Mensajes Rápidos/ }).first();
    const wa = p.getByRole('button', { name: /por WhatsApp/ }).first();
    if (await quick.count()) {
      rec.cap('Mensajes listos para mandarle por WhatsApp'); await quick.click().catch(() => {}); await p.waitForTimeout(3200);
    } else if (await wa.count()) {
      rec.cap('Le escribís por WhatsApp'); await wa.click().catch(() => {}); await p.waitForTimeout(2000);
      const msgs = p.getByText(/MENSAJES PARA EL CLIENTE/i).first();
      if (await msgs.count()) { await msgs.scrollIntoViewIfNeeded().catch(() => {}); rec.cap('Con mensajes listos: seña, confirmación, recordatorio'); await p.waitForTimeout(2600); }
    }
    const caps = await rec.stop(1);
    let n = 0;
    try { n = await cancelarReservasDePrueba(ctx, p, log); } catch (e) { log('no pude cancelar la reserva de prueba:', e.message.slice(0, 120)); }
    log(n ? `reserva de prueba cancelada (${n})` : 'ojo: revisá en el panel que no quede la reserva de prueba de Laura Gómez');
    return caps;
  } finally { await ctx.close(); }
}

// ---------- Flujos de reserva por rubro ----------
const FLOWS = {
  async canchas(p, rec) {
    rec.cap('Entra a la página del club'); await p.waitForTimeout(2000);
    await smoothTo(p, ['Elegí una fecha']);
    rec.cap('Elige el día'); await p.locator('button').filter({ hasText: /Sáb|Vie/ }).first().click(); await p.waitForTimeout(1500);
    rec.cap('Ve solo los horarios libres'); await p.waitForTimeout(800);
    const times = p.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    const n = await times.count(); const t = times.nth(Math.max(0, Math.floor(n * 0.7)));
    await t.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await t.click(); await p.waitForTimeout(1200);
    await smoothTo(p, ['Selección de Cancha', 'Canchas disponibles'], 100);
    rec.cap('Elige cancha y cuánto juega');
    const dur = p.locator('button').filter({ hasText: /90 min/ }).first();
    await ((await dur.count()) ? dur : p.locator('button').filter({ hasText: /min/ }).first()).click(); await p.waitForTimeout(1500);
    const txt = await visibleText(p);
    if (/Sumá a tu reserva/.test(txt)) { rec.cap('Suma algo a su reserva'); await p.locator('[class*=modal] button, [role=dialog] button').filter({ hasText: /^\$|\$/ }).first().click().catch(() => {}); await p.waitForTimeout(1200); }
    await advanceModal(p, rec, { datos: 'Deja su nombre y WhatsApp', resumen: 'Ve el total', pago: 'Paga la seña al alias del club' });
  },
  async servicios(p, rec) {
    rec.cap('Entra a tu página'); await p.waitForTimeout(1800);
    await smoothTo(p, ['Nuestros Servicios'], 90);
    // primer título visible que viene después de "Nuestros Servicios" en el documento
    const box = await p.evaluate(() => {
      const h = [...document.querySelectorAll('h2,h3')].find(e => e.innerText.includes('Nuestros Servicios'));
      const c = [...document.querySelectorAll('h3,h4')].find(e => (h.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) && e.offsetParent && e.getBoundingClientRect().left >= 0 && e.getBoundingClientRect().right <= innerWidth && e.getBoundingClientRect().top > h.getBoundingClientRect().bottom);
      if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await p.waitForTimeout(600);
    rec.cap('Toca el servicio'); if (box) await p.mouse.click(box.x, box.y); await p.waitForTimeout(1800);
    rec.cap('Ve fotos, duración y precio'); await p.waitForTimeout(1500);
    await p.getByRole('button', { name: /Elegir fecha/ }).click(); await p.waitForTimeout(1500);
    rec.cap('Elige el día');
    const days = p.locator('button').filter({ hasText: /^(Lun|Mar|Mié|Jue|Vie|Sáb)\s*\d+$/ });
    await days.nth(Math.min(2, (await days.count()) - 1)).click(); await p.waitForTimeout(1500);
    rec.cap('Solo ve horarios libres');
    const times = p.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    const t = times.nth(Math.min(2, (await times.count()) - 1)); await t.scrollIntoViewIfNeeded(); await t.click(); await p.waitForTimeout(1000);
    const go = p.getByRole('button', { name: /^Continuar/ }).last(); await go.scrollIntoViewIfNeeded(); await go.click(); await p.waitForTimeout(1600);
    const txt = await visibleText(p);
    if (/Sumá a tu reserva/.test(txt)) { rec.cap('Le ofrecés un extra'); await p.waitForTimeout(1500); }
    await advanceModal(p, rec, { datos: 'Deja su nombre y WhatsApp', resumen: 'Ve el total', pago: 'Ve la seña y tu alias' });
  },
  async alquiler(p, rec) {
    rec.cap('Entra a la página del espacio'); await p.waitForTimeout(2000);
    await smoothTo(p, ['Disponibilidad'], 90);
    rec.cap('Elige la fecha libre');
    const days = p.locator('button').filter({ hasText: /^\d{1,2}$/ });
    const n = await days.count(); let picked = false;
    for (let i = Math.floor(n * 0.6); i < n && !picked; i++) { const d = days.nth(i); if (await d.isEnabled()) { await d.click(); picked = true; } }
    await p.waitForTimeout(1000);
    await p.getByRole('button', { name: /Continuar/ }).first().click(); await p.waitForTimeout(1500);
    rec.cap('Cuántos invitados y cuántas horas');
    const plus = p.getByRole('button', { name: '+', exact: true });
    for (let i = 0; i < 3; i++) { await plus.nth(0).click(); await p.waitForTimeout(250); }
    if ((await plus.count()) > 1) { await plus.nth(1).click(); await p.waitForTimeout(300); }
    const ing = p.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    if (await ing.count()) { rec.cap('Elige la hora de ingreso'); await ing.last().click(); await p.waitForTimeout(1200); }
    await p.getByRole('button', { name: /^Siguiente$/ }).last().click({ force: true }); await p.waitForTimeout(1500);
    if (/Servicios Adicionales/.test(await visibleText(p))) {
      rec.cap('Suma servicios adicionales');
      // toca las dos primeras tarjetas de adicionales (el elemento clickeable que contiene "+$")
      const boxes = await p.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('div,button,label,li')) {
          if (out.length >= 2) break;
          const t = el.innerText?.trim() || '';
          if (!/\+\s?\$\s?[\d.]+/.test(t) || t.split('\n').length > 4) continue;
          if (getComputedStyle(el).cursor !== 'pointer' && el.tagName !== 'BUTTON' && el.tagName !== 'LABEL') continue;
          const r = el.getBoundingClientRect(); if (r.width < 200 || r.top < 0 || r.bottom > innerHeight) continue;
          if (out.some(o => Math.abs(o.y - (r.top + r.height / 2)) < 20)) continue;
          out.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }
        return out;
      });
      for (const bx of boxes) { await p.mouse.click(bx.x, bx.y); await p.waitForTimeout(900); }
    }
    await advanceModal(p, rec, { datos: 'Deja sus datos', resumen: 'Ve el resumen y el total', pago: 'Ve la seña y tu alias' });
  },
};

async function storeFlow(p, rec, product) {
  rec.cap('Entra a la tienda'); await p.waitForTimeout(2000);
  rec.cap('Elige un producto'); await p.locator(`text=${product}`).first().click(); await p.waitForTimeout(2000);
  rec.cap('Lo agrega al carrito'); await p.locator('.store-detail-modal-backdrop button').filter({ hasText: /Agregar/ }).first().click(); await p.waitForTimeout(1500);
  rec.cap('Revisa su pedido'); await p.getByRole('button', { name: /Carrito|Ver carrito|Ver pedido/ }).first().click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(2200);
}

// ---------- Armado de pasos ----------
function buildSteps(kind, b, pos, hasStore, bookCaps, storeCaps, panelCaps) {
  const S = [{ type: 'intro' }, { type: 'chapter', c: 'a' }];
  const add = (o) => { if (!o.spot || o.spot[0] != null) S.push({ c: 'a', ...o }); };
  const who = { canchas: 'el jugador', alquiler: 'tu cliente', servicios: 'tu clienta' }[kind];
  add({ img: 'bio', fx: 'url', t: 'Tu propio <em>link</em>', p: 'En la bio de Instagram, en tu WhatsApp o en un QR.' });
  if (pos.bioButtons) add({ img: 'bio', spot: pos.bioButtons, tap: [195, pos.bioButtons[0] + 35], t: 'Un Link in Bio que <em>trabaja</em>', p: hasStore ? 'Reservar, tienda, WhatsApp y ubicación, a un toque.' : 'Reservar, WhatsApp y ubicación, a un toque.' });
  if (pos.hero) add({ img: 'perfil', spot: pos.hero, t: kind === 'alquiler' ? 'Tu espacio, con <em>tu estilo</em>' : 'Tu página, con <em>tu estilo</em>', p: 'Tu portada, tu logo, la dirección y tus redes.' });
  if (kind !== 'alquiler') add({ img: 'perfil', fx: 'ring', hidden: 1, t: 'Historias de <em>24 horas</em>', p: 'Cuando subís una, tu logo se enciende como en Instagram.' });
  if (kind === 'alquiler') {
    if (pos.galeria) add({ img: 'perfil', spot: pos.galeria, t: 'Galería <em>e historias</em>', p: 'Fotos del espacio por categoría, y tus historias primero.' });
  } else if (pos.destacadas) add({ img: 'perfil', spot: pos.destacadas, tap: [60, pos.destacadas[0] + 55], t: 'Destacadas <em>fijas</em>', p: 'Tus mejores fotos y videos, siempre arriba.' });
  if (pos.hasDest) add({ img: 'dest', fx: 'full', t: 'Se miran a <em>pantalla completa</em>', p: 'Como una historia de Instagram, pero en tu página.' });
  if (hasStore && pos.tiendaCard) add({ img: 'perfil', spot: pos.tiendaCard, tap: [335, pos.tiendaCard[0] + 70], t: 'La tienda <em>a la vista</em>', p: 'Tus productos aparecen antes de reservar.' });
  if (kind === 'canchas' && pos.horarios) add({ img: 'perfil', spot: pos.horarios, t: 'Horarios libres, <em>en vivo</em>', p: 'Solo ve los horarios en que tenés canchas libres.' });
  if (kind === 'servicios' && pos.servicios) add({ img: 'perfil', spot: pos.servicios, t: 'Servicios con <em>fotos reales</em>', p: 'Precio, duración y tu trabajo, antes de reservar.' });
  if (kind === 'alquiler') {
    if (pos.comodidades) add({ img: 'perfil', spot: pos.comodidades, t: 'Todo lo que <em>incluye</em>', p: 'Pileta, parrilla, capacidad y comodidades, de un vistazo.' });
    if (pos.adicionales) add({ img: 'perfil', spot: pos.adicionales, t: 'Servicios <em>adicionales</em>', p: 'Limpieza, vajilla, hielo: se suman al reservar.' });
    if (pos.disponibilidad) add({ img: 'perfil', spot: pos.disponibilidad, t: 'Fechas libres, <em>en vivo</em>', p: 'El calendario muestra solo los días disponibles.' });
  }
  // tienda e información del lugar antes de la reserva: así la reserva conecta directo con el panel
  if (hasStore && storeCaps) S.push({ c: 'a', vid: 'store', after: 'wa', caps: storeCaps, t: 'Así compra <em>en tu tienda</em>', p: 'Con carrito y pedido directo a tu WhatsApp.', end: { t: 'Pedido <em>a tu WhatsApp</em>', p: 'Con el detalle y el total.' } });
  if (kind === 'alquiler' && pos.sobre) add({ img: 'perfil', spot: pos.sobre, t: 'Sobre <em>el espacio</em>', p: 'Tu descripción completa, con las reglas y lo que ofrecés.' });
  if (pos.mapa) add({ img: 'perfil', spot: pos.mapa, t: 'Cómo <em>llegar</em>', p: 'El mapa con tu ubicación y el botón para ir.' });
  if (kind !== 'alquiler' && pos.comodidades) add({ img: 'perfil', spot: pos.comodidades, t: 'Comodidades <em>y horarios</em>', p: 'Todo lo que ofrecés, de un vistazo.' });
  if (pos.resenas) add({ img: 'perfil', spot: pos.resenas, t: 'Reseñas <em>reales</em>', p: 'Solo opinan los que reservaron con vos.' });
  const end = bookCaps.at(-1)?.[1] || '';
  const booked = /turno reservado/i.test(end);
  S.push({ c: 'a', vid: 'booking', caps: bookCaps, autoNext: booked && !!panelCaps,
    t: `Así reserva <em>${who}</em>`, p: kind === 'alquiler' ? 'Fecha, invitados, horas y adicionales, solo y en un minuto.' : 'Del día a la seña, solo y en menos de un minuto.',
    end: booked ? { t: '¡Turno <em>reservado</em>!', p: 'Y en ese mismo momento, a vos te llega esto…' }
      : /seña|alias/i.test(end) ? { spot: [205, 410], t: 'Seña <em>asegurada</em>', p: 'Confirma y te llega el comprobante por WhatsApp.' }
        : { t: 'Reserva <em>lista</em>', p: 'Confirma y te llega el aviso con sus datos.' } });
  // del lado del negocio, sin portada de capítulo en el medio: sigue directo de la reserva
  S.push({ c: 'b', fx: 'notif', t: 'Te avisa <em>al celu</em>', p: 'La reserva de recién te llega como notificación.' });
  if (panelCaps) S.push({ c: 'b', vid: 'panel', caps: panelCaps, t: 'La misma reserva, <em>en tu panel</em>', p: 'La revisás, ves la seña y le escribís por WhatsApp, desde el celu.',
    end: { t: 'Todo <em>en orden</em>', p: 'Sin cuadernos ni capturas de WhatsApp: cada reserva queda en tu agenda.' } });
  S.push({ type: 'outro' });
  return S;
}

// ---------- Principal ----------
(async () => {
  const b = await loadBusiness();
  // --solo-html: rearma index.html con los datos guardados. --solo-panel: además regraba el video del panel
  // con la reserva de prueba que ya esté en el panel (sin hacer una nueva).
  if (process.argv.includes('--solo-html') || process.argv.includes('--solo-panel')) {
    const st = JSON.parse(fs.readFileSync(path.join(OUT, 'recorrido.json'), 'utf8'));
    if (process.argv.includes('--solo-panel')) { st.panelCaps = await panelFlow(b.name); log('video del panel listo'); fs.writeFileSync(path.join(OUT, 'recorrido.json'), JSON.stringify(st, null, 1)); }
    writeIndex(b, st); fs.rmSync(TMP, { recursive: true, force: true }); return;
  }
  const kind = kindOf(b);
  if (CON_PANEL && b.metadata?.simulacion !== true) { CON_PANEL = false; log('negocio real: no se confirma la reserva ni se graba el panel'); }
  const products = (b.metadata?.store_products || []).filter(p => p.is_active !== false);
  const hasStore = kind !== 'alquiler' && products.length > 0;
  log(`${b.name} (${kind})${hasStore ? `, tienda con ${products.length} productos` : ''}`);
  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'vid'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true });
  const BASE = `${SITE}/${slug}`;
  const browser = await chromium.launch();
  const pos = {};

  // capturas
  let c = await browser.newContext(ctxOpts(SHOT_SCALE)); let p = await c.newPage();
  await p.goto(BASE + '/bio', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'img/bio.jpg'), type: 'jpeg', quality: 88 });
  pos.bioButtons = await p.evaluate(() => {
    const bs = [...document.querySelectorAll('a,button')].filter(e => e.offsetParent && e.getBoundingClientRect().height > 44 && e.getBoundingClientRect().width > 250);
    if (!bs.length) return null; const t = bs[0].getBoundingClientRect().top, bt = bs.at(-1).getBoundingClientRect().bottom;
    return [Math.round(t) - 8, Math.min(520, Math.round(bt - t) + 16)];
  });
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(2000); await settle(p);
  if (kind === 'alquiler') { // despliega los adicionales para que se vean en la captura
    const acc = p.locator('h2,h3', { hasText: 'Servicios Adicionales' }).first();
    if (await acc.count()) { await acc.click().catch(() => {}); await p.waitForTimeout(800); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500); }
  }
  if (kind === 'canchas') { // de noche ya no quedan horarios para hoy: elige el próximo día con horarios
    const days = p.locator('button').filter({ hasText: /^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)\s*\d+$/ });
    for (let i = 1; i < Math.min(4, await days.count()); i++) {
      await days.nth(i).click().catch(() => {}); await p.waitForTimeout(1500);
      if (await p.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).count() >= 4) break;
    }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
  }
  const foot = await footerTop(p);
  const H1 = await p.evaluate(() => { const h = document.querySelector('h1'); return h ? Math.round(h.getBoundingClientRect().top + scrollY) : null; });
  const T = async (...t) => headTop(p, t);
  const tienda = await T('Tienda'), fecha = await T('Elegí una fecha', '1. Elegí'), info = await T('Información General'), comod = await T('Comodidades'),
    opin = await T('Opiniones'), serv = await T('Nuestros Servicios'), gal = await T('Galería'), adic = await T('Servicios Adicionales'),
    disp = await T('Disponibilidad'), sobre = await T('Sobre el Espacio'), ubic = await T('Ubicación');
  pos.hero = H1 != null ? [H1 - 18, 140] : null;
  const destTop = await p.evaluate((H1) => { const els = [...document.querySelectorAll('img')].filter(i => { const r = i.getBoundingClientRect(); return Math.abs(r.width - r.height) < 4 && r.width > 50 && r.width < 110 && r.top + scrollY > H1; }); return els.length > 2 ? Math.round(els[0].getBoundingClientRect().top + scrollY) : null; }, H1 ?? 0);
  if (destTop) pos.destacadas = [destTop - 14, 125];
  if (tienda) pos.tiendaCard = [tienda - 24, 140];
  if (fecha) pos.horarios = spot(fecha, info ?? fecha + 560, 560);
  if (serv) pos.servicios = spot(serv, serv + 480);
  if (kind === 'alquiler') {
    pos.galeria = spot(gal, comod); pos.comodidades = spot(comod, adic ?? disp); pos.adicionales = spot(adic, disp);
    pos.disponibilidad = spot(disp, sobre ?? ubic ?? foot); pos.sobre = spot(sobre, ubic ?? foot); pos.mapa = spot(ubic, foot, 420);
  } else {
    pos.mapa = spot(info, comod ?? info + 420, 420); pos.comodidades = spot(comod, opin ?? comod + 450, 450); pos.resenas = opin ? [opin - 14, 330] : null;
  }
  const crop = Math.min(foot, 5200);
  await p.screenshot({ path: path.join(TMP, 'perfil.png'), fullPage: true });
  // destacada / galería a pantalla completa
  try {
    const y0 = kind === 'alquiler' ? gal : destTop;
    if (y0 != null) {
      await p.evaluate(y => scrollTo(0, Math.max(0, y - 200)), y0); await p.waitForTimeout(600);
      // primera imagen debajo del título de galería (alquiler) o la primera destacada
      const box = await p.evaluate((y0) => {
        const img = [...document.querySelectorAll('img')].find(i => { const r = i.getBoundingClientRect(); return r.top + scrollY >= y0 - 6 && r.width > 50 && r.height > 50; });
        if (!img) return null; const r = img.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, y0);
      if (box) {
        await p.mouse.click(box.x, box.y); await p.waitForTimeout(2500);
        await p.screenshot({ path: path.join(OUT, 'img/dest.jpg'), type: 'jpeg', quality: 88 });
        pos.hasDest = true;
      }
    }
  } catch (e) { log('sin destacada a pantalla completa:', e.message.split('\n')[0]); }
  await c.close();

  // recorte del perfil (sin el pie) y tienda
  const IMGH = { bio: H, dest: H, perfil: crop };
  await sharpCrop(path.join(TMP, 'perfil.png'), path.join(OUT, 'img/perfil.jpg'), crop);
  if (hasStore) {
    c = await browser.newContext(ctxOpts(SHOT_SCALE)); p = await c.newPage();
    await p.goto(BASE + '/tienda', { waitUntil: 'networkidle' }); await p.waitForTimeout(2200);
    const tf = await footerTop(p); await p.screenshot({ path: path.join(TMP, 'tienda.png'), fullPage: true });
    await sharpCrop(path.join(TMP, 'tienda.png'), path.join(OUT, 'img/tienda.jpg'), tf); IMGH.tienda = tf;
    await c.close();
  }

  // videos
  c = await browser.newContext(ctxOpts(VID_SCALE)); await c.addInitScript(tapJS);
  // Solo en este navegador: el negocio se ve como activo, así el final muestra "¡Turno reservado!"
  // (lo que ve un cliente real) y no el cartel de página de ejemplo. La reserva se guarda igual.
  await c.route(/\/rest\/v1\/businesses_public/, async (route) => {
    const res = await route.fetch(); let body = await res.text();
    try {
      const j = JSON.parse(body); const fix = (x) => { if (x && typeof x === 'object') { if ('subscription_status' in x) x.subscription_status = 'active'; if (x.metadata) x.metadata.simulacion = false; } };
      Array.isArray(j) ? j.forEach(fix) : fix(j); body = JSON.stringify(j);
    } catch { /* deja la respuesta como vino */ }
    await route.fulfill({ response: res, body });
  });
  p = await c.newPage();
  const mainPage = p; c.on('page', pg => { if (pg !== mainPage) pg.close().catch(() => {}); }); // el WhatsApp del final abre otra pestaña
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  let rec = await startRec(p, 'booking'); await FLOWS[kind](p, rec); const confirmed = !!rec.confirmed; const bookCaps = await rec.stop(); await c.close();
  log(`video de reserva listo${confirmed ? ' (reserva de prueba confirmada)' : ''}`);
  let panelCaps = null;
  if (confirmed) {
    try { panelCaps = await panelFlow(b.name); log('video del panel listo'); }
    catch (e) { log('sin video del panel:', e.message.split('\n')[0]); }
  } else if (!CON_PANEL) log('sin sesión del SuperAdmin: no se graba el panel (corré sesion-superadmin.mjs)');
  let storeCaps = null, prod = products[0];
  if (hasStore) {
    c = await browser.newContext(ctxOpts(VID_SCALE)); await c.addInitScript(tapJS); p = await c.newPage();
    await p.goto(BASE + '/tienda', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    rec = await startRec(p, 'store'); await storeFlow(p, rec, prod.name); storeCaps = await rec.stop(2); await c.close();
    log('video de tienda listo');
  }
  await browser.close();

  // logo y recursos compartidos
  const logoUrl = b.logo_url || b.logo;
  if (logoUrl) { const r = await fetch(logoUrl); fs.writeFileSync(path.join(TMP, 'logo.src'), Buffer.from(await r.arrayBuffer()));
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(TMP, 'logo.src'), '-vf', 'scale=150:150:force_original_aspect_ratio=increase,crop=150:150', '-q:v', '2', path.join(OUT, 'img/logo.jpg')]); }
  const shared = path.join(__dirname, 'recursos');
  for (const f of ['tlr-verde.png', 'tlr-oscuro.png']) fs.copyFileSync(path.join(shared, f), path.join(OUT, 'img', f));
  fs.copyFileSync(path.join(shared, 'musica.mp3'), path.join(OUT, 'audio/musica.mp3'));

  fs.writeFileSync(path.join(OUT, 'recorrido.json'), JSON.stringify({ kind, pos, IMGH, hasStore, bookCaps, storeCaps, panelCaps, prod: prod ? { name: prod.name, price: prod.price } : null }, null, 1));
  writeIndex(b, { kind, pos, IMGH, hasStore, bookCaps, storeCaps, panelCaps, prod });
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error('✗', e.message); process.exit(1); });

// Arma index.html con los datos del recorrido
function writeIndex(b, { kind, pos, IMGH, hasStore, bookCaps, storeCaps, panelCaps, prod }) {
  const S = buildSteps(kind, b, pos, hasStore, bookCaps, storeCaps, panelCaps);
  const CH = {
    a: { n: 'Capítulo 1', t: { canchas: 'Lo que ve <em>el jugador</em>', alquiler: 'Lo que ve <em>tu cliente</em>', servicios: 'Lo que ve <em>tu clienta</em>' }[kind],
      p: { canchas: 'Así encuentra tu club, mira las canchas y reserva solo, a cualquier hora.', alquiler: 'Así encuentra tu espacio, mira las fotos y reserva su fecha, a cualquier hora.', servicios: 'Así te encuentra, mira tus trabajos y reserva sola, a cualquier hora.' }[kind] },
    b: { n: 'Capítulo 2', t: 'Lo que <em>ganás vos</em>', p: 'Menos mensajes de WhatsApp, más reservas.' },
  };
  const BIZ = { name: b.name, sub: slug, word: { canchas: 'club', alquiler: 'espacio', servicios: 'negocio' }[kind],
    outro: kind === 'servicios' ? 'Que reserven solas. <em>Vos seguí con lo tuyo.</em>' : 'Que reserven solos. <em>Vos seguí con lo tuyo.</em>',
    waOrder: prod ? `• 1x ${prod.name} — ${money(prod.price)}\n\n*Total a pagar:* ${money(prod.price)}\n\n¿Lo puedo retirar cuando voy? ¡Gracias!` : '',
    push1: { canchas: 'Laura Gómez · Cancha 1<br><small>Sábado, 20:00 · Seña del 30 %</small>', alquiler: 'Laura Gómez · Evento de 40 personas<br><small>Viernes, 20:00 · 6 horas</small>', servicios: `Laura Gómez · ${prod ? '' : ''}Turno nuevo<br><small>Sábado, 10:00 · Seña del 30 %</small>` }[kind],
    push2: hasStore && prod ? `${prod.name} · ${money(prod.price)}` : '' };
  const data = `const BIZ=${JSON.stringify(BIZ)};\nconst IMGH=${JSON.stringify(IMGH)};\nconst TH={colors:['#3ECF8E']};\nconst CH=${JSON.stringify(CH)};\nconst S=${JSON.stringify(S)};\n`;
  const tpl = fs.readFileSync(path.join(__dirname, 'plantilla.html'), 'utf8');
  fs.writeFileSync(path.join(OUT, 'index.html'), tpl.replace('/*@@DATA@@*/', data).replace('@@NAME@@', b.name));
  log(`Listo: public/recorrido/${slug}/ (${S.filter(s => !s.type).length} pasos). Probalo con: npx serve public -l 5277  →  http://localhost:5277/recorrido/${slug}/`);
}

// recorta una captura de página completa a "alto" px CSS y la deja a 600 px de ancho
async function sharpCrop(src, dst, altoCss) {
  const h = Math.round(altoCss * SHOT_SCALE);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', `crop=iw:min(ih\\,${h}):0:0,scale=600:-2`, '-q:v', '3', dst]);
}
