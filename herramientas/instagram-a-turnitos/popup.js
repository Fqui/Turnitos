// Popup: junta los datos del perfil de Instagram abierto, baja las fotos y arma el .zip.
// Todo pasa en el navegador: la lectura se hace dentro de la pestaña de Instagram, con la
// sesión de quien la usa, y las fotos se bajan directo del CDN de Instagram.
import { createZip } from './zip.js';

const runButton = document.getElementById('run');
const statusBox = document.getElementById('status');
const highlightsBox = document.getElementById('highlights');

function setStatus(text, kind = '') {
    statusBox.textContent = text;
    statusBox.className = kind;
}

function slugify(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40) || 'sin-titulo';
}

// --- Lo que corre dentro de la pestaña de Instagram ---------------------------------------
// Tiene que ser autocontenida: Chrome la serializa y la ejecuta en la página.
async function collectFromPage(includeHighlights) {
    const RESERVED = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'direct', 'tv']);
    const username = decodeURIComponent(location.pathname.split('/').filter(Boolean)[0] || '');
    if (location.hostname !== 'www.instagram.com' || !username || RESERVED.has(username)) {
        return { error: 'Abrí un perfil de Instagram (instagram.com/usuario) y probá de nuevo.' };
    }

    const warnings = [];
    const headers = { 'x-ig-app-id': '936619743392459', 'x-requested-with': 'XMLHttpRequest' };
    const api = async path => {
        const res = await fetch(path, { headers, credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const biggest = candidates => (candidates || [])
        .filter(c => c && c.url)
        .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))[0]?.url || null;
    const fromImg = img => {
        const set = (img.getAttribute('srcset') || '').split(',').map(s => s.trim().split(/\s+/))
            .filter(([url]) => url).map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 }))
            .sort((a, b) => b.w - a.w);
        return set[0]?.url || img.currentSrc || img.src || null;
    };
    const cleanLink = url => {
        try {
            const u = new URL(url, location.origin);
            if (u.hostname === 'l.instagram.com' && u.searchParams.get('u')) return u.searchParams.get('u');
            return u.href;
        } catch {
            return url;
        }
    };

    // Perfil: primero la API interna de la web de Instagram, si falla lo que se ve en la página
    let user = null;
    try {
        user = (await api(`/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`))?.data?.user || null;
    } catch (err) {
        warnings.push(`No se pudo leer el perfil completo (${err.message}); uso lo que se ve en la página.`);
    }

    const header = document.querySelector('header');
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
    const name = user?.full_name || ogTitle.replace(/\s*\(@.*$/, '').trim() || username;
    const bio = user?.biography ?? '';
    if (!user && header) warnings.push('La bio puede venir incompleta: revisá "texto_encabezado" en perfil.json.');

    // Links
    const links = [];
    const addLink = (url, title) => {
        if (!url) return;
        const clean = cleanLink(url);
        if (!links.some(l => l.url === clean)) links.push({ titulo: title || '', url: clean });
    };
    for (const l of user?.bio_links || []) addLink(l.url || l.lynx_url, l.title);
    if (user?.external_url) addLink(user.external_url);
    if (!user && header) {
        for (const a of header.querySelectorAll('a[href*="l.instagram.com"], a[rel~="nofollow"]')) addLink(a.href, a.textContent.trim());
    }

    // Teléfono y WhatsApp: datos de contacto del perfil comercial, links de WhatsApp y la bio
    const phones = [];
    const addPhone = value => {
        const digits = String(value || '').replace(/[^\d+]/g, '');
        // El mismo número con y sin +54 cuenta una vez
        const key = d => d.replace(/\D/g, '').slice(-10);
        if (digits.replace(/\D/g, '').length >= 8 && !phones.some(p => key(p) === key(digits))) phones.push(digits);
    };
    if (user?.public_phone_number) addPhone(`${user.public_phone_country_code ? `+${user.public_phone_country_code}` : ''}${user.public_phone_number}`);
    addPhone(user?.business_phone_number);
    let whatsapp = null;
    for (const l of links) {
        const m = /(?:wa\.me\/|whatsapp\.com\/send\/?\?phone=|wa\.link\/)([\d+]+)/i.exec(l.url);
        if (m && !whatsapp) whatsapp = m[1];
    }
    for (const m of bio.matchAll(/\+?\d[\d\s().-]{7,}\d/g)) addPhone(m[0]);
    if (!whatsapp && /whats?app|wsp|wpp/i.test(bio) && phones.length) whatsapp = phones[0];

    // Foto de perfil en la mayor resolución
    let profilePic = user?.profile_pic_url_hd || user?.profile_pic_url || null;
    if (user?.id) {
        try {
            const info = await api(`/api/v1/users/${user.id}/info/`);
            profilePic = info?.user?.hd_profile_pic_url_info?.url || biggest(info?.user?.hd_profile_pic_versions) || profilePic;
        } catch {
            // queda la de web_profile_info
        }
    }
    if (!profilePic && header) {
        const img = header.querySelector('img');
        if (img) profilePic = fromImg(img);
    }

    // Posts: los que se ven en la página, en orden, con la versión grande si la API la tiene
    const apiPosts = new Map();
    for (const edge of user?.edge_owner_to_timeline_media?.edges || []) {
        if (edge?.node?.shortcode && edge.node.display_url) apiPosts.set(edge.node.shortcode, edge.node.display_url);
    }
    const posts = [];
    const seen = new Set();
    for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
        const code = /\/(?:p|reel)\/([^/?#]+)/.exec(a.getAttribute('href') || '')?.[1];
        const img = a.querySelector('img');
        if (!code || seen.has(code) || !img) continue;
        seen.add(code);
        const url = apiPosts.get(code) || fromImg(img);
        if (url) posts.push({ codigo: code, url });
    }
    for (const [code, url] of apiPosts) {
        if (!seen.has(code)) posts.push({ codigo: code, url });
    }

    // Destacadas: títulos, portada y (si se pide) las fotos de cada una
    let highlights = [];
    if (user?.id) {
        try {
            const tray = await api(`/api/v1/highlights/${user.id}/highlights_tray/`);
            highlights = (tray?.tray || []).map(h => ({
                id: String(h.id).startsWith('highlight:') ? String(h.id) : `highlight:${h.id}`,
                titulo: h.title || '',
                portada: h.cover_media?.cropped_image_version?.url || h.cover_media?.full_image_version?.url || null,
                fotos: []
            }));
        } catch (err) {
            warnings.push(`No se pudieron leer las destacadas por la API (${err.message}).`);
        }
    }
    if (!highlights.length) {
        for (const a of document.querySelectorAll('a[href*="/stories/highlights/"]')) {
            const id = /\/stories\/highlights\/(\d+)/.exec(a.getAttribute('href') || '')?.[1];
            if (!id || highlights.some(h => h.id === `highlight:${id}`)) continue;
            const img = a.querySelector('img');
            highlights.push({ id: `highlight:${id}`, titulo: a.textContent.trim(), portada: img ? fromImg(img) : null, fotos: [] });
        }
    }
    if (includeHighlights && highlights.length) {
        for (let i = 0; i < highlights.length; i += 3) {
            const batch = highlights.slice(i, i + 3);
            try {
                const query = batch.map(h => `reel_ids=${encodeURIComponent(h.id)}`).join('&');
                const data = await api(`/api/v1/feed/reels_media/?${query}`);
                for (const h of batch) {
                    const reel = data?.reels?.[h.id] || (data?.reels_media || []).find(r => String(r.id) === h.id);
                    h.fotos = (reel?.items || []).map(item => biggest(item?.image_versions2?.candidates)).filter(Boolean);
                }
            } catch (err) {
                warnings.push(`No se pudieron bajar las fotos de ${batch.map(h => `"${h.titulo}"`).join(', ')} (${err.message}).`);
            }
            await wait(400);
        }
    }

    return {
        usuario: user?.username || username,
        nombre: name,
        bio,
        categoria: user?.category_name || null,
        links,
        telefonos: phones,
        whatsapp: whatsapp ? whatsapp.replace(/[^\d+]/g, '') : null,
        email: user?.business_email || null,
        texto_encabezado: user ? null : header?.innerText?.trim() || null,
        foto_perfil: profilePic,
        posts,
        destacadas: highlights.map(({ titulo, portada, fotos }) => ({ titulo, portada, fotos })),
        avisos: warnings
    };
}

// --- Descarga y .zip -------------------------------------------------------------------

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/avif': 'avif', 'image/gif': 'gif' };

async function download(url) {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    return { data: new Uint8Array(await res.arrayBuffer()), ext: EXTENSIONS[type] || 'jpg' };
}

// Baja las fotos de a pocas a la vez para no saturar
async function downloadAll(jobs, onProgress) {
    const results = new Array(jobs.length);
    let next = 0;
    let done = 0;
    async function worker() {
        while (next < jobs.length) {
            const i = next++;
            try {
                results[i] = await download(jobs[i].url);
            } catch (err) {
                results[i] = { error: err.message };
            }
            onProgress(++done, jobs.length);
        }
    }
    await Promise.all(Array.from({ length: 4 }, worker));
    return results;
}

async function run() {
    runButton.disabled = true;
    setStatus('Leyendo el perfil…');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url?.startsWith('https://www.instagram.com/')) throw new Error('Abrí un perfil de Instagram en esta pestaña y probá de nuevo.');

        const [injection] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: collectFromPage,
            args: [highlightsBox.checked]
        });
        const profile = injection?.result;
        if (!profile) throw new Error('No se pudo leer la página. Recargá el perfil y probá de nuevo.');
        if (profile.error) throw new Error(profile.error);

        // Qué bajar y con qué nombre
        const jobs = [];
        if (profile.foto_perfil) jobs.push({ url: profile.foto_perfil, base: 'perfil' });
        profile.posts.forEach((p, i) => jobs.push({ url: p.url, base: `post ${i + 1}` }));
        profile.destacadas.forEach((h, hi) => {
            const urls = h.fotos.length ? h.fotos : h.portada ? [h.portada] : [];
            urls.forEach((url, i) => jobs.push({ url, base: `destacada "${h.titulo}" ${i + 1}`, highlight: hi }));
        });

        const results = await downloadAll(jobs, (done, total) => setStatus(`Bajando fotos… ${done} de ${total}`));

        const files = [];
        const failed = [];
        const highlightFiles = profile.destacadas.map(() => []);
        let profileFile = null;
        const postFiles = [];
        jobs.forEach((job, i) => {
            const r = results[i];
            if (r.error) {
                failed.push(`${job.base} (${r.error})`);
                return;
            }
            // Numeradas sin huecos aunque alguna falle
            let name;
            if (job.base === 'perfil') name = profileFile = `perfil.${r.ext}`;
            else if (job.highlight != null) {
                const list = highlightFiles[job.highlight];
                name = `destacada${job.highlight + 1}-${slugify(profile.destacadas[job.highlight].titulo)}-${list.length + 1}.${r.ext}`;
                list.push(name);
            } else {
                name = `foto${postFiles.length + 1}.${r.ext}`;
                postFiles.push(name);
            }
            files.push({ name, data: r.data });
        });

        const json = {
            fuente: 'instagram',
            capturado: new Date().toISOString(),
            url: `https://www.instagram.com/${profile.usuario}/`,
            usuario: profile.usuario,
            nombre: profile.nombre,
            bio: profile.bio,
            categoria: profile.categoria,
            links: profile.links,
            telefonos: profile.telefonos,
            whatsapp: profile.whatsapp,
            email: profile.email,
            ...(profile.texto_encabezado ? { texto_encabezado: profile.texto_encabezado } : {}),
            archivos: {
                foto_perfil: profileFile,
                posts: postFiles,
                destacadas: profile.destacadas.map((h, i) => ({ titulo: h.titulo, fotos: highlightFiles[i] }))
            },
            // Base para crear_negocio_demo / scripts/negocios: falta rubro, servicios o canchas
            negocio: {
                nombre: profile.nombre,
                rubro: '',
                instagram: `https://www.instagram.com/${profile.usuario}/`,
                descripcion: profile.bio,
                whatsapp: profile.whatsapp || profile.telefonos[0] || '',
                links: profile.links.map(l => ({ titulo: l.titulo || l.url, url: l.url }))
            },
            avisos: [...profile.avisos, ...failed.map(f => `No se pudo bajar ${f}`)]
        };
        files.unshift({ name: 'perfil.json', data: new TextEncoder().encode(JSON.stringify(json, null, 2)) });

        setStatus('Armando el .zip…');
        const blobUrl = URL.createObjectURL(createZip(files));
        await chrome.downloads.download({ url: blobUrl, filename: `instagram-${profile.usuario}.zip` });
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        const summary = [
            `Listo: instagram-${profile.usuario}.zip`,
            `${postFiles.length} posts, ${highlightFiles.flat().length} fotos de ${profile.destacadas.length} destacadas${profileFile ? ', foto de perfil' : ''}.`
        ];
        if (json.avisos.length) summary.push(`Avisos: ${json.avisos.length} (ver perfil.json)`);
        setStatus(summary.join('\n'), 'ok');
    } catch (err) {
        setStatus(err.message || String(err), 'error');
    } finally {
        runButton.disabled = false;
    }
}

runButton.addEventListener('click', run);
