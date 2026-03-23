"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { Search, Moon, Sun } from "lucide-react";
import { useUI } from "@/context/UIContext";

export function TopBar() {
    const { user } = useAuth();
    const handleSignOut = () => signOut(auth);
    const { isDarkMode, toggleDarkMode, isSidebarCollapsed } = useUI();

    return (
        <header className="flex-row justify-between items-center" style={{
            height: '48px',
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-light)',
            padding: '0 0.75rem',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            transition: 'all var(--transition-speed)'
        }}>
            <div className="flex-row hide-mobile" style={{ flex: 1 }}>
                {/* Search moved to page level for mockup fidelity */}
            </div>

            <div className="flex-row items-center gap-6">
                {/* Notification Bell moved to floating position */}
            </div>
        </header>
    );
}
