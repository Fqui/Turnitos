import React, { useState, useEffect } from 'react';
import supabaseService from '../services/supabaseService';
import './SubscriptionManager.css';

const SubscriptionManager = ({ businessId, businessType, business }) => {
    const [subscription, setSubscription] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [actualSpacesUsed, setActualSpacesUsed] = useState(0);

    useEffect(() => {
        loadSubscriptionData();
    }, [businessId, businessType]);

    useEffect(() => {
        // Calculate actual spaces used from business data
        if (business) {
            const isSport = business.type === 'sport' || business.type === 'venue';
            const count = isSport
                ? (business.courts?.length || 0)
                : (business.specialists?.length || 0);
            setActualSpacesUsed(count);
        }
    }, [business]);

    const loadSubscriptionData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load current subscription
            const currentSub = await supabaseService.getSubscription(businessId);
            setSubscription(currentSub);

            // Load available plans for this business type
            const availablePlans = await supabaseService.getSubscriptionPlans(businessType);
            setPlans(availablePlans);

        } catch (err) {
            console.error('Error loading subscription data:', err);
            setError('Error al cargar información de suscripción');
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (planId) => {
        if (!confirm('¿Estás seguro de cambiar tu plan de suscripción?')) {
            return;
        }

        try {
            setLoading(true);
            await supabaseService.updateSubscription(businessId, planId);
            await loadSubscriptionData();

            // ✅ Notify parent component to refresh business data
            if (business?.onSubscriptionUpdate) {
                await business.onSubscriptionUpdate();
            }

            alert('¡Plan actualizado exitosamente!');
        } catch (err) {
            console.error('Error updating subscription:', err);
            alert('Error al actualizar el plan: ' + err.message);
        } finally {
            setLoading(false);
        }
    };


    const getPlanBadge = (plan) => {
        if (!subscription) return null;
        if (plan.id === subscription.plan_name) {
            return <span className="badge badge-current">Plan Actual</span>;
        }
        if (plan.spaces > subscription.spaces_included) {
            return <span className="badge badge-upgrade">Upgrade</span>;
        }
        return null;
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    };

    if (loading) {
        return <div className="subscription-manager loading">Cargando...</div>;
    }

    if (error) {
        return <div className="subscription-manager error">{error}</div>;
    }

    return (
        <div className="subscription-manager">
            {/* Current Subscription Summary */}
            {subscription && (
                <div className="current-subscription">
                    <h3>Tu Suscripción Actual</h3>
                    <div className="subscription-card">
                        <div className="subscription-header">
                            <h4>{subscription.plan_name}</h4>
                            <span className={`status status-${subscription.status}`}>
                                {subscription.status === 'active' ? 'Activo' : subscription.status}
                            </span>
                        </div>
                        <div className="subscription-details">
                            <div className="detail-item">
                                <span className="label">Espacios incluidos:</span>
                                <span className="value">{subscription.spaces_included}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Espacios en uso:</span>
                                <span className="value">
                                    {actualSpacesUsed} / {subscription.spaces_included}
                                    {actualSpacesUsed >= subscription.spaces_included && (
                                        <span className="warning"> ⚠️ Límite alcanzado</span>
                                    )}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Precio mensual:</span>
                                <span className="value price">{formatPrice(subscription.monthly_price)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Próxima facturación:</span>
                                <span className="value">{new Date(subscription.next_billing_date).toLocaleDateString('es-AR')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Available Plans */}
            <div className="available-plans">
                <h3>Planes Disponibles</h3>
                <div className="plans-grid">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`plan-card ${subscription?.plan_name === plan.id ? 'current' : ''}`}
                        >
                            <div className="plan-header">
                                <h4>{plan.name}</h4>
                                {getPlanBadge(plan)}
                            </div>
                            <div className="plan-price">
                                <span className="amount">{formatPrice(plan.monthly_price)}</span>
                                <span className="period">/mes</span>
                            </div>
                            <div className="plan-features">
                                <div className="feature">
                                    <span className="icon">✓</span>
                                    <span>{plan.spaces} {businessType === 'sport' ? 'canchas' : businessType === 'service' ? 'especialistas' : 'espacios'}</span>
                                </div>
                                {plan.price_per_space && (
                                    <div className="feature secondary">
                                        <span className="icon">💰</span>
                                        <span>{formatPrice(plan.price_per_space)} por espacio</span>
                                    </div>
                                )}
                                {plan.features && Object.entries(plan.features).map(([key, value]) => (
                                    value && (
                                        <div key={key} className="feature">
                                            <span className="icon">✓</span>
                                            <span>{key === 'support' ? `Soporte ${value}` :
                                                key === 'analytics' ? 'Analytics avanzado' :
                                                    key === 'custom_features' ? 'Features personalizados' :
                                                        value}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                            {subscription?.plan_name !== plan.id && (
                                <button
                                    className="btn-select-plan"
                                    onClick={() => handleUpgrade(plan.id)}
                                    disabled={loading}
                                >
                                    {plan.spaces > (subscription?.spaces_included || 0) ? 'Actualizar Plan' : 'Cambiar Plan'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Usage Warning */}
            {subscription && actualSpacesUsed >= subscription.spaces_included && (
                <div className="usage-warning">
                    <h4>⚠️ Límite de espacios alcanzado</h4>
                    <p>
                        Has alcanzado el límite de {subscription.spaces_included} espacios de tu plan actual.
                        Para agregar más {businessType === 'sport' ? 'canchas' : businessType === 'service' ? 'especialistas' : 'espacios'},
                        necesitas actualizar tu plan.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SubscriptionManager;
