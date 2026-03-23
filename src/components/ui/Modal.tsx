"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps): JSX.Element | null => {
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
                    width: 'min(95%, 550px)',
                    maxHeight: '85vh',
                    padding: 'var(--main-p)',
                    boxShadow: '0 40px 80px -15px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    animation: 'modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#111827' }}>{title}</h2>
                    <button 
                        onClick={onClose}
                        style={{ 
                            background: '#f3f4f6', 
                            border: 'none',
                            borderRadius: '14px',
                            cursor: 'pointer', 
                            color: '#4b5563',
                            width: '44px',
                            height: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={26} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
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
