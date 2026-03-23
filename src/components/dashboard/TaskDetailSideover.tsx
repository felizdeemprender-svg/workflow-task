"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, User, Tag, AlertCircle, Save, Trash2, Clock, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { taskActions } from "@/lib/firebase/actions";
import { toast } from "sonner";

interface TaskDetailSideoverProps {
    task: any;
    isOpen: boolean;
    onClose: () => void;
}

export const TaskDetailSideover = ({ task, isOpen, onClose }: TaskDetailSideoverProps) => {
    const [editedTask, setEditedTask] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setEditedTask({ ...task });
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
        if (!task?.id || !editedTask) return;
        setIsSaving(true);
        try {
            await taskActions.updateTask(task.id, editedTask);
            toast.success("Tarea actualizada correctamente");
            onClose();
        } catch (error) {
            console.error("Error updating task:", error);
            toast.error("Error al actualizar la tarea");
        } finally {
            setIsSaving(false);
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
        <AnimatePresence mode="wait">
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
                            maxWidth: '450px',
                            backgroundColor: 'var(--bg-card)',
                            boxShadow: '-10px 0 50px rgba(0,0,0,0.3)',
                            zIndex: 1001,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '2rem',
                            gap: '2rem',
                            borderLeft: '1px solid var(--border-light)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={24} className="text-primary" />
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Detalle de Tarea</h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClose} style={{ borderRadius: '50%', padding: '8px' }}>
                                <X size={20} />
                            </Button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="no-scrollbar">
                            {!editedTask ? (
                                <div className="flex-row justify-center items-center py-20">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : (
                                <>
                                    <div className="flex-col gap-2">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Título</label>
                                        <input
                                            type="text"
                                            value={editedTask.title || ""}
                                            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                                            style={{
                                                border: 'none',
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                width: '100%',
                                                outline: 'none',
                                                color: 'var(--text-main)',
                                                backgroundColor: 'transparent'
                                            }}
                                        />
                                    </div>

                                    <div className="flex-col gap-2">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Descripción</label>
                                        <textarea
                                            value={editedTask.description || ""}
                                            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                                            rows={4}
                                            style={{
                                                border: '1px solid var(--border-light)',
                                                borderRadius: '12px',
                                                padding: '1rem',
                                                fontSize: '0.9rem',
                                                width: '100%',
                                                outline: 'none',
                                                resize: 'none',
                                                backgroundColor: 'var(--bg-main)',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="flex-col gap-2">
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</label>
                                            <select
                                                value={editedTask.status || ""}
                                                onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })}
                                                style={{ 
                                                    padding: '0.75rem', 
                                                    borderRadius: '10px', 
                                                    border: '1px solid var(--border-light)', 
                                                    fontSize: '0.85rem',
                                                    backgroundColor: 'var(--bg-main)',
                                                    color: 'var(--text-main)'
                                                }}
                                            >
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="En Proceso">En Proceso</option>
                                                <option value="Finalizada">Finalizada</option>
                                            </select>
                                        </div>
                                        <div className="flex-col gap-2">
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prioridad</label>
                                            <select
                                                value={editedTask.priority || ""}
                                                onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                                                style={{ 
                                                    padding: '0.75rem', 
                                                    borderRadius: '10px', 
                                                    border: '1px solid var(--border-light)', 
                                                    fontSize: '0.85rem',
                                                    backgroundColor: 'var(--bg-main)',
                                                    color: 'var(--text-main)'
                                                }}
                                            >
                                                <option value="Alta">Alta</option>
                                                <option value="Media">Media</option>
                                                <option value="Baja">Baja</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex-col gap-4" style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                                        <div className="flex-row items-center gap-3">
                                            <Clock size={16} className="text-muted" />
                                            <div className="flex-col">
                                                <span style={{ fontSize: '0.75rem', opacity: 0.6, color: 'var(--text-muted)' }}>Fecha de vto.</span>
                                                <input 
                                                    type="date" 
                                                    value={editedTask.dueDate || ""} 
                                                    onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                                                    style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-row items-center gap-3">
                                            <Tag size={16} className="text-muted" />
                                            <div className="flex-col">
                                                <span style={{ fontSize: '0.75rem', opacity: 0.6, color: 'var(--text-muted)' }}>Área</span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{editedTask.area || "General"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                            <Button 
                                variant="outline" 
                                onClick={handleDelete}
                                style={{ flex: 1, color: '#ef4444' }}
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
