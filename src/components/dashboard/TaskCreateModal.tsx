"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
    Plus, Users, Clock, 
    Paperclip, ChevronDown, X, Flag, Calendar,
    Tag, MessageSquare, Layout, AlignLeft,
    Maximize2, Minus, Maximize, PlaySquare, MoreHorizontal,
    Sparkles, CheckSquare, Mic, MicOff, Loader2
} from "lucide-react";
import { taskActions } from "@/lib/firebase/actions";
import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

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
    const dateInputRef = useRef<HTMLInputElement>(null);
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

    const [isRecording, setIsRecording] = useState(false);
    const [isParsingSpeech, setIsParsingSpeech] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const recognitionRef = useRef<any>(null);

    const [quickSubtasks, setQuickSubtasks] = useState<any[]>([]);
    const [subtaskInput, setSubtaskInput] = useState("");

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
        setQuickSubtasks([]);
        setSubtaskInput("");
    };

    const addQuickSubtask = () => {
        if (!subtaskInput.trim()) return;
        setQuickSubtasks([...quickSubtasks, {
            title: subtaskInput.trim(),
            priority: "Media",
            assignedEmails: []
        }]);
        setSubtaskInput("");
    };

    const handleCreate = async () => {
        if (!user?.company_id) { toast.error("Error: Empresa no identificada"); return; }
        if (!newTask.title.trim()) { toast.error("El título es obligatorio"); return; }
        
        setIsSubmitting(true);
        try {
            // 1. Create Main Task
            const mainTaskId = await taskActions.createTask(user.company_id, { ...newTask, createdBy: user.email });
            
            // 2. Create Quick Subtasks if any
            if (quickSubtasks.length > 0) {
                const subtaskPromises = quickSubtasks.map(st => 
                    taskActions.createTask(user.company_id, {
                        ...st,
                        area: newTask.area,
                        status: "Pendiente",
                        parentId: mainTaskId,
                        createdBy: user.email
                    })
                );
                await Promise.all(subtaskPromises);
            }

            resetForm();
            onClose();
            toast.success(quickSubtasks.length > 0 
                ? `Tarea y ${quickSubtasks.length} subtareas creadas correctamente` 
                : "Tarea creada correctamente"
            );
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleSpeech = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Tu navegador no soporta reconocimiento de voz.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => {
            setIsRecording(true);
            setSpeechTranscript("");
        };

        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');
            setSpeechTranscript(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech Error:", event.error);
            setIsRecording(false);
            toast.error("Error de voz: " + event.error);
        };

        recognition.onend = async () => {
            setIsRecording(false);
            if (speechTranscript.trim()) {
                handleParseSpeech(speechTranscript);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleParseSpeech = async (text: string) => {
        setIsParsingSpeech(true);
        const parseToast = toast.loading("La IA está analizando tu voz...");
        try {
            const parseFunc = httpsCallable(functions, 'parseTaskFromVoice');
            const result: any = await parseFunc({ text, availableAreas });
            const data = result.data;

            setNewTask(prev => ({
                ...prev,
                title: data.title || prev.title,
                description: data.description || text,
                priority: data.priority || prev.priority,
                area: data.area || prev.area,
                dueDate: data.dueDate || prev.dueDate
            }));

            toast.success("¡Tarea configurada por voz!", { id: parseToast });
        } catch (error) {
            console.error("Parse Error:", error);
            toast.error("No pude entender todos los detalles, pero he guardado tu nota.", { id: parseToast });
            setNewTask(prev => ({ ...prev, title: text }));
        } finally {
            setIsParsingSpeech(false);
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
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={onClose} 
                            style={{ 
                                width: '32px', 
                                height: '32px', 
                                padding: '0', 
                                borderRadius: '10px',
                                color: 'var(--cu-text-light)',
                                marginRight: '2.5rem'
                            }}
                        >
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="cu-body">
                    {/* Title Input */}
                    <div className="flex-row items-center gap-3 w-full">
                        <input
                            type="text"
                            placeholder={isRecording ? "Escuchando..." : "Nombre de la tarea"}
                            className="cu-title-input"
                            autoFocus
                            value={isRecording ? speechTranscript : newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        />
                        <Button 
                            variant="ghost" 
                            onClick={toggleSpeech}
                            style={{ 
                                padding: '12px', 
                                height: '50px', 
                                width: '50px', 
                                borderRadius: '15px',
                                background: isRecording ? '#ef4444' : 'var(--cu-hover)',
                                color: isRecording ? 'white' : 'var(--cu-primary)',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            className={isRecording ? 'pulse-anim' : ''}
                        >
                            {isParsingSpeech ? <Loader2 size={24} className="animate-spin" /> : isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                        </Button>
                    </div>

                    {/* Metadata Action Row */}
                    <div className="cu-meta-row">
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
                        <div className="cu-pill cu-pill-date" onClick={() => {
                            try { (dateInputRef.current as any)?.showPicker(); } catch(e) { dateInputRef.current?.click(); }
                        }}>
                            <Calendar size={12} /> 
                            <span>{newTask.dueDate || 'Fechas'}</span>
                            <input 
                                ref={dateInputRef}
                                type="date" 
                                value={newTask.dueDate} 
                                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                            />
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
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toast("La redacción con IA estará disponible próximamente", { icon: '✨' })}
                            style={{ 
                                alignSelf: 'flex-start', 
                                background: 'rgba(123,104,238,0.1)', 
                                color: '#7b68ee',
                                fontSize: '0.75rem' 
                            }}
                        >
                            <Sparkles size={12} fill="currentColor" /> Redactar con IA
                        </Button>
                    </div>

                    {/* Quick Subtasks Section */}
                    <div className="cu-subtasks-section" style={{ marginTop: '20px' }}>
                        <div className="flex-row items-center gap-2 mb-3">
                            <CheckSquare size={14} className="text-primary" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--cu-text-light)' }}>Subtareas Rápidas</span>
                        </div>

                        <div className="cu-subtask-quick-add">
                            <input 
                                type="text" 
                                placeholder="Añadir subtarea y presionar Enter..." 
                                value={subtaskInput}
                                onChange={e => setSubtaskInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addQuickSubtask()}
                                className="cu-subtask-input"
                            />
                        </div>

                        <div className="cu-subtasks-list">
                            {quickSubtasks.map((st, idx) => (
                                <div key={idx} className="cu-subtask-item">
                                    <div className="cu-subtask-main">
                                        <div className="cu-subtask-dot" />
                                        <span className="cu-subtask-title">{st.title}</span>
                                    </div>
                                    
                                    <div className="cu-subtask-actions">
                                        {/* Priority Selector */}
                                        <div className="cu-mini-pill cu-dropdown">
                                            <Flag size={10} fill={priorityColors[st.priority] || 'none'} color={priorityColors[st.priority] || 'var(--cu-text-light)'} />
                                            <select 
                                                value={st.priority} 
                                                onChange={e => {
                                                    const updated = [...quickSubtasks];
                                                    updated[idx].priority = e.target.value;
                                                    setQuickSubtasks(updated);
                                                }}
                                            >
                                                {["Baja", "Media", "Alta", "Urgente"].map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>

                                        {/* Assignee Selector */}
                                        <div className="cu-mini-pill cu-dropdown">
                                            <Users size={10} />
                                            <span style={{fontSize: '0.65rem'}}>{st.assignedEmails?.length > 0 ? st.assignedEmails.length : ''}</span>
                                            <select 
                                                onChange={e => {
                                                    const email = e.target.value;
                                                    if (!email) return;
                                                    const updated = [...quickSubtasks];
                                                    const current = updated[idx].assignedEmails || [];
                                                    updated[idx].assignedEmails = current.includes(email) 
                                                        ? current.filter((m: string) => m !== email) 
                                                        : [...current, email];
                                                    setQuickSubtasks(updated);
                                                }}
                                            >
                                                <option value="">Asignar...</option>
                                                {companyUsers?.map((u: any) => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
                                            </select>
                                        </div>

                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="cu-subtask-remove text-muted hover:text-danger"
                                            onClick={() => setQuickSubtasks(quickSubtasks.filter((_, i) => i !== idx))}
                                            style={{ padding: '4px', height: '20px', width: '20px' }}
                                        >
                                            <X size={12} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                        <Button 
                            variant="primary" 
                            onClick={handleCreate}
                            isLoading={isSubmitting}
                            style={{ height: '36px', padding: '0 18px' }}
                        >
                            {isSubmitting ? 'Creando...' : 'Crear Tarea'}
                        </Button>
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
                .cu-btn-icon { width: 28px; height: 28px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--cu-text-light); border: none; background: transparent; cursor: pointer; transition: background 0.1s; }
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
                .cu-pill-date input { position: absolute; inset: 0; opacity: 0; cursor: pointer; pointer-events: none; }

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

                /* Quick Subtasks Styles */
                .cu-subtask-input { width: 100%; border: 1px solid var(--cu-border); border-radius: 6px; padding: 8px 12px; font-size: 0.85rem; outline: none; transition: border-color 0.2s; }
                .cu-subtask-input:focus { border-color: var(--cu-primary); }
                .cu-subtasks-list { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; max-height: 200px; overflow-y: auto; padding-right: 4px; }
                .cu-subtask-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fafbfc; border-radius: 6px; border: 1px solid transparent; transition: all 0.2s; }
                .cu-subtask-item:hover { background: #f1f3f5; border-color: var(--cu-border); }
                .cu-subtask-main { display: flex; align-items: center; gap: 10px; flex: 1; }
                .cu-subtask-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cu-border); }
                .cu-subtask-title { font-size: 0.85rem; font-weight: 500; color: var(--cu-text); }
                .cu-subtask-actions { display: flex; gap: 6px; align-items: center; }
                .cu-mini-pill { display: flex; align-items: center; gap: 4px; padding: 2px 6px; border: 1px solid var(--cu-border); border-radius: 4px; cursor: pointer; background: white; }
                .cu-mini-pill:hover { background: var(--cu-hover); }
                .cu-subtask-remove { border: none; background: transparent; color: var(--cu-text-light); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
                .cu-subtask-remove:hover { background: #fee2e2; color: #ef4444; }
                .cu-subtasks-list::-webkit-scrollbar { width: 4px; }
                .cu-subtasks-list::-webkit-scrollbar-thumb { background: #e9ebf0; border-radius: 20px; }

                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .pulse-anim {
                    animation: pulse 1.5s infinite;
                }
            `}</style>
        </div>
    );

    const root = document.getElementById("modal-root");
    return root ? createPortal(modalContent, root) : null;
};
