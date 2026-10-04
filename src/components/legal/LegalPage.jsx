import React from 'react';
import { ChevronDown, MessageCircle, Mail } from 'lucide-react';
import SEOHead from '../SEOHead';
import '../../styles/support.css';

// En escritorio el índice queda siempre abierto; en celular arranca cerrado para no tapar el texto
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches;

/**
 * Layout compartido de Términos y Privacidad: encabezado, índice y secciones numeradas.
 * sections: [{ id, title, content }]
 */
export default function LegalPage({ seo, eyebrow, title, lastUpdated, sections, contact }) {
    return (
        <div className="sp-page">
            <SEOHead {...seo} />

            <header className="sp-hero">
                <div className="sp-wrap">
                    <span className="sp-eyebrow">{eyebrow}</span>
                    <h1 className="sp-title">{title}</h1>
                    <p className="sp-meta">Última actualización: {lastUpdated}</p>
                </div>
            </header>

            <div className="sp-wrap">
                <div className="sp-legal">
                    <details className="sp-toc" open={isDesktop()}>
                        <summary>
                            Contenido <ChevronDown size={18} aria-hidden="true" />
                        </summary>
                        <ol>
                            {sections.map((section, index) => (
                                <li key={section.id}>
                                    <a href={`#${section.id}`}>{index + 1}. {section.title}</a>
                                </li>
                            ))}
                        </ol>
                    </details>

                    <article className="sp-prose">
                        {sections.map((section, index) => (
                            <section key={section.id} id={section.id}>
                                <h2><span>{index + 1}.</span> {section.title}</h2>
                                {section.content}
                            </section>
                        ))}

                        <aside className="sp-contact" style={{ textAlign: 'left' }}>
                            <h3>{contact.title}</h3>
                            <p style={{ margin: 0 }}>{contact.text}</p>
                            <div className="sp-actions" style={{ justifyContent: 'flex-start' }}>
                                <a className="sp-btn" href={contact.mailto}>
                                    <Mail size={18} aria-hidden="true" /> consultas@turnitoslr.com
                                </a>
                                <a className="sp-btn" href={contact.whatsapp} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle size={18} aria-hidden="true" /> WhatsApp
                                </a>
                            </div>
                        </aside>
                    </article>
                </div>
            </div>
        </div>
    );
}
