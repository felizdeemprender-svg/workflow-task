"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Plus, Filter, Loader2, Database, Users, Clock, 
    MoreVertical, RefreshCw, UserCheck, Hammer, 
    CheckCheck, Circle, Wrench, Timer, Play, 
    ChevronDown, X, MessageSquare, Square, Folder, Search 
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
        const taskId = draggableId;

        try {
            toast.promise(
                taskActions.updateTask(taskId, { status: newStatus }),
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
            {/* Creator Card */}
            <div className="card p-4 sm:p-5 flex-col gap-5 w-full overflow-hidden" style={{ boxShadow: 'var(--shadow-premium)', border: 'none' }}>
                <div className="flex-col gap-4">
                    <input
                        type="text"
                        placeholder="¿Qué hay que hacer?"
                        className="text-main placeholder-muted w-full"
                        style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', fontSize: 'min(1.5rem, 6vw)', fontWeight: '500' }}
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    />
                    <textarea
                        placeholder="Añadir descripción..."
                        className="text-muted resize-none w-full"
                        style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', fontSize: '0.95rem', opacity: 0.6 }}
                        rows={1}
                        value={newTask.description}
                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    />
                </div>

                <div className="flex-col gap-4" style={{ width: '100%', overflow: 'hidden' }}>
                    <div className="flex-row gap-2 flex-wrap" style={{ width: '100%' }}>
                        {availableAreas.filter(a => a !== "Todas").map(area => {
                            const isSelected = newTask.area === area;
                            const areaColors: any = { "Administración": "#00ffff", "Ventas": "#ef4444", "Logística": "#f59e0b", "Soporte": "#10b981" };
                            const color = areaColors[area] || "#6366f1";
                            return (
                                <button 
                                    key={area}
                                    onClick={() => setNewTask({ ...newTask, area })}
                                    className="pill"
                                    style={{ 
                                        background: isSelected ? color : 'var(--bg-main)', 
                                        color: isSelected ? 'white' : 'var(--text-muted)',
                                        border: '1px solid var(--border-light)',
                                        padding: '0.2rem 0.6rem',
                                        fontSize: '0.65rem'
                                    }}
                                >
                                    {area}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="flex-col gap-3" style={{ width: '100%' }}>
                        <div className="flex-row gap-x-2 gap-y-1 text-muted font-bold flex-wrap" style={{ opacity: 0.8, fontSize: '0.65rem', minWidth: 0, width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><Database size={10} /> Adjuntar</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><Clock size={10} /> Fecha</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <RefreshCw size={10} /> <span>Recurrencia</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <Filter size={10} /> <span>{newTask.priority}</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateTask}
                            className="pill text-white font-bold"
                            style={{ 
                                background: '#6366f1', 
                                fontSize: '0.75rem', 
                                width: 'fit-content',
                                alignSelf: 'center',
                                padding: '6px 24px',
                                border: 'none',
                                color: 'white'
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creando..." : "Crear Tarea"}
                        </button>
                    </div>
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
                                        style={{ borderBottom: `2px solid ${col.color}`, paddingBottom: '0.6rem' }}
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
                                                                            borderLeft: `6px solid ${priorityColor}`, 
                                                                            padding: '1rem',
                                                                            background: 'var(--bg-card)',
                                                                            minWidth: 0,
                                                                            borderRadius: '16px',
                                                                            transition: 'all 0.2s',
                                                                            backgroundColor: snapshot.isDragging ? 'var(--primary-light)' : 'var(--bg-card)'
                                                                        }}>
                                                                            <div className="flex-col gap-3">
                                                                                <div className="flex-row justify-between items-start gap-2">
                                                                                    <h4 className="font-bold text-main" style={{ 
                                                                                        fontSize: '0.85rem', 
                                                                                        lineHeight: '1.3', 
                                                                                        flex: 1,
                                                                                        minWidth: 0
                                                                                    }}>{task.title}</h4>
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
                                                                                    <div className="flex-row gap-1.5 items-center text-muted" style={{ fontSize: '0.65rem' }}>
                                                                                        <Users size={12} />
                                                                                        <span>{companyUsers?.find((u: any) => u.email === task.assignedEmail)?.name || "Sin asignar"}</span>
                                                                                    </div>
                                                                                    <div className="flex-row gap-2">
                                                                                        <MessageSquare size={13} className="text-muted" />
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
