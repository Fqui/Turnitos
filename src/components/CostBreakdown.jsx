import React from 'react';

/**
 * Componente para mostrar el desglose de costos de suscripción
 * Muestra plan base + costos adicionales por espacios extra
 */
export default function CostBreakdown({
    planName,
    baseCost,
    includedSpaces,
    totalSpaces,
    additionalSpaces,
    perUnitPrice,
    additionalCost,
    totalCost,
    spaceType = 'espacios' // 'canchas', 'especialistas', 'espacios'
}) {
    // No mostrar si no hay plan seleccionado
    if (!planName || baseCost === undefined) return null;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    };

    return (
        <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '20px',
            border: '2px solid var(--primary-paddle)',
            marginTop: '20px'
        }}>
            <h4 style={{
                fontSize: '18px',
                fontWeight: '800',
                marginBottom: '16px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                💰 Resumen de Costos
            </h4>

            {/* Plan Base */}
            <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Plan seleccionado
                </p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {planName}
                </p>
                <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-paddle)', marginTop: '4px' }}>
                    {formatPrice(baseCost)}/mes
                </p>
            </div>

            {/* Desglose de Espacios */}
            <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-main)',
                borderRadius: '12px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {spaceType.charAt(0).toUpperCase() + spaceType.slice(1)} incluidos:
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {includedSpaces}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {spaceType.charAt(0).toUpperCase() + spaceType.slice(1)} agregados:
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {totalSpaces}
                    </span>
                </div>
                {additionalSpaces > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {spaceType.charAt(0).toUpperCase() + spaceType.slice(1)} adicionales:
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#FF9800' }}>
                            {additionalSpaces}
                        </span>
                    </div>
                )}
            </div>

            {/* Costo Adicional */}
            {additionalSpaces > 0 && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#FF980020',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    border: '1px solid #FF9800'
                }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Costo adicional:
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {additionalSpaces} × {formatPrice(perUnitPrice)} = {formatPrice(additionalCost)}/mes
                    </p>
                </div>
            )}

            {/* Total */}
            <div style={{
                paddingTop: '16px',
                borderTop: '2px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    TOTAL MENSUAL:
                </span>
                <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary-paddle)' }}>
                    {formatPrice(totalCost)}
                </span>
            </div>

            {/* Nota informativa */}
            {additionalSpaces > 0 && (
                <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginTop: '12px',
                    fontStyle: 'italic'
                }}>
                    * Los {spaceType} adicionales se facturan mensualmente
                </p>
            )}
        </div>
    );
}
