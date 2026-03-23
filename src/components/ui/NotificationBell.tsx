"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { where, orderBy, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export const NotificationBell = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const constraints = React.useMemo(() =>
        user?.uid ? [
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
        ] : [],
        [user?.uid]
    );

    const { data: notifications, loading } = useFirestoreQuery<any>(
        'notifications',
        constraints,
        !!user?.uid
    );

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        for (const n of unread) {
            await updateDoc(doc(db, 'notifications', n.id), {
                read: true,
                updatedAt: serverTimestamp()
            });
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: isOpen ? 'var(--primary)' : 'white',
                    border: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: '24px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isOpen ? '0 8px 20px rgba(79, 70, 229, 0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
                    animation: unreadCount > 0 && !isOpen ? 'pulse-glow 2s infinite' : 'none'
                }}
                className="notification-fab"
            >
                <Bell size={20} color={isOpen ? 'white' : 'var(--primary)'} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        minWidth: '20px',
                        height: '20px',
                        padding: '0 4px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 800,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                        zIndex: 10
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                        onClick={() => setIsOpen(false)} 
                    />
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        marginTop: '12px',
                        width: '360px',
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid var(--border-light)',
                        zIndex: 1000,
                        overflow: 'hidden',
                        animation: 'slideIn 0.2s ease-out',
                        transformOrigin: 'top right'
                    }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
                            <h3 style={{ fontSize: '0.925rem', fontWeight: 800, color: 'var(--text-main)' }}>Notificaciones</h3>
                            {unreadCount > 0 && (
                                <span 
                                    style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }} 
                                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                >
                                    Marcar todo leída
                                </span>
                            )}
                        </div>
                        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                            {loading ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 0.75rem' }} />
                                    <p style={{ fontSize: '0.8125rem' }}>Cargando...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                    <Bell size={40} color="#e2e8f0" style={{ margin: '0 auto 1rem' }} />
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>No hay notificaciones pendientes</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        style={{
                                            padding: '1.25rem',
                                            borderBottom: '1px solid var(--border-light)',
                                            backgroundColor: n.read ? 'transparent' : 'rgba(79, 70, 229, 0.03)',
                                            position: 'relative',
                                            transition: 'background-color 0.2s'
                                        }}
                                        className="notification-item"
                                    >
                                        {!n.read && (
                                            <div style={{ position: 'absolute', left: '12px', top: '1.5rem', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                                        )}
                                        <div style={{ paddingLeft: n.read ? 0 : '12px' }}>
                                            <p style={{ fontSize: '0.875rem', fontWeight: n.read ? 600 : 700, color: 'var(--text-main)', marginBottom: '4px' }}>{n.title}</p>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{n.message}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                    {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() + ' ' + n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                                                </span>
                                                {!n.read && (
                                                    <button 
                                                        onClick={() => updateDoc(doc(db, 'notifications', n.id), { read: true })}
                                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                                                        className="hover-bg-light"
                                                    >
                                                        Listo
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-light)', backgroundColor: '#fafafa' }}>
                            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', cursor: 'default' }}>
                                Bandeja de Entrada
                            </p>
                        </div>
                    </div>
                </>
            )}
            <style jsx>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
                }
                .notification-fab {
                    z-index: 1001;
                }
                .notification-fab:hover {
                    transform: scale(1.05);
                    background-color: var(--primary);
                }
                .notification-fab:hover :global(svg) {
                    color: white !important;
                }
                .hover-bg-light:hover { background-color: var(--primary-light); }
                .notification-item:hover { background-color: rgba(0,0,0,0.01) !important; }
            `}</style>
        </div>
    );
};
