"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { orderBy, limit } from "firebase/firestore";
import { Trophy, Star, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SpiritScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPoints: number;
}

export function SpiritScoreModal({ isOpen, onClose, currentPoints }: SpiritScoreModalProps) {
    const { user } = useAuth();
    
    const constraints = React.useMemo(() => [
        orderBy("createdAt", "desc"),
        limit(20)
    ], []);

    const { data: history, loading } = useFirestoreQuery<any>(
        user?.uid ? `users/${user.uid}/spirit_history` : "",
        constraints,
        !!user?.uid
    );

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case "Alta": return "#ef4444";
            case "Media": return "#f59e0b";
            case "Baja": return "#10b981";
            default: return "var(--text-muted)";
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Historial Spirit Score">
            <div className="flex-col gap-6">
                <div className="flex-row justify-between items-center glass" style={{ padding: '1.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', color: 'white' }}>
                    <div className="flex-row gap-4 items-center">
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                            <Trophy size={32} />
                        </div>
                        <div className="flex-col">
                            <span style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 600 }}>PUNTUACIÓN ACTUAL</span>
                            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>{currentPoints} pts</h2>
                        </div>
                    </div>
                </div>

                <div className="flex-col gap-4">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star size={18} color="#f59e0b" fill="#f59e0b" /> Logros Recientes
                    </h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando historial...</div>
                    ) : (history && history.length > 0) ? (
                        <div className="flex-col" style={{ gap: '1px', backgroundColor: 'var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
                            {history.map((item: any) => (
                                <div key={item.id} className="flex-row justify-between items-center" style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', transition: 'background 0.2s' }}>
                                    <div className="flex-row gap-4 items-center">
                                        <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            backgroundColor: getDifficultyColor(item.difficulty)
                                        }} />
                                        <div className="flex-col">
                                            <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{item.taskTitle}</p>
                                            <div className="flex-row gap-3 text-small text-muted">
                                                <span className="flex-row gap-1"><Clock size={12} /> {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ""}</span>
                                                <span style={{ color: getDifficultyColor(item.difficulty), fontWeight: 700 }}>{item.difficulty}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-row gap-1 items-center" style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                                        +{item.points}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '12px' }}>
                            Aún no tienes registros en tu historial de Spirit Score. ¡Completa tareas para ganar puntos!
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
