"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md', noPadding = false }: ModalProps): JSX.Element | null => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const sizeMap = {
        sm: '450px',
        md: '650px',
        lg: '850px',
        xl: '1100px'
    };

    const modalContent = (
        <div 
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                backdropFilter: 'blur(10px)',
                padding: '20px',
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    width: `min(95%, ${sizeMap[size]})`,
                    maxHeight: '85vh',
                    boxShadow: '0 40px 80px -15px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    animation: 'modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: 'var(--main-p)',
                    paddingBottom: '1rem' 
                }}>
                    {typeof title === 'string' ? (
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#111827' }}>{title}</h2>
                    ) : (
                        <div>{title}</div>
                    )}
                    <Button 
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        style={{ 
                            background: '#f3f4f6', 
                            borderRadius: '14px',
                            width: '44px',
                            height: '44px',
                            marginRight: '2.5rem'
                        }}
                    >
                        <X size={26} />
                    </Button>
                </div>
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden', 
                    minHeight: 0,
                    padding: noPadding ? 0 : 'var(--main-p)',
                    paddingTop: 0,
                    paddingBottom: noPadding ? 0 : 'var(--main-p)'
                }}>
                    {children}
                </div>
            </div>
            <style jsx>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.9) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );

    const root = document.getElementById("modal-root");
    return root ? createPortal(modalContent, root) : null;
};
