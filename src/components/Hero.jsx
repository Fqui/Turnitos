import React from 'react';

export default function Hero() {
    return (
        <section style={{ textAlign: 'center', marginBottom: '60px', padding: '40px 20px 20px' }}>
            <h2 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '20px', lineHeight: '1.1' }}>
                Tu turno, <br />
                <span style={{
                    background: 'linear-gradient(to right, var(--primary-paddle), var(--primary-football))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    tu momento.
                </span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
                Deportes, belleza y salud en un solo lugar. Encontrá y reservá en segundos.
            </p>
        </section>
    );
}
