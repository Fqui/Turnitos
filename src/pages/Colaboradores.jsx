import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Colaboradores() {
    const navigate = useNavigate();

    const commissionStructure = [
        { period: 'Mes 1', rate: '40%', color: '#10B981', description: 'Primer mes del cliente' },
        { period: 'Mes 2', rate: '30%', color: '#3B82F6', description: 'Segundo mes del cliente' },
        { period: 'Mes 3', rate: '20%', color: '#F59E0B', description: 'Tercer mes del cliente' },
        { period: 'Meses 4-6', rate: '10%', color: '#8B5CF6', description: 'Del cuarto al sexto mes' },
        { period: 'Mes 7+', rate: '0%', color: '#EF4444', description: 'A partir del séptimo mes' }
    ];

    const benefits = [
        'Comisión del 40% en el primer mes de cada cliente nuevo',
        'Comisión decreciente hasta el mes 6 (30%, 20%, 10%)',
        'Bonus del +5% adicional si tienes 50+ clientes activos en el mes',
        'Sin límite de clientes que puedes sumar',
        'Capacitación completa sobre el sistema',
        'Material de ventas y presentaciones listas',
        'Dashboard para seguimiento de tus comisiones en tiempo real',
        'Soporte técnico para tus clientes'
    ];

    const exampleScenarios = [
        {
            clients: 5,
            avgPrice: 10000,
            month1: 20000, // 5 * 10000 * 0.4
            month2: 15000, // 5 * 10000 * 0.3
            month3: 10000, // 5 * 10000 * 0.2
            description: 'Inicio conservador'
        },
        {
            clients: 15,
            avgPrice: 10000,
            month1: 60000, // 15 * 10000 * 0.4
            month2: 45000, // 15 * 10000 * 0.3
            month3: 30000, // 15 * 10000 * 0.2
            description: 'Crecimiento medio'
        },
        {
            clients: 50,
            avgPrice: 10000,
            month1: 210000, // 50 * 10000 * 0.4 * 1.05 (bonus)
            month2: 157500, // 50 * 10000 * 0.3 * 1.05 (bonus)
            month3: 105000, // 50 * 10000 * 0.2 * 1.05 (bonus)
            description: 'Con bonus del 5%'
        }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-main)',
            paddingBottom: '80px'
        }}>
            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '80px 20px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    ←
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 style={{
                        fontSize: 'clamp(32px, 5vw, 56px)',
                        fontWeight: '900',
                        color: '#fff',
                        marginBottom: '20px',
                        textShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        Sé Colaborador de Turnitos
                    </h1>
                    <p style={{
                        fontSize: 'clamp(16px, 2.5vw, 24px)',
                        color: 'rgba(255,255,255,0.95)',
                        maxWidth: '700px',
                        margin: '0 auto 40px',
                        lineHeight: '1.6'
                    }}>
                        Ayuda a negocios a crecer mientras generas ingresos recurrentes
                    </p>
                    <button
                        onClick={() => window.location.href = 'mailto:consultas@turnitoslr.com?subject=Consulta Colaboradores'}
                        style={{
                            background: '#fff',
                            color: '#667eea',
                            border: 'none',
                            padding: '16px 40px',
                            borderRadius: '50px',
                            fontSize: '18px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Quiero ser Colaborador
                    </button>
                </motion.div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}>

                {/* ¿Qué es Turnitos? */}
                <section style={{ marginBottom: '80px' }}>
                    <h2 style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        ¿Qué es Turnitos?
                    </h2>
                    <p style={{
                        fontSize: '18px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        maxWidth: '800px',
                        margin: '0 auto 40px',
                        lineHeight: '1.8'
                    }}>
                        Turnitos es la plataforma líder en gestión de reservas y turnos para negocios en Argentina.
                        Ayudamos a canchas deportivas, spas, salones de belleza, quinchos y todo tipo de negocios
                        a digitalizar su gestión, aumentar sus reservas y mejorar la experiencia de sus clientes.
                    </p>

                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '40px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                    }}>
                        <h3 style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            marginBottom: '20px'
                        }}>
                            Nuestra Visión
                        </h3>
                        <p style={{
                            fontSize: '16px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.8',
                            marginBottom: '20px'
                        }}>
                            Queremos ser la solución #1 en Latinoamérica para la gestión de reservas,
                            facilitando que cualquier negocio pueda ofrecer una experiencia digital
                            de primer nivel a sus clientes.
                        </p>
                        <p style={{
                            fontSize: '16px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.8'
                        }}>
                            <strong>Nuestro objetivo:</strong> Llegar a 10,000 negocios activos en los próximos 2 años,
                            y para eso necesitamos colaboradores como vos que conozcan el mercado local y puedan
                            conectar con negocios que necesitan nuestra solución.
                        </p>
                    </div>
                </section>

                {/* Lo que Ofrecemos */}
                <section style={{ marginBottom: '80px' }}>
                    <h2 style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        marginBottom: '50px'
                    }}>
                        Lo que Ofrecemos
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '30px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                padding: '30px',
                                border: '1px solid var(--border)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📱</div>
                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                marginBottom: '10px'
                            }}>
                                Sistema Completo
                            </h3>
                            <p style={{
                                fontSize: '15px',
                                color: 'var(--text-secondary)',
                                lineHeight: '1.6'
                            }}>
                                Plataforma web moderna con calendario, gestión de reservas y pagos integrados
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                padding: '30px',
                                border: '1px solid var(--border)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>💰</div>
                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                marginBottom: '10px'
                            }}>
                                Comisiones Decrecientes
                            </h3>
                            <p style={{
                                fontSize: '15px',
                                color: 'var(--text-secondary)',
                                lineHeight: '1.6'
                            }}>
                                40% en el primer mes, luego 30%, 20% y 10% hasta el mes 6
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                padding: '30px',
                                border: '1px solid var(--border)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎯</div>
                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                marginBottom: '10px'
                            }}>
                                Soporte Continuo
                            </h3>
                            <p style={{
                                fontSize: '15px',
                                color: 'var(--text-secondary)',
                                lineHeight: '1.6'
                            }}>
                                Capacitación completa y acompañamiento en cada venta
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                padding: '30px',
                                border: '1px solid var(--border)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📈</div>
                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                marginBottom: '10px'
                            }}>
                                Bonus por Volumen
                            </h3>
                            <p style={{
                                fontSize: '15px',
                                color: 'var(--text-secondary)',
                                lineHeight: '1.6'
                            }}>
                                +5% adicional si tenés 50+ clientes activos en el mes
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Estructura de Comisiones */}
                <section style={{ marginBottom: '80px' }}>
                    <h2 style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        Estructura de Comisiones
                    </h2>
                    <p style={{
                        fontSize: '18px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        maxWidth: '700px',
                        margin: '0 auto 40px',
                        lineHeight: '1.6'
                    }}>
                        Gana comisiones por cada cliente que sumes durante los primeros 6 meses.
                        Cuanto más temprano, mayor es tu comisión.
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '20px',
                        marginBottom: '40px'
                    }}>
                        {commissionStructure.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: 'var(--bg-card)',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    border: `2px solid ${item.color}`,
                                    textAlign: 'center',
                                    position: 'relative'
                                }}
                            >
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '8px'
                                }}>
                                    {item.period}
                                </div>
                                <div style={{
                                    fontSize: '42px',
                                    fontWeight: '900',
                                    color: item.color,
                                    marginBottom: '8px'
                                }}>
                                    {item.rate}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    opacity: 0.8
                                }}>
                                    {item.description}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Ejemplos de Ingresos */}
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '30px',
                        border: '1px solid var(--border)',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            Ejemplos de Ingresos
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '20px'
                        }}>
                            {exampleScenarios.map((scenario, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: index === 2 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(0,0,0,0.02)',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        border: index === 2 ? 'none' : '1px solid var(--border)'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: index === 2 ? '#fff' : 'var(--text-secondary)',
                                        marginBottom: '12px'
                                    }}>
                                        {scenario.clients} clientes
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: index === 2 ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)',
                                        marginBottom: '12px'
                                    }}>
                                        {scenario.description}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: index === 2 ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
                                        marginBottom: '4px'
                                    }}>
                                        Mes 1: <strong style={{ color: index === 2 ? '#fff' : 'var(--primary-paddle)' }}>${scenario.month1.toLocaleString()}</strong>
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: index === 2 ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
                                        marginBottom: '4px'
                                    }}>
                                        Mes 2: <strong style={{ color: index === 2 ? '#fff' : 'var(--primary-paddle)' }}>${scenario.month2.toLocaleString()}</strong>
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: index === 2 ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)'
                                    }}>
                                        Mes 3: <strong style={{ color: index === 2 ? '#fff' : 'var(--primary-paddle)' }}>${scenario.month3.toLocaleString()}</strong>
                                    </div>
                                    {index === 2 && (
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '8px',
                                            background: 'rgba(255,255,255,0.2)',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            color: '#fff',
                                            fontWeight: '600'
                                        }}>
                                            🎉 Incluye bonus del 5%
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        background: '#FEF3C7',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid #FCD34D'
                    }}>
                        <p style={{
                            fontSize: '14px',
                            color: '#92400E',
                            margin: 0,
                            textAlign: 'center'
                        }}>
                            💡 <strong>Nota:</strong> Las comisiones se calculan sobre el precio de suscripción mensual de cada cliente (promedio $10,000/mes)
                        </p>
                    </div>
                </section>

                {/* Beneficios */}
                <section style={{ marginBottom: '80px' }}>
                    <h2 style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        marginBottom: '40px'
                    }}>
                        Beneficios para Colaboradores
                    </h2>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '40px',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '20px'
                        }}>
                            {benefits.map((benefit, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '15px'
                                    }}
                                >
                                    <div style={{
                                        background: '#667eea',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        flexShrink: 0
                                    }}>
                                        ✓
                                    </div>
                                    <p style={{
                                        fontSize: '16px',
                                        color: 'var(--text-secondary)',
                                        margin: 0,
                                        lineHeight: '1.6'
                                    }}>
                                        {benefit}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Final */}
                <section style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '24px',
                    padding: '60px 40px',
                    textAlign: 'center',
                    color: '#fff'
                }}>
                    <h2 style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        marginBottom: '20px'
                    }}>
                        ¿Listo para Empezar?
                    </h2>
                    <p style={{
                        fontSize: '18px',
                        marginBottom: '40px',
                        opacity: 0.95,
                        maxWidth: '600px',
                        margin: '0 auto 40px'
                    }}>
                        Únete a nuestro equipo de colaboradores y comienza a generar ingresos recurrentes
                        ayudando a negocios a crecer.
                    </p>
                    <button
                        onClick={() => window.location.href = 'mailto:consultas@turnitoslr.com?subject=Quiero ser Colaborador'}
                        style={{
                            background: '#fff',
                            color: '#667eea',
                            border: 'none',
                            padding: '18px 50px',
                            borderRadius: '50px',
                            fontSize: '18px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        Contactar Ahora
                    </button>
                </section>
            </div>
        </div>
    );
}
