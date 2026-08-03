import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer({ minimal = false }) {
    if (minimal) {
        return (
            <div style={{
                padding: '24px 20px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                marginTop: 'auto',
                borderTop: '1px solid var(--border)'
            }}>
                © {new Date().getFullYear()} TurnitosLR. Todos los derechos reservados. Hecho con ❤️ en La Rioja.
            </div>
        );
    }

    return (
        <footer style={{
            backgroundColor: '#1A1A1A',
            color: '#fff',
            padding: '60px 20px 20px',
            marginTop: 'auto'
        }}>
            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '40px',
                    marginBottom: '40px',
                    justifyContent: 'space-between'
                }}>
                    {/* Brand Section */}
                    <div style={{ flex: '1 1 250px' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', background: 'linear-gradient(45deg, #00E676, #2979FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            TurnitosLR
                        </h3>
                        <p style={{ color: '#A0A0A0', fontSize: '14px', lineHeight: '1.6' }}>
                            Simplificamos tus reservas de canchas, belleza y salud en La Rioja. Todo en un solo lugar.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div style={{ flex: '1 1 150px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Explorar</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <li><Link to="/" style={{ color: '#A0A0A0', textDecoration: 'none', fontSize: '14px' }}>Inicio</Link></li>
                            <li><Link to="/?category=deportes" style={{ color: '#A0A0A0', textDecoration: 'none', fontSize: '14px' }}>Deportes</Link></li>
                            <li><Link to="/?category=belleza" style={{ color: '#A0A0A0', textDecoration: 'none', fontSize: '14px' }}>Belleza</Link></li>
                            <li><Link to="/?category=quinchos" style={{ color: '#A0A0A0', textDecoration: 'none', fontSize: '14px' }}>Quinchos</Link></li>
                            <li><Link to="/?category=salud" style={{ color: '#A0A0A0', textDecoration: 'none', fontSize: '14px' }}>Salud</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div style={{ flex: '1 1 150px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Soporte</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <li><Link to="/ayuda" style={{ color: '#A0A0A0', textDecoration: 'none', fontSize: '14px' }}>Centro de Ayuda</Link></li>
                            <li><Link to="/negocios" style={{ color: '#A0A0A0', textDecoration: 'none', fontSize: '14px' }}>Para Negocios</Link></li>
                            <li><Link to="/portal" style={{ color: '#A0A0A0', textDecoration: 'none', fontSize: '14px' }}>Iniciar Sesión</Link></li>
                            <li><span style={{ color: '#A0A0A0', fontSize: '14px', cursor: 'pointer' }}>Términos y Condiciones</span></li>
                            <li><span style={{ color: '#A0A0A0', fontSize: '14px', cursor: 'pointer' }}>Política de Privacidad</span></li>
                        </ul>
                    </div>

                    {/* Contact & Social */}
                    <div style={{ flex: '1 1 200px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Contacto</h4>
                        <p style={{ color: '#A0A0A0', fontSize: '14px', marginBottom: '8px' }}>📧 hola@turnitoslr.com</p>
                        <p style={{ color: '#A0A0A0', fontSize: '14px', marginBottom: '20px' }}>📱 +54 9 380 4123456</p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            {/* Instagram */}
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </a>

                            {/* Facebook */}
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: '#1877F2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>

                            {/* WhatsApp */}
                            <a href="https://wa.me/5493804123456" target="_blank" rel="noopener noreferrer" style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: '#25D366',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '20px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '13px'
                }}>
                    © {new Date().getFullYear()} TurnitosLR. Todos los derechos reservados. Hecho con ❤️ en La Rioja.
                </div>
            </div>
        </footer>
    );
}
