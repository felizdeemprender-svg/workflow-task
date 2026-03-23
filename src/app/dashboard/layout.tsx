"use client";

import React from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { TopBar } from "@/components/ui/TopBar";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UIProvider, useUI } from "@/context/UIContext";

import { NotificationBell } from "@/components/ui/NotificationBell";
import { AICommandBar } from "@/components/dashboard/AICommandBar";
import { FloatingBot } from "@/components/FloatingBot";
import { PageTransition } from "@/components/ui/PageTransition";

const LayoutContent = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const { isSidebarCollapsed, isCommandPaletteOpen, setCommandPaletteOpen } = useUI();
    const router = useRouter();

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(!isCommandPaletteOpen);
            }
            if (e.key === 'Escape' && isCommandPaletteOpen) {
                setCommandPaletteOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCommandPaletteOpen, setCommandPaletteOpen]);

    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-main)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid var(--primary-light)',
                        borderTopColor: 'var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cargando Workflow...</p>
                </div>
                <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', maxWidth: '100vw', overflowX: 'hidden', position: 'relative' }}>
            <Sidebar />
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                minWidth: 0, 
                marginLeft: isSidebarCollapsed ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)',
                width: isSidebarCollapsed ? 'calc(100vw - var(--sidebar-collapsed-w))' : 'calc(100vw - var(--sidebar-w))', 
                maxWidth: isSidebarCollapsed ? 'calc(100vw - var(--sidebar-collapsed-w))' : 'calc(100vw - var(--sidebar-w))', 
                overflowX: 'hidden' 
            }}>
                <TopBar />
                <main style={{
                    padding: 'var(--main-p)',
                    backgroundColor: 'var(--bg-main)',
                    minHeight: 'calc(100vh - 48px)',
                    transition: 'all var(--transition-speed)',
                    width: '100%',
                    maxWidth: '100%',
                    overflowX: 'hidden',
                    boxSizing: 'border-box'
                }}>
                    <PageTransition>
                        {children}
                    </PageTransition>
                </main>
            </div>
            <div style={{ position: 'fixed', top: '1rem', right: '1.25rem', zIndex: 1100 }}>
                <NotificationBell />
            </div>
            <AICommandBar />
            <FloatingBot />
        </div>
    );
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UIProvider>
            <AuthProvider>
                <LayoutContent>{children}</LayoutContent>
            </AuthProvider>
        </UIProvider>
    );
}
