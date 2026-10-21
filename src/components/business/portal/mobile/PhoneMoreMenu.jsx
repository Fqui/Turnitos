import React from 'react';
import {
    Copy, Wallet, BarChart3, CreditCard, Users, Moon, Sun, HelpCircle, LogOut,
    ChevronRight, Bell, BellOff, Smartphone, Receipt
} from 'lucide-react';
import ShareButton from '../../../common/ShareButton';
import { buildBusinessShareUrl, copyText } from '../../../../utils/share';
import { getBillingInfo } from '../../../../utils/billingUtils';

const SUPPORT_WHATSAPP = '5493805002706';

function Row({ icon: Icon, title, subtitle, value, onClick, href, danger, chevron = true }) {
    const content = (
        <>
            <span className="pm-item-ic">{Icon && <Icon size={20} aria-hidden="true" />}</span>
            <span className="pm-item-tx">
                <b>{title}</b>
                {subtitle && <span>{subtitle}</span>}
            </span>
            {value && <span className="pm-item-val">{value}</span>}
            {chevron && <ChevronRight size={18} className="pm-item-chev" aria-hidden="true" />}
        </>
    );
    const className = `pm-item${danger ? ' is-danger' : ''}`;
    if (href) {
        return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
    }
    return <button type="button" className={className} onClick={onClick}>{content}</button>;
}

// Menú "Más" en celular: el link del negocio arriba y el resto de las secciones en filas
export default function PhoneMoreMenu({
    business,
    isSport,
    theme,
    toggleTheme,
    onNavigate,
    onLogout,
    showToast,
    notifGranted,
    onToggleNotifications,
    canInstall,
    onInstall
}) {
    const slug = business?.slug;
    const url = buildBusinessShareUrl(slug);
    const billing = getBillingInfo(business, business?.subscription || (Array.isArray(business?.subscriptions) ? business.subscriptions[0] : null));

    let planText = billing.label;
    if (billing.status === 'trial' && billing.daysToDue !== null) {
        planText = billing.daysToDue >= 0
            ? `Prueba gratis · ${billing.daysToDue === 1 ? 'queda 1 día' : `quedan ${billing.daysToDue} días`}`
            : 'Prueba gratis terminada';
    }
    const planWarn = ['due_soon', 'grace', 'overdue', 'trial_expired'].includes(billing.status) ||
        (billing.status === 'trial' && billing.daysToDue !== null && billing.daysToDue <= 3);

    return (
        <div className="pm-stack">
            {url && (
                <div className="pm-link-card">
                    <small>Tu link para compartir</small>
                    <span className="pm-link-url"><em>{slug}</em>.turnitoslr.com</span>
                    <div className="pm-link-acts">
                        <button
                            type="button"
                            onClick={async () => {
                                const ok = await copyText(url);
                                showToast(ok ? 'Link copiado' : 'No se pudo copiar el link', ok ? 'success' : 'error');
                            }}
                        >
                            <Copy size={18} aria-hidden="true" /> Copiar
                        </button>
                        <div className="pm-link-share">
                            <ShareButton
                                url={url}
                                title={business?.name}
                                text={`Reservá en ${business?.name || 'mi negocio'}`}
                                image={business?.logo || business?.image}
                                label="Compartir"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="pm-group">
                {isSport && <Row icon={Wallet} title="Registro de caja" onClick={() => onNavigate('caja')} />}
                {isSport && <Row icon={Users} title="Clientes" onClick={() => onNavigate('customers')} />}
                <Row icon={BarChart3} title="Estadísticas" subtitle="Turnos, ingresos y horarios más pedidos" onClick={() => onNavigate('analytics')} />
            </div>

            <section className="pm-set-group">
                <h3 className="pm-sec-label">Suscripción</h3>
                <div className="pm-group">
                    <Row
                        icon={CreditCard}
                        title="Mi plan"
                        subtitle={planWarn ? null : planText}
                        value={planWarn ? planText : null}
                        onClick={() => onNavigate('subscription')}
                    />
                    <Row
                        icon={Receipt}
                        title="Comisiones del mes"
                        subtitle="Reservas que llegaron desde TurnitosLR"
                        onClick={() => onNavigate('subscription')}
                    />
                </div>
            </section>

            <div className="pm-group">
                <Row
                    icon={notifGranted ? Bell : BellOff}
                    title="Avisos de reservas"
                    subtitle={notifGranted ? 'Activos en este celular' : 'Desactivados en este celular'}
                    onClick={onToggleNotifications}
                    chevron={false}
                />
                {canInstall && (
                    <Row icon={Smartphone} title="Instalar la app" subtitle="Abrí el panel desde tu pantalla de inicio" onClick={onInstall} chevron={false} />
                )}
                <Row
                    icon={theme === 'dark' ? Moon : Sun}
                    title="Tema"
                    subtitle={theme === 'dark' ? 'Oscuro' : 'Claro'}
                    onClick={toggleTheme}
                    chevron={false}
                />
                <Row
                    icon={HelpCircle}
                    title="Ayuda por WhatsApp"
                    subtitle="380 500-2706"
                    href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hola! Necesito ayuda con el panel de ${business?.name || 'mi negocio'}`)}`}
                />
                <Row icon={LogOut} title="Cerrar sesión" onClick={onLogout} danger chevron={false} />
            </div>
        </div>
    );
}
