import React from 'react';

export default function SocialMediaSection({ formData, setFormData }) {
    return (
        <section>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Redes Sociales
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Instagram (URL completa)
                    </label>
                    <input
                        type="url"
                        value={formData.instagram || ''}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}
                        placeholder="https://instagram.com/tu_negocio"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Facebook (URL completa)
                    </label>
                    <input
                        type="url"
                        value={formData.facebook || ''}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}
                        placeholder="https://facebook.com/tu_negocio"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        WhatsApp (número con código de país, sin +)
                    </label>
                    <input
                        type="tel"
                        value={formData.whatsapp || ''}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}
                        placeholder="5493804123456"
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Ejemplo: 5493804123456 (54 = Argentina, 9 = celular, 3804 = código de área, 123456 = número)
                    </p>
                </div>
            </div>
        </section>
    );
}
