// Minimal .zip reader for the browser: lists the entries and extracts them as Blobs.
// Supports "stored" (what the Instagram extension writes) and "deflate" (zips re-made by hand).

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

function findEndOfCentralDirectory(view) {
    // The record is 22 bytes plus a comment of up to 64 KB
    const stop = Math.max(0, view.byteLength - 22 - 0xffff);
    for (let i = view.byteLength - 22; i >= stop; i--) {
        if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
    }
    throw new Error('El archivo no es un .zip válido');
}

async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('Este navegador no puede abrir zips comprimidos. Probá con Chrome.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Reads a .zip File/Blob.
 * Returns [{ name, size, read: () => Promise<Uint8Array> }] (folders left out).
 */
export async function readZip(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const eocd = findEndOfCentralDirectory(view);
    const count = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);

    const utf8 = new TextDecoder('utf-8');
    const latin = new TextDecoder('latin1');
    const entries = [];

    for (let n = 0; n < count; n++) {
        if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) throw new Error('El .zip está dañado');
        const flags = view.getUint16(offset + 8, true);
        const method = view.getUint16(offset + 10, true);
        const compressedSize = view.getUint32(offset + 20, true);
        const size = view.getUint32(offset + 24, true);
        const nameLength = view.getUint16(offset + 28, true);
        const extraLength = view.getUint16(offset + 30, true);
        const commentLength = view.getUint16(offset + 32, true);
        const localOffset = view.getUint32(offset + 42, true);
        const nameBytes = new Uint8Array(buffer, offset + 46, nameLength);
        const name = (flags & 0x0800 ? utf8 : latin).decode(nameBytes);
        offset += 46 + nameLength + extraLength + commentLength;

        if (name.endsWith('/')) continue;

        entries.push({
            name,
            size,
            read: async () => {
                if (view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) throw new Error('El .zip está dañado');
                const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
                const data = new Uint8Array(buffer, start, compressedSize);
                if (method === 0) return data;
                if (method === 8) return inflateRaw(data);
                throw new Error(`No se puede abrir ${name} (compresión no soportada)`);
            }
        });
    }
    return entries;
}
