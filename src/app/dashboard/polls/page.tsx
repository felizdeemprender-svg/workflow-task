"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { pollActions } from "@/lib/firebase/actions";
import { where } from "firebase/firestore";
import { Modal } from "@/components/ui/Modal";

export default function PollsPage() {
    const { user } = useAuth();
    const [isVoting, setIsVoting] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPoll, setNewPoll] = useState({
        question: "",
        options: ["", ""]
    });

    const constraints = React.useMemo(() =>
        user?.company_id ? [where('company_id', '==', user.company_id)] : [],
        [user?.company_id]
    );

    const { data: polls, loading } = useFirestoreQuery<any>('polls', constraints, !!user?.company_id);

    const handleVote = async (pollId: string, optionIndex: number) => {
        if (!user?.uid) return;
        setIsVoting(`${pollId}-${optionIndex}`);
        try {
            await pollActions.vote(pollId, optionIndex, user.uid);
        } catch (error) {
            console.error("Error voting:", error);
        } finally {
            setIsVoting(null);
        }
    };

    const handleCreatePoll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.company_id) return;
        
        const validOptions = newPoll.options.filter(opt => opt.trim() !== "");
        if (validOptions.length < 2) {
            alert("Debes añadir al menos 2 opciones.");
            return;
        }

        setIsSubmitting(true);
        try {
            await pollActions.createPoll(user.company_id, newPoll.question, validOptions);
            setIsModalOpen(false);
            setNewPoll({ question: "", options: ["", ""] });
            alert("Encuesta creada con éxito.");
        } catch (error) {
            console.error(error);
            alert("Error al crear la encuesta.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddOption = () => {
        setNewPoll({ ...newPoll, options: [...newPoll.options, ""] });
    };

    const handleRemoveOption = (index: number) => {
        if (newPoll.options.length <= 2) return;
        const newOptions = newPoll.options.filter((_, i) => i !== index);
        setNewPoll({ ...newPoll, options: newOptions });
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...newPoll.options];
        newOptions[index] = value;
        setNewPoll({ ...newPoll, options: newOptions });
    };

    return (
        <div className="flex-col gap-8 fade-in">
            <div className="flex-row justify-between items-center">
                <div>
                    <h1>Encuestas</h1>
                    <p className="text-muted">Participa en las decisiones del equipo de forma democrática.</p>
                </div>
                {(user?.role === 'CEO' || user?.role === 'Admin') && (
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Nueva Encuesta
                    </Button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <Loader2 className="animate-spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando encuestas...</p>
                </div>
            ) : (
                <div className="grid-auto">
                    {polls.length === 0 ? (
                        <Card title="Sin encuestas">
                            <p style={{ color: 'var(--text-muted)' }}>No hay encuestas activas en este momento.</p>
                        </Card>
                    ) : polls.map((poll) => {
                        const hasVoted = poll.voters?.includes(user?.uid);
                        const totalVotes = poll.options.reduce((acc: number, opt: any) => acc + opt.votes, 0);

                        return (
                            <Card key={poll.id} title={poll.question}>
                                <div className="flex-col gap-4" style={{ marginTop: '1rem' }}>
                                    {poll.options.map((option: any, index: number) => {
                                        const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

                                        return (
                                            <div key={index} className="flex-col gap-2">
                                                <div className="flex-row justify-between text-muted font-bold">
                                                    <span>{option.text}</span>
                                                    <span>{percentage}% ({option.votes})</span>
                                                </div>
                                                <div style={{
                                                    height: '8px',
                                                    width: '100%',
                                                    backgroundColor: 'var(--bg-main)',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${percentage}%`,
                                                        backgroundColor: hasVoted ? 'var(--primary)' : '#cbd5e1',
                                                        transition: 'width 0.5s ease'
                                                    }} />
                                                </div>
                                                {!hasVoted && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleVote(poll.id, index)}
                                                        isLoading={isVoting === `${poll.id}-${index}`}
                                                    >
                                                        Votar
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {hasVoted && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textAlign: 'center', marginTop: '1rem' }}>
                                            ✓ Ya has participado en esta encuesta
                                        </p>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Encuesta">
                <form onSubmit={handleCreatePoll} className="flex-col gap-6">
                    <div className="flex-col gap-2">
                        <label className="text-small font-bold" style={{ color: 'var(--text-muted)' }}>PREGUNTA</label>
                        <input
                            required
                            type="text"
                            value={newPoll.question}
                            onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                            className="premium-input"
                            placeholder="¿Qué vamos a decidir?"
                        />
                    </div>

                    <div className="flex-col gap-3">
                        <label className="text-small font-bold">OPCIONES</label>
                        {newPoll.options.map((option, index) => (
                            <div key={index} className="flex-row gap-2 items-center">
                                <input
                                    required
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    className="premium-input"
                                    style={{ flex: 1 }}
                                    placeholder={`Opción ${index + 1}`}
                                />
                                {newPoll.options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(index)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <Button variant="outline" type="button" onClick={handleAddOption} size="sm">
                            <Plus size={16} /> Añadir Opción
                        </Button>
                    </div>

                    <div className="flex-row gap-4" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" isLoading={isSubmitting} style={{ flex: 1 }}>
                            Publicar Encuesta
                        </Button>
                    </div>
                </form>
            </Modal>

            <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
        </div>
    );
}
