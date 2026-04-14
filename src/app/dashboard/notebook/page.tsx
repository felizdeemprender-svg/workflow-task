"use client";
/** One-Page Infinite Parchment — v3 — Dual Search **/

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Mic, MicOff,
    Sparkles, Wand2, Loader2, Milestone,
    Search, X, ChevronUp, ChevronDown
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { notebookActions } from "@/lib/firebase/actions";
import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function NotebookView() {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

    // Simple text search
    const [simpleQuery, setSimpleQuery] = useState("");
    const [matchIndices, setMatchIndices] = useState<number[]>([]);
    const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
    const [showSimpleSearch, setShowSimpleSearch] = useState(false);

    // AI search
    const [aiQuery, setAiQuery] = useState("");
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [isAILoading, setIsAILoading] = useState(false);
    const [showAIPanel, setShowAIPanel] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastSavedRef = useRef("");
    const recognitionRef = useRef<any>(null);

    // Load the single document
    useEffect(() => {
        if (!user?.uid) return;
        notebookActions.getDraft(user.uid).then(draft => {
            const c = draft?.content || "";
            setContent(c);
            lastSavedRef.current = c;
            setIsLoading(false);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            }, 150);
        }).catch(() => setIsLoading(false));
    }, [user?.uid]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [content]);

    // Auto-save (debounced 1.5s)
    useEffect(() => {
        if (!user?.uid || isLoading || content === lastSavedRef.current) return;
        setSaveStatus("unsaved");
        const timer = setTimeout(async () => {
            setSaveStatus("saving");
            try {
                await notebookActions.saveDraft(user.uid, content);
                lastSavedRef.current = content;
                setSaveStatus("saved");
            } catch {
                setSaveStatus("unsaved");
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [content, user?.uid, isLoading]);

    // --- Simple local search ---
    const runSimpleSearch = useCallback((q: string) => {
        if (!q.trim()) {
            setMatchIndices([]);
            setCurrentMatchIdx(0);
            return;
        }
        const lower = content.toLowerCase();
        const lq = q.toLowerCase();
        const matches: number[] = [];
        let idx = lower.indexOf(lq);
        while (idx !== -1) {
            matches.push(idx);
            idx = lower.indexOf(lq, idx + 1);
        }
        setMatchIndices(matches);
        setCurrentMatchIdx(0);
        // NOTE: do NOT focus the textarea here — causes cursor jump while typing
    }, [content]);

    const navigateMatch = (dir: 1 | -1) => {
        if (!matchIndices.length) return;
        const next = (currentMatchIdx + dir + matchIndices.length) % matchIndices.length;
        setCurrentMatchIdx(next);
        
        const matchIdx = matchIndices[next];

        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(
                matchIdx,
                matchIdx + simpleQuery.length
            );
            
            // Calculate scroll position
            if (containerRef.current) {
                const textBefore = content.substring(0, matchIdx);
                const linesBefore = textBefore.split('\n').length;
                const lineHeight = 1.0 * 1.8 * 16; // Approx line height in px
                const targetY = (linesBefore - 1) * lineHeight;
                
                containerRef.current.scrollTo({
                    top: Math.max(0, targetY - 150),
                    behavior: 'smooth'
                });
            }

            // Re-focus search input but selection in backdrop stays visible
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (backdropRef.current) {
            backdropRef.current.scrollTop = e.currentTarget.scrollTop;
            backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    // Helper to render text with highlights for the backdrop
    const renderHighlights = () => {
        if (!simpleQuery.trim() || !matchIndices.length) return content;

        const parts: React.ReactNode[] = [];
        let lastIdx = 0;
        
        // Sort matches to ensure we process them in order
        const sortedMatches = [...matchIndices].sort((a,b) => a-b);

        sortedMatches.forEach((matchIdx, i) => {
            // Text before match
            parts.push(content.substring(lastIdx, matchIdx));
            
            // The match itself
            const isCurrent = i === currentMatchIdx;
            parts.push(
                <mark 
                    key={i} 
                    style={{ 
                        background: isCurrent ? "rgba(245, 158, 11, 0.4)" : "rgba(252, 211, 77, 0.3)",
                        borderBottom: isCurrent ? "2px solid #f59e0b" : "none",
                        color: "transparent",
                        borderRadius: "2px"
                    }}
                >
                    {content.substring(matchIdx, matchIdx + simpleQuery.length)}
                </mark>
            );
            
            lastIdx = matchIdx + simpleQuery.length;
        });
        
        parts.push(content.substring(lastIdx));
        return parts;
    };


    const clearSimpleSearch = () => {
        setSimpleQuery("");
        setMatchIndices([]);
        setCurrentMatchIdx(0);
        setShowSimpleSearch(false);
    };

    // --- AI search ---
    const handleAI = async (mode: "search" | "generate") => {
        if (!aiQuery.trim()) return;
        setIsAILoading(true);
        setAiResponse(null);
        try {
            const fn = httpsCallable(functions, "notebookAI");
            const result: any = await fn({ mode, query: aiQuery, notes: [{ content }] });
            setAiResponse(result.data.answer);
        } catch {
            toast.error("Error al consultar la IA");
        } finally {
            setIsAILoading(false);
        }
    };

    // --- Hito ---
    const insertHito = () => {
        const timestamp = format(new Date(), "d 'de' MMMM yyyy · HH:mm", { locale: es });
        const divider = `\n\n━━━━━━━━ 📌 ${timestamp} ━━━━━━━━\n\n`;
        const textarea = textareaRef.current;
        const pos = textarea?.selectionStart ?? content.length;
        const newContent = content.slice(0, pos) + divider + content.slice(pos);
        setContent(newContent);
        setTimeout(() => {
            if (textarea) {
                const np = pos + divider.length;
                textarea.selectionStart = np;
                textarea.selectionEnd = np;
                textarea.focus();
                textarea.scrollTop = textarea.scrollHeight;
            }
        }, 30);
    };

    // --- Voice ---
    const toggleVoice = () => {
        if (isRecording) { recognitionRef.current?.stop(); return; }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { toast.error("Navegador no soportado"); return; }
        const rec = new SR();
        rec.lang = "es-ES";
        rec.interimResults = true;
        rec.onstart = () => setIsRecording(true);
        rec.onresult = (e: any) => setTranscript(Array.from(e.results).map((r: any) => r[0].transcript).join(""));
        rec.onend = () => {
            setIsRecording(false);
            if (transcript) { setContent(p => p ? p + " " + transcript : transcript); setTranscript(""); }
        };
        recognitionRef.current = rec;
        rec.start();
    };

    const saveStatusLabel = saveStatus === "saved" ? "✓ Guardado" : saveStatus === "saving" ? "Guardando..." : "Sin guardar";

    return (
        <div className="flex-col h-[calc(100vh-140px)] gap-3 fade-in">

            {/* ── Header row ── */}
            <div className="flex-row items-center justify-between gap-4 stack-mobile">
                <div>
                    <h1 className="font-bold">Mi Cuaderno</h1>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {isLoading ? "Cargando..." : saveStatusLabel}
                    </p>
                </div>

                {/* Search tools */}
                <div className="flex-row gap-2">
                    {/* Toggle Lupa */}
                    <Button
                        variant={showSimpleSearch ? "primary" : "secondary"}
                        onClick={() => setShowSimpleSearch(p => !p)}
                        style={{ borderRadius: "12px", height: "42px", width: "42px", padding: 0 }}
                    >
                        <Search size={18} />
                    </Button>

                    {/* AI search toggle */}
                    <Button
                        variant={showAIPanel ? "primary" : "secondary"}
                        onClick={() => setShowAIPanel(p => !p)}
                        style={{ borderRadius: "12px", height: "42px", padding: "0 1rem", gap: "6px", fontSize: "0.82rem", flexShrink: 0 }}
                    >
                        <Sparkles size={15} />
                        IA
                    </Button>
                </div>
            </div>

            {/* ── AI Panel (collapsible) ── */}
            {showAIPanel && (
                <div className="flex-row gap-2 items-center fade-in" style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "14px",
                    border: "1px solid var(--primary-light)",
                    background: "rgba(79,70,229,0.04)"
                }}>
                    <Sparkles size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Preguntale algo a tu cuaderno..."
                        value={aiQuery}
                        onChange={e => setAiQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAI("search");
                            }
                        }}
                        style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "0.875rem", color: "var(--text-main)" }}
                        autoFocus
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleAI("search")} disabled={isAILoading || !aiQuery}
                        style={{ borderRadius: "10px", padding: "0 0.75rem", height: "34px", fontSize: "0.8rem" }}>
                        {isAILoading ? <Loader2 size={14} className="animate-spin" /> : "Buscar"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleAI("generate")} disabled={isAILoading || !aiQuery}
                        style={{ borderRadius: "10px", padding: "0 0.75rem", height: "34px", fontSize: "0.8rem", gap: "4px" }}>
                        <Wand2 size={13} /> Generar
                    </Button>
                </div>
            )}

            {/* AI Response card */}
            {aiResponse && (
                <Card style={{ border: "1.5px solid var(--primary-light)", background: "rgba(79,70,229,0.03)", padding: "1rem 1.25rem" }} className="fade-in">
                    <div className="flex-row justify-between items-start mb-2">
                        <div className="flex-row items-center gap-2 font-bold text-small" style={{ color: "var(--primary)" }}>
                            <Sparkles size={13} /> Respuesta de la IA
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setAiResponse(null)} style={{ height: "20px", padding: "0 4px" }}>Cerrar</Button>
                    </div>
                    <p style={{ fontSize: "0.9rem", lineHeight: "1.6", whiteSpace: "pre-wrap", color: "var(--text-main)" }}>{aiResponse}</p>
                </Card>
            )}

            {/* ── Infinite Parchment ── */}
            <div 
                ref={containerRef}
                style={{
                    flex: 1, overflowY: "auto", borderRadius: "16px",
                    background: "var(--bg-card)", border: "1px solid var(--border-light)",
                    boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column",
                    position: "relative",
                    minHeight: "450px"
                }}
            >
                {/* Wordpad-style Floating Search Bar */}
                {showSimpleSearch && (
                    <div className="fade-in" style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        background: "var(--bg-card)",
                        border: "1.5px solid var(--primary)",
                        boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
                        borderRadius: "14px",
                        padding: "0.4rem 0.6rem 0.4rem 0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        zIndex: 100,
                        width: "320px"
                    }}>
                        <Search size={14} style={{ color: "var(--primary)" }} />
                        <input
                            ref={searchInputRef}
                            autoFocus
                            type="text"
                            placeholder="Buscar..."
                            value={simpleQuery}
                            onChange={e => { setSimpleQuery(e.target.value); runSimpleSearch(e.target.value); }}
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    navigateMatch(1);
                                }
                            }}
                            style={{ 
                                flex: 1, border: "none", outline: "none", 
                                background: "transparent", fontSize: "0.85rem", 
                                color: "var(--text-main)", fontWeight: 500 
                            }}
                        />
                        <div className="flex-row items-center gap-1">
                            {matchIndices.length > 0 && (
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "4px" }}>
                                    {currentMatchIdx + 1}/{matchIndices.length}
                                </span>
                            )}
                            <button onClick={() => navigateMatch(-1)} style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><ChevronUp size={16} /></button>
                            <button onClick={() => navigateMatch(1)} style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><ChevronDown size={16} /></button>
                            <button onClick={clearSimpleSearch} style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", marginLeft: "4px" }}><X size={15} /></button>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} />
                    </div>
                ) : (
                    <>
                        {/* Highlights Layer (Backdrop) */}
                        <div 
                            ref={backdropRef}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: textareaRef.current?.style.height || "100%",
                                padding: "1.5rem 2rem",
                                fontSize: "1rem",
                                lineHeight: "1.8",
                                fontFamily: "inherit",
                                whiteSpace: "pre-wrap",
                                wordWrap: "break-word",
                                color: "transparent",
                                pointerEvents: "none",
                                overflow: "hidden"
                            }}
                        >
                            {renderHighlights()}
                        </div>

                        {/* Editing Layer (Textarea) */}
                        <textarea
                            ref={textareaRef}
                            value={isRecording ? content + (transcript ? " " + transcript : "") : content}
                            onChange={e => setContent(e.target.value)}
                            onScroll={handleScroll}
                            placeholder=""
                            style={{
                                width: "100%", 
                                minHeight: "450px",
                                border: "none", outline: "none", background: "transparent",
                                resize: "none", fontSize: "1rem", lineHeight: "1.8",
                                color: "var(--text-main)", fontFamily: "inherit",
                                padding: "1.5rem 2rem",
                                position: "relative",
                                zIndex: 2,
                                overflow: "hidden"
                            }}
                        />
                    </>
                )}
            </div>

            {/* ── Bottom toolbar ── */}
            <div className="flex-row items-center justify-between gap-3">
                <div className="flex-row gap-2 items-center">
                    <Button variant="ghost" onClick={toggleVoice} style={{
                        width: "40px", height: "40px", borderRadius: "50%",
                        background: isRecording ? "#fb7185" : "var(--bg-card)",
                        color: isRecording ? "white" : "var(--text-muted)",
                        boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-light)"
                    }} className={isRecording ? "pulse-mic" : ""}>
                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    </Button>
                    {isRecording && (
                        <div className="flex-row items-center gap-2 animate-pulse" style={{
                            padding: "0 1rem", borderRadius: "20px",
                            background: "#fff1f2", color: "#fb7185", fontSize: "0.8rem", fontWeight: 600
                        }}>Grabando...</div>
                    )}
                </div>

                <Button variant="secondary" size="sm" onClick={insertHito} style={{
                    borderRadius: "12px", height: "38px", padding: "0 1.25rem",
                    fontSize: "0.82rem", gap: "8px", display: "flex", alignItems: "center"
                }}>
                    <Milestone size={16} />
                    Marcar Hito
                </Button>
            </div>

            <style jsx>{`
                .pulse-mic { animation: pulse-red 1.5s infinite; }
                @keyframes pulse-red {
                    0%   { box-shadow: 0 0 0 0 rgba(251,113,133,0.4); }
                    70%  { box-shadow: 0 0 0 10px rgba(251,113,133,0); }
                    100% { box-shadow: 0 0 0 0 rgba(251,113,133,0); }
                }
            `}</style>
        </div>
    );
}
