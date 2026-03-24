"use client";

import React from "react";
import { motion } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

export const Button = ({
    children,
    variant = "primary",
    size = "md",
    isLoading,
    className = "",
    disabled,
    ...props
}: ButtonProps) => {
    const isClickable = !disabled && !isLoading;

    const getSpacingStyles = () => {
        switch (size) {
            case 'sm': return { padding: '0.4rem 0.8rem', fontSize: '0.75rem' };
            case 'lg': return { padding: '1rem 2rem', fontSize: '1rem', fontWeight: 600 };
            default: return { padding: '0.65rem 1.25rem', fontSize: '0.85rem' }; // md
        }
    };

    const inlineStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        borderRadius: '14px',
        cursor: isClickable ? 'pointer' : 'not-allowed',
        opacity: isClickable ? 1 : 0.6,
        border: 'none',
        boxShadow: variant === 'primary' && isClickable ? '0 8px 16px -4px rgba(99, 102, 241, 0.3)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        ...getSpacingStyles()
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary': return { backgroundColor: 'var(--primary)', color: 'white' };
            case 'secondary': return { backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' };
            case 'outline': return { backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-light)' };
            case 'danger': return { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
            case 'success': return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
            case 'warning': return { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
            case 'ghost': return { backgroundColor: 'transparent', color: 'var(--text-muted)' };
            default: return { backgroundColor: 'transparent' };
        }
    };
    // Remove motion-specific props from HTML spread to avoid type conflicts
    const { onDragEnd, onDragStart, onDrag, ...filteredProps } = props as any;

    return (
        <motion.button
            className={`btn btn-${variant} btn-${size} ${className}`}
            whileHover={isClickable ? { scale: 1.02, translateY: -1 } : {}}
            whileTap={isClickable ? { scale: 0.98 } : {}}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            disabled={!isClickable}
            style={{ ...inlineStyles, ...getVariantStyles() }}
            {...(filteredProps as any)}
        >
            {isLoading && (
                <span className="animate-spin" style={{ marginRight: '8px', display: 'inline-block' }}>◌</span>
            )}
            {children}
        </motion.button>
    );
};
