"use client";

import React from "react";
import { motion } from "framer-motion";

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    className?: string;
    footer?: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export const Card = ({ children, title, subtitle, className = "", footer, style, onClick }: CardProps) => {
    return (
        <motion.div
            className={`card ${className}`}
            whileHover={onClick ? { scale: 1.01, translateY: -4 } : { translateY: -2 }}
            whileTap={onClick ? { scale: 0.98 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={onClick}
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--card-p)',
                boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(10px)',
                ...style
            }}
        >
            {(title || subtitle) && (
                <div style={{ marginBottom: '0.25rem' }}>
                    {title && <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{title}</h3>}
                    {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>}
                </div>
            )}
            <div style={{ flex: 1 }}>
                {children}
            </div>
            {footer && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    {footer}
                </div>
            )}
        </motion.div>
    );
};
