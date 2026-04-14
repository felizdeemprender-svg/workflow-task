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
import { doc, onSnapshot, orderBy, where, serverTimestamp } from "firebase/firestore";
import { aiService } from "@/lib/ai/service";
import { toast } from "sonner";
import { Trash2, CheckCircle2 } from "lucide-react";

export default function TaskDetailClient() {
    const { id } = useParams();
    const { user, isAuthSynced } = useAuth();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Real-time task data
    useEffect(() => {
        if (!id || !isAuthSynced) return;
        const unsubscribe = onSnapshot(
            doc(db, "tasks", id as string), 
            (doc) => {
                if (doc.exists()) {
                    setTask({ id: doc.id, ...doc.data() });
                } else {
                    setTask(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching task:", err);
                if (err.code !== 'permission-denied') {
                    setLoading(false);
                }
            }
        );
        return () => unsubscribe();
    }, [id, isAuthSynced]);

    // Real-time chat messages
    const chatConstraints = React.useMemo(() => [orderBy("createdAt", "asc")], []);
    const { data: messages = [] } = useFirestoreQuery<any>(
        id ? `tasks/${id}/chat` : "",
        chatConstraints,
        isAuthSynced && !!id
    );

    // Real-time logs
    const logConstraints = React.useMemo(() => [orderBy("createdAt", "desc")], []);
    const { data: logs = [] } = useFirestoreQuery<any>(
        id ? `tasks/${id}/log` : "",
        logConstraints,
        isAuthSynced && !!id
    );

    // Subtasks query
    const subtasksConstraints = React.useMemo(() => 
        (id && user?.company_id) ? [
            where('parentId', '==', id),
            where('company_id', '==', user.company_id)
        ] : [],
        [id, user?.company_id]
    );
    const { data: subtasks = [] } = useFirestoreQuery<any>(
        'tasks',
        subtasksConstraints,
        isAuthSynced && !!id && !!user?.company_id,
        [id, user?.company_id]
    );

    // Company users for assignment
    const usersConstraints = React.useMemo(() =>
        user?.company_id ? [where('company_id', '==', user.company_id)] : [],
        [user?.company_id]
    );
    const { data: companyUsers = [] } = useFirestoreQuery<any>(
        'users', 
        usersConstraints, 
        isAuthSynced && !!user?.company_id
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
        if (!user || !id) return;
        setIsSaving(true);
        try {
            await taskActions.updateStatus(id as string, newStatus, user.email || "Usuario");
            toast.success("Estado actualizado");
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Error al actualizar estado");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleSubtaskStatus = async (st: any) => {
        if (!st.id || !user) return;
        const newStatus = st.status === "Finalizada" ? "Pendiente" : "Finalizada";
        try {
            await taskActions.updateStatus(st.id, newStatus, user.uid);
            toast.success(`Subtarea marcada como ${newStatus}`);
        } catch (error) {
            console.error("Error toggling subtask status:", error);
            toast.error("Error al actualizar el estado");
        }
    };

    const handleDeleteSubtask = async (stId: string) => {
        if (!stId) return;
        if (!confirm("¿Eliminar esta subtarea?")) return;
        try {
            await taskActions.deleteTask(stId);
            toast.success("Subtarea eliminada");
        } catch (error) {
            console.error("Error deleting subtask:", error);
            toast.error("Error al eliminar la subtarea");
        }
    };

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim() || isAddingSubtask || !id || !user) return;
        
        setIsAddingSubtask(true);
        try {
            await taskActions.createTask(user.company_id, {
                title: newSubtaskTitle.trim(),
                description: "",
                status: "Pendiente",
                priority: "Media",
                area: task.area || "General",
                parentId: id as string,
                createdBy: user.email,
                assignedEmails: []
            });
            setNewSubtaskTitle("");
            toast.success("Subtarea añadida");
        } catch (error) {
            console.error("Error adding subtask:", error);
            toast.error("Error al añadir la subtarea");
        } finally {
            setIsAddingSubtask(false);
        }
    };

    const handleToggleAssignment = async (email: string) => {
        if (!id || !task || !user) return;
        const emails = task.assignedEmails || (task.assignedEmail ? [task.assignedEmail] : []);
        const newEmails = emails.includes(email) 
            ? emails.filter((e: string) => e !== email)
            : [...emails, email];
        
        try {
            await taskActions.updateTask(id as string, { assignedEmails: newEmails }, {
                action: 'ASIGNACIÓN',
                user: user.email || 'Sistema',
                details: emails.includes(email) ? `Quitado: ${email}` : `Asignado: ${email}`
            });
            toast.success("Equipo actualizado");
        } catch (error) {
            console.error("Error updating assignment:", error);
            toast.error("Error al actualizar asignación");
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
                        <option>🔴 Urgente</option>
                        <option>Finalizada</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
                <div className="flex-col gap-6">
                    <Card title="Descripción">
                        <p className="text-muted" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {task.description || "Sin descripción proporcionada."}
                        </p>
                    </Card>

                    <Card title="Subtareas">
                        <div className="flex-col gap-4">
                            <div className="flex-row justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                                <div className="flex-row items-center gap-2">
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Progreso</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    {subtasks.filter((st: any) => st.status === 'Finalizada').length} / {subtasks.length}
                                </span>
                            </div>

                            {subtasks.length > 0 && (
                                <div style={{ 
                                    width: '100%', 
                                    height: '6px', 
                                    backgroundColor: 'var(--border-light)', 
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    marginBottom: '1rem'
                                }}>
                                    <div 
                                        style={{ 
                                            height: '100%', 
                                            backgroundColor: 'var(--primary)',
                                            borderRadius: '3px',
                                            width: `${(subtasks.filter((st: any) => st.status === 'Finalizada').length / (subtasks.length || 1)) * 100}%`,
                                            transition: 'width 0.3s ease'
                                        }}
                                    />
                                </div>
                            )}
                            
                            <div className="flex-col gap-2">
                                {subtasks.map((st: any) => (
                                    <div 
                                        key={st.id} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '12px',
                                            backgroundColor: 'var(--bg-main)',
                                            border: '1px solid var(--border-light)',
                                            transition: 'all 0.2s'
                                        }}
                                        className="group"
                                    >
                                        <div className="flex-row items-center gap-3" style={{ flex: 1 }}>
                                            <div 
                                                onClick={() => handleToggleSubtaskStatus(st)}
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '4px',
                                                    border: '2px solid var(--primary)',
                                                    background: (st.status === 'Finalizada') ? 'var(--primary)' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {(st.status === 'Finalizada') && <CheckCircle2 size={12} color="white" />}
                                            </div>
                                            <span style={{ 
                                                fontSize: '0.875rem', 
                                                fontWeight: 600, 
                                                textDecoration: (st.status === 'Finalizada') ? 'line-through' : 'none',
                                                opacity: (st.status === 'Finalizada') ? 0.6 : 1
                                            }}>
                                                {st.title}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteSubtask(st.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0 }}
                                            className="group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                
                                <form onSubmit={handleAddSubtask} style={{ marginTop: '0.5rem' }}>
                                    <input 
                                        type="text"
                                        placeholder="+ Añadir nueva subtarea rápida..."
                                        value={newSubtaskTitle}
                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: 'transparent',
                                            border: '1px dashed var(--border-light)',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            fontSize: '0.875rem',
                                            outline: 'none',
                                            color: 'var(--text-main)'
                                        }}
                                        disabled={isAddingSubtask}
                                    />
                                </form>
                            </div>
                        </div>
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

                    <Card title="Equipo">
                        <div className="flex-col gap-3">
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ASIGNADOS</p>
                            <div className="flex-row flex-wrap gap-2">
                                {companyUsers.map((u: any) => {
                                    const isAssigned = (task.assignedEmails || (task.assignedEmail ? [task.assignedEmail] : [])).includes(u.email);
                                    return (
                                        <div 
                                            key={u.email}
                                            onClick={() => handleToggleAssignment(u.email)}
                                            style={{ 
                                                padding: '6px 12px', 
                                                borderRadius: '20px', 
                                                fontSize: '0.75rem', 
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                background: isAssigned ? 'var(--primary-light)' : 'var(--bg-main)',
                                                color: isAssigned ? 'var(--primary)' : 'var(--text-muted)',
                                                border: `1px solid ${isAssigned ? 'var(--primary)' : 'var(--border-light)'}`
                                            }}
                                        >
                                            <div style={{ 
                                                width: '18px', 
                                                height: '18px', 
                                                borderRadius: '50%', 
                                                backgroundColor: isAssigned ? 'var(--primary)' : 'var(--secondary)',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.6rem'
                                            }}>
                                                {u.name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                                            </div>
                                            {u.name || u.email.split('@')[0]}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>

                    <Card title="Detalles">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ÁREA</p>
                                <div style={{ display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '20px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 700 }}>
                                    {task.area}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>CREADO POR</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{task.createdBy}</span>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>FECHA LÍMITE</p>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem', 
                                    color: (task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]) ? '#ef4444' : 'var(--text-main)',
                                    fontWeight: (task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]) ? 700 : 600
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
