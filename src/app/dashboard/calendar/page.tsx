"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon,
    Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { where } from "firebase/firestore";
import { Modal } from "@/components/ui/Modal";
import { taskActions } from "@/lib/firebase/actions";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DAY_NAMES_LONG  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const PRIORITY_COLOR: Record<string, string> = { Alta: "#ef4444", Media: "#f59e0b", Baja: "#10b981" };
const STATUS_BG: Record<string, string> = { Finalizada: "rgba(16,185,129,0.15)", Urgente: "rgba(239,68,68,0.12)", default: "rgba(79,70,229,0.1)" };
const STATUS_COLOR: Record<string, string> = { Finalizada: "#059669", Urgente: "#ef4444", default: "var(--primary)" };
const STATUS_BORDER: Record<string, string> = { Finalizada: "#10b981", Urgente: "#ef4444", default: "var(--primary)" };

export default function CalendarPage() {
    const { user, loading: authLoading, isAuthSynced } = useAuth();
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
    const [selectedDayDate, setSelectedDayDate] = React.useState<Date | null>(null);
    const [isDayModalOpen, setIsDayModalOpen] = React.useState(false);
    const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);
    const [isMobile, setIsMobile] = React.useState(false);

    // Detect mobile
    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Week navigation reference: start of currently visible week on mobile
    const [weekStart, setWeekStart] = React.useState<Date>(() => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay()); // Sunday of current week
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const constraints = React.useMemo(() => {
        if (!user?.company_id) return [];
        return [where("company_id", "==", user.company_id)];
    }, [user?.company_id]);

    const { data: tasks, loading: tasksLoading } = useFirestoreQuery<any>(
        "tasks", constraints, isAuthSynced && !!user?.company_id, [user?.company_id]
    );

    // ── Calendar helpers ──────────────────────────────────────────────────────
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth     = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => {
        setCurrentDate(new Date());
        const d = new Date();
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        setWeekStart(d);
    };

    const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
    const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

    // Build the 7 days of the visible week
    const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    }), [weekStart]);

    // Project recurring tasks for a given month/year
    const getProjectedTasks = React.useMemo(() => {
        if (!tasks) return [];
        const allInstances: any[] = [];
        tasks.forEach((task: any) => {
            if (!task.recurrence || task.recurrence.frequency === "None") {
                allInstances.push(task);
                return;
            }
            const start = new Date(task.recurrence.startDate + "T00:00:00");
            const end   = new Date(task.recurrence.endDate   + "T23:59:59");
            const limit = new Date(start); limit.setFullYear(limit.getFullYear() + 1);
            const actualEnd = end > limit ? limit : end;
            const cur = new Date(start);
            while (cur <= actualEnd) {
                allInstances.push({
                    ...task,
                    id: `${task.id}-${cur.getTime()}`,
                    dueDate: cur.toISOString().split("T")[0],
                    isInstance: true
                });
                if (task.recurrence.frequency === "Diaria")  cur.setDate(cur.getDate() + 1);
                else if (task.recurrence.frequency === "Semanal") cur.setDate(cur.getDate() + 7);
                else if (task.recurrence.frequency === "Mensual") cur.setMonth(cur.getMonth() + 1);
                else break;
            }
        });
        return allInstances;
    }, [tasks]);

    const getTasksForDate = (date: Date) => getProjectedTasks.filter((t: any) => {
        const td = new Date(t.dueDate + "T00:00:00");
        return td.getUTCDate() === date.getDate() && td.getUTCMonth() === date.getMonth() && td.getUTCFullYear() === date.getFullYear();
    }).sort((a: any, b: any) => ({ Alta: 0, Media: 1, Baja: 2 } as any)[a.priority] - ({ Alta: 0, Media: 1, Baja: 2 } as any)[b.priority]);

    const getTasksForDay = (day: number) => getProjectedTasks.filter((t: any) => {
        const td = new Date(t.dueDate + "T00:00:00");
        return td.getUTCDate() === day && td.getUTCMonth() === month && td.getUTCFullYear() === year;
    }).sort((a: any, b: any) => ({ Alta: 0, Media: 1, Baja: 2 } as any)[a.priority] - ({ Alta: 0, Media: 1, Baja: 2 } as any)[b.priority]);

    const isToday = (d: Date) => {
        const t = new Date();
        return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    };

    const handleDayClick = (day: number) => {
        setSelectedDay(day);
        setSelectedDayDate(new Date(year, month, day));
        setIsDayModalOpen(true);
    };

    const handleDateClick = (date: Date) => {
        setSelectedDay(date.getDate());
        setSelectedDayDate(date);
        setIsDayModalOpen(true);
    };

    const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
        if (!user) return;
        setUpdatingTaskId(taskId);
        try { await taskActions.updateStatus(taskId.split("-")[0], newStatus, user.email || "Usuario"); }
        finally { setUpdatingTaskId(null); }
    };

    // ── Task chip ─────────────────────────────────────────────────────────────
    const TaskChip = ({ task, small = false }: { task: any; small?: boolean }) => {
        const bg     = STATUS_BG[task.status]     ?? STATUS_BG.default;
        const color  = STATUS_COLOR[task.status]  ?? STATUS_COLOR.default;
        const border = STATUS_BORDER[task.status] ?? STATUS_BORDER.default;
        return (
            <div title={task.title} style={{
                fontSize: small ? "0.65rem" : "0.7rem",
                padding: small ? "2px 6px" : "3px 8px",
                borderRadius: "4px",
                backgroundColor: bg,
                color,
                borderLeft: `3px solid ${border}`,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: 600,
                lineHeight: 1.3
            }}>
                {task.title}
            </div>
        );
    };

    if (authLoading || tasksLoading) {
        return <div style={{ padding: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <Loader2 className="animate-spin" color="var(--primary)" /> Cargando calendario...
        </div>;
    }

    // ── Week label for mobile header ──────────────────────────────────────────
    const weekLabel = (() => {
        const last = weekDays[6];
        if (weekDays[0].getMonth() === last.getMonth())
            return `${weekDays[0].getDate()} – ${last.getDate()} de ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`;
        return `${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`;
    })();

    // ── MOBILE: weekly list view ──────────────────────────────────────────────
    const MobileWeekView = () => (
        <div className="flex-col gap-3">
            {weekDays.map(date => {
                const dayTasks = getTasksForDate(date);
                const today    = isToday(date);
                return (
                    <div
                        key={date.toISOString()}
                        onClick={() => handleDateClick(date)}
                        style={{
                            borderRadius: "14px",
                            border: today ? "1.5px solid var(--primary)" : "1px solid var(--border-light)",
                            background: today ? "rgba(79,70,229,0.04)" : "var(--bg-card)",
                            padding: "0.75rem 1rem",
                            cursor: "pointer",
                            transition: "all 0.15s"
                        }}
                    >
                        {/* Day header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: dayTasks.length ? "0.6rem" : 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: "28px", height: "28px", borderRadius: "50%",
                                    background: today ? "var(--primary)" : "transparent",
                                    color: today ? "white" : "var(--text-main)",
                                    fontWeight: 700, fontSize: "0.95rem"
                                }}>
                                    {date.getDate()}
                                </span>
                                <span style={{ fontWeight: 600, fontSize: "0.9rem", color: today ? "var(--primary)" : "var(--text-main)" }}>
                                    {DAY_NAMES_LONG[date.getDay()]}
                                </span>
                            </div>
                            {dayTasks.length > 0 && (
                                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-main)", borderRadius: "20px", padding: "2px 8px" }}>
                                    {dayTasks.length} tarea{dayTasks.length > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>

                        {/* Task list */}
                        {dayTasks.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {dayTasks.map(t => <TaskChip key={t.id} task={t} />)}
                            </div>
                        ) : (
                            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>Sin tareas</p>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // ── DESKTOP: monthly grid ─────────────────────────────────────────────────
    const desktopDays: React.ReactNode[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        desktopDays.push(
            <div key={`e-${i}`} style={{ height: "140px", border: "1px solid var(--border-light)", backgroundColor: "var(--bg-main)", opacity: 0.3 }} />
        );
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dayTasks = getTasksForDay(d);
        const today    = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
        desktopDays.push(
            <div
                key={d}
                onClick={() => handleDayClick(d)}
                className="calendar-day clickable"
                style={{
                    height: "140px", border: "1px solid var(--border-light)", padding: "0.75rem",
                    backgroundColor: today ? "rgba(79,70,229,0.03)" : "var(--bg-card)",
                    display: "flex", flexDirection: "column", gap: "0.5rem",
                    transition: "all 0.2s", overflow: "hidden", cursor: "pointer"
                }}
            >
                <span style={{
                    fontSize: "0.9rem", fontWeight: today ? 800 : 500,
                    color: today ? "var(--primary)" : "var(--text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "24px", height: "24px", borderRadius: "50%",
                    backgroundColor: today ? "var(--primary-light)" : "transparent"
                }}>{d}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", flex: 1 }}>
                    {dayTasks.map(t => <TaskChip key={t.id} task={t} small />)}
                </div>
            </div>
        );
    }

    // ── Selected tasks for modal ──────────────────────────────────────────────
    const modalTasks = selectedDayDate ? getTasksForDate(selectedDayDate) : [];
    const modalTitle = selectedDayDate
        ? `${DAY_NAMES_LONG[selectedDayDate.getDay()]} ${selectedDayDate.getDate()} de ${MONTH_NAMES[selectedDayDate.getMonth()]}`
        : "Tareas del día";

    return (
        <div className="flex-col gap-6 fade-in" style={{ padding: isMobile ? "1rem" : "2rem" }}>

            {/* ── Header ── */}
            <div className="flex-row justify-between items-center" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
                <div className="flex-col gap-1">
                    <div className="flex-row gap-2 items-center" style={{ color: "var(--primary)" }}>
                        <CalendarIcon size={22} />
                        <h1 style={{ margin: 0 }}>Calendario</h1>
                    </div>
                    {!isMobile && <p className="text-muted">Visualización de tareas y fechas límite.</p>}
                </div>

                {/* Navigation controls */}
                <div className="flex-row gap-2 items-center" style={{ padding: "0.4rem 0.75rem", borderRadius: "12px", border: "1px solid var(--border-light)", background: "var(--bg-card)" }}>
                    <button onClick={isMobile ? prevWeek : prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: "4px", borderRadius: "8px" }}>
                        <ChevronLeft size={20} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: isMobile ? "0.82rem" : "1rem", minWidth: isMobile ? "auto" : "150px", textAlign: "center", color: "var(--text-main)" }}>
                        {isMobile ? weekLabel : `${MONTH_NAMES[month]} ${year}`}
                    </span>
                    <button onClick={isMobile ? nextWeek : nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: "4px", borderRadius: "8px" }}>
                        <ChevronRight size={20} />
                    </button>
                    <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border-light)", margin: "0 0.25rem" }} />
                    <Button variant="primary" size="sm" onClick={goToToday} style={{ padding: "0.3rem 0.9rem", fontSize: "0.8rem" }}>Hoy</Button>
                </div>
            </div>

            {/* ── Content ── */}
            {isMobile ? (
                <MobileWeekView />
            ) : (
                <Card style={{ padding: 0, overflow: "hidden", border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}>
                    {/* Day headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", backgroundColor: "var(--bg-sidebar)", color: "white", textAlign: "center", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                        {DAY_NAMES_SHORT.map(d => <div key={d} style={{ padding: "1rem 0" }}>{d}</div>)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                        {desktopDays}
                    </div>
                </Card>
            )}

            {/* Legend */}
            <div className="flex-row gap-6">
                {[["var(--primary)", "Pendiente"], ["#10b981", "Finalizada"]].map(([color, label]) => (
                    <div key={label} className="flex-row gap-2 items-center text-small">
                        <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: color }} />
                        <span className="text-muted">{label}</span>
                    </div>
                ))}
            </div>

            {/* ── Day detail modal ── */}
            <Modal isOpen={isDayModalOpen} onClose={() => setIsDayModalOpen(false)} title={modalTitle}>
                <div className="flex-col gap-4">
                    {modalTasks.length === 0 ? (
                        <p className="text-muted text-center" style={{ padding: "2rem" }}>No hay tareas programadas para este día.</p>
                    ) : (
                        <div className="flex-col gap-3">
                            {modalTasks.map((task: any) => (
                                <div key={task.id} className="glass" style={{ padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                                    <div className="flex-row justify-between items-start mb-2">
                                        <div className="flex-col gap-1">
                                            <div className="flex-row gap-2 items-center">
                                                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: PRIORITY_COLOR[task.priority] ?? "#4f46e5" }} />
                                                <span className="font-bold" style={{ fontSize: "1rem" }}>{task.title}</span>
                                            </div>
                                            <p className="text-small text-muted">{task.area} • {task.assignedEmail || "Público"}</p>
                                        </div>
                                        <div className="badge badge-primary">{task.status.toUpperCase()}</div>
                                    </div>
                                    {task.description && (
                                        <p className="text-small text-muted mb-4" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.4" }}>
                                            {task.description}
                                        </p>
                                    )}
                                    <div className="flex-row justify-between items-center" style={{ marginTop: "1rem", borderTop: "1px solid var(--border-light)", paddingTop: "1rem" }}>
                                        <div className="flex-row gap-2 items-center">
                                            <span className="text-small font-bold text-muted">ESTADO:</span>
                                            <select value={task.status} disabled={updatingTaskId === task.id}
                                                onChange={e => handleQuickStatusChange(task.id, e.target.value)}
                                                className="premium-input" style={{ width: "auto", padding: "0.3rem 1.5rem 0.3rem 0.6rem", fontSize: "0.75rem" }}>
                                                <option>Pendiente</option><option>En Proceso</option><option>🔴 Urgente</option><option>Finalizada</option>
                                            </select>
                                            {updatingTaskId === task.id && <Loader2 className="animate-spin" size={14} color="var(--primary)" />}
                                        </div>
                                        <Link href={`/dashboard/tasks/${task.id.split("-")[0]}`} onClick={() => setIsDayModalOpen(false)}>
                                            <Button variant="outline" size="sm" style={{ fontSize: "0.75rem" }}>Ver Detalles</Button>
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
                    background-color: rgba(79,70,229,0.05) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    z-index: 2;
                }
            `}</style>
        </div>
    );
}
