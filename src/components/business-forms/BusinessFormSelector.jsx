import React, { useState } from 'react';
import DeportesForm from './DeportesForm';
import ServiciosForm from './ServiciosForm';
import AlquileresForm from './AlquileresForm';

const BUSINESS_TYPES = [
    {
        id: 'sport',
        name: 'Deportes',
        icon: '⚽',
        color: '#00E676',
        description: 'Canchas, complejos deportivos, clubes'
    },
    {
        id: 'service',
        name: 'Servicios',
        icon: '💼',
        color: '#2196F3',
        description: 'Belleza, salud, mascotas, profesionales'
    },
    {
        id: 'alquiler',
        name: 'Alquileres',
        icon: '🏡',
        color: '#FF5722',
        description: 'Quinchos, salones, espacios para eventos'
    }
];

export default function BusinessFormSelector({ business, onSave, onCancel }) {
    const [selectedType, setSelectedType] = useState(business?.type || null);

    // If editing existing business, show the appropriate form directly
    if (business) {
        if (business.type === 'sport') {
            return <DeportesForm business={business} onSave={onSave} onCancel={onCancel} />;
        } else if (business.type === 'service') {
            return <ServiciosForm business={business} onSave={onSave} onCancel={onCancel} />;
        } else if (business.type === 'alquiler') {
            return <AlquileresForm business={business} onSave={onSave} onCancel={onCancel} />;
        }
    }

    // If creating new business and type is selected, show the form
    if (selectedType === 'sport') {
        return <DeportesForm onSave={onSave} onCancel={() => setSelectedType(null)} />;
    } else if (selectedType === 'service') {
        return <ServiciosForm onSave={onSave} onCancel={() => setSelectedType(null)} />;
    } else if (selectedType === 'alquiler') {
        return <AlquileresForm onSave={onSave} onCancel={() => setSelectedType(null)} />;
    }

    // Show type selector
    return (
        <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    ¿Qué tipo de negocio vas a crear?
                </h2>
                <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                    Selecciona el tipo para usar el formulario optimizado
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {BUSINESS_TYPES.map(type => (
                    <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        style={{
                            padding: '32px 24px',
                            borderRadius: '20px',
                            border: '2px solid var(--border)',
                            backgroundColor: 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = type.color;
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 8px 24px ${type.color}30`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                            {type.icon}
                        </div>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                            {type.name}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                            {type.description}
                        </p>
                    </button>
                ))}
            </div>

            {onCancel && (
                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '12px 32px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            )}
        </div>
    );
}
