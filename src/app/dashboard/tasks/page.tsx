"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Plus, Filter, Loader2, Users, Clock, 
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
import { TaskCreateModal } from "@/components/dashboard/TaskCreateModal";

export default function TasksPage() {
    const { user, isAuthSynced } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isSideoverOpen, setIsSideoverOpen] = useState(false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

    // Modal state for ClickUp-style creation
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Removing old newTask state as it's now internal to the Modal

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;
        const taskId = draggableId;

        try {
            await taskActions.updateStatus(taskId, newStatus, user?.uid || 'Sistema');
        } catch (error) {
            console.error("Error updating task status:", error);
            toast.error("Error al mover la tarea");
        }
    };

    const toggleSection = (label: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    // Real-time tasks query
    const taskConstraints = React.useMemo(() =>
        user?.company_id ? [
            where('company_id', '==', user.company_id)
        ] : [],
        [user?.company_id]
    );

    const userConstraints = React.useMemo(() =>
        user?.company_id ? [where('company_id', '==', user.company_id)] : [],
        [user?.company_id]
    );

    const { data: tasks, loading } = useFirestoreQuery<any>(
        'tasks', 
        taskConstraints, 
        isAuthSynced && !!user?.company_id,
        [user?.company_id]
    );
    const { data: companyUsers } = useFirestoreQuery<any>(
        'users', 
        userConstraints, 
        isAuthSynced && !!user?.company_id,
        [user?.company_id]
    );
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
        priority: "Todas",
        date: "Todas"
    });

    const subtasksCountMap = React.useMemo(() => {
        const counts: Record<string, number> = {};
        (tasks || []).forEach((t: any) => {
            if (t.parentId) counts[t.parentId] = (counts[t.parentId] || 0) + 1;
        });
        return counts;
    }, [tasks]);

    const filteredTasks = React.useMemo(() => {
        return (tasks || []).filter((task: any) => {
            if (task.isArchived === true) return false; // Filter out archived tasks in memory
            if (task.parentId) return false; // Show only top-level tasks

            const searchLower = (filters.search || "").toLowerCase();
            const matchesSearch = 
                (task.title?.toLowerCase() || "").includes(searchLower) || 
                (task.description?.toLowerCase() || "").includes(searchLower);
            
            const matchesStatus = filters.status === "Todos" || task.status === filters.status;
            const matchesArea = filters.area === "Todas" || task.area === filters.area;
            const matchesPriority = filters.priority === "Todas" || task.priority === filters.priority;
            
            let matchesDate = true;
            if (filters.date !== "Todas") {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const taskDate = task.dueDate ? new Date(task.dueDate + 'T00:00:00') : null;
                
                if (!taskDate) {
                    matchesDate = false;
                } else {
                    if (filters.date === "Hoy") {
                        matchesDate = taskDate.getTime() === today.getTime();
                    } else if (filters.date === "Semana") {
                        const weekFromNow = new Date(today);
                        weekFromNow.setDate(today.getDate() + 7);
                        matchesDate = taskDate >= today && taskDate <= weekFromNow;
                    } else if (filters.date === "Vencidas") {
                        matchesDate = taskDate < today && task.status !== "Finalizada";
                    }
                }
            }
            
            return matchesSearch && matchesStatus && matchesArea && matchesPriority && matchesDate;
        });
    }, [tasks, filters]);

    const handleArchiveTask = async (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        if (!window.confirm("¿Seguro que quieres archivar esta tarea? Dejará de aparecer en el tablero.")) return;
        
        try {
            await taskActions.archiveTask(taskId);
            toast.success("Tarea archivada correctamente");
        } catch (error) {
            console.error("Error archiving task:", error);
            toast.error("Error al archivar la tarea");
        }
    };

    // Removing handleCreateTask as it's now internal to the Modal

    return (
        <div className="flex-col gap-4 fade-in">
            <div className="flex-row justify-between items-center w-full mb-2">
                <div className="flex-col">
                    <h1 className="font-bold">Mis Tareas</h1>
                    <p className="text-muted text-xs">Gestiona el flujo de trabajo de tu equipo</p>
                </div>
                <Button 
                    variant="primary" 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span className="font-bold">Nueva Tarea</span>
                </Button>
            </div>

            {/* Consolidado Search & Filter Pill */}
            <div className="flex-row items-center gap-3 w-full mb-2">
                <div className="card-pill flex-row items-center gap-2 px-3 flex-1 shadow-sm hover:shadow-md transition-all border-light">
                    <div className="flex-row items-center gap-3 flex-1 px-1">
                        <Search size={16} className="text-muted opacity-40" />
                        <input 
                            type="text" 
                            placeholder="Buscar tareas..." 
                            className="text-sm font-semibold bg-transparent border-none outline-none w-full py-2 color-main"
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    
                    <div className="flex-row items-center gap-1">
                        {(filters.search || filters.area !== "Todas" || filters.priority !== "Todas" || filters.date !== "Todas") && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setFilters({ search: "", status: "Todos", area: "Todas", priority: "Todas", date: "Todas" })}
                                className="text-[10px] font-black uppercase tracking-tighter text-danger hover:bg-red-50 px-2"
                                style={{ height: '28px' }}
                            >
                                Limpiar
                            </Button>
                        )}
                        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-light)', margin: '0 4px' }} className="hide-mobile" />
                        <Button 
                            variant={(filters.area !== "Todas" || filters.priority !== "Todas" || filters.date !== "Todas") ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => setIsFilterMenuOpen(true)}
                            className="flex-row items-center gap-2 font-black text-[11px] uppercase tracking-wide px-3"
                            style={{ height: '32px', borderRadius: '10px' }}
                        >
                            <Filter size={14} />
                            <span className="hide-mobile">Filtros</span>
                            {(filters.area !== "Todas" || filters.priority !== "Todas" || filters.date !== "Todas") && (
                                <span className={`px-1.5 rounded-full text-[9px] ml-1 ${ (filters.area !== "Todas" || filters.priority !== "Todas" || filters.date !== "Todas") ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                                    {[filters.area !== "Todas", filters.priority !== "Todas", filters.date !== "Todas"].filter(Boolean).length}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filter Detail Modal - Premium Dropdown Style */}
            <Modal 
                isOpen={isFilterMenuOpen} 
                onClose={() => setIsFilterMenuOpen(false)} 
                title="Configurar Filtros"
            >
                <div className="flex-col gap-6" style={{ padding: '0.25rem' }}>
                    <div className="flex-col gap-3">
                        <label className="text-[10px] font-black text-muted uppercase tracking-[0.1em] flex-row items-center gap-2">
                            <Users size={12} className="text-primary opacity-50" />
                            Por Área de Trabajo
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {["Todas", ...availableAreas].map(a => (
                                <Button
                                    key={a}
                                    variant={filters.area === a ? "primary" : "ghost"}
                                    size="sm"
                                    onClick={() => setFilters({ ...filters, area: a })}
                                    className="justify-start font-bold text-xs"
                                    style={{ 
                                        borderRadius: '10px',
                                        backgroundColor: filters.area === a ? 'var(--primary)' : 'var(--bg-main)',
                                        color: filters.area === a ? 'white' : 'var(--text-main)',
                                        border: filters.area === a ? 'none' : '1px solid var(--border-light)'
                                    }}
                                >
                                    {a === "Todas" ? "Cualquier área" : a}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-col gap-3">
                        <label className="text-[10px] font-black text-muted uppercase tracking-[0.1em] flex-row items-center gap-2">
                            <Clock size={12} className="text-primary opacity-50" />
                            Urgencia (Prioridad)
                        </label>
                        <div className="flex-row flex-wrap gap-2">
                            {["Todas", "Baja", "Media", "Alta", "Urgente"].map(p => {
                                const pColors: any = { "Urgente": "#ef4444", "Alta": "#f59e0b", "Media": "#6366f1", "Baja": "#10b981", "Todas": "var(--text-muted)" };
                                const isActive = filters.priority === p;
                                return (
                                    <Button
                                        key={p}
                                        variant={isActive ? "primary" : "ghost"}
                                        size="sm"
                                        onClick={() => setFilters({ ...filters, priority: p })}
                                        className="font-bold text-[10px] uppercase tracking-wider px-3"
                                        style={{ 
                                            borderRadius: '12px',
                                            backgroundColor: isActive ? pColors[p] : 'transparent',
                                            color: isActive ? 'white' : 'var(--text-main)',
                                            border: isActive ? 'none' : '1px solid var(--border-light)',
                                            boxShadow: isActive ? `0 4px 12px ${pColors[p]}40` : 'none'
                                        }}
                                    >
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? 'white' : pColors[p], marginRight: '6px' }} />
                                        {p}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-col gap-3">
                        <label className="text-[10px] font-black text-muted uppercase tracking-[0.1em] flex-row items-center gap-2">
                            <Timer size={12} className="text-primary opacity-50" />
                            Fecha de Vencimiento
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: "Todas", label: "Cualquier fecha" },
                                { id: "Hoy", label: "Para Hoy" },
                                { id: "Semana", label: "Esta Semana" },
                                { id: "Vencidas", label: "Tareas Vencidas" }
                            ].map(d => (
                                <Button
                                    key={d.id}
                                    variant={filters.date === d.id ? "primary" : "ghost"}
                                    size="sm"
                                    onClick={() => setFilters({ ...filters, date: d.id })}
                                    className="font-bold text-xs justify-start"
                                    style={{ 
                                        borderRadius: '10px',
                                        backgroundColor: filters.date === d.id ? 'var(--primary)' : 'var(--bg-main)',
                                        color: filters.date === d.id ? 'white' : 'var(--text-main)',
                                        border: filters.date === d.id ? 'none' : '1px solid var(--border-light)'
                                    }}
                                >
                                    {d.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-row gap-3 pt-4 border-t border-light mt-2">
                        <Button 
                            variant="primary" 
                            className="flex-1 font-black uppercase text-[10px] tracking-widest py-3" 
                            onClick={() => setIsFilterMenuOpen(false)}
                        >
                            Aplicar Filtros
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="px-4 text-muted hover:text-danger" 
                            onClick={() => {
                                setFilters({ ...filters, area: "Todas", priority: "Todas", date: "Todas" });
                                setIsFilterMenuOpen(false);
                            }}
                        >
                            <RefreshCw size={16} />
                        </Button>
                    </div>
                </div>
            </Modal>

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
                            { label: "Urgente", dbValue: "Urgente", color: "#ef4444" },
                            { label: "Finalizada", dbValue: "Finalizada", color: "#10b981" }
                        ].map(col => {
                            const colTasks = (tasks || []).filter((t: any) => (t.status || "Pendiente") === col.dbValue && filteredTasks.some((ft: any) => ft.id === t.id));

                            return (
                                <div key={col.label} className="flex-col gap-3 kanban-column" style={{ minWidth: 0 }}>
                                    <div 
                                        onClick={() => toggleSection(col.label)}
                                        className="flex-row justify-between items-center group cursor-pointer" 
                                        style={{ borderTop: `3px solid ${col.color}`, paddingTop: '0.8rem', paddingLeft: '0.2rem', paddingRight: '0.2rem' }}
                                    >
                                        <h3 className="flex-row gap-2 items-center text-main font-bold" style={{ fontSize: '0.80rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                            <ChevronDown 
                                                size={12} 
                                                className="text-muted transition-transform" 
                                                style={{ transform: collapsedSections[col.label] ? 'rotate(-90deg)' : 'rotate(0)' }} 
                                            />
                                            {col.label}
                                            <span className="text-muted font-normal ml-1" style={{ fontSize: '0.75rem' }}>{colTasks.length}</span>
                                        </h3>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={(e) => { e.stopPropagation(); setIsCreateModalOpen(true); }}
                                            >
                                                <Plus size={14} className="text-muted" />
                                            </Button>
                                        </div>
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
                                                                        <div className="card overflow-hidden shadow-sm" style={{ 
                                                                            borderLeft: 'none', 
                                                                            padding: '0.75rem',
                                                                            background: 'var(--bg-card)',
                                                                            minWidth: 0,
                                                                            borderRadius: '8px',
                                                                            border: '1px solid var(--border-light)',
                                                                            transition: 'all 0.15s',
                                                                            backgroundColor: snapshot.isDragging ? 'var(--primary-light)' : 'var(--bg-card)',
                                                                            boxShadow: snapshot.isDragging ? '0 8px 20px rgba(0,0,0,0.1)' : 'var(--shadow-sm)'
                                                                        }}>
                                                                            <div className="flex-col" style={{ gap: '0.5rem' }}>
                                                                                <div className="flex-row items-center justify-between text-muted" style={{ fontSize: '0.65rem', marginBottom: '-0.2rem' }}>
                                                                                    <span className="truncate">{task.area}</span>
                                                                                    {(task.attachments?.length > 0) && <Paperclip size={10} />}
                                                                                </div>
                                                                                
                                                                                <div className="flex-row items-center justify-between">
                                                                                    <h4 className="font-semibold text-main" style={{ 
                                                                                        fontSize: '0.8rem', 
                                                                                        lineHeight: '1.4', 
                                                                                        minWidth: 0
                                                                                    }}>{task.title}</h4>
                                                                                    {col.dbValue === 'Finalizada' && (
                                                                                        <Button 
                                                                                            variant="ghost" 
                                                                                            size="sm" 
                                                                                            className="h-6 w-6 p-0 text-muted hover:text-primary"
                                                                                            onClick={(e) => handleArchiveTask(e, task.id)}
                                                                                            title="Archivar ahora"
                                                                                        >
                                                                                            <Folder size={12} />
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                                
                                                                                <div className="flex-row justify-between items-end mt-1">
                                                                                    <div className="flex-row gap-3 items-center">
                                                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: priorityColor }} title={`Prioridad: ${task.priority}`} />
                                                                                        {subtasksCountMap[task.id] > 0 && (
                                                                                            <div className="flex-row gap-1 items-center text-muted" style={{ fontSize: '0.65rem' }} title={`${subtasksCountMap[task.id]} Subtareas`}>
                                                                                                <Folder size={10} />
                                                                                                <span>{subtasksCountMap[task.id]}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {(task.messageCount || 0) > 0 && (
                                                                                            <div className="flex-row gap-1 items-center text-muted" style={{ fontSize: '0.65rem' }}>
                                                                                                <MessageSquare size={10} />
                                                                                                <span>{task.messageCount}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    
                                                                                    <div className="flex-row" style={{ direction: 'rtl' }}>
                                                                                        {(task.assignedEmails || (task.assignedEmail ? [task.assignedEmail] : []))
                                                                                            .map((email: string, idx: number) => {
                                                                                                if (!email) return null;
                                                                                                const userName = companyUsers?.find((u: any) => u.email === email)?.name || email.split('@')[0];
                                                                                                return (
                                                                                                    <div key={idx} style={{ 
                                                                                                        width: '18px', 
                                                                                                        height: '18px', 
                                                                                                        borderRadius: '50%', 
                                                                                                        background: 'var(--primary)',
                                                                                                        color: 'white',
                                                                                                        display: 'flex',
                                                                                                        alignItems: 'center',
                                                                                                        justifyContent: 'center',
                                                                                                        fontSize: '0.5rem',
                                                                                                        fontWeight: 'bold',
                                                                                                        border: '1.5px solid var(--bg-card)',
                                                                                                        marginLeft: '-4px'
                                                                                                    }} title={userName}>
                                                                                                        {userName.charAt(0).toUpperCase()}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
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
                onTaskSelect={setSelectedTask}
            />

            <TaskCreateModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                user={user}
                companyUsers={companyUsers}
                availableAreas={availableAreas}
            />


            <style jsx>{`
                @media (max-width: 768px) {
                    .mobile-full-width {
                        width: 100%;
                    }
                    .mobile-full-width button {
                        width: 100%;
                        justify-content: center;
                    }
                }
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
