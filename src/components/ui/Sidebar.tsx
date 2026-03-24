"use client";

import React from "react";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    Settings,
    PieChart,
    HelpCircle,
    LogOut,
    Building2,
    Calendar,
    Menu,
    ChevronLeft,
    Sun,
    Moon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export const Sidebar = () => {
    const pathname = usePathname();
    const { user } = useAuth();
    const { isSidebarCollapsed, setSidebarCollapsed, isDarkMode, toggleDarkMode } = useUI();

    const navItems = [
        { name: "Inicio", icon: LayoutDashboard, href: "/dashboard" },
        { name: "Tareas", icon: CheckSquare, href: "/dashboard/tasks" },
        { name: "Equipo", icon: Users, href: "/dashboard/team" },
        { name: "Encuestas", icon: PieChart, href: "/dashboard/polls" },
        { name: "Calendario", icon: Calendar, href: "/dashboard/calendar" },
    ];

    if (user?.email === 'felizdeemprender@gmail.com') {
        navItems.push({ name: "Super Admin", icon: Building2, href: "/ceo" });
    }

    const bottomItems = [
        { name: "Ajustes", icon: Settings, href: "/dashboard/settings" },
        { name: "Ayuda", icon: HelpCircle, href: "/dashboard/help" },
    ];

    return (
        <aside 
            className="sidebar-transition"
            style={{
                width: isSidebarCollapsed ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)',
                height: '100vh',
                backgroundColor: 'var(--bg-sidebar)',
                color: 'var(--text-inverse)',
                display: 'flex',
                flexDirection: 'column',
                padding: isSidebarCollapsed ? '1.25rem 0.15rem' : '1.5rem 1rem',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 100,
                transition: 'width var(--transition-speed), padding var(--transition-speed)'
            }}
        >
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                gap: '1rem', 
                marginBottom: '2.5rem', 
                padding: '0 0.5rem' 
            }}>
                {!isSidebarCollapsed && (
                    <div className="hide-mobile" style={{ 
                        display: 'flex', 
                        flexDirection: 'row',
                        alignItems: 'center', 
                        gap: '0.75rem',
                        width: '100%',
                        justifyContent: 'flex-start'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'var(--primary)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            flexShrink: 0
                        }}>
                            W
                        </div>
                        <span className="sidebar-logo-text" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>Workflow</span>
                    </div>
                )}
                
                <button 
                    onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        padding: '6px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: isSidebarCollapsed ? '28px' : 'auto',
                        alignSelf: isSidebarCollapsed ? 'center' : 'flex-end',
                        marginTop: !isSidebarCollapsed ? '-42px' : '0' // Pull up next to logo on desktop
                    }}
                    className="mobile-hamburger-adjust hide-mobile"
                >
                    {isSidebarCollapsed ? <Menu size={isSidebarCollapsed ? 16 : 18} /> : <ChevronLeft size={18} />}
                </button>

                </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={isSidebarCollapsed ? item.name : ""}
                            className="sidebar-item"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                                gap: '0.75rem',
                                padding: isSidebarCollapsed ? '0.5rem' : '0.75rem 1rem',
                                borderRadius: '8px',
                                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                                backgroundColor: isActive ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                                transition: 'all 0.2s',
                                textDecoration: 'none',
                                overflow: 'hidden'
                            }}
                        >
                            <item.icon size={isSidebarCollapsed ? 16 : 18} color={isActive ? 'var(--primary)' : 'rgba(255,255,255,0.4)'} />
                            {!isSidebarCollapsed && <span className="sidebar-text" style={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {bottomItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        title={isSidebarCollapsed ? item.name : ""}
                        className="sidebar-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                            gap: '0.75rem',
                            padding: isSidebarCollapsed ? '0.5rem' : '0.75rem 1rem',
                            borderRadius: '8px',
                            color: 'rgba(255,255,255,0.6)',
                            transition: 'all 0.2s',
                            textDecoration: 'none',
                            overflow: 'hidden'
                        }}
                    >
                        <item.icon size={isSidebarCollapsed ? 16 : 18} color="rgba(255,255,255,0.4)" />
                        {!isSidebarCollapsed && <span className="sidebar-text" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{item.name}</span>}
                    </Link>
                ))}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    marginTop: 'auto',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    overflow: 'hidden'
                }} className="sidebar-footer">
                    <button
                        onClick={toggleDarkMode}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                            gap: '0.75rem',
                            padding: '0.65rem 0.75rem',
                            borderRadius: '8px',
                            color: 'rgba(255,255,255,0.6)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            fontSize: '0.8rem'
                        }}
                        className="sidebar-item"
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        {!isSidebarCollapsed && <span className="sidebar-text">{isDarkMode ? "Modo Claro" : "Modo Oscuro"}</span>}
                    </button>

                    <div style={{ 
                        height: '1px', 
                        background: 'rgba(255,255,255,0.1)', 
                        margin: '0.25rem 0' 
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                        <div style={{ width: isSidebarCollapsed ? '32px' : '36px', height: isSidebarCollapsed ? '32px' : '36px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {!isSidebarCollapsed && (
                            <div style={{ flex: 1, overflow: 'hidden' }} className="sidebar-text">
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email?.split('@')[0]}</p>
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{user?.role || 'Empleado'}</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => signOut(auth)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem',
                            marginTop: '0.5rem',
                            borderRadius: '8px',
                            color: '#fb7185',
                            backgroundColor: 'rgba(251, 113, 133, 0.1)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        <LogOut size={18} />
                        {!isSidebarCollapsed && <span className="sidebar-text">Cerrar Sesión</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
};
