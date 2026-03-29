"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Calendar, User, Tag, AlertCircle, Save, Trash2, 
    Clock, CheckCircle2, Circle, Loader2, Send, Paperclip, 
    Bot, History, MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { taskActions, notificationActions } from "@/lib/firebase/actions";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { aiService } from "@/lib/ai/service";
import { serverTimestamp, orderBy, where } from "firebase/firestore";
import { toast } from "sonner";

interface TaskDetailSideoverProps {
    task: any;
    isOpen: boolean;
    onClose: () => void;
}

// Constants for queries
const CHAT_CONSTRAINTS = [orderBy("createdAt", "asc")];
const LOG_CONSTRAINTS = [orderBy("createdAt", "desc")];

export const TaskDetailSideover = ({ task, isOpen, onClose }: TaskDetailSideoverProps) => {
    const { user } = useAuth();
    const [editedTask, setEditedTask] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"detalles" | "chat" | "actividad">("detalles");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Fetch company users
    const usersConstraints = useMemo(() =>
        user?.company_id ? [where('company_id', '==', user.company_id)] : [],
        [user?.company_id]
    );
    const { data: companyUsers } = useFirestoreQuery<any>('users', usersConstraints, isOpen && !!user?.company_id);

    // Queries for chat and logs
    const { data: messages = [] } = useFirestoreQuery<any>(
        task?.id ? `tasks/${task.id}/chat` : "",
        CHAT_CONSTRAINTS,
        isOpen && !!task?.id
    );

    const { data: logs = [] } = useFirestoreQuery<any>(
        task?.id ? `tasks/${task.id}/log` : "",
        LOG_CONSTRAINTS,
        isOpen && !!task?.id
    );

    useEffect(() => {
        if (task) {
            setEditedTask({ 
                ...task, 
                assignedEmails: task.assignedEmails || (task.assignedEmail ? [task.assignedEmail] : []) 
            });
            setActiveTab("detalles");
        } else {
            setEditedTask(null);
        }
    }, [task]);

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSave = async () => {
        if (!task?.id || !editedTask || !user) return;
        setIsSaving(true);
        
        // Build change log
        const changes = [];
        if (editedTask.title !== task.title) changes.push(`Título: ${task.title} -> ${editedTask.title}`);
        if (editedTask.status !== task.status) changes.push(`Estado: ${task.status} -> ${editedTask.status}`);
        if (editedTask.priority !== task.priority) changes.push(`Prioridad: ${task.priority} -> ${editedTask.priority}`);
        if (editedTask.dueDate !== task.dueDate) changes.push(`Vto: ${task.dueDate} -> ${editedTask.dueDate}`);
        
        const oldEmails = task.assignedEmails || (task.assignedEmail ? [task.assignedEmail] : []);
        const newEmails = editedTask.assignedEmails || [];
        if (JSON.stringify(oldEmails.sort()) !== JSON.stringify(newEmails.sort())) {
            changes.push(`Equipo actualizado: ${newEmails.join(', ')}`);
        }

        if (editedTask.description !== task.description) changes.push(`Descripción editada`);
        if ((editedTask.attachments?.length || 0) > (task.attachments?.length || 0)) {
            const addedCount = (editedTask.attachments?.length || 0) - (task.attachments?.length || 0);
            changes.push(`${addedCount} archivo(s) adjunto(s) nuevo(s)`);
        }

        try {
            await taskActions.updateTask(task.id, editedTask, changes.length > 0 ? {
                action: 'ACTUALIZACIÓN',
                user: user.email || 'Sistema',
                details: changes.join(', ')
            } : undefined);
            toast.success("Tarea actualizada correctamente");
            onClose();
        } catch (error) {
            console.error("Error updating task:", error);
            toast.error("Error al actualizar la tarea");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isSending || !user || !task?.id) return;

        setIsSending(true);
        try {
            await taskActions.sendMessage(task.id, {
                text: message,
                sender: user.email,
                type: "user"
            });
            setMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Error al enviar el mensaje");
        } finally {
            setTimeout(() => setIsSending(false), 500);
        }
    };

    const handleAIAnalysis = async () => {
        if (!user || isAnalyzing || !task?.id) return;
        setIsAnalyzing(true);
        try {
            const recommendation = await aiService.analyzeTask(task, logs);

            await taskActions.sendMessage(task.id, {
                text: `🤖 ANÁLISIS IA:\n\n${recommendation.analysis}\n\nPASOS SUGERIDOS:\n${recommendation.suggestedSteps.map((s: string) => `- ${s}`).join('\n')}\n\nPRIORIDAD RECOMENDADA: ${recommendation.priority}`,
                sender: "Bot",
                type: "bot",
                createdAt: serverTimestamp()
            });

            if (recommendation.priority !== task.priority) {
                await notificationActions.create(user.uid, {
                    title: 'Recomendación IA',
                    message: `La IA sugiere cambiar la prioridad a ${recommendation.priority} para: ${task.title}`,
                    type: 'AI_RECOMENDACION',
                    link: `/dashboard/tasks`
                });
            }
            toast.success("Análisis de IA completado");
        } catch (error) {
            console.error("Error in AI Analysis:", error);
            toast.error("Error al conectar con el asistente de IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDelete = async () => {
        if (!task?.id) return;
        if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) return;
        try {
            await taskActions.deleteTask(task.id);
            toast.success("Tarea eliminada");
            onClose();
        } catch (error) {
            console.error("Error deleting task:", error);
            toast.error("Error al eliminar la tarea");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1000,
                        }}
                    />

                    {/* Side Panel */}
                    <motion.div
                        key="panel"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: '100%',
                            maxWidth: '650px',
                            backgroundColor: 'var(--bg-card)',
                            boxShadow: '-10px 0 50px rgba(0,0,0,0.5)',
                            zIndex: 1001,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '1.25rem',
                            gap: '0.75rem',
                            borderLeft: '1px solid var(--border-light)',
                            backdropFilter: 'blur(10px)',
                            height: '100dvh'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={24} className="text-primary" />
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Tarea</h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClose} style={{ borderRadius: '50%', padding: '8px' }}>
                                <X size={20} />
                            </Button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex-row gap-2" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                            <button 
                                onClick={() => setActiveTab('detalles')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    background: activeTab === 'detalles' ? 'var(--primary-light)' : 'transparent',
                                    color: activeTab === 'detalles' ? 'var(--primary)' : 'var(--text-muted)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Detalles
                            </button>
                            <button 
                                onClick={() => setActiveTab('chat')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    background: activeTab === 'chat' ? 'var(--primary-light)' : 'transparent',
                                    color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Chat ({messages.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('actividad')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    background: activeTab === 'actividad' ? 'var(--primary-light)' : 'transparent',
                                    color: activeTab === 'actividad' ? 'var(--primary)' : 'var(--text-muted)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Actividad
                            </button>
                        </div>

                        <div style={{ 
                            flex: 1, 
                            overflowY: activeTab === 'chat' ? 'hidden' : 'auto', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: activeTab === 'chat' ? '0' : '1.5rem',
                            paddingRight: activeTab === 'chat' ? '0' : '0.5rem'
                        }} className="custom-scrollbar">
                            {!editedTask ? (
                                <div className="flex-row justify-center items-center py-20">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'detalles' && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex-col gap-6"
                                        >
                                            <div className="flex-col gap-2">
                                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Título</label>
                                                <input
                                                    type="text"
                                                    value={editedTask.title || ""}
                                                    onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                                                    style={{
                                                        border: 'none',
                                                        fontSize: '1.4rem',
                                                        fontWeight: 800,
                                                        width: '100%',
                                                        outline: 'none',
                                                        color: 'var(--text-main)',
                                                        backgroundColor: 'transparent'
                                                    }}
                                                />
                                            </div>

                                            <div className="flex-col gap-2">
                                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción</label>
                                                <textarea
                                                    value={editedTask.description || ""}
                                                    onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                                                    rows={6}
                                                    style={{
                                                        border: '1px solid var(--border-light)',
                                                        borderRadius: '16px',
                                                        padding: '1rem',
                                                        fontSize: '0.9rem',
                                                        width: '100%',
                                                        outline: 'none',
                                                        resize: 'none',
                                                        backgroundColor: 'rgba(var(--bg-main-rgb), 0.5)',
                                                        color: 'var(--text-main)',
                                                        lineHeight: '1.5'
                                                    }}
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div className="flex-col gap-2">
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</label>
                                                    <select
                                                        value={editedTask.status || ""}
                                                        onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })}
                                                        style={{ 
                                                            padding: '0.75rem', 
                                                            borderRadius: '12px', 
                                                            border: '1px solid var(--border-light)', 
                                                            fontSize: '0.85rem',
                                                            backgroundColor: 'var(--bg-main)',
                                                            color: 'var(--text-main)',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <option value="Pendiente">Pendiente</option>
                                                        <option value="En Proceso">En Proceso</option>
                                                        <option value="Finalizada">Finalizada</option>
                                                    </select>
                                                </div>
                                                <div className="flex-col gap-2">
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prioridad</label>
                                                    <select
                                                        value={editedTask.priority || ""}
                                                        onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                                                        style={{ 
                                                            padding: '0.75rem', 
                                                            borderRadius: '12px', 
                                                            border: '1px solid var(--border-light)', 
                                                            fontSize: '0.85rem',
                                                            backgroundColor: 'var(--bg-main)',
                                                            color: 'var(--text-main)',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <option value="Alta">Alta</option>
                                                        <option value="Media">Media</option>
                                                        <option value="Baja">Baja</option>
                                                    </select>
                                                </div>
                                            </div>

                                                <div className="flex-col gap-4" style={{ backgroundColor: 'rgba(var(--bg-main-rgb), 0.3)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
                                                    <div className="flex-row items-center gap-3">
                                                        <Clock size={16} className="text-primary" />
                                                        <div className="flex-col">
                                                            <span style={{ fontSize: '0.65rem', opacity: 0.6, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Vencimiento</span>
                                                            <input 
                                                                type="date" 
                                                                value={editedTask.dueDate || ""} 
                                                                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                                                                style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', outline: 'none' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex-col gap-3" style={{ padding: '1.25rem', borderRadius: '20px', backgroundColor: 'rgba(var(--bg-main-rgb), 0.3)', border: '1px solid var(--border-light)' }}>
                                                    <div className="flex-row items-center gap-2">
                                                        <User size={18} className="text-primary" />
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Equipo Asignado</span>
                                                    </div>
                                                    <div className="flex-row flex-wrap gap-2">
                                                        {companyUsers?.map((u: any) => (
                                                            <div 
                                                                key={u.email}
                                                                onClick={() => {
                                                                    const emails = editedTask.assignedEmails || [];
                                                                    const newEmails = emails.includes(u.email) 
                                                                        ? emails.filter((e: string) => e !== u.email)
                                                                        : [...emails, u.email];
                                                                    setEditedTask({ ...editedTask, assignedEmails: newEmails });
                                                                }}
                                                                style={{ 
                                                                    padding: '6px 12px', 
                                                                    borderRadius: '10px', 
                                                                    fontSize: '0.75rem', 
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    background: (editedTask.assignedEmails || []).includes(u.email) ? 'var(--primary-light)' : 'var(--bg-main)',
                                                                    color: (editedTask.assignedEmails || []).includes(u.email) ? 'var(--primary)' : 'var(--text-muted)',
                                                                    border: `1px solid ${(editedTask.assignedEmails || []).includes(u.email) ? 'var(--primary)' : 'var(--border-light)'}`
                                                                }}
                                                            >
                                                                <div style={{ 
                                                                    width: '10px', 
                                                                    height: '10px', 
                                                                    borderRadius: '3px', 
                                                                    border: '1.5px solid currentColor',
                                                                    background: (editedTask.assignedEmails || []).includes(u.email) ? 'currentColor' : 'transparent'
                                                                }} />
                                                                {u.name || u.email.split('@')[0]}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                            {/* Attachments Section */}
                                            <div className="flex-col gap-3" style={{ padding: '1.25rem', borderRadius: '20px', backgroundColor: 'rgba(var(--bg-main-rgb), 0.3)', border: '1px solid var(--border-light)' }}>
                                                <div className="flex-row justify-between items-center">
                                                    <div className="flex-row items-center gap-2">
                                                        <Paperclip size={18} className="text-primary" />
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Archivos Adjuntos</span>
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{editedTask.attachments?.length || 0}</span>
                                                </div>
                                                
                                                <div className="flex-col gap-2">
                                                    {editedTask.attachments?.length > 0 ? (
                                                        editedTask.attachments.map((file: any, index: number) => (
                                                            <div key={index} className="flex-row items-center justify-between p-2 rounded-xl bg-main border border-light hover-border-primary transition-all">
                                                                <div className="flex-row items-center gap-3 overflow-hidden">
                                                                    <div className="p-2 rounded-lg bg-primary-light text-primary">
                                                                        <Paperclip size={14} />
                                                                    </div>
                                                                    <div className="flex-col overflow-hidden">
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {file.name}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                                            {(file.size / 1024).toFixed(1)} KB
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: '1rem 0', opacity: 0.6 }}>No hay archivos adjuntos.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'chat' && (
                                        <motion.div 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex-col" 
                                            style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
                                        >
                                            <div style={{ 
                                                flex: 1, 
                                                overflowY: 'auto', 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '0.75rem',
                                                padding: '0.25rem'
                                            }} className="no-scrollbar">
                                                {messages.length === 0 ? (
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, gap: '1rem' }}>
                                                        <MessageSquare size={32} />
                                                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No hay mensajes todavía.</p>
                                                    </div>
                                                ) : messages.map((msg: any, idx: number) => (
                                                    <div key={msg.id || `msg-${idx}`} style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: msg.sender === 'Bot' ? 'flex-start' : (msg.sender === user?.email ? 'flex-end' : 'flex-start'),
                                                        gap: '0.2rem'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>{msg.sender === user?.email ? 'Tú' : (msg.sender === 'Bot' ? 'IA Assistant' : msg.sender.split('@')[0])}</span>
                                                        </div>
                                                        <div style={{
                                                            maxWidth: '92%',
                                                            padding: '0.5rem 0.85rem',
                                                            borderRadius: '14px',
                                                            fontSize: '0.8rem',
                                                            backgroundColor: msg.sender === 'Bot' ? 'rgba(79, 70, 229, 0.1)' : (msg.sender === user?.email ? 'var(--primary)' : 'var(--bg-main)'),
                                                            color: msg.sender === user?.email ? 'white' : 'var(--text-main)',
                                                            border: '1px solid var(--border-light)',
                                                            whiteSpace: 'pre-wrap',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                            borderTopRightRadius: msg.sender === user?.email ? '2px' : '14px',
                                                            borderTopLeftRadius: (msg.sender !== user?.email && msg.sender !== 'Bot') || msg.sender === 'Bot' ? '2px' : '14px'
                                                        }}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <form onSubmit={handleSendMessage} style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                padding: '0.75rem',
                                                backgroundColor: 'var(--bg-main)',
                                                borderRadius: '16px',
                                                border: '1px solid var(--border-light)',
                                                marginTop: 'auto'
                                            }}>
                                                <input
                                                    type="text"
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    placeholder="Escribir mensaje..."
                                                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-main)' }}
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
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        opacity: message.trim() && !isSending ? 1 : 0.6,
                                                        transition: 'all 0.2s'
                                                    }}>
                                                    {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                                </button>
                                            </form>
                                        </motion.div>
                                    )}

                                    {activeTab === 'actividad' && (
                                        <motion.div 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex-col gap-4"
                                        >
                                            <div style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '1rem',
                                                padding: '1rem',
                                                backgroundColor: 'rgba(var(--bg-main-rgb), 0.2)',
                                                borderRadius: '20px',
                                                border: '1px solid var(--border-light)'
                                            }}>
                                                {logs.length === 0 ? (
                                                    <div style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.5 }}>
                                                        <History size={32} />
                                                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No hay movimientos registrados.</p>
                                                    </div>
                                                ) : logs.map((log: any, i: number) => (
                                                    <div key={log.id || `log-${i}`} style={{ 
                                                        display: 'flex', 
                                                        gap: '1rem', 
                                                        alignItems: 'flex-start',
                                                        paddingBottom: i < logs.length - 1 ? '1rem' : 0,
                                                        borderBottom: i < logs.length - 1 ? '1px solid var(--border-light)' : 'none'
                                                    }}>
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '10px',
                                                            backgroundColor: 'var(--bg-main)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            border: '1px solid var(--border-light)'
                                                        }}>
                                                            <History size={14} className="text-primary" />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                 <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{log.action}</p>
                                                                 <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                                                                     {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Reciente"}
                                                                 </span>
                                                            </div>
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0', lineHeight: '1.4' }}>{log.details}</p>
                                                            <div style={{ marginTop: '6px' }}>
                                                                <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, background: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                    {log.user?.split('@')[0]}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </div>

                        {activeTab === 'detalles' && (
                            <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                                <Button 
                                    variant="danger" 
                                    onClick={handleDelete}
                                    style={{ flex: 1 }}
                                    disabled={!editedTask || isSaving}
                                >
                                    <Trash2 size={18} style={{ marginRight: '8px' }} />
                                    Eliminar
                                </Button>
                                <Button 
                                    variant="primary" 
                                    onClick={handleSave} 
                                    isLoading={isSaving}
                                    style={{ flex: 2 }}
                                    disabled={!editedTask}
                                >
                                    <Save size={18} style={{ marginRight: '8px' }} />
                                    Guardar Cambios
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(99, 102, 241, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(99, 102, 241, 0.4);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </AnimatePresence>
    );
};
