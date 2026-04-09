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
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isSideoverOpen, setIsSideoverOpen] = useState(false);

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
                                            <Plus size={14} className="text-muted hover:text-primary" onClick={(e) => { e.stopPropagation(); setIsCreateModalOpen(true); }} />
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
                                                                                <h4 className="font-semibold text-main" style={{ 
                                                                                    fontSize: '0.8rem', 
                                                                                    lineHeight: '1.4', 
                                                                                    minWidth: 0
                                                                                }}>{task.title}</h4>
                                                                                
                                                                                <div className="flex-row justify-between items-end mt-1">
                                                                                    <div className="flex-row gap-2 items-center">
                                                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: priorityColor }} title={`Prioridad: ${task.priority}`} />
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
            />

            <TaskCreateModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                user={user}
                companyUsers={companyUsers}
                availableAreas={availableAreas}
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
