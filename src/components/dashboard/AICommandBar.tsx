"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
    Search, 
    Bot, 
    Loader2, 
    CheckCircle2, 
    LayoutDashboard, 
    CheckSquare, 
    Users, 
    Settings, 
    LogOut,
    Sparkles,
    Hash,
    ChevronRight,
    Command
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions, auth } from "@/lib/firebase/config";
import { useUI } from "@/context/UIContext";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

export function AICommandBar() {
    const { isCommandPaletteOpen, setCommandPaletteOpen, toggleDarkMode } = useUI();
    const [command, setCommand] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const navigationActions = [
        { name: "Ir al Dashboard", icon: LayoutDashboard, action: () => router.push("/dashboard"), shortcut: "D" },
        { name: "Ver Tareas", icon: CheckSquare, action: () => router.push("/dashboard/tasks"), shortcut: "T" },
        { name: "Equipo", icon: Users, action: () => router.push("/dashboard/team"), shortcut: "E" },
        { name: "Ajustes", icon: Settings, action: () => router.push("/dashboard/settings"), shortcut: "S" },
    ];

    const quickActions = [
        { name: "Cambiar Tema (Claro/Oscuro)", icon: Sparkles, action: () => toggleDarkMode(), shortcut: "L" },
        { name: "Cerrar Sesión", icon: LogOut, action: () => signOut(auth), shortcut: "Q" },
    ];

    const allActions = [...navigationActions, ...quickActions];

    useEffect(() => {
        if (isCommandPaletteOpen) {
            setCommand("");
            setStatus('idle');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isCommandPaletteOpen]);

    const handleAction = (action: () => void) => {
        action();
        setCommandPaletteOpen(false);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!command.trim() || isProcessing) return;

        setIsProcessing(true);
        setStatus('idle');
        try {
            const processCommand = httpsCallable(functions, 'processAICommand');
            await processCommand({ command });
            setCommand("");
            setStatus('success');
            setTimeout(() => {
                setStatus('idle');
                setCommandPaletteOpen(false);
            }, 1500);
        } catch (error) {
            console.error("Command error:", error);
            setStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % allActions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + allActions.length) % allActions.length);
        } else if (e.key === 'Enter') {
            if (command.trim()) {
                handleSubmit();
            } else {
                handleAction(allActions[selectedIndex].action);
            }
        }
    };

    if (!isCommandPaletteOpen) return null;

    return (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '15vh'
        }}>
            {/* Backdrop */}
            <div 
                onClick={() => setCommandPaletteOpen(false)}
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(8px)',
                    animation: 'fadeIn 0.2s ease-out'
                }} 
            />

            {/* Palette Content */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '650px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-light)',
                overflow: 'hidden',
                animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Search Header */}
                <div style={{ 
                    padding: '1.5rem', 
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    {isProcessing ? (
                        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                    ) : status === 'success' ? (
                        <CheckCircle2 size={24} color="#10b981" />
                    ) : status === 'error' ? (
                        <Bot size={24} color="#ef4444" />
                    ) : (
                        <Command size={24} color="var(--primary)" />
                    )}
                    
                    <input 
                        ref={inputRef}
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un comando de IA o busca una acción..."
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            fontSize: '1.15rem',
                            color: 'var(--text-main)',
                            fontWeight: 500
                        }}
                    />
                    
                    <div style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontWeight: 700
                    }}>
                        ESC
                    </div>
                </div>

                {/* Suggestions / Results */}
                <div style={{ maxHeight: '450px', overflowY: 'auto', padding: '0.75rem' }}>
                    {!command && (
                        <>
                            <p style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Navegación
                            </p>
                            {navigationActions.map((item, idx) => (
                                <ActionItem 
                                    key={item.name} 
                                    item={item} 
                                    isSelected={selectedIndex === idx}
                                    onClick={() => handleAction(item.action)}
                                    onHover={() => setSelectedIndex(idx)}
                                />
                            ))}

                            <p style={{ padding: '1.25rem 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Acciones Rápidas
                            </p>
                            {quickActions.map((item, idx) => (
                                <ActionItem 
                                    key={item.name} 
                                    item={item} 
                                    isSelected={selectedIndex === idx + navigationActions.length}
                                    onClick={() => handleAction(item.action)}
                                    onHover={() => setSelectedIndex(idx + navigationActions.length)}
                                />
                            ))}
                        </>
                    )}

                    {command && (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                padding: '0.5rem 1rem', 
                                backgroundColor: 'var(--primary-light)', 
                                borderRadius: '12px',
                                color: 'var(--primary)',
                                marginBottom: '1rem'
                            }}>
                                <Sparkles size={16} />
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Procesar con IA</span>
                            </div>
                            <p style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                                Presiona <span style={{ fontWeight: 800 }}>Enter</span> para ejecutar: "{command}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ 
                    padding: '1rem 1.5rem', 
                    backgroundColor: 'var(--bg-main)', 
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)'
                }}>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <kbd style={{ padding: '2px 4px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>↑↓</kbd> Navegar
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <kbd style={{ padding: '2px 4px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>↵</kbd> Ejecutar
                        </span>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideDown { 
                    from { transform: translateY(-20px) scale(0.98); opacity: 0; } 
                    to { transform: translateY(0) scale(1); opacity: 1; } 
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function ActionItem({ item, isSelected, onClick, onHover }: any) {
    return (
        <div 
            onClick={onClick}
            onMouseEnter={onHover}
            style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? 'white' : 'var(--text-main)',
                transition: 'all 0.15s ease'
            }}
        >
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <item.icon size={18} color={isSelected ? 'white' : 'var(--text-muted)'} />
            </div>
            <span style={{ flex: 1, fontWeight: 600, fontSize: '0.925rem' }}>{item.name}</span>
            <div style={{ 
                fontSize: '0.7rem', 
                fontWeight: 800, 
                opacity: isSelected ? 0.8 : 0.4,
                letterSpacing: '0.05em'
            }}>
                {item.shortcut}
            </div>
        </div>
    );
}
