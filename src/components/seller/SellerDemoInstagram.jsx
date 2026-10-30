import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, ExternalLink, Camera, ImagePlus, MessageCircle, Plus, Trash2, Upload } from 'lucide-react';
import supabaseService from '../../services/supabaseService';
import { readZip } from '../../utils/zipReader';
import { parseFrame, withFrame } from '../../utils/imageFrame';
import ImageFrameEditor, { FRAME_ASPECTS } from '../common/ImageFrameEditor';
import FramedImage from '../common/FramedImage';
import { DEFAULT_RENTAL, defaultCourts, defaultServices, guessBio, guessName, kindOf } from './demoDefaults';
import './superadmin.css';
import './sellerDemo.css';

const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const MAX_GALLERY = 12;
const MAX_HIGHLIGHTS = 6;
const MAX_HIGHLIGHT_PHOTOS = 6;

// Shrinks a photo to JPEG so the upload stays light (Instagram photos come up to 1440 px)
async function toJpeg(blob, maxSide, quality = 0.82) {
    const url = URL.createObjectURL(blob);
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('No se pudo leer una foto del .zip'));
            el.src = url;
        });
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve, reject) => canvas.toBlob(
            b => (b ? resolve(b) : reject(new Error('No se pudo achicar una foto'))), 'image/jpeg', quality));
    } finally {
        URL.revokeObjectURL(url);
    }
}

