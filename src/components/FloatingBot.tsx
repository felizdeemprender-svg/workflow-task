"use client";

import React, { useState } from 'react';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

export const FloatingBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isTyping) return;

        const userMsg = query;
        const currentHistory = [...messages];
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setQuery("");
        setIsTyping(true);

        try {
            const askAI = httpsCallable(functions, 'generalChat');
            const result = await askAI({ query: userMsg, history: currentHistory });
            const botReply = (result.data as any).response;
            
            setMessages(prev => [...prev, { 
                role: 'bot', 
                text: botReply 
            }]);
        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { 
                role: 'bot', 
                text: "Lo siento, tuve problemas para conectar con mi cerebro de IA. ¿Podrías intentar de nuevo?" 
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
            {isOpen ? (
                <div style={{
                    width: '350px',
                    height: '500px',
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid var(--border-light)',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        color: 'white', 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Bot size={24} />
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Workflow AI</p>
                                <p style={{ fontSize: '0.7rem', opacity: 0.9 }}>Asistente Inteligente</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                                <div style={{ 
                                    width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' 
                                }}>
                                    <Sparkles size={24} color="var(--primary)" />
                                </div>
                                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>¿En qué puedo ayudarte hoy?</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Prueba preguntando: "¿Cómo creo una tarea?" o "¿Qué es el área General?"</p>
                            </div>
                        )}
                        {messages.map((ms, idx) => (
                            <div key={idx} style={{
                                alignSelf: ms.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                backgroundColor: ms.role === 'user' ? 'var(--primary)' : 'var(--bg-main)',
                                color: ms.role === 'user' ? 'white' : 'var(--text-main)',
                                border: ms.role === 'bot' ? '1px solid var(--border-light)' : 'none',
                                borderTopRightRadius: ms.role === 'user' ? '2px' : '12px',
                                borderTopLeftRadius: ms.role === 'bot' ? '2px' : '12px'
                            }}>
                                {ms.text}
                            </div>
                        ))}
                        {isTyping && (
                            <div style={{ alignSelf: 'flex-start', padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '12px', display: 'flex', gap: '4px' }}>
                                <Loader2 className="animate-spin" size={14} />
                                <span style={{ fontSize: '0.75rem' }}>Escribiendo...</span>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Pregunta algo..."
                            style={{ flex: 1, border: 'none', background: 'var(--bg-main)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                        />
                        <button 
                            type="submit"
                            style={{ 
                                background: 'var(--primary)', color: 'white', border: 'none', 
                                width: '36px', height: '36px', borderRadius: '8px', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '30px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        animation: 'bounce 2s infinite'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Bot size={28} />
                </button>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                    40% {transform: translateY(-10px);}
                    60% {transform: translateY(-5px);}
                }
            `}</style>
        </div>
    );
};
