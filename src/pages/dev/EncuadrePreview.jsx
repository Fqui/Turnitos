// Vista previa SOLO para desarrollo (npm run dev): editor de zoom y encuadre de fotos, con el
// panel de fotos de un servicio y cómo queda en la página pública (componentes reales). No se incluye en el build.
import React, { useState } from 'react';
import ServicePhotosEditor from '../../components/business/settings/ServicePhotosEditor';
import ServiceSelector from '../../components/ServiceSelector';

const SIM = 'https://pjtakqbegttsazhkcsmv.supabase.co/storage/v1/object/public/business-images/simulacion/braids-lr-saloon';
const BRAND = '#B0287A';

export default function EncuadrePreview() {
    const [images, setImages] = useState([`${SIM}/foto3.jpg`, `${SIM}/foto2.jpg`]);
    const [selected, setSelected] = useState(null);
    const service = {
        id: 's1',
        name: 'Trenzas hombre',
        description: 'Trenzas pegadas con diseño',
        price: 15000,
        duration: 90,
        category: 'Trenzas',
        image_url: images[0] || null,
        images
    };

    return (
        <div style={{ maxWidth: '980px', margin: '0 auto', padding: '24px 16px 80px', display: 'grid', gap: '32px' }}>
            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Panel · fotos del servicio</h2>
                <ServicePhotosEditor
                    inputId="encuadre-fotos"
                    images={images}
                    onChange={setImages}
                    showToast={() => {}}
                    labelStyle={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}
                    buttonSecondaryStyle={{}}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{images[0]}</p>
            </section>
            <section>
                <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Página pública</h2>
                <ServiceSelector services={[service]} selected={selected} onSelect={setSelected} color={BRAND} businessName="Braidss LR Saloon" />
            </section>
        </div>
    );
}
