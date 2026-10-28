import React from 'react';
import { Copy, Check } from 'lucide-react';

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' };

// Alias (max 20 chars) and CBU (22 digits) must stay on one line: the font scales
// with the viewport and, as a last resort, the value scrolls instead of breaking.
function CopyableValue({ label, value, field, copiedField, onCopy, accentColor }) {
    const copied = copiedField === field;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ ...labelStyle, marginBottom: 0 }}>{label}</span>
                {copied && (
                    <span style={{ fontSize: '11px', fontWeight: '700', color: accentColor }}>Copiado</span>
                )}
            </div>
            <button
                type="button"
                onClick={() => onCopy(value, field)}
                aria-label={`Copiar ${label.toLowerCase()}`}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 8px 8px 12px',
                    borderRadius: '12px',
                    backgroundColor: copied ? `${accentColor}15` : 'var(--bg-main)',
                    border: `1px solid ${copied ? accentColor : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    fontFamily: 'inherit'
                }}
            >
                <span style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 'clamp(12px, 3.6vw, 16px)',
                    letterSpacing: '-0.2px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    whiteSpace: 'nowrap',
                    overflowX: 'auto',
                    scrollbarWidth: 'none'
                }}>
                    {value}
                </span>
                <span style={{
                    flexShrink: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: copied ? accentColor : 'var(--bg-card)',
                    color: copied ? '#fff' : 'var(--text-primary)',
                    border: copied ? 'none' : '1px solid var(--border)',
                    transition: 'all 0.2s'
                }}>
                    {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} />}
                </span>
            </button>
        </div>
    );
}

export default function TransferDetails({ bankDetails, copiedField, onCopy, accentColor }) {
    return (
        <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid var(--border)',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                Datos para la transferencia
            </h4>

            {bankDetails.alias && (
                <CopyableValue label="Alias" value={bankDetails.alias} field="alias" copiedField={copiedField} onCopy={onCopy} accentColor={accentColor} />
            )}
            {bankDetails.cbu && (
                <CopyableValue label="CBU" value={bankDetails.cbu} field="cbu" copiedField={copiedField} onCopy={onCopy} accentColor={accentColor} />
            )}

            {[['Titular', bankDetails.titular], ['Banco', bankDetails.banco]].map(([label, value]) => (
                <div key={label}>
                    <span style={labelStyle}>{label}</span>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', overflowWrap: 'break-word' }}>
                        {value || '-'}
                    </div>
                </div>
            ))}
        </div>
    );
}
