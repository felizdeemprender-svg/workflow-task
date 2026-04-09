"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
    Plus, Users, Clock, 
    Paperclip, ChevronDown, X, Flag, Calendar,
    Tag, MessageSquare, Layout, AlignLeft,
    Maximize2, Minus, Maximize, PlaySquare, MoreHorizontal,
    Sparkles
} from "lucide-react";
import { taskActions } from "@/lib/firebase/actions";
import { toast } from "sonner";

interface TaskCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    companyUsers: any[];
    availableAreas: string[];
}

export const TaskCreateModal = ({ 
    isOpen, 
    onClose, 
    user, 
    companyUsers, 
    availableAreas 
}: TaskCreateModalProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        priority: "Media",
        area: user?.area || "General",
        status: "Pendiente",
        dueDate: "",
        assignedEmails: [] as string[],
        attachments: [] as any[],
        recurrence: { frequency: "None" }
    });

    const resetForm = () => {
        setNewTask({
            title: "",
            description: "",
            priority: "Media",
            area: user?.area || "General",
            status: "Pendiente",
            dueDate: "",
            assignedEmails: [],
            attachments: [],
            recurrence: { frequency: "None" }
        });
    };

    const handleCreate = async () => {
        if (!user?.company_id) { toast.error("Error: Empresa no identificada"); return; }
        if (!newTask.title.trim()) { toast.error("El título es obligatorio"); return; }
        
        setIsSubmitting(true);
        try {
            await taskActions.createTask(user.company_id, { ...newTask, createdBy: user.email });
            resetForm();
            onClose();
            toast.success("Tarea creada correctamente");
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const priorityColors: any = { "Alta": "#ef4444", "Media": "#f59e0b", "Baja": "#10b981", "Urgente": "#991b1b" };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div 
            onClick={onClose}
            className="clickup-overlay"
        >
            <div 
                onClick={e => e.stopPropagation()}
                className="clickup-modal"
            >
                {/* Header Navbar */}
                <div className="cu-header">
                    <div className="cu-breadcrumbs">
                        <span className="cu-crumb">{newTask.area}</span>
                        <span className="cu-crumb-sep">/</span>
                        <span className="cu-crumb-active">Nueva Tarea</span>
                    </div>
                    <div className="cu-window-actions">
                        <button className="cu-btn-icon" onClick={onClose}><X size={16} /></button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="cu-body">
                    {/* Title Input */}
                    <input
                        type="text"
                        placeholder="Nombre de la tarea"
                        className="cu-title-input"
                        autoFocus
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    />

                    {/* Metadata Action Row */}
                    <div className="cu-meta-row">
                        <div className="cu-pill cu-pill-status">
                            <span className="cu-status-dot" /> TO DO
                        </div>
                        
                        {/* Assignee */}
                        <div className="cu-pill cu-dropdown">
                            <Users size={12} /> 
                            <span>{newTask.assignedEmails.length ? `${newTask.assignedEmails.length} asignados` : 'Asignar a'}</span>
                            <select onChange={e => {
                                const val = e.target.value;
                                if(val && !newTask.assignedEmails.includes(val)) setNewTask(p => ({ ...p, assignedEmails: [...p.assignedEmails, val] }));
                                e.target.value = "";
                            }}>
                                <option value="">Seleccionar Asignado</option>
                                {companyUsers?.map((u: any) => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
                            </select>
                        </div>
                        
                        {/* Due Date */}
                        <div className="cu-pill cu-pill-date">
                            <Calendar size={12} /> 
                            <span>{newTask.dueDate || 'Fechas'}</span>
                            <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}/>
                        </div>

                        {/* Priority */}
                        <div className="cu-pill cu-dropdown">
                            <Flag size={12} fill={priorityColors[newTask.priority] || 'none'} color={priorityColors[newTask.priority] || 'var(--cu-text-light)'} />
                            <span>{newTask.priority}</span>
                            <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                                {["Baja", "Media", "Alta", "Urgente"].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        {/* Area Tags */}
                        <div className="cu-pill cu-dropdown">
                            <Tag size={12} />
                            <span>{newTask.area}</span>
                            <select value={newTask.area} onChange={e => setNewTask({ ...newTask, area: e.target.value })}>
                                {availableAreas.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="cu-divider" />

                    {/* Description Area */}
                    <div className="cu-desc-container">
                        <textarea
                            placeholder="Añadir descripción"
                            className="cu-desc-input"
                            value={newTask.description}
                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                        />
                        <button className="cu-ai-btn" onClick={() => toast("La redacción con IA estará disponible próximamente", { icon: '✨' })}>
                            <Sparkles size={12} fill="currentColor" /> Redactar con IA
                        </button>
                    </div>

                    {/* Attachments Dropzone */}
                    <div className="cu-dropzone" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip size={14} className="cu-text-light" />
                        <span className="cu-text-light" style={{fontSize: '0.8rem'}}>Haz clic para adjuntar archivos</span>
                        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => {
                            if(e.target.files) setNewTask(p => ({ ...p, attachments: [...p.attachments, ...Array.from(e.target.files!)] }));
                        }} />
                    </div>
                </div>

                {/* Footer fixed */}
                <div className="cu-footer">
                    <div className="cu-footer-left">
                        {/* Status saved text or empty */}
                    </div>
                    <div className="cu-footer-right">
                        <button className="cu-btn-create" onClick={handleCreate}>
                            {isSubmitting ? 'Creando...' : 'Crear Tarea'}
                        </button>
                    </div>
                </div>

            </div>

            <style jsx>{`
                .clickup-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100000;
                    display: flex; align-items: flex-start; justify-content: center; padding-top: 5vh; font-family: 'Inter', sans-serif;
                }
                .clickup-modal {
                    background: #ffffff; border-radius: 12px; width: 850px; max-width: 95vw; height: 80vh; max-height: 800px;
                    display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: fadeUp 0.2s ease-out; position: relative; overflow: hidden;
                    --cu-text: #2f3438; --cu-text-light: #7c828d; --cu-border: #e9ebf0; --cu-hover: #f1f3f5; --cu-primary: #7b68ee;
                }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .cu-header { display: flex; justify-content: space-between; align-items: center; height: 44px; padding: 0 12px 0 20px; border-bottom: 1px solid var(--cu-border); }
                .cu-breadcrumbs { display: flex; gap: 8px; font-size: 0.75rem; color: var(--cu-text-light); align-items: center; text-transform: uppercase; letter-spacing: 0.02em; font-weight: 600; }
                .cu-crumb { cursor: pointer; } .cu-crumb:hover { color: var(--cu-text); text-decoration: underline; }
                .cu-crumb-sep { opacity: 0.4; } .cu-crumb-active { color: var(--cu-text); }
                .cu-window-actions { display: flex; gap: 4px; }
                .cu-btn-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--cu-text-light); border: none; background: transparent; cursor: pointer; transition: background 0.1s; }
                .cu-btn-icon:hover { background: var(--cu-hover); color: var(--cu-text); }
                
                .cu-body { flex: 1; padding: 30px 40px; overflow-y: auto; display: flex; flex-direction: column; }
                
                .cu-title-input { font-size: 2.1rem; font-weight: 800; color: var(--cu-text); border: none; outline: none; width: 100%; margin-bottom: 16px; letter-spacing: -0.02em; }
                .cu-title-input::placeholder { color: #cfd4d8; font-weight: 700; }
                
                .cu-meta-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 24px; }
                .cu-pill { display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; height: 26px; border: 1px dashed var(--cu-border); border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: var(--cu-text-light); cursor: pointer; transition: all 0.1s; background: transparent; }
                .cu-pill:hover { background: var(--cu-hover); border-color: #b9bec7; color: var(--cu-text); }
                .cu-pill-status { background: #e9ebf0; border: none; color: var(--cu-text); }
                .cu-status-dot { width: 8px; height: 8px; border-radius: 2px; background: #b9bec7; }
                .cu-pill-icon { padding: 0 6px; }
                .cu-dropdown { position: relative; }
                .cu-dropdown select { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
                .cu-pill-date { position: relative; }
                .cu-pill-date input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

                .cu-divider { height: 1px; background: var(--cu-border); margin: 0 -40px 16px; }
                
                .cu-desc-container { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 150px; }
                .cu-desc-input { flex: 1; border: none; outline: none; resize: none; font-size: 0.95rem; line-height: 1.6; color: var(--cu-text); min-height: 100px; }
                .cu-desc-input::placeholder { color: #a4abb5; }
                
                .cu-ai-btn { align-self: flex-start; display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 0.75rem; font-weight: 600; color: #7b68ee; background: rgba(123,104,238,0.1); border: none; border-radius: 4px; cursor: pointer; transition: opacity 0.2s; }
                .cu-ai-btn:hover { opacity: 0.8; }
                
                .cu-dropzone { border: 1px dashed var(--cu-border); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; margin-top: 20px; transition: background 0.1s; }
                .cu-dropzone:hover { background: var(--cu-hover); }

                .cu-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid var(--cu-border); background: #fbfbfc; }
                .cu-footer-left { display: flex; gap: 8px; }
                .cu-footer-right { display: flex; gap: 12px; }
                .cu-btn-create { display: inline-flex; align-items: center; justify-content: center; height: 36px; padding: 0 18px; background: var(--primary); color: #fff; font-size: 0.85rem; font-weight: 600; border: none; border-radius: var(--radius-standard); cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm); }
                .cu-btn-create:hover { background: var(--primary-hover); }
            `}</style>
        </div>
    );

    const root = document.getElementById("modal-root");
    return root ? createPortal(modalContent, root) : null;
};
