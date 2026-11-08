import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { buildIndex, rankFaqs, detectIntent } from '../../utils/helpMatcher';

// Help assistant without AI: it answers only with our own texts and hands off to WhatsApp otherwise
const SUGGESTIONS = ['¿Cómo reservo?', '¿Cómo pago la seña?', 'Quiero cancelar', 'Tengo un negocio, ¿cuánto cuesta?'];

const HANDOFF_TEXT = 'No tengo esa respuesta a mano. Continuemos por WhatsApp y te ayuda una persona del equipo.';

export default function HelpChat({ faqs, whatsappUrl }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [messages, setMessages] = useState([
        { id: 0, from: 'bot', text: '¡Hola! Soy el asistente de TurnitosLR. Escribime tu duda como te salga y te ayudo.' }
    ]);
    const index = useMemo(() => buildIndex(faqs), [faqs]);
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const nextId = useRef(1);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, typing, open]);

    useEffect(() => {
        if (open) inputRef.current?.focus({ preventScroll: true });
    }, [open]);

    const push = (...items) => setMessages(m => [...m, ...items.map(it => ({ id: nextId.current++, ...it }))]);

    const replyTo = (question) => {
        const ranked = rankFaqs(index, question);
        const intent = detectIntent(question);
        const strong = ranked[0] && ranked[0].hits >= 2;

        if (intent === 'human') return { text: 'Dale, te paso con una persona del equipo por WhatsApp.', handoff: true };
        if (strong || (ranked[0] && intent !== 'business_info')) {
            const [best, ...rest] = ranked;
            return { title: best.faq.q, text: best.faq.a, feedback: true, related: rest.slice(0, 2).map(r => r.faq.q) };
        }
        if (intent === 'business_info') {
            return { text: 'Eso depende de cada lugar. Entrá al perfil del negocio: ahí ves la dirección, los horarios, las comodidades y las fotos, y podés escribirle por WhatsApp con el botón verde.' };
        }
        if (intent === 'thanks') return { text: '¡De nada! Si te queda otra duda, escribime.' };
        if (intent === 'greeting') return { text: '¡Hola! Contame qué necesitás: reservar, pagar una seña, cancelar, o sumar tu negocio.' };
        return { text: HANDOFF_TEXT, handoff: true };
    };

    const ask = (text) => {
        const question = text.trim();
        if (!question || typing) return;
        push({ from: 'user', text: question });
        setInput('');
        setTyping(true);
        // A short pause so the answer feels like a reply, not a page jump
        setTimeout(() => {
            setTyping(false);
            push({ from: 'bot', ...replyTo(question) });
        }, 450);
    };

    const answerFeedback = (msgId, useful) => {
        setMessages(m => m.map(msg => (msg.id === msgId ? { ...msg, feedback: false } : msg)));
        push(useful
            ? { from: 'bot', text: '¡Genial! ¿Te ayudo con algo más?' }
            : { from: 'bot', text: 'Perdón. Continuemos por WhatsApp así te ayuda una persona.', handoff: true });
    };

    return (
        <>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="hc-panel"
                        role="dialog"
                        aria-label="Asistente de ayuda"
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="hc-head">
                            <span className="hc-avatar" aria-hidden="true"><MessageCircle size={18} /></span>
                            <div>
                                <strong>Asistente TurnitosLR</strong>
                                <span>Respuestas al instante</span>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18} /></button>
                        </div>
                        <div className="hc-list" ref={listRef} aria-live="polite">
                            {messages.map((m) => (
                                <div key={m.id} className={`hc-msg hc-msg--${m.from}`}>
                                    {m.title && <strong>{m.title}</strong>}
                                    <p>{m.text}</p>
                                    {m.handoff && (
                                        <a className="hc-wa" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                            <MessageCircle size={16} aria-hidden="true" /> Continuemos por WhatsApp
                                        </a>
                                    )}
                                    {m.feedback && (
                                        <div className="hc-feedback">
                                            <span>¿Te sirvió?</span>
                                            <button type="button" onClick={() => answerFeedback(m.id, true)}><ThumbsUp size={14} aria-hidden="true" /> Sí</button>
                                            <button type="button" onClick={() => answerFeedback(m.id, false)}><ThumbsDown size={14} aria-hidden="true" /> No</button>
                                        </div>
                                    )}
                                    {m.related?.length > 0 && (
                                        <div className="hc-related">
                                            {m.related.map(q => <button key={q} type="button" onClick={() => ask(q)}>{q}</button>)}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {typing && (
                                <div className="hc-msg hc-msg--bot hc-typing" aria-label="Escribiendo">
                                    <span /><span /><span />
                                </div>
                            )}
                            {messages.length === 1 && !typing && (
                                <div className="hc-suggestions">
                                    {SUGGESTIONS.map(s => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}
                                </div>
                            )}
                        </div>
                        <form className="hc-form" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
                            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribí tu pregunta..." aria-label="Tu pregunta" maxLength={300} />
                            <button type="submit" aria-label="Enviar" disabled={!input.trim() || typing}><Send size={18} /></button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
            <button type="button" className={`hc-fab${open ? ' is-open' : ''}`} onClick={() => setOpen(o => !o)} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de ayuda'}>
                {open ? <X size={24} /> : <><MessageCircle size={22} /><span>¿Te ayudo?</span></>}
            </button>
        </>
    );
}
