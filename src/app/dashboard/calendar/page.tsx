"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { where } from "firebase/firestore";
import { Modal } from "@/components/ui/Modal";
import { taskActions } from "@/lib/firebase/actions";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function CalendarPage() {
    const { user, loading: authLoading } = useAuth();
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
    const [isDayModalOpen, setIsDayModalOpen] = React.useState(false);
    const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

    const constraints = React.useMemo(() => {
        if (!user?.company_id) return [];
        return [where('company_id', '==', user.company_id)];
    }, [user?.company_id]);

    const { data: tasks, loading: tasksLoading } = useFirestoreQuery<any>('tasks', constraints, !!user?.company_id);

    // Calendar logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Helper to project recurring tasks
    const getProjectedTasks = React.useMemo(() => {
        if (!tasks) return [];
        const allInstances: any[] = [];

        tasks.forEach((task: any) => {
            if (!task.recurrence || task.recurrence.frequency === 'None') {
                allInstances.push(task);
                return;
            }

            // Expand recurring task
            const start = new Date(task.recurrence.startDate + 'T00:00:00');
            const end = new Date(task.recurrence.endDate + 'T23:59:59');
            const current = new Date(start);

            // Safety limit to prevent infinite loops (max 1 year projection)
            const yearLimit = new Date(start);
            yearLimit.setFullYear(yearLimit.getFullYear() + 1);
            const actualEnd = end > yearLimit ? yearLimit : end;

            while (current <= actualEnd) {
                // If the current date matches the current month view
                if (current.getMonth() === month && current.getFullYear() === year) {
                    allInstances.push({
                        ...task,
                        id: `${task.id}-${current.getTime()}`,
                        dueDate: current.toISOString().split('T')[0],
                        assignedEmail: task.assignedEmail || null,
                        isInstance: true
                    });
                }

                // Move to next occurrence
                if (task.recurrence.frequency === 'Diaria') {
                    current.setDate(current.getDate() + 1);
                } else if (task.recurrence.frequency === 'Semanal') {
                    current.setDate(current.getDate() + 7);
                } else if (task.recurrence.frequency === 'Mensual') {
                    current.setMonth(current.getMonth() + 1);
                } else {
                    break;
                }
            }
        });

        return allInstances;
    }, [tasks, month, year]);

    // Helper to check if a task falls on a specific day
    const getTasksForDay = (day: number) => {
        return getProjectedTasks.filter((task: any) => {
            const taskDate = new Date(task.dueDate + 'T00:00:00');
            return (
                taskDate.getUTCDate() === day &&
                taskDate.getUTCMonth() === month &&
                taskDate.getUTCFullYear() === year
            );
        }).sort((a, b) => {
            const priorityOrder: any = { 'Alta': 0, 'Media': 1, 'Baja': 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    };

    const handleDayClick = (day: number) => {
        setSelectedDay(day);
        setIsDayModalOpen(true);
    };

    const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
        if (!user) return;
        setUpdatingTaskId(taskId);
        try {
            await taskActions.updateStatus(taskId.split('-')[0], newStatus, user.email || "Usuario");
        } catch (error) {
            console.error("Error updating status from calendar:", error);
        } finally {
            setUpdatingTaskId(null);
        }
    };

    if (authLoading || tasksLoading) {
        return <div style={{ padding: '2rem' }}>Cargando calendario corporativo...</div>;
    }

    const days = [];
    // Add empty slots for the first week
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} style={{ height: '120px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-main)', opacity: 0.3 }} />);
    }

    // Add actual days
    for (let d = 1; d <= daysInMonth; d++) {
        const dayTasks = getTasksForDay(d);
        const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

        days.push(
            <div 
                key={d} 
                onClick={() => handleDayClick(d)}
                className="calendar-day clickable"
                style={{ 
                    height: '140px', 
                    border: '1px solid var(--border-light)', 
                    padding: '0.75rem',
                    backgroundColor: isToday ? 'rgba(79, 70, 229, 0.03)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer'
                }}
            >
                <span style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: isToday ? 800 : 500,
                    color: isToday ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: isToday ? 'var(--primary-light)' : 'transparent'
                }}>
                    {d}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1 }}>
                    {dayTasks.map((task: any) => (
                        <div 
                            key={task.id} 
                            title={task.title}
                            style={{ 
                                fontSize: '0.7rem', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                backgroundColor: task.status === 'Completada' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)',
                                color: task.status === 'Completada' ? '#059669' : 'var(--primary)',
                                borderLeft: `3px solid ${task.status === 'Completada' ? '#10b981' : 'var(--primary)'}`,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: 600
                            }}
                        >
                            {task.title}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-col gap-6 fade-in" style={{ padding: '2rem' }}>
            <div className="flex-row justify-between items-center">
                <div className="flex-col gap-1">
                    <div className="flex-row gap-2 items-center" style={{ color: 'var(--primary)' }}>
                        <CalendarIcon size={24} />
                        <h1 style={{ margin: 0 }}>Calendario de Tareas</h1>
                    </div>
                    <p className="text-muted">Visualización mensual de objetivos y fechas límite.</p>
                </div>

                <div className="flex-row gap-3 items-center glass" style={{ padding: '0.5rem 1rem', borderRadius: '12px' }}>
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold" style={{ minWidth: '150px', textAlign: 'center', fontSize: '1.1rem' }}>
                        {monthNames[month]} {year}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer">
                        <ChevronRight size={20} />
                    </button>
                    <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-light)', margin: '0 0.5rem' }} />
                    <button 
                        onClick={goToToday}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                        Hoy
                    </button>
                </div>
            </div>

            <Card style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    backgroundColor: 'var(--bg-sidebar)', 
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(day => (
                        <div key={day} style={{ padding: '1rem 0' }}>{day}</div>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {days}
                </div>
            </Card>

            <div className="flex-row gap-6">
                <div className="flex-row gap-2 items-center text-small">
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--primary)' }} />
                    <span className="text-muted">Tarea Pendiente</span>
                </div>
                <div className="flex-row gap-2 items-center text-small">
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10b981' }} />
                    <span className="text-muted">Completada</span>
                </div>
            </div>

            {/* Day Detail Modal */}
            <Modal 
                isOpen={isDayModalOpen} 
                onClose={() => setIsDayModalOpen(false)} 
                title={selectedDay ? `Tareas para el ${selectedDay} de ${monthNames[month]}` : "Tareas del día"}
            >
                <div className="flex-col gap-4">
                    {selectedDay && getTasksForDay(selectedDay).length === 0 ? (
                        <p className="text-muted text-center" style={{ padding: '2rem' }}>No hay tareas programadas para este día.</p>
                    ) : (
                        <div className="flex-col gap-3">
                            {selectedDay && getTasksForDay(selectedDay).map((task: any) => (
                                <div key={task.id} className="glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                                    <div className="flex-row justify-between items-start mb-2">
                                        <div className="flex-col gap-1">
                                            <div className="flex-row gap-2 items-center">
                                                <div style={{
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    backgroundColor: task.priority === 'Alta' ? '#ef4444' : (task.priority === 'Media' ? '#f59e0b' : '#10b981')
                                                }} />
                                                <span className="font-bold" style={{ fontSize: '1rem' }}>{task.title}</span>
                                            </div>
                                            <p className="text-small text-muted">{task.area} • Asignado a: {task.assignedEmail || 'Público'}</p>
                                        </div>
                                        <div className="badge badge-primary">{task.status.toUpperCase()}</div>
                                    </div>
                                    
                                    <p className="text-small text-muted mb-4" style={{ 
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: '1.4'
                                    }}>
                                        {task.description}
                                    </p>

                                    <div className="flex-row justify-between items-center" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                                        <div className="flex-row gap-2 items-center">
                                            <span className="text-small font-bold text-muted">ESTADO:</span>
                                            <select 
                                                value={task.status}
                                                disabled={updatingTaskId === task.id}
                                                onChange={(e) => handleQuickStatusChange(task.id, e.target.value)}
                                                className="premium-input"
                                                style={{ width: 'auto', padding: '0.3rem 1.5rem 0.3rem 0.6rem', fontSize: '0.75rem' }}
                                            >
                                                <option>Pendiente</option>
                                                <option>En Proceso</option>
                                                <option>Finalizado</option>
                                            </select>
                                            {updatingTaskId === task.id && <Loader2 className="animate-spin" size={14} color="var(--primary)" />}
                                        </div>
                                        
                                        <Link href={`/dashboard/tasks/${task.id.split('-')[0]}`} onClick={() => setIsDayModalOpen(false)}>
                                            <Button variant="outline" size="sm" style={{ fontSize: '0.75rem' }}>
                                                Ver Detalles
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .calendar-day:hover {
                    background-color: rgba(79, 70, 229, 0.05) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    z-index: 2;
                }
            `}</style>
        </div>
    );
}
