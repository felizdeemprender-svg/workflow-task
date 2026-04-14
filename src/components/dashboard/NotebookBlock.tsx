"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { notebookActions } from "@/lib/firebase/actions";

interface NotebookBlockProps {
    note: any;
    onDelete: (id: string) => Promise<void>;
}

export const NotebookBlock: React.FC<NotebookBlockProps> = ({ note, onDelete }) => {
    const [content, setContent] = useState(note.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastSaved = useRef(note.content);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    // Debounced Update
    useEffect(() => {
        if (content === lastSaved.current) return;

        const timeout = setTimeout(async () => {
            try {
                await notebookActions.updateNote(note.id, content);
                lastSaved.current = content;
            } catch (err) {
                console.error("Failed to update note block:", err);
            }
        }, 2000);

        return () => clearTimeout(timeout);
    }, [content, note.id]);

    return (
        <div className="flex-col gap-2 note-hover-group group">
            <div className="flex-row items-center gap-2">
                <Clock size={12} className="text-muted opacity-50" />
                <span className="font-bold text-small text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {note.createdAt?.toDate ? format(note.createdAt.toDate(), "d MMM, HH:mm", { locale: es }) : '...'}
                </span>
                <div className="flex-1 h-[1px] bg-border-light opacity-30"></div>
                <Button 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100" 
                    onClick={() => onDelete(note.id)}
                    style={{ padding: '0', height: '16px', width: '16px' }}
                >
                    <Trash2 size={10} className="text-danger" />
                </Button>
            </div>
            
            <textarea 
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: 'var(--text-main)',
                    resize: 'none',
                    padding: '0 0.5rem',
                    overflow: 'hidden'
                }}
            />
        </div>
    );
};
