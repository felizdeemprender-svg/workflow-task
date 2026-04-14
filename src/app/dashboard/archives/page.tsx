"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Archive, Loader2, Search, RefreshCw, 
    Calendar, Clock, User, Flag, MessageSquare, 
    Paperclip, Folder, ArrowLeft, History
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { taskActions } from "@/lib/firebase/actions";
import { where } from "firebase/firestore";
import { toast } from "sonner";
import { TaskDetailSideover } from "@/components/dashboard/TaskDetailSideover";

export default function ArchivesPage() {
    const { user, isAuthSynced } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isSideoverOpen, setIsSideoverOpen] = useState(false);

    // Queries
    const constraints = React.useMemo(() =>
        user?.company_id ? [
            where('company_id', '==', user.company_id),
            where('isArchived', '==', true)
        ] : [],
        [user?.company_id]
    );

    const { data: tasks, loading } = useFirestoreQuery<any>(
        'tasks', 
        constraints, 
        isAuthSynced && !!user?.company_id,
        [user?.company_id]
    );

    const filteredTasks = (tasks || []).filter((task: any) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.area.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRestore = async (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        try {
            await taskActions.restoreTask(taskId);
            toast.success("Tarea restaurada al tablero principal.");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo restaurar la tarea.");
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "Sin fecha";
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    };

    return (
        <div className="flex-col gap-6 fade-in" style={{ padding: 'var(--main-p)' }}>
            {/* Header */}
            <div className="flex-row justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-light">
                <div className="flex-row gap-4 items-center">
                    <div style={{ 
                        width: '48px', height: '48px', borderRadius: '14px', 
                        background: 'var(--bg-main)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)', border: '1px solid var(--border-light)'
                    }}>
                        <Archive size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Archivo de Tareas</h1>
                        <p className="text-muted">Tareas finalizadas que han superado el tiempo de permanencia en el tablero.</p>
                    </div>
                </div>
                <div className="flex-row gap-3">
                    <div className="flex-row items-center gap-3 premium-input" style={{ width: '300px', padding: '0.6rem 1rem' }}>
                        <Search size={18} className="text-muted" />
                        <input 
                            type="text" 
                            placeholder="Buscar en el archivo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', width: '100%' }}
                        />
                    </div>
                    <Link href="/dashboard/tasks">
                        <Button variant="ghost" size="md">
                            <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Volver
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex-row justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            ) : filteredTasks.length === 0 ? (
                <Card style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                    <div style={{ 
                        width: '64px', height: '64px', borderRadius: '50%', 
                        background: 'var(--bg-main)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', 
                        margin: '0 auto 1.5rem', color: 'var(--text-muted)'
                    }}>
                        <History size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">No hay tareas archivadas</h3>
                    <p className="text-muted max-w-md mx-auto">
                        Las tareas finalizadas se archivan automáticamente según la configuración de tu empresa.
                    </p>
                </Card>
            ) : (
                <div className="flex-col gap-3">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-bold text-muted uppercase tracking-wider">
                        <div className="col-span-1">Estado</div>
                        <div className="col-span-4">Título de la Tarea</div>
                        <div className="col-span-2">Área</div>
                        <div className="col-span-2">Finalizada el</div>
                        <div className="col-span-3 text-right">Acciones</div>
                    </div>

                    <div className="flex-col gap-2">
                        {filteredTasks.map((task: any) => (
                            <div 
                                key={task.id}
                                onClick={() => {
                                    setSelectedTask(task);
                                    setIsSideoverOpen(true);
                                }}
                                className="grid grid-cols-12 items-center px-6 py-4 bg-card rounded-xl border border-light hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="col-span-1">
                                    <div style={{ 
                                        width: '24px', height: '24px', borderRadius: '6px', 
                                        background: '#dcfce7', display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center',
                                        color: '#16a34a'
                                    }}>
                                        <Clock size={14} />
                                    </div>
                                </div>
                                <div className="col-span-4 flex-col">
                                    <span className="font-semibold text-sm group-hover:text-primary transition-colors truncate pr-4">
                                        {task.title}
                                    </span>
                                    <div className="flex-row gap-3 mt-1 items-center">
                                        <div className="flex-row gap-1 items-center text-muted" style={{ fontSize: '0.7rem' }}>
                                            <Flag size={10} style={{ color: task.priority === "Alta" ? "#ef4444" : task.priority === "Media" ? "#f59e0b" : "#10b981" }} />
                                            <span>{task.priority}</span>
                                        </div>
                                        {(task.messageCount || 0) > 0 && (
                                            <div className="flex-row gap-1 items-center text-muted" style={{ fontSize: '0.7rem' }}>
                                                <MessageSquare size={10} />
                                                <span>{task.messageCount}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-xs px-2 py-1 rounded-md bg-secondary text-primary font-bold">
                                        {task.area}
                                    </span>
                                </div>
                                <div className="col-span-2 text-muted text-xs">
                                    {formatDate(task.archivedAt)}
                                </div>
                                <div className="col-span-3 text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e) => handleRestore(e, task.id)}
                                        className="text-primary hover:bg-primary/10"
                                    >
                                        <RefreshCw size={14} style={{ marginRight: '6px' }} /> Restaurar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detail Sideover */}
            {selectedTask && (
                <TaskDetailSideover 
                    isOpen={isSideoverOpen}
                    onClose={() => {
                        setIsSideoverOpen(false);
                        setSelectedTask(null);
                    }}
                    task={selectedTask}
                />
            )}
        </div>
    );
}
