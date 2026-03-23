"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    CheckCircle2,
    Clock,
    ArrowUpRight,
    Plus,
    Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { where, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { SmartBriefing } from "@/components/dashboard/SmartBriefing";
import { AICommandBar } from "@/components/dashboard/AICommandBar";
import { Sparkline } from "@/components/ui/Sparkline";

export default function DashboardPage() {
    const { user } = useAuth();

    const taskConstraints = React.useMemo(() =>
        user?.company_id ? [
            where('company_id', '==', user.company_id),
            orderBy('updatedAt', 'desc'),
            limit(5)
        ] : [],
        [user?.company_id]
    );

    const pollConstraints = React.useMemo(() =>
        user?.company_id ? [where('company_id', '==', user.company_id), limit(1)] : [],
        [user?.company_id]
    );

    const { data: recentTasks, loading: tasksLoading } = useFirestoreQuery<any>(
        'tasks',
        taskConstraints,
        !!user?.company_id
    );

    const { data: activePolls, loading: pollsLoading } = useFirestoreQuery<any>(
        'polls',
        pollConstraints,
        !!user?.company_id
    );

    const stats = [
        { 
            name: "Tareas Activas", 
            value: recentTasks.filter(t => t.status !== 'Finalizado').length.toString(), 
            icon: Clock, 
            color: "#f59e0b",
            trend: [4, 6, 5, 8, 7, 9, 8] // Mocked trend
        },
        { 
            name: "Completadas", 
            value: recentTasks.filter(t => t.status === 'Finalizado').length.toString(), 
            icon: CheckCircle2, 
            color: "#10b981",
            trend: [2, 3, 5, 4, 6, 8, 10] // Mocked trend
        },
        { 
            name: "Spirit Score", 
            value: (user?.spiritPoints || 0).toString(), 
            icon: ArrowUpRight, 
            color: "#6366f1",
            trend: [300, 320, 350, 340, 380, 420, 450] // Mocked trend
        },
    ];

    return (
        <div className="flex-col gap-8 fade-in" style={{ paddingBottom: '6rem' }}>
            <SmartBriefing />
            
            <div className="flex-row justify-between items-center stack-mobile">
                <div>
                    <h1 className="font-bold">¡Buen día, {user?.email?.split('@')[0]}!</h1>
                    <p className="text-muted">
                        Resumen de {user?.area || 'General'} • {user?.company_id ? `ID Empresa: ${user.company_id}` : 'Buscando empresa...'}
                    </p>
                </div>
                <div className="flex-row gap-4 full-width-mobile">
                    <Link href="/dashboard/tasks" style={{ width: '100% ' }}>
                        <Button variant="primary" className="full-width-mobile"><Plus size={18} style={{ marginRight: '8px' }} /> Nueva Tarea</Button>
                    </Link>
                </div>
            </div>

            <div className="grid-3">
                {stats.map((stat) => (
                    <Card key={stat.name} style={{ overflow: 'hidden' }}>
                        <div className="flex-row justify-between items-start">
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                backgroundColor: `${stat.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <stat.icon size={20} color={stat.color} />
                            </div>
                        </div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div className="flex-col gap-1">
                                <p className="text-muted font-bold" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.name}</p>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stat.value}</h2>
                            </div>
                            <div style={{ marginBottom: '4px' }}>
                                <Sparkline data={stat.trend} color={stat.color} width={80} height={30} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            <div className="report-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr', 
                gap: '2rem' 
            }}>
                <div className="flex-col gap-8">
                    <ActivityChart />
                    
                    <Card title="Estado del Equipo" subtitle="Carga de trabajo por área">
                        <div className="flex-row gap-4 flex-wrap">
                            {['Administración', 'Ventas', 'Logística', 'Producción'].map(alt => (
                                <div key={alt} className="flex-col gap-2 p-4 hover-scale" style={{ flex: 1, minWidth: '150px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{alt}</span>
                                    <div className="flex-row justify-between items-end">
                                        <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{Math.floor(Math.random() * 10) + 2}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>+12%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', marginTop: '4px' }}>
                                        <div style={{ width: `${Math.random() * 60 + 20}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="flex-col gap-8">
                    <Card title="Actividad Reciente" subtitle="Últimas actualizaciones">
                        {tasksLoading ? (
                            <div className="flex-row justify-center" style={{ padding: '2rem' }}>
                                <Loader2 className="animate-spin" color="var(--primary)" />
                            </div>
                        ) : (
                            <div className="flex-col gap-4">
                                {recentTasks.length === 0 ? (
                                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay actividad reciente.</p>
                                ) : recentTasks.map((task: any) => (
                                    <Link key={task.id} href={`/dashboard/tasks/${task.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div className="flex-row gap-4 fade-in hover-scale" style={{
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-light)',
                                            background: 'var(--bg-card)',
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                marginTop: '4px',
                                                backgroundColor: task.priority === 'Alta' ? '#ef4444' : (task.priority === 'Media' ? '#f59e0b' : '#10b981')
                                            }} />
                                            <div style={{ flex: 1 }} className="flex-col">
                                                <p className="font-bold" style={{ fontSize: '0.85rem', lineHeight: '1.2' }}>{task.title}</p>
                                                <p className="text-small text-muted" style={{ fontSize: '0.7rem' }}>{task.area} • {task.status}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                <Link href="/dashboard/tasks" style={{ width: '100%' }}>
                                    <Button variant="ghost" style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.75rem' }}>Ver todo</Button>
                                </Link>
                            </div>
                        )}
                    </Card>

                    <Card title="Encuesta Semanal">
                        {pollsLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : activePolls[0] ? (
                            <div className="flex-col gap-4">
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                    {activePolls[0].question}
                                </p>
                                <div className="flex-col gap-2">
                                    {[1, 2].map(i => (
                                        <div key={i} className="p-2 border rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-50 transition-colors">
                                            Opción de ejemplo {i}
                                        </div>
                                    ))}
                                </div>
                                <Link href="/dashboard/polls">
                                    <Button size="sm" style={{ width: '100%', marginTop: '0.5rem' }}>Votar ahora</Button>
                                </Link>
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No hay encuestas.</p>
                        )}
                    </Card>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 1100px) {
                    .report-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
