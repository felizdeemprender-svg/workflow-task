"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
    isSidebarCollapsed: boolean;
    setSidebarCollapsed: (value: boolean) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    isCommandPaletteOpen: boolean;
    setCommandPaletteOpen: (value: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

    // Initialize dark mode from localStorage or system preference
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark-mode');
        } else if (savedTheme === 'light') {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark-mode');
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark-mode');
        }
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const newValue = !prev;
            if (newValue) {
                document.documentElement.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
            return newValue;
        });
    };

    return (
        <UIContext.Provider value={{ 
            isSidebarCollapsed, 
            setSidebarCollapsed,
            isDarkMode,
            toggleDarkMode,
            isCommandPaletteOpen,
            setCommandPaletteOpen
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
