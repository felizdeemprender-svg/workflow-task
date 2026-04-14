"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Send, Loader2, MessageSquare, User, Check, Paperclip, Smile } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { chatActions } from "@/lib/firebase/actions";
import { orderBy } from "firebase/firestore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface TeamChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipient: {
        id: string;
        name: string;
        email: string;
    } | null;
}

const CHAT_CONSTRAINTS = [orderBy("createdAt", "asc")];

const POPULAR_EMOJIS = [
    "😀", "😂", "🥰", "😊", "😎", "🤔", "🤫", "🤩", "🥳", "😡",
    "👍", "👎", "🙌", "🙏", "🔥", "💯", "❤️", "✨", "🚀", "✅"
];

// Definitive Vanilla Styles to bypass Tailwind issues
const V_STYLE: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: '#e5ddd5',
        position: 'relative',
    },
    patternOverlay: {
        position: 'absolute',
        inset: 0,
        opacity: 0.06,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)',
        backgroundSize: '20px 20px',
    },
    messagesArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        position: 'relative',
        zIndex: 10,
        minHeight: 0,
    },
    dateLabelContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: '0.5rem',
    },
    dateLabel: {
        padding: '0.25rem 0.75rem',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(4px)',
        borderRadius: '8px',
        fontSize: '10px',
        fontWeight: 900,
        color: '#475569',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    bubbleRow: {
        display: 'flex',
        width: '100%',
        marginBottom: '4px',
    },
    bubbleBase: {
        position: 'relative',
        maxWidth: '80%',
        padding: '8px 12px',
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    },
    bubbleTail: {
        position: 'absolute',
        top: 0,
        width: '12px',
        height: '12px',
    },
    inputBar: {
        flexNone: 'none',
        padding: '12px',
        backgroundColor: '#f0f2f5',
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: '999px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 16px',
        height: '44px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    },
    emojiPanel: {
        backgroundColor: 'white',
        padding: '12px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '8px',
        border: '1px solid #e2e8f0',
        maxWidth: '300px',
    }
};

export function TeamChatModal({ isOpen, onClose, recipient }: TeamChatModalProps) {
    const { user } = useAuth();
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const chatId = user?.uid && recipient?.id 
        ? chatActions.getChatId(user.uid, recipient.id)
        : null;

    const { data: messages, loading } = useFirestoreQuery<any>(
        chatId ? `chats/${chatId}/messages` : "",
        CHAT_CONSTRAINTS,
        !!chatId
    );

    const groupedMessages = useMemo(() => {
        if (!messages) return [];
        const groups: { date: string, msgs: any[] }[] = [];
        
        messages.forEach((msg: any) => {
            const date = msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()) : new Date();
            const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            
            const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            
            let label = dateStr;
            if (dateStr === today) label = "HOY";
            else if (dateStr === yesterday) label = "AYER";

            const existingGroup = groups.find(g => g.date === label);
            if (existingGroup) {
                existingGroup.msgs.push(msg);
            } else {
                groups.push({ date: label, msgs: [msg] });
            }
        });
        return groups;
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(scrollToBottom, 200);
            return () => clearTimeout(timer);
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !chatId || !user || !user.company_id) return;

        setIsSending(true);
        try {
            await chatActions.sendMessage(chatId, user.company_id, {
                text: message.trim(),
                senderId: user.uid,
                senderEmail: user.email,
                senderName: user.displayName || user.name || "Usuario",
                recipientId: recipient?.id,
            });
            setMessage("");
            setShowEmojis(false);
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Error al enviar el mensaje");
        } finally {
            setIsSending(false);
        }
    };

    const addEmoji = (emoji: string) => {
        setMessage(prev => prev + emoji);
        inputRef.current?.focus();
    };

    if (!recipient) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            noPadding={true}
            title={
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', width: '100%' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <User size={20} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 800, color: '#075e54', lineHeight: 1.2 }}>{recipient.name}</span>
                            <span style={{ fontSize: '9px', backgroundColor: '#d1fae5', color: '#047857', padding: '1px 6px', borderRadius: '4px', fontWeight: 900 }}>v5.5</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>En línea ahora</span>
                    </div>
                </div>
            }
        >
            <div style={V_STYLE.container}>
                <div style={V_STYLE.patternOverlay} />

                {/* Content */}
                <div ref={scrollRef} style={{ ...V_STYLE.messagesArea, padding: isMobile ? '1rem 0.5rem' : '2rem 1rem' }} className="no-scrollbar">
                    {loading ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" style={{ color: '#059669', opacity: 0.4 }} size={32} />
                        </div>
                    ) : groupedMessages.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px', textAlign: 'center', color: 'rgba(71, 85, 105, 0.6)' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={32} />
                            </div>
                            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', lineHeight: 1.6 }}>
                                Los mensajes están cifrados.<br/>Tu comunicación es segura.
                            </p>
                        </div>
                    ) : (
                        groupedMessages.map((group) => (
                            <div key={group.date} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={V_STYLE.dateLabelContainer}>
                                    <span style={V_STYLE.dateLabel}>{group.date}</span>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {group.msgs.map((msg) => {
                                        const currentUid = user?.uid ? String(user.uid) : null;
                                        const currentEmail = user?.email ? String(user.email).toLowerCase() : null;
                                        const currentName = (user?.displayName || user?.name) ? String(user.displayName || user?.name).toLowerCase() : null;
                                        
                                        const msgSenderId = msg.senderId ? String(msg.senderId) : null;
                                        const msgSenderEmail = msg.senderEmail ? String(msg.senderEmail).toLowerCase() : null;
                                        const msgSenderName = msg.senderName ? String(msg.senderName).toLowerCase() : null;

                                        const isMe = (currentUid && msgSenderId === currentUid) || 
                                                    (currentEmail && msgSenderEmail === currentEmail) ||
                                                    (currentName && msgSenderName === currentName);
                                        
                                        return (
                                            <motion.div 
                                                key={msg.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                style={{ ...V_STYLE.bubbleRow, flexDirection: isMe ? 'row-reverse' : 'row' }}
                                            >
                                                <div style={{
                                                    ...V_STYLE.bubbleBase,
                                                    backgroundColor: isMe ? '#dcf8c6' : 'white',
                                                    borderTopLeftRadius: isMe ? '12px' : '0px',
                                                    borderTopRightRadius: isMe ? '0px' : '12px',
                                                    maxWidth: isMobile ? '90%' : '80%',
                                                    marginLeft: isMe ? (isMobile ? '10px' : '40px') : '0px',
                                                    marginRight: isMe ? '0px' : (isMobile ? '10px' : '40px'),
                                                }}>
                                                    {/* Tail */}
                                                    <div style={{
                                                        ...V_STYLE.bubbleTail,
                                                        backgroundColor: isMe ? '#dcf8c6' : 'white',
                                                        clipPath: isMe ? 'polygon(0_0,100%_0,0_100%)' : 'polygon(0_0,100%_0,100%_100%)',
                                                        right: isMe ? '-6px' : 'auto',
                                                        left: isMe ? 'auto' : '-6px',
                                                    }} />

                                                    <div style={{ fontSize: isMobile ? '0.85rem' : '0.92rem', color: '#111827', paddingRight: '32px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        {msg.text}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', opacity: 0.5, position: 'absolute', right: '8px', bottom: '6px' }}>
                                                        <span style={{ fontSize: '9px', fontWeight: 800 }}>
                                                            {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </span>
                                                        {isMe && <Check size={12} style={{ color: '#10b981' }} />}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sticky Input Bar */}
                <div style={{ ...V_STYLE.inputBar, padding: isMobile ? '8px 45px 8px 12px' : '12px' }}>
                    <AnimatePresence>
                        {showEmojis && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                style={V_STYLE.emojiPanel}
                            >
                                {POPULAR_EMOJIS.map(emoji => (
                                    <button 
                                        key={emoji}
                                        type="button"
                                        onClick={() => addEmoji(emoji)}
                                        style={{ fontSize: isMobile ? '20px' : '24px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <form 
                        onSubmit={handleSend}
                        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: isMobile ? '8px' : '12px', width: '100%' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'row', gap: isMobile ? '8px' : '12px', color: '#64748b' }}>
                            <Smile 
                                size={isMobile ? 22 : 24} 
                                style={{ cursor: 'pointer', color: showEmojis ? '#059669' : 'inherit' }} 
                                onClick={() => setShowEmojis(!showEmojis)}
                            />
                            <Paperclip size={isMobile ? 22 : 24} style={{ cursor: 'pointer' }} />
                        </div>

                        <div style={{ ...V_STYLE.inputWrapper, padding: isMobile ? '0 12px' : '0 16px' }}>
                            <input 
                                ref={inputRef}
                                type="text" 
                                placeholder="Escribe..." 
                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: isMobile ? '16px' : '14px', color: '#334155', minWidth: 0 }}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={!message.trim() || isSending}
                            style={{ 
                                width: isMobile ? '40px' : '44px', 
                                height: isMobile ? '40px' : '44px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                backgroundColor: !message.trim() ? '#94a3b8' : '#00a884',
                                color: 'white',
                                border: 'none',
                                cursor: !message.trim() ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 12px rgba(0, 168, 132, 0.25)',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                                position: isMobile ? 'absolute' : 'relative',
                                right: isMobile ? '10px' : '0px'
                            }}
                        >
                            {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} style={{ marginLeft: '2px' }} />}
                        </button>
                    </form>
                </div>
            </div>
        </Modal>
    );
}
