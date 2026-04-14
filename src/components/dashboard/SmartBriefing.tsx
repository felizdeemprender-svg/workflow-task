"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Loader2, Trophy, Bot, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";

import { SpiritScoreModal } from "./SpiritScoreModal";

export function SmartBriefing() {
    const { user } = useAuth();
    const [briefing, setBriefing] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchBriefing = async () => {
            if (!user?.company_id) return;
            try {
                const getBriefing = httpsCallable(functions, "getDailyBriefing");
                const result = await getBriefing();
                setBriefing((result.data as any).briefing || "");
            } catch (error) {
                console.error("Error fetching briefing:", error);
                setBriefing("No se pudo cargar el resumen diario.");
            } finally {
                setLoading(false);
            }
        };

        fetchBriefing();
    }, [user?.company_id]);

    const parseBriefing = (text: string) => {
        if (!text) return [];
        
        // Normalize: sometimes AI doesn't put ** on the first section
        let normalizedText = text;
        if (!text.startsWith('**') && text.includes(':')) {
            const firstColon = text.indexOf(':');
            const potentialTitle = text.slice(0, firstColon).trim();
            if (potentialTitle.length < 30) { // Safety check to not treat long sentences as titles
                normalizedText = `**${potentialTitle}**: ${text.slice(firstColon + 1).trim()}`;
            }
        }

        // More robust regex to handle **Title**: or Title:
        // Supports nested newlines and bullet points
        const regex = /(?:\*\*|(?<=\s|^))([A-Z][\w\s]{2,20})(?:\*\*|):([\s\S]*?)(?=(?:\*\*|(?<=\s|^))[A-Z][\w\s]{2,20}(?:\*\*|):|$)/g;
        
        const sections: { title: string; content: string }[] = [];
        let match;
        
        while ((match = regex.exec(normalizedText)) !== null) {
            sections.push({
                title: match[1].trim(),
                content: match[2].trim().replace(/^\*/, '').trim()
            });
        }

        // Fallback: If regex didn't find multiple sections, try a simpler split
        if (sections.length < 2 && text.includes(':')) {
            const tempSections = text.split(/\r?\n\s*\r?\n/).filter(s => s.trim());
            if (tempSections.length > 1) {
                return tempSections.map(s => {
                    const colonIdx = s.indexOf(':');
                    if (colonIdx > 0 && colonIdx < 30) {
                        return {
                            title: s.slice(0, colonIdx).replace(/\*/g, '').trim(),
                            content: s.slice(colonIdx + 1).trim().replace(/^\*/, '').trim()
                        };
                    }
                    return { title: "Nota", content: s.replace(/\*/g, '').trim() };
                });
            }
        }

        if (sections.length === 0 && text) {
            sections.push({ 
                title: "Resumen", 
                content: text.replace(/\*\*/g, '').trim() 
            });
        }
        
        return sections;
    };

    if (loading) {
        return (
            <div className="flex-col gap-6 fade-in" style={{ padding: '1rem 0' }}>
                <div className="flex-row justify-between items-center">
                    <div className="flex-row gap-3 items-center">
                        <div className="skeleton-pulse" style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'var(--border-light)' }} />
                        <div className="flex-col gap-2">
                            <div className="skeleton-pulse" style={{ width: '80px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--border-light)' }} />
                            <div className="skeleton-pulse" style={{ width: '150px', height: '20px', borderRadius: '4px', backgroundColor: 'var(--border-light)' }} />
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ 
                    padding: '2rem', 
                    borderRadius: '24px', 
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex-col gap-3">
                            <div className="skeleton-pulse" style={{ width: '100px', height: '14px', borderRadius: '4px', backgroundColor: 'var(--border-light)' }} />
                            <div className="skeleton-pulse" style={{ width: '100%', height: '12px', borderRadius: '4px', backgroundColor: 'var(--border-light)', opacity: 0.6 }} />
                            <div className="skeleton-pulse" style={{ width: '85%', height: '12px', borderRadius: '4px', backgroundColor: 'var(--border-light)', opacity: 0.6 }} />
                        </div>
                    ))}
                </div>
                <style jsx>{`
                    .skeleton-pulse {
                        animation: pulse 2s infinite ease-in-out;
                    }
                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }
                `}</style>
            </div>
        );
    }

    const sections = parseBriefing(briefing);

    return (
        <div id="smart-briefing" className="flex-col gap-6 fade-in" style={{ padding: '1rem 0' }}>
            <div className="flex-row justify-between items-center stack-mobile">
                <div className="flex-row gap-3 items-center">
                    <div style={{ 
                        backgroundColor: 'var(--primary-light)', 
                        padding: '0.6rem', 
                        borderRadius: '12px',
                    }}>
                        <Bot size={22} color="var(--primary)" />
                    </div>
                    <div className="flex-col">
                        <span className="text-primary font-bold" style={{ letterSpacing: '0.1em', fontSize: '0.75rem' }}>ASISTENTE IA</span>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Resumen Inteligente</h2>
                    </div>
                </div>
                <div onClick={() => setIsModalOpen(true)} style={{ cursor: 'pointer' }} className="full-width-mobile">
                    <SpiritScore points={user?.spiritPoints || 0} />
                </div>
            </div>

            <div className="glass-panel" style={{ 
                padding: '1.75rem', 
                background: 'var(--card-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-light)',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    position: 'absolute', 
                    top: '-20px', 
                    right: '-20px', 
                    opacity: 0.03,
                    transform: 'rotate(-15deg)',
                    pointerEvents: 'none'
                }}>
                    <Sparkles size={140} color="var(--primary)" />
                </div>

                {sections.map((section, idx) => (
                    <div key={idx} style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        animation: `fadeInUp 0.5s ease forwards ${idx * 0.15}s`,
                        opacity: 0,
                        transform: 'translateY(10px)'
                    }}>
                        <div className="flex-row gap-2 items-center">
                            {getIconForTitle(section.title)}
                            <h3 style={{ 
                                color: 'var(--primary)', 
                                fontSize: '0.85rem', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em',
                                margin: 0,
                                fontWeight: 700
                            }}>
                                {section.title}
                            </h3>
                        </div>
                        <p style={{ 
                            fontSize: '1.05rem', 
                            lineHeight: '1.5',
                            color: 'var(--text-main)',
                            margin: 0,
                            paddingLeft: '1.75rem',
                            fontWeight: 500
                        }}>
                            {section.content}
                        </p>
                    </div>
                ))}
            </div>

            <SpiritScoreModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                currentPoints={user?.spiritPoints || 0} 
            />

            <style jsx>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

function getIconForTitle(title: string) {
    const t = title.toLowerCase();
    if (t.includes('resumen') || t.includes('tarea')) return <CheckCircle2 size={16} color="var(--primary)" />;
    if (t.includes('prioridad')) return <AlertCircle size={16} color="#f59e0b" />;
    if (t.includes('dificultad') || t.includes('tiempo')) return <Clock size={16} color="var(--secondary)" />;
    return <Sparkles size={16} color="var(--primary)" />;
}

export function SpiritScore({ points = 0 }) {
    return (
        <div className="flex-row gap-3 items-center hover-scale full-width-mobile" style={{ 
            padding: '0.6rem 1.2rem', 
            borderRadius: '24px', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            justifyContent: 'center',
            background: 'rgba(var(--bg-card-rgb), 0.6)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
        }}>
            <Trophy size={18} color="#f59e0b" />
            <div className="flex-col">
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Spirit Score</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, background: 'linear-gradient(90deg, #f59e0b, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{points} pts</span>
            </div>
        </div>
    );
}
