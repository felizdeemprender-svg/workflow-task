"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    Send,
    Paperclip,
    Bot,
    History,
    AlertCircle,
    Loader2,
    Clock
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { taskActions, notificationActions } from "@/lib/firebase/actions";
import { db } from "@/lib/firebase/config";
import { doc, onSnapshot, orderBy, collection, serverTimestamp } from "firebase/firestore";
import { aiService } from "@/lib/ai/service";

export default function TaskDetailClient() {
    const { id } = useParams();
    const { user } = useAuth();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Real-time task data
    useEffect(() => {
        if (!id) return;
        const unsubscribe = onSnapshot(doc(db, "tasks", id as string), (doc) => {
            setTask({ id: doc.id, ...doc.data() });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id]);

    // Real-time chat messages
    const chatConstraints = React.useMemo(() => [orderBy("createdAt", "asc")], []);
    const { data: messages } = useFirestoreQuery<any>(
        `tasks/${id}/chat`,
        chatConstraints,
        !!user?.company_id
    );

    // Real-time logs
    const logConstraints = React.useMemo(() => [orderBy("createdAt", "desc")], []);
    const { data: logs } = useFirestoreQuery<any>(
        `tasks/${id}/log`,
        logConstraints,
        !!user?.company_id
    );

    const priorityColors: Record<string, string> = {
        "Alta": "#ef4444",
        "Media": "#f59e0b",
        "Baja": "#10b981"
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isSending || !user) return;

        setIsSending(true);
        try {
            await taskActions.sendMessage(id as string, {
                text: message,
                sender: user.email,
                type: "user"
            });
            setMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(true); // Small delay feel
            setTimeout(() => setIsSending(false), 500);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!user) return;
        try {
            await taskActions.updateStatus(id as string, newStatus, user.email || "Usuario");
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleAIAnalysis = async () => {
        if (!user || isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const recommendation = await aiService.analyzeTask(task, logs);

            // Post result to chat as Bot
            await taskActions.sendMessage(id as string, {
                text: `🤖 ANÁLISIS IA:\n\n${recommendation.analysis}\n\nPASOS SUGERIDOS:\n${recommendation.suggestedSteps.map(s => `- ${s}`).join('\n')}\n\nPRIORIDAD RECOMENDADA: ${recommendation.priority}`,
                sender: "Bot",
                type: "bot",
                createdAt: serverTimestamp()
            });

            // If priority analysis is different, maybe notify?
            if (recommendation.priority !== task.priority) {
                await notificationActions.create(user.uid, {
                    title: 'Recomendación IA',
                    message: `La IA sugiere cambiar la prioridad a ${recommendation.priority} para: ${task.title}`,
                    type: 'AI_RECOMENDACION',
                    link: `/dashboard/tasks/${id}`
                });
            }
        } catch (error) {
            console.error("Error in AI Analysis:", error);
            alert("Error al conectar con el asistente de IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
        );
    }

    if (!task) {
        return (
            <Card title="Error">
                <p>No se pudo encontrar la tarea solicitada.</p>
            </Card>
        );
    }

    return (
        <div className="flex-col gap-8 fade-in">
            <div className="flex-row justify-between">
                <div className="flex-row gap-4">
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: priorityColors[task.priority] || "#cbd5e1",
                        boxShadow: `0 0 10px ${(priorityColors[task.priority] || "#cbd5e1")}50`
                    }} />
                    <h1>{task.title}</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option>Pendiente</option>
                        <option>En Proceso</option>
                        <option>Finalizado</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
                <div className="flex-col gap-6">
                    <Card title="Descripción">
                        <p className="text-muted" style={{ lineHeight: '1.6' }}>
                            {task.description}
                        </p>
                    </Card>

                    <Card title="Chat de la Tarea">
                        <div style={{
                            height: '400px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            overflowY: 'auto',
                            paddingRight: '0.5rem',
                            marginBottom: '1rem'
                        }}>
                            {messages.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '2rem' }}>Aún no hay mensajes. Menciona al @bot para obtener ayuda profesional.</p>
                            ) : messages.map((msg: any) => (
                                <div key={msg.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.sender === 'Bot' ? 'flex-start' : (msg.sender === user?.email ? 'flex-end' : 'flex-start'),
                                    gap: '0.25rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        {msg.sender === 'Bot' && <Bot size={14} color="var(--primary)" />}
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{msg.sender === user?.email ? 'Tú' : msg.sender}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Enviando..."}
                                        </span>
                                    </div>
                                    <div style={{
                                        maxWidth: '85%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '12px',
                                        fontSize: '0.875rem',
                                        backgroundColor: msg.sender === 'Bot' ? 'var(--primary-light)' : (msg.sender === user?.email ? 'var(--primary)' : 'var(--bg-main)'),
                                        color: msg.sender === user?.email ? 'white' : 'var(--text-main)',
                                        border: msg.sender === 'Bot' ? '1px solid #e0e7ff' : '1px solid var(--border-light)',
                                        borderTopRightRadius: (msg.sender === user?.email) ? '2px' : '12px',
                                        borderTopLeftRadius: (msg.sender !== user?.email) ? '2px' : '12px'
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSendMessage} style={{
                            display: 'flex',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-main)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-light)'
                        }}>
                            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <Paperclip size={20} />
                            </button>
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escribe un mensaje o menciona al @bot..."
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.875rem' }}
                            />
                            <button
                                type="submit"
                                disabled={!message.trim() || isSending}
                                style={{
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: message.trim() && !isSending ? 'pointer' : 'not-allowed',
                                    opacity: message.trim() && !isSending ? 1 : 0.6
                                }}>
                                {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                            </button>
                        </form>
                    </Card>

                    <Card title="Bitácora de Actividad">
                        <div className="flex-col gap-4">
                            {logs.map((log: any, i: number) => (
                                <div key={log.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--bg-main)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <History size={16} color="var(--text-muted)" />
                                    </div>
                                    <div style={{ flex: 1, borderBottom: i < logs.length - 1 ? '1px solid var(--border-light)' : 'none', paddingBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{log.action}</p>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>{log.details}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Por: {log.user}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="flex-col gap-6" style={{ position: 'sticky', top: '84px' }}>
                    <Card title="Asistente IA">
                        <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8125rem', fontWeight: 700 }}>DeepSeek AI</p>
                                    <p style={{ fontSize: '0.625rem', opacity: 0.8 }}>Análisis predictivo activo</p>
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                size="sm"
                                style={{ width: '100%', backgroundColor: 'white', color: '#4f46e5', border: 'none' }}
                                onClick={handleAIAnalysis}
                                isLoading={isAnalyzing}
                            >
                                <AlertCircle size={14} style={{ marginRight: '6px' }} /> Analizar Tarea
                            </Button>
                        </div>
                    </Card>

                    <Card title="Detalles">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ÁREA</p>
                                <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '20px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    {task.area}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>CREADO POR</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', justifyContent: 'center' }}>
                                        {task.createdBy?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span style={{ fontSize: '0.875rem' }}>{task.createdBy}</span>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>FECHA LÍMITE</p>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem', 
                                    color: (task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]) ? '#ef4444' : 'inherit',
                                    fontWeight: (task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]) ? 700 : 500
                                }}>
                                    <Clock size={16} />
                                    <span style={{ fontSize: '0.875rem' }}>{task.dueDate || 'Sin fecha configurada'}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
        </div>
    );
}
