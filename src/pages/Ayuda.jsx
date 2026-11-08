import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, X, ChevronDown, User, Store, MessageCircle, Mail, MapPin, Clock } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import HelpChat from '../components/help/HelpChat';
import { STATIC_PAGES, staticPageUrl } from '../utils/seo';
import { HELP_TOPICS, ALL_HELP_FAQS, HELP_WHATSAPP_URL } from '../data/helpCenter';
import { buildIndex, rankFaqs, normalize } from '../utils/helpMatcher';
import '../styles/support.css';

const QUICK_SEARCHES = ['seña', 'cancelar', 'lluvia', 'precios'];

function FaqList({ faqs }) {
    const [openIndex, setOpenIndex] = useState(null);
    return (
        <div className="sp-faq">
            {faqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                    <div key={faq.q} className={`sp-faq-item${isOpen ? ' is-open' : ''}`}>
                        <button type="button" className="sp-faq-q" aria-expanded={isOpen} onClick={() => setOpenIndex(isOpen ? null : index)}>
                            <span>{faq.q}</span>
                            <ChevronDown size={20} aria-hidden="true" />
                        </button>
                        <AnimatePresence initial={false}>
                            {isOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div className="sp-faq-a">{faq.a}</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}

export default function HelpCenter() {
    const [audience, setAudience] = useState('clientes'); // 'clientes' | 'negocios'
    const [query, setQuery] = useState('');
    const [topicId, setTopicId] = useState(null);

    const topics = HELP_TOPICS[audience];
    const topic = topics.find(t => t.id === topicId) || null;
    const popular = useMemo(() => topics.slice(0, 4).map(t => t.faqs[0]), [topics]);
    const searchIndex = useMemo(() => buildIndex(ALL_HELP_FAQS), []);

    // Search covers both audiences: literal matches first, then the assistant's matcher for other wordings
    const results = useMemo(() => {
        const q = normalize(query).trim();
        if (!q) return null;
        const literal = ALL_HELP_FAQS.filter(f => normalize(`${f.q} ${f.a}`).includes(q));
        const smart = rankFaqs(searchIndex, query).map(r => ALL_HELP_FAQS.find(f => f.q === r.faq.q));
        return [...new Set([...literal, ...smart])].slice(0, 8);
    }, [query, searchIndex]);

    const selectAudience = (next) => {
        setAudience(next);
        setTopicId(null);
    };

    // Schema.org FAQPage for Google Rich Snippets
    const faqSchema = useMemo(() => ({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': ALL_HELP_FAQS.map(faq => ({
            '@type': 'Question',
            'name': faq.q,
            'acceptedAnswer': { '@type': 'Answer', 'text': faq.a }
        }))
    }), []);

    return (
        <div className="sp-page">
            <SEOHead
                {...STATIC_PAGES.ayuda}
                url={staticPageUrl('ayuda')}
                schema={faqSchema}
            />

            <header className="sp-hero sp-hero--center hp-hero">
                <div className="sp-wrap sp-wrap--narrow">
                    <span className="sp-eyebrow">Centro de ayuda</span>
                    <h1 className="sp-title">¿En qué te ayudamos?</h1>

                    <div className="sp-search">
                        <Search size={18} aria-hidden="true" />
                        <input
                            type="search"
                            aria-label="Buscar preguntas"
                            placeholder="Buscá: seña, cancelar, precios..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                            <button type="button" className="sp-search-clear" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    <div className="hp-chips">
                        {QUICK_SEARCHES.map(c => (
                            <button key={c} type="button" className="hp-chip" onClick={() => setQuery(c)}>{c}</button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="sp-wrap">
                {results ? (
                    <section className="hp-block">
                        <h2 className="hp-h2">
                            {results.length ? `${results.length} resultado${results.length === 1 ? '' : 's'} para "${query}"` : `Sin resultados para "${query}"`}
                        </h2>
                        {results.length > 0 ? (
                            <FaqList key={query} faqs={results} />
                        ) : (
                            <p className="sp-meta">Probá con otras palabras o preguntale al asistente de abajo a la derecha.</p>
                        )}
                    </section>
                ) : (
                    <>
                        <div className="sp-tabs hp-tabs" role="tablist">
                            <button type="button" role="tab" aria-selected={audience === 'clientes'} className={`sp-tab${audience === 'clientes' ? ' is-active' : ''}`} onClick={() => selectAudience('clientes')}>
                                <User size={16} aria-hidden="true" /> Para clientes
                            </button>
                            <button type="button" role="tab" aria-selected={audience === 'negocios'} className={`sp-tab${audience === 'negocios' ? ' is-active' : ''}`} onClick={() => selectAudience('negocios')}>
                                <Store size={16} aria-hidden="true" /> Para negocios
                            </button>
                        </div>

                        <div className="hp-topic-grid">
                            {topics.map(t => {
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        className={`hp-topic${topicId === t.id ? ' is-active' : ''}`}
                                        aria-pressed={topicId === t.id}
                                        onClick={() => setTopicId(topicId === t.id ? null : t.id)}
                                    >
                                        <span className="sp-icon"><Icon size={20} aria-hidden="true" /></span>
                                        <strong>{t.title}</strong>
                                        <span>{t.blurb}</span>
                                        <small>{t.faqs.length} pregunta{t.faqs.length === 1 ? '' : 's'}</small>
                                    </button>
                                );
                            })}
                        </div>

                        <section className="hp-block">
                            <h2 className="hp-h2">{topic ? topic.title : 'Lo más consultado'}</h2>
                            <FaqList key={`${audience}-${topic?.id || 'popular'}`} faqs={topic ? topic.faqs : popular} />
                            {audience === 'negocios' && (
                                <p className="sp-meta" style={{ marginTop: '20px' }}>
                                    ¿Querés sumar tu negocio? <Link to="/negocios#sumate" style={{ color: 'var(--sp-accent-text)', fontWeight: 700 }}>Dejanos tus datos</Link> y probalo 14 días gratis.
                                </p>
                            )}
                        </section>
                    </>
                )}

                <section className="hp-contact">
                    <div>
                        <h2>¿No encontraste lo que buscabas?</h2>
                        <p><MapPin size={14} aria-hidden="true" /> Somos de La Rioja · <Clock size={14} aria-hidden="true" /> Te respondemos por WhatsApp o por correo</p>
                    </div>
                    <div className="sp-actions">
                        <a className="sp-btn sp-btn--primary" href={HELP_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                            <MessageCircle size={18} aria-hidden="true" /> WhatsApp
                        </a>
                        <a className="sp-btn" href="mailto:consultas@turnitoslr.com">
                            <Mail size={18} aria-hidden="true" /> Correo
                        </a>
                    </div>
                </section>
            </main>

            <HelpChat faqs={ALL_HELP_FAQS} whatsappUrl={HELP_WHATSAPP_URL} />
        </div>
    );
}