// The Chrome extension, zipped in the browser from the files in herramientas/
async function downloadExtension() {
    const [{ createZip }, manifest, popupHtml, popupJs, zipJs, readme] = await Promise.all([
        import('../../../herramientas/instagram-a-turnitos/zip.js'),
        import('../../../herramientas/instagram-a-turnitos/manifest.json?raw'),
        import('../../../herramientas/instagram-a-turnitos/popup.html?raw'),
        import('../../../herramientas/instagram-a-turnitos/popup.js?raw'),
        import('../../../herramientas/instagram-a-turnitos/zip.js?raw'),
        import('../../../herramientas/instagram-a-turnitos/README.md?raw')
    ]);
    const encoder = new TextEncoder();
    const files = [
        ['manifest.json', manifest], ['popup.html', popupHtml], ['popup.js', popupJs], ['zip.js', zipJs], ['README.md', readme]
    ].map(([name, mod]) => ({ name: `instagram-a-turnitos/${name}`, data: encoder.encode(mod.default) }));
    const url = URL.createObjectURL(createZip(files));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instagram-a-turnitos.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STEPS = [
    'Bajá la extensión y descomprimí el .zip (te queda la carpeta instagram-a-turnitos).',
    'En Chrome de la compu abrí chrome://extensions y prendé "Modo de desarrollador" (arriba a la derecha).',
    'Tocá "Cargar sin empaquetar" y elegí la carpeta instagram-a-turnitos. Fijala con el ícono del rompecabezas.',
    'Abrí el Instagram del negocio, bajá un poco para que carguen las fotos y tocá la extensión → "Juntar y descargar .zip".',
    'Subí acá ese .zip (también desde el celu, si te lo pasaste).'
];

const SellerDemoInstagram = () => {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [theme] = useState(() => {
        try {
            const saved = localStorage.getItem('sa-theme');
            if (saved === 'light' || saved === 'dark') return saved;
        } catch { /* storage unavailable */ }
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const [categories, setCategories] = useState([]);
    const [showSteps, setShowSteps] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [reading, setReading] = useState(false);
    const [error, setError] = useState('');

    const [profile, setProfile] = useState(null);
    const [images, setImages] = useState([]); // { id, label, blob, url, kind, highlight }
    const [form, setForm] = useState({ nombre: '', categoryId: '', subcategorias: [], whatsapp: '', direccion: '', descripcion: '', instagram: '' });
    const [services, setServices] = useState([]);
    const [courts, setCourts] = useState([]);
    const [rental, setRental] = useState(DEFAULT_RENTAL);
    const [logo, setLogo] = useState(null);       // { id, frame }
    const [cover, setCover] = useState(null);     // { id, frame }
    const [gallery, setGallery] = useState([]);   // image ids, in order
    const [highlights, setHighlights] = useState([]); // [{ titulo, ids, on }]
    const [pickMode, setPickMode] = useState('galeria');
    const [framing, setFraming] = useState(null); // 'logo' | 'portada'

    const [creating, setCreating] = useState('');
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState('');

    useEffect(() => {
        supabaseService.getCategories().then(data => setCategories(data || [])).catch(() => setCategories([]));
    }, []);

    // Free the photo previews when they are replaced or the page closes
    useEffect(() => () => images.forEach(img => URL.revokeObjectURL(img.url)), [images]);

    const category = categories.find(c => c.id === form.categoryId) || null;
    const kind = kindOf(category);
    const imageById = useMemo(() => Object.fromEntries(images.map(img => [img.id, img])), [images]);
    const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

    const chooseCategory = (categoryId) => {
        const next = categories.find(c => c.id === categoryId) || null;
        update({ categoryId, subcategorias: [] });
        setServices(defaultServices(next, []));
        setCourts(defaultCourts([]));
        setRental(DEFAULT_RENTAL);
    };

    const toggleSubcategory = (name) => {
        const list = form.subcategorias.includes(name)
            ? form.subcategorias.filter(n => n !== name)
            : [...form.subcategorias, name];
        update({ subcategorias: list });
        // Example prices follow the first subcategory, until the seller edits them
        setServices(defaultServices(category, list));
        setCourts(defaultCourts(list));
    };

    const loadZip = async (file) => {
        if (!file) return;
        setError('');
        setResult(null);
        setReading(true);
        try {
            const entries = await readZip(file);
            const profileEntry = entries.find(e => /(^|\/)perfil\.json$/i.test(e.name));
            if (!profileEntry) throw new Error('Este .zip no viene de la extensión: no tiene perfil.json.');
            const base = profileEntry.name.slice(0, profileEntry.name.length - 'perfil.json'.length);
            const data = JSON.parse(new TextDecoder().decode(await profileEntry.read()));
            const byName = Object.fromEntries(entries.map(e => [e.name.slice(base.length), e]));

            const loaded = [];
            const add = async (name, label, extra) => {
                const entry = byName[name];
                const type = IMAGE_TYPES[name.split('.').pop()?.toLowerCase()];
                if (!entry || !type || loaded.some(i => i.id === name)) return;
                const blob = new Blob([await entry.read()], { type });
                loaded.push({ id: name, label, blob, url: URL.createObjectURL(blob), ...extra });
            };
            const files = data.archivos || {};
            if (files.foto_perfil) await add(files.foto_perfil, 'Perfil', { kind: 'perfil' });
            for (const [i, name] of (files.posts || []).entries()) await add(name, `Post ${i + 1}`, { kind: 'post' });
            const highlightList = [];
            for (const [hi, h] of (files.destacadas || []).entries()) {
                const ids = [];
                for (const name of h.fotos || []) {
                    await add(name, h.titulo, { kind: 'destacada', highlight: hi });
                    if (byName[name]) ids.push(name);
                }
                if (ids.length) highlightList.push({ titulo: h.titulo || 'Fotos', ids, on: hi < MAX_HIGHLIGHTS });
            }
            if (!loaded.length) throw new Error('El .zip no trae fotos.');

            const posts = loaded.filter(i => i.kind === 'post');
            setProfile(data);
            setImages(loaded);
            setLogo(loaded.find(i => i.kind === 'perfil') ? { id: files.foto_perfil, frame: null } : null);
            setCover(posts[0] ? { id: posts[0].id, frame: null } : null);
            setGallery(posts.slice(0, 9).map(p => p.id));
            setHighlights(highlightList);
            setForm({
                nombre: guessName(data),
                categoryId: '',
                subcategorias: [],
                whatsapp: data.whatsapp || data.telefonos?.[0] || '',
                direccion: '',
                descripcion: guessBio(data),
                instagram: data.usuario ? `https://www.instagram.com/${data.usuario}/` : ''
            });
            setServices([]);
            setCourts([]);
        } catch (err) {
            setError(err.message || 'No se pudo leer el .zip');
        } finally {
            setReading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const pickImage = (id) => {
        if (pickMode === 'logo') {
            setLogo({ id, frame: null });
            setFraming('logo');
            setPickMode('galeria');
        } else if (pickMode === 'portada') {
            setCover({ id, frame: null });
            setFraming('portada');
            setPickMode('galeria');
        } else {
            setGallery(prev => (prev.includes(id)
                ? prev.filter(g => g !== id)
                : prev.length >= MAX_GALLERY ? prev : [...prev, id]));
        }
    };

    const framingTarget = framing === 'logo' ? logo : framing === 'portada' ? cover : null;
    const framedUrl = (sel) => (sel && imageById[sel.id] ? withFrame(imageById[sel.id].url, sel.frame) : null);

    const missing = [];
    if (!form.nombre.trim()) missing.push('el nombre');
    if (!category) missing.push('el rubro');
    if (kind === 'service' && !services.some(s => s.nombre.trim() && Number(s.precio) > 0)) missing.push('al menos un servicio con precio');
    if (kind === 'sport' && !courts.some(c => c.nombre.trim() && Number(c.precio) > 0)) missing.push('al menos una cancha con precio');
    if (kind === 'alquiler' && !(Number(rental.precio_hora) > 0)) missing.push('el precio por hora');

    const createDemo = async () => {
        if (missing.length) return;
        setError('');
        try {
            setCreating('Achicando las fotos…');
            const files = {};
            const ref = async (key, id, maxSide, quality) => {
                files[key] = await toJpeg(imageById[id].blob, maxSide, quality);
                return `archivo:${key}`;
            };
            const negocio = {
                nombre: form.nombre.trim(),
                rubro: category.slug,
                subcategorias: form.subcategorias,
                whatsapp: form.whatsapp.trim(),
                direccion: form.direccion.trim(),
                descripcion: form.descripcion.trim(),
                instagram: form.instagram.trim()
            };
            if (logo) negocio.logo = withFrame(await ref('logo', logo.id, 512, 0.9), logo.frame);
            if (cover) negocio.portada = withFrame(await ref('portada', cover.id, 1600, 0.82), cover.frame);
            negocio.galeria = [];
            for (const [i, id] of gallery.entries()) negocio.galeria.push({ url: await ref(`g${i + 1}`, id, 1280, 0.8) });
            negocio.destacados = [];
            for (const [hi, h] of highlights.filter(x => x.on).slice(0, MAX_HIGHLIGHTS).entries()) {
                const fotos = [];
                for (const [pi, id] of h.ids.slice(0, MAX_HIGHLIGHT_PHOTOS).entries()) fotos.push(await ref(`d${hi + 1}-${pi + 1}`, id, 1080, 0.8));
                negocio.destacados.push({ titulo: h.titulo, fotos });
            }
            if (kind === 'service') {
                negocio.servicios = services.filter(s => s.nombre.trim() && Number(s.precio) > 0)
                    .map(s => ({ ...s, nombre: s.nombre.trim(), precio: Number(s.precio), duracion: Number(s.duracion) || 30 }));
            } else if (kind === 'sport') {
                negocio.canchas = courts.filter(c => c.nombre.trim() && Number(c.precio) > 0)
                    .map(c => ({ ...c, nombre: c.nombre.trim(), precio: Number(c.precio) }));
            } else if (kind === 'alquiler') {
                negocio.precio_hora = Number(rental.precio_hora);
                if (Number(rental.capacidad) > 0) negocio.capacidad = Number(rental.capacidad);
            }

            setCreating('Creando la demo y subiendo las fotos…');
            const data = await supabaseService.createDemoBusiness(negocio, files);
            setResult(data);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError(err.message || 'No se pudo crear la demo');
        } finally {
            setCreating('');
        }
    };

    const copy = async (key, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied(''), 1800);
        } catch { /* clipboard unavailable */ }
    };

    const startOver = () => {
        setProfile(null);
        setImages([]);
        setResult(null);
        setError('');
    };

    const shareText = result
        ? `¡Hola! Te armé una demo de cómo quedaría ${result.business.name} en TurnitosLR, con tus fotos y turnos online: ${result.business.link}`
        : '';
    const accessText = result
        ? `${result.business.name}\nLink: ${result.business.link}\nPanel: https://turnitoslr.com/portal\nEmail: ${result.credentials.email}\nContraseña: ${result.credentials.password}`
        : '';
    const waNumber = String(form.whatsapp || '').replace(/\D/g, '');

    const selectedCount = gallery.length + (logo ? 1 : 0) + (cover ? 1 : 0)
        + highlights.filter(h => h.on).slice(0, MAX_HIGHLIGHTS).reduce((n, h) => n + Math.min(h.ids.length, MAX_HIGHLIGHT_PHOTOS), 0);

    return (
        <div className="sa-root sd-root" data-theme={theme}>
            <div className="sd-wrap">
                <button type="button" className="sd-back" onClick={() => navigate('/admin/dashboard')}>
                    <ArrowLeft size={16} /> Volver al panel
                </button>
                <h1 className="sd-title"><Camera size={26} /> Demo desde Instagram</h1>
                <p className="sd-muted">Con el .zip que baja la extensión armás la demo del negocio en un par de minutos. Queda a tu nombre, en prueba y marcada como demo.</p>

                {result && (
                    <section className="sd-card sd-success">
                        <div className="sd-success-head"><Check size={20} /> ¡Demo lista!</div>
                        <a className="sd-link" href={result.business.link} target="_blank" rel="noreferrer">
                            {result.business.link.replace('https://', '')} <ExternalLink size={14} />
                        </a>
                        <div className="sd-access">
                            <div><span className="sd-muted">Email</span><strong>{result.credentials.email}</strong></div>
                            <div><span className="sd-muted">Contraseña</span><strong>{result.credentials.password}</strong></div>
                        </div>
                        <p className="sd-muted sd-small">El dueño entra en turnitoslr.com/portal y cambia la contraseña la primera vez.</p>
                        <div className="sd-actions">
                            <a className="sd-btn sd-btn-primary" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
                                <MessageCircle size={16} /> Mandar por WhatsApp
                            </a>
                            <button type="button" className="sd-btn" onClick={() => copy('access', accessText)}>
                                {copied === 'access' ? <Check size={16} /> : <Copy size={16} />} Copiar accesos
                            </button>
                            <button type="button" className="sd-btn" onClick={startOver}><Plus size={16} /> Hacer otra</button>
                            <button type="button" className="sd-btn" onClick={() => navigate('/admin/businesses')}>Ver mis negocios</button>
                        </div>
                    </section>
                )}

                {!profile && !result && (
                    <>
                        <section className="sd-card">
                            <div className="sd-step">1</div>
                            <h2>Bajá la extensión de Chrome</h2>
                            <p className="sd-muted">Se usa en la compu, con tu Instagram abierto. Junta nombre, bio, WhatsApp y fotos del perfil en un .zip.</p>
                            <div className="sd-actions">
                                <button type="button" className="sd-btn sd-btn-primary" onClick={() => downloadExtension().catch(() => setError('No se pudo bajar la extensión'))}>
                                    <Download size={16} /> Bajar extensión
                                </button>
                                <button type="button" className="sd-btn" onClick={() => setShowSteps(v => !v)}>
                                    {showSteps ? 'Ocultar pasos' : 'Cómo se instala'}
                                </button>
                            </div>
                            {showSteps && (
                                <ol className="sd-steps">
                                    {STEPS.map(step => <li key={step}>{step}</li>)}
                                </ol>
                            )}
                        </section>

                        <section className="sd-card">
                            <div className="sd-step">2</div>
                            <h2>Subí el .zip del negocio</h2>
                            <label
                                className={`sd-drop ${dragOver ? 'is-over' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); loadZip(e.dataTransfer.files?.[0]); }}
                            >
                                <Upload size={28} />
                                <strong>{reading ? 'Leyendo el .zip…' : 'Tocá para elegir el .zip'}</strong>
                                <span className="sd-muted sd-small">o arrastralo acá · instagram-usuario.zip</span>
                                <input ref={inputRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => loadZip(e.target.files?.[0])} />
                            </label>
                        </section>
                    </>
                )}

                {error && <div className="sd-error">{error}</div>}

                {profile && !result && (
                    <>
                        <section className="sd-card">
                            <div className="sd-profile">
                                {logo && imageById[logo.id] && (
                                    <FramedImage src={framedUrl(logo)} alt="" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
                                )}
                                <div className="sd-profile-info">
                                    <strong>@{profile.usuario}</strong>
                                    <div className="sd-muted sd-small">{images.filter(i => i.kind === 'post').length} posts · {highlights.length} destacadas</div>
                                </div>
                                <button type="button" className="sd-btn sd-btn-small" onClick={startOver}>Cambiar .zip</button>
                            </div>
                            {profile.avisos?.length > 0 && (
                                <p className="sd-muted sd-small" style={{ marginTop: 10 }}>
                                    La extensión no pudo leer todo el perfil: revisá el nombre y la descripción.
                                </p>
                            )}
                        </section>

                        <section className="sd-card">
                            <h2>Datos del negocio</h2>
                            <label className="sd-field">
                                <span>Nombre</span>
                                <input value={form.nombre} onChange={(e) => update({ nombre: e.target.value })} placeholder="Como lo conoce la gente" />
                            </label>
                            <div className="sd-field">
                                <span>Rubro</span>
                                <div className="sd-chips">
                                    {categories.map(c => (
                                        <button key={c.id} type="button" className={`sd-chip ${form.categoryId === c.id ? 'is-on' : ''}`} onClick={() => chooseCategory(c.id)}>
                                            {c.icon} {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {category?.subcategories?.length > 0 && (
                                <div className="sd-field">
                                    <span>Qué hace (podés elegir varias)</span>
                                    <div className="sd-chips">
                                        {[...category.subcategories].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)).map(s => (
                                            <button key={s.id} type="button" className={`sd-chip ${form.subcategorias.includes(s.name) ? 'is-on' : ''}`} onClick={() => toggleSubcategory(s.name)}>
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="sd-grid2">
                                <label className="sd-field">
                                    <span>WhatsApp</span>
                                    <input value={form.whatsapp} inputMode="tel" onChange={(e) => update({ whatsapp: e.target.value })} placeholder="5493804..." />
                                </label>
                                <label className="sd-field">
                                    <span>Dirección (opcional)</span>
                                    <input value={form.direccion} onChange={(e) => update({ direccion: e.target.value })} placeholder="Calle 123, La Rioja" />
                                </label>
                            </div>
                            <label className="sd-field">
                                <span>Descripción</span>
                                <textarea rows={4} value={form.descripcion} onChange={(e) => update({ descripcion: e.target.value })} />
                            </label>
                        </section>

                        {kind && (
                            <section className="sd-card">
                                <h2>{kind === 'service' ? 'Servicios' : kind === 'sport' ? 'Canchas' : 'Precio del alquiler'}</h2>
                                <p className="sd-muted sd-small">Son precios de ejemplo para que la demo se vea completa. Si los sabés, cambialos.</p>
                                {kind === 'service' && (
                                    <div className="sd-rows">
                                        {services.map((s, i) => (
                                            <div key={i} className="sd-row">
                                                <input className="sd-row-name" value={s.nombre} placeholder="Servicio" onChange={(e) => setServices(list => list.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} />
                                                <label className="sd-row-num"><input type="number" min="5" step="5" value={s.duracion} onChange={(e) => setServices(list => list.map((x, j) => (j === i ? { ...x, duracion: e.target.value } : x)))} /><span>min</span></label>
                                                <label className="sd-row-num"><span>$</span><input type="number" min="0" step="500" value={s.precio} onChange={(e) => setServices(list => list.map((x, j) => (j === i ? { ...x, precio: e.target.value } : x)))} /></label>
                                                <button type="button" className="sd-icon-btn" aria-label="Quitar" onClick={() => setServices(list => list.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                        <button type="button" className="sd-btn sd-btn-small" onClick={() => setServices(list => [...list, { nombre: '', duracion: 30, precio: '', categoria: 'General' }])}>
                                            <Plus size={14} /> Agregar servicio
                                        </button>
                                    </div>
                                )}
                                {kind === 'sport' && (
                                    <div className="sd-rows">
                                        {courts.map((c, i) => (
                                            <div key={i} className="sd-row">
                                                <input className="sd-row-name" value={c.nombre} placeholder="Cancha" onChange={(e) => setCourts(list => list.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} />
                                                <label className="sd-row-num"><span>$</span><input type="number" min="0" step="500" value={c.precio} onChange={(e) => setCourts(list => list.map((x, j) => (j === i ? { ...x, precio: e.target.value } : x)))} /><span>/h</span></label>
                                                <button type="button" className="sd-icon-btn" aria-label="Quitar" onClick={() => setCourts(list => list.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                        <button type="button" className="sd-btn sd-btn-small" onClick={() => setCourts(list => [...list, { nombre: `Cancha ${list.length + 1}`, precio: list[0]?.precio || '', deporte: list[0]?.deporte || 'padel' }])}>
                                            <Plus size={14} /> Agregar cancha
                                        </button>
                                    </div>
                                )}
                                {kind === 'alquiler' && (
                                    <div className="sd-grid2">
                                        <label className="sd-field"><span>Precio por hora ($)</span><input type="number" min="0" step="500" value={rental.precio_hora} onChange={(e) => setRental(r => ({ ...r, precio_hora: e.target.value }))} /></label>
                                        <label className="sd-field"><span>Capacidad (personas)</span><input type="number" min="1" value={rental.capacidad} onChange={(e) => setRental(r => ({ ...r, capacidad: e.target.value }))} /></label>
                                    </div>
                                )}
                            </section>
                        )}

                        <section className="sd-card">
                            <h2>Fotos</h2>
                            <div className="sd-covers">
                                <button type="button" className="sd-cover-slot" onClick={() => (cover ? setFraming('portada') : setPickMode('portada'))}>
                                    <span className="sd-muted sd-small">Portada</span>
                                    {cover && imageById[cover.id]
                                        ? <FramedImage src={framedUrl(cover)} alt="Portada" style={{ width: '100%', aspectRatio: '3 / 1', borderRadius: 10 }} />
                                        : <div className="sd-empty-slot" style={{ aspectRatio: '3 / 1' }}><ImagePlus size={20} /></div>}
                                    {cover && <span className="sd-slot-hint">Tocá para acomodar</span>}
                                </button>
                                <button type="button" className="sd-cover-slot sd-logo-slot" onClick={() => (logo ? setFraming('logo') : setPickMode('logo'))}>
                                    <span className="sd-muted sd-small">Logo</span>
                                    {logo && imageById[logo.id]
                                        ? <FramedImage src={framedUrl(logo)} alt="Logo" style={{ width: 84, height: 84, borderRadius: '50%' }} />
                                        : <div className="sd-empty-slot" style={{ width: 84, height: 84, borderRadius: '50%' }}><ImagePlus size={20} /></div>}
                                </button>
                            </div>

                            <div className="sd-pick">
                                <span className="sd-muted sd-small">Tocá una foto para usarla de</span>
                                <div className="sd-segment">
                                    {[['galeria', `Galería (${gallery.length}/${MAX_GALLERY})`], ['portada', 'Portada'], ['logo', 'Logo']].map(([mode, label]) => (
                                        <button key={mode} type="button" className={pickMode === mode ? 'is-on' : ''} onClick={() => setPickMode(mode)}>{label}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="sd-photos">
                                {images.filter(i => i.kind !== 'destacada').map(img => {
                                    const order = gallery.indexOf(img.id);
                                    return (
                                        <button key={img.id} type="button" className={`sd-photo ${order >= 0 ? 'is-on' : ''}`} onClick={() => pickImage(img.id)}>
                                            <img src={img.url} alt={img.label} loading="lazy" />
                                            {order >= 0 && <span className="sd-badge">{order + 1}</span>}
                                            {cover?.id === img.id && <span className="sd-tag">Portada</span>}
                                            {logo?.id === img.id && <span className="sd-tag sd-tag-logo">Logo</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {highlights.length > 0 && (
                                <div className="sd-highlights">
                                    <span className="sd-muted sd-small">Destacadas (los círculos del perfil)</span>
                                    <div className="sd-hl-list">
                                        {highlights.map((h, i) => (
                                            <button key={`${h.titulo}-${i}`} type="button" className={`sd-hl ${h.on ? 'is-on' : ''}`} onClick={() => setHighlights(list => list.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}>
                                                <img src={imageById[h.ids[0]]?.url} alt="" />
                                                <span>{h.titulo}</span>
                                                {h.on && <Check size={14} className="sd-hl-check" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        <div className="sd-submit">
                            {missing.length > 0 && <p className="sd-muted sd-small">Falta {missing.join(', ')}.</p>}
                            <button type="button" className="sd-btn sd-btn-primary sd-btn-big" disabled={missing.length > 0 || !!creating} onClick={createDemo}>
                                {creating || `Crear demo (${selectedCount} fotos)`}
                            </button>
                            <p className="sd-muted sd-small">Queda en prueba, con seña del 30 % y datos de transferencia de ejemplo. La podés borrar desde Mis negocios.</p>
                        </div>
                    </>
                )}
            </div>

            <ImageFrameEditor
                open={!!framingTarget && !!imageById[framingTarget?.id]}
                image={framedUrl(framingTarget)}
                aspects={framing === 'logo' ? FRAME_ASPECTS.logo : FRAME_ASPECTS.cover}
                title={framing === 'logo' ? 'Acomodá el logo' : 'Acomodá la portada'}
                onSave={(url) => {
                    const frame = parseFrame(url).frame;
                    if (framing === 'logo') setLogo(prev => ({ ...prev, frame }));
                    else setCover(prev => ({ ...prev, frame }));
                }}
                onClose={() => setFraming(null)}
            />
        </div>
    );
};

export default SellerDemoInstagram;
