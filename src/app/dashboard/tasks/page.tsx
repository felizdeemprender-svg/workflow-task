"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Plus, Filter, Loader2, Database, Users, Clock, 
    MoreVertical, RefreshCw, UserCheck, Hammer, 
    CheckCheck, Circle, Wrench, Timer, Play, 
    ChevronDown, X, MessageSquare, Square, Folder, Search,
    Paperclip 
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { taskActions } from "@/lib/firebase/actions";
import { where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Modal } from "@/components/ui/Modal";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { TaskDetailSideover } from "@/components/dashboard/TaskDetailSideover";

export default function TasksPage() {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isSideoverOpen, setIsSideoverOpen] = useState(false);

    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        priority: "Media",
        area: user?.area || "General",
        status: "Pendiente",
        dueDate: new Date().toISOString().split('T')[0],
        assignedEmail: "",
        attachments: [] as any[],
        recurrence: {
            frequency: "None",
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
        }
    });

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;
        const oldStatus = source.droppableId;
        const taskId = draggableId;

        try {
            toast.promise(
                taskActions.updateTask(taskId, { status: newStatus }, {
                    action: 'CAMBIO DE ESTADO',
                    user: user?.email || 'Sistema',
                    details: `${oldStatus} -> ${newStatus} (Arrastre)`
                }),
                {
                    loading: 'Actualizando estado...',
                    success: 'Estado actualizado correctamente',
                    error: 'Error al actualizar el estado'
                }
            );
        } catch (error) {
            console.error("Error handling drag end:", error);
        }
    };

    const toggleSection = (label: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    // Real-time tasks query
    const constraints = React.useMemo(() =>
        user?.company_id ? [where('company_id', '==', user.company_id)] : [],
        [user?.company_id]
    );

    const { data: tasks, loading } = useFirestoreQuery<any>('tasks', constraints, !!user?.company_id);
    const { data: companyUsers } = useFirestoreQuery<any>('users', constraints, !!user?.company_id);
    const [availableAreas, setAvailableAreas] = useState<string[]>([]);

    React.useEffect(() => {
        const fetchCompanyAreas = async () => {
            if (!user?.company_id) return;
            const companyDoc = await getDoc(doc(db, "companies", user.company_id));
            if (companyDoc.exists()) {
                setAvailableAreas(companyDoc.data().areas || ["General", "Ventas", "Logística", "Soporte"]);
            }
        };
        fetchCompanyAreas();
    }, [user?.company_id]);

    const [filters, setFilters] = useState({
        search: "",
        status: "Todos",
        area: "Todas",
        priority: "Todas"
    });

    const filteredTasks = React.useMemo(() => {
        return (tasks || []).filter((task: any) => {
            const searchLower = (filters.search || "").toLowerCase();
            const matchesSearch = 
                (task.title?.toLowerCase() || "").includes(searchLower) || 
                (task.description?.toLowerCase() || "").includes(searchLower);
            
            const matchesStatus = filters.status === "Todos" || task.status === filters.status;
            const matchesArea = filters.area === "Todas" || task.area === filters.area;
            const matchesPriority = filters.priority === "Todas" || task.priority === filters.priority;
            
            return matchesSearch && matchesStatus && matchesArea && matchesPriority;
        });
    }, [tasks, filters]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.company_id) return;
        setIsSubmitting(true);
        try {
            await taskActions.createTask(user.company_id, {
                ...newTask,
                createdBy: user.email
            });
            setIsModalOpen(false);
            setNewTask({
                title: "",
                description: "",
                priority: "Media",
                area: user?.area || "General",
                status: "Pendiente",
                dueDate: new Date().toISOString().split('T')[0],
                assignedEmail: "",
                attachments: [],
                recurrence: {
                    frequency: "None",
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                }
            });
            toast.success("Tarea creada correctamente");
        } catch (error: any) {
            console.error("Error creating task:", error);
            toast.error("Error al crear la tarea");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-col gap-4 fade-in">
            <div className="card p-4 sm:p-5 pr-1 sm:pr-1 flex-row gap-4 w-full" style={{ boxShadow: 'var(--shadow-premium)', border: 'none', alignItems: 'center' }}>
                <div className="flex-col gap-4 flex-1 min-w-0">
                    <div className="flex-col gap-3">
                        <input
                            type="text"
                            placeholder="¿Qué hay que hacer?"
                            className="text-main placeholder-muted w-full"
                            style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', fontSize: 'min(1.4rem, 5.5vw)', fontWeight: '500' }}
                            value={newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        />
                        <textarea
                            placeholder="Añadir descripción..."
                            className="text-muted resize-none w-full"
                            style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', fontSize: '0.9rem', opacity: 0.6 }}
                            rows={1}
                            value={newTask.description}
                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                        />
                    </div>

                    <div className="flex-row items-center" style={{ width: '100%', gap: '1rem' }}>
                        <div className="flex-col gap-1.5">
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginLeft: '2px' }}>Área</span>
                            <select 
                                value={newTask.area} 
                                onChange={e => setNewTask({ ...newTask, area: e.target.value })}
                                style={{ 
                                    padding: '0.4rem 2rem 0.4rem 0.8rem', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    width: 'auto', 
                                    minWidth: '140px',
                                    background: 'var(--bg-main)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-light)',
                                    color: 'var(--text-main)',
                                    appearance: 'none',
                                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\' stroke-width=\'3\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.6rem center',
                                    backgroundSize: '0.8rem',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {availableAreas.filter(a => a !== "Todas").map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                        
                        <div className="flex-row text-muted font-bold flex-wrap items-center" style={{ opacity: 0.8, fontSize: '0.75rem', minWidth: 0, width: '100%', marginTop: '0.5rem', columnGap: '1.25rem', rowGap: '0.5rem' }}>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                className="hover-primary-text"
                            >
                                <Paperclip size={12} className={newTask.attachments.length > 0 ? "text-primary" : ""} /> 
                                <span style={{ color: newTask.attachments.length > 0 ? 'var(--primary)' : 'inherit' }}>
                                    {newTask.attachments.length > 0 ? `${newTask.attachments.length} Archivo(s)` : "Adjuntar"}
                                </span>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    multiple
                                    style={{ display: 'none' }} 
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            const newFiles = Array.from(e.target.files).map(f => ({
                                                name: f.name,
                                                size: f.size,
                                                type: f.type,
                                                lastModified: f.lastModified,
                                                uploadedAt: new Date().toISOString()
                                            }));
                                            setNewTask({ ...newTask, attachments: [...newTask.attachments, ...newFiles] });
                                            toast.success(`${newFiles.length} archivo(s) preparados`);
                                        }
                                    }} 
                                />
                            </div>
                            <div 
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', cursor: 'pointer', position: 'relative' }}
                                className="hover-primary-text"
                            >
                                <Clock size={12} /> 
                                <span onClick={() => (document.getElementById('task-date-input') as any)?.showPicker?.() || document.getElementById('task-date-input')?.focus()}>
                                    {newTask.dueDate || "Fecha"}
                                </span>
                                <input 
                                    id="task-date-input" 
                                    type="date" 
                                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0 }} 
                                    value={newTask.dueDate} 
                                    onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} 
                                />
                            </div>
                            <div 
                                onClick={() => {
                                    const next: any = { "None": "Daily", "Daily": "Weekly", "Weekly": "Monthly", "Monthly": "None" };
                                    setNewTask({ ...newTask, recurrence: { ...newTask.recurrence, frequency: next[newTask.recurrence.frequency] || "None" } });
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                className="hover-primary-text"
                            >
                                <RefreshCw size={12} className={newTask.recurrence.frequency !== "None" ? "text-primary" : ""} /> 
                                <span style={{ color: newTask.recurrence.frequency !== "None" ? 'var(--primary)' : 'inherit' }}>
                                    {newTask.recurrence.frequency === "None" ? "Recurrencia" : newTask.recurrence.frequency}
                                </span>
                            </div>
                            <div 
                                onClick={() => {
                                    const next: any = { "Baja": "Media", "Media": "Alta", "Alta": "Baja" };
                                    setNewTask({ ...newTask, priority: next[newTask.priority] || "Media" });
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                className="hover-primary-text"
                            >
                                <Filter size={12} /> <span>{newTask.priority}</span>
                            </div>
                        </div>
                    </div>

                <div className="flex-col justify-center shrink-0 pr-1">
                    <button 
                        onClick={handleCreateTask}
                        className="flex items-center justify-center text-white p-0 shadow-lg"
                        style={{ 
                            background: 'var(--primary)', 
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                        disabled={isSubmitting}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                        }}
                    >
                        {isSubmitting ? (
                            <Loader2 size={18} className="animate-spin text-white" />
                        ) : (
                            <Plus size={24} strokeWidth={2.5} className="text-white" />
                        )}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex-col gap-6">
                <div className="flex-row justify-between items-center gap-2" style={{ minWidth: 0 }}>
                    <div className="flex-row gap-2 flex-grow max-w-lg px-3 py-1.5 rounded-pill shadow-sm" style={{ background: 'rgba(var(--bg-main-rgb), 0.5)', border: '1px solid var(--border-light)', minWidth: 0 }}>
                        <Search size={14} className="text-muted opacity-40" />
                        <input 
                            type="text" 
                            placeholder="Buscar tareas, archivos..." 
                            className="text-main flex-grow text-xs font-medium"
                            style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', minWidth: 0 }}
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex-row gap-2 no-scrollbar" style={{ 
                    maxWidth: '100%', 
                    overflowX: 'auto', 
                    paddingBottom: '8px', 
                    WebkitOverflowScrolling: 'touch',
                    display: 'flex',
                    flexWrap: 'nowrap',
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none'
                }}>
                    <button 
                        onClick={() => setFilters({ ...filters, area: "Todas" })}
                        className="pill"
                        style={{ 
                            background: filters.area === "Todas" ? '#6366f1' : 'var(--bg-card)', 
                            color: filters.area === "Todas" ? 'white' : 'var(--text-muted)',
                            padding: '0.4rem 1.2rem',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        Todas
                    </button>
                    
                    {availableAreas.filter(a => a !== "Todas").map(area => {
                        const areaColors: any = { "Administración": "#00ffff", "Ventas": "#ef4444", "Logística": "#f59e0b", "Soporte": "#10b981", "Producción": "#8b5cf6" };
                        const dotColor = areaColors[area] || "#64748b";
                        const isSelected = filters.area === area;
                        return (
                            <button
                                key={area}
                                onClick={() => setFilters({ ...filters, area: isSelected ? "Todas" : area })}
                                className="pill"
                                style={{ 
                                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)', 
                                    color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                                    padding: '0.4rem 1rem',
                                    border: '1px solid var(--border-light)',
                                    fontSize: '0.75rem',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor }} />
                                <span>{area}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Kanban Grid */}
            {loading ? (
                <div className="flex-row justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="kanban-grid" style={{ 
                        display: 'grid', 
                        gap: '2rem',
                        width: '100%',
                        alignItems: 'start'
                    }}>
                        {[
                            { label: "Pendiente", dbValue: "Pendiente", color: "#6366f1" },
                            { label: "En Progreso", dbValue: "En Proceso", color: "#f59e0b" },
                            { label: "Terminado", dbValue: "Finalizada", color: "#10b981" }
                        ].map(col => {
                            const colTasks = filteredTasks.filter((t: any) => (t.status || "Pendiente") === col.dbValue);

                            return (
                                <div key={col.label} className="flex-col gap-6 kanban-column" style={{ minWidth: 0 }}>
                                    <div 
                                        onClick={() => toggleSection(col.label)}
                                        className="flex-row justify-between items-center px-2 group cursor-pointer" 
                                        style={{ borderBottom: '2px solid var(--bg-sidebar)', paddingBottom: '0.6rem' }}
                                    >
                                        <h3 className="flex-row gap-2 items-center text-main font-extrabold" style={{ fontSize: '0.90rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <ChevronDown 
                                                size={14} 
                                                className="text-muted transition-transform" 
                                                style={{ transform: collapsedSections[col.label] ? 'rotate(-90deg)' : 'rotate(0)' }} 
                                            />
                                            {col.label}
                                        </h3>
                                        <span className="text-main font-black opacity-30" style={{ fontSize: '1rem' }}>{colTasks.length}</span>
                                    </div>
                                    
                                    {!collapsedSections[col.label] && (
                                        <Droppable droppableId={col.dbValue}>
                                            {(provided, snapshot) => (
                                                <div 
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={`flex-col gap-4 ${snapshot.isDraggingOver ? 'bg-indigo-50/30' : ''}`}
                                                    style={{ 
                                                        minHeight: '150px', 
                                                        borderRadius: '16px',
                                                        transition: 'background 0.2s ease',
                                                        padding: '2px'
                                                    }}
                                                >
                                                    {colTasks.length === 0 ? (
                                                        <div style={{ 
                                                            padding: '2.5rem', 
                                                            border: '2px dashed var(--border-light)', 
                                                            borderRadius: '20px', 
                                                            textAlign: 'center',
                                                            color: 'var(--text-muted)',
                                                            fontSize: '0.75rem',
                                                            background: 'var(--bg-main)',
                                                            opacity: 0.5
                                                        }}>
                                                            Suelta aquí
                                                        </div>
                                                    ) : colTasks.map((task: any, index: number) => {
                                                        const areaColors: any = { "Administración": "#00ffff", "Ventas": "#ef4444", "Logística": "#f59e0b", "Soporte": "#10b981", "Producción": "#8b5cf6" };
                                                        const areaColor = areaColors[task.area] || "#64748b";
                                                        const priorityColor = task.priority === "Alta" ? "#ef4444" : task.priority === "Media" ? "#f59e0b" : "#10b981";

                                                        return (
                                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        onClick={() => {
                                                                            setSelectedTask(task);
                                                                            setIsSideoverOpen(true);
                                                                        }}
                                                                        style={{
                                                                            ...provided.draggableProps.style,
                                                                            zIndex: snapshot.isDragging ? 100 : 1,
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        <div className={`card overflow-hidden ${snapshot.isDragging ? 'shadow-2xl' : 'shadow-sm'}`} style={{ 
                                                                            borderLeft: 'none', 
                                                                            padding: '1rem',
                                                                            background: 'var(--bg-card)',
                                                                            minWidth: 0,
                                                                            borderRadius: '16px',
                                                                            transition: 'all 0.2s',
                                                                            backgroundColor: snapshot.isDragging ? 'var(--primary-light)' : 'var(--bg-card)'
                                                                        }}>
                                                                            <div className="flex-col" style={{ gap: '0.75rem' }}>
                                                                                <div className="flex-row justify-between items-start" style={{ gap: '0.4rem' }}>
                                                                                    <div className="flex-row items-start flex-1 min-w-0" style={{ gap: '0.75rem' }}>
                                                                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: priorityColor, flexShrink: 0, marginTop: '5px' }} />
                                                                                        <h4 className="font-bold text-main" style={{ 
                                                                                            fontSize: '0.85rem', 
                                                                                            lineHeight: '1.3', 
                                                                                            minWidth: 0
                                                                                        }}>{task.title}</h4>
                                                                                    </div>
                                                                                    <div className="pill" style={{ 
                                                                                        background: `${areaColor}15`, 
                                                                                        color: areaColor, 
                                                                                        border: `1px solid ${areaColor}30`, 
                                                                                        fontWeight: '800', 
                                                                                        fontSize: '0.55rem',
                                                                                        padding: '2px 8px'
                                                                                    }}>
                                                                                        {task.area.toUpperCase()}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex-row justify-between items-center opacity-60">
                                                                                    {task.assignedEmail ? (
                                                                                        <div className="flex-row gap-1.5 items-center text-muted" style={{ fontSize: '0.65rem' }}>
                                                                                            <Users size={12} />
                                                                                            <span>{companyUsers?.find((u: any) => u.email === task.assignedEmail)?.name || task.assignedEmail}</span>
                                                                                        </div>
                                                                                    ) : <div />}
                                                                                    <div className="flex-row gap-2">
                                                                                        {(task.messageCount || 0) > 0 && (
                                                                                            <MessageSquare size={13} className="text-muted" />
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            )}

            <TaskDetailSideover 
                task={selectedTask} 
                isOpen={isSideoverOpen} 
                onClose={() => setIsSideoverOpen(false)} 
            />

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { 
                    display: none; 
                }
                .kanban-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
                @media (max-width: 1024px) {
                    .kanban-grid {
                        grid-template-columns: 1fr;
                        gap: 2.5rem;
                    }
                }
            `}</style>
        </div>
    );
}
