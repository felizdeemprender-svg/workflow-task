"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Lock, 
    Eye, 
    EyeOff, 
    ShieldCheck, 
    AlertCircle, 
    Map, 
    Plus, 
    Trash2, 
    Edit2,
    Save,
    X as CloseX
} from "lucide-react";
import { userActions } from "@/lib/firebase/userActions";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [showPasswords, setShowPasswords] = React.useState(false);

    // Area Management State
    const [areas, setAreas] = React.useState<string[]>([]);
    const [editingArea, setEditingArea] = React.useState<{ index: number, value: string } | null>(null);
    const [newAreaName, setNewAreaName] = React.useState("");
    const [savingAreas, setSavingAreas] = React.useState(false);

    const isAdmin = user?.role === "Admin" || user?.role === "CEO";

    React.useEffect(() => {
        const fetchCompanyData = async () => {
            if (!user?.company_id) return;
            try {
                const companyDoc = await getDoc(doc(db, "companies", user.company_id));
                if (companyDoc.exists()) {
                    const companyData = companyDoc.data();
                    if (companyData.areas && companyData.areas.length > 0) {
                        setAreas(companyData.areas);
                    } else {
                        // Default areas if not set yet
                        setAreas(["General", "Ventas", "Logística", "Soporte", "Administración"]);
                    }
                }
            } catch (error) {
                console.error("Error fetching company areas:", error);
            }
        };

        if (isAdmin) fetchCompanyData();
    }, [user?.company_id, isAdmin]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            alert("Las contraseñas nuevas no coinciden.");
            return;
        }

        if (newPassword.length < 6) {
            alert("La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setLoading(true);
        try {
            await userActions.changePassword(currentPassword, newPassword);
            alert("Contraseña actualizada con éxito.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            console.error("Error changing password:", error);
            if (error.code === 'auth/wrong-password') {
                alert("La contraseña actual es incorrecta.");
            } else {
                alert("Error al actualizar la contraseña: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddArea = async () => {
        if (!newAreaName.trim()) return;
        if (areas.includes(newAreaName.trim())) {
            alert("El área ya existe.");
            return;
        }

        const updatedAreas = [...areas, newAreaName.trim()];
        await saveAreas(updatedAreas);
        setNewAreaName("");
    };

    const handleRemoveArea = async (index: number) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta área?")) return;
        const updatedAreas = areas.filter((_, i) => i !== index);
        await saveAreas(updatedAreas);
    };

    const handleRenameArea = async () => {
        if (!editingArea || !editingArea.value.trim()) return;
        const updatedAreas = [...areas];
        updatedAreas[editingArea.index] = editingArea.value.trim();
        await saveAreas(updatedAreas);
        setEditingArea(null);
    };

    const saveAreas = async (updatedAreas: string[]) => {
        if (!user?.company_id) return;
        setSavingAreas(true);
        try {
            await updateDoc(doc(db, "companies", user.company_id), {
                areas: updatedAreas
            });
            setAreas(updatedAreas);
        } catch (error) {
            console.error("Error saving areas:", error);
            alert("No se pudieron guardar las áreas.");
        } finally {
            setSavingAreas(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex-row justify-center" style={{ padding: '4rem' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid var(--primary-light)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        );
    }

    return (
        <div className="flex-col gap-8 fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div className="flex-col gap-2">
                <div className="flex-row gap-2 items-center" style={{ color: 'var(--primary)' }}>
                    <ShieldCheck size={24} />
                    <h1 style={{ margin: 0 }}>Seguridad y Ajustes</h1>
                </div>
                <p className="text-muted">Gestiona el acceso a tu cuenta y la configuración corporativa.</p>
            </div>

            {/* Area Management Section (Admin Only) */}
            {isAdmin && (
                <Card 
                    title="Gestión de Áreas de Trabajo" 
                    subtitle="Administra las áreas operativas de tu empresa. Estas aparecerán al crear nuevas tareas."
                >
                    <div className="flex-col gap-6" style={{ marginTop: '1.5rem' }}>
                        <div className="flex-row gap-3">
                            <input 
                                className="premium-input flex-1"
                                placeholder="Nueva área (ej: Logística, Ventas...)"
                                value={newAreaName}
                                onChange={(e) => setNewAreaName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddArea()}
                            />
                            <Button variant="primary" onClick={handleAddArea} disabled={savingAreas}>
                                <Plus size={18} /> Agregar
                            </Button>
                        </div>

                        <div className="flex-col gap-2">
                            {areas.length === 0 ? (
                                <p className="text-muted italic" style={{ padding: '1rem', textAlign: 'center' }}>No hay áreas definidas.</p>
                            ) : (
                                <div className="flex-col" style={{ gap: '1px', backgroundColor: 'var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
                                    {areas.map((area, index) => (
                                        <div key={index} className="flex-row justify-between items-center" style={{ backgroundColor: 'var(--bg-card)', padding: '0.875rem 1rem' }}>
                                            {editingArea?.index === index ? (
                                                <div className="flex-row gap-2 flex-1">
                                                    <input 
                                                        className="premium-input"
                                                        value={editingArea.value}
                                                        onChange={(e) => setEditingArea({ ...editingArea, value: e.target.value })}
                                                        autoFocus
                                                    />
                                                    <button onClick={handleRenameArea} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}><Save size={18} /></button>
                                                    <button onClick={() => setEditingArea(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><CloseX size={18} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-row gap-3 items-center">
                                                        <Map size={18} className="text-primary" />
                                                        <span className="font-bold">{area}</span>
                                                    </div>
                                                    <div className="flex-row gap-1">
                                                        <button 
                                                            onClick={() => setEditingArea({ index, value: area })}
                                                            style={{ padding: '8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                            className="hover-bg-light"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRemoveArea(index)}
                                                            style={{ padding: '8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                            className="hover-bg-light"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            <Card title="Cambiar Contraseña" subtitle="Para tu seguridad, deberás verificar tu contraseña actual antes de establecer una nueva.">
                <form onSubmit={handlePasswordChange} className="flex-col gap-5" style={{ marginTop: '1rem' }}>
                    
                    <div className="flex-col gap-2">
                        <label className="text-small font-bold text-muted">Contraseña Actual</label>
                        <div className="flex-row items-center gap-3 premium-input">
                            <Lock size={18} className="text-muted" />
                            <input 
                                type={showPasswords ? "text" : "password"} 
                                required 
                                className="flex-1"
                                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit' }}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Ingresa tu contraseña actual"
                            />
                        </div>
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'var(--border-light)', margin: '0.5rem 0' }} />

                    <div className="flex-col gap-2">
                        <label className="text-small font-bold text-muted">Nueva Contraseña</label>
                        <div className="flex-row items-center gap-3 premium-input">
                            <Lock size={18} className="text-muted" />
                            <input 
                                type={showPasswords ? "text" : "password"} 
                                required 
                                minLength={6}
                                className="flex-1"
                                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit' }}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    <div className="flex-col gap-2">
                        <label className="text-small font-bold text-muted">Confirmar Nueva Contraseña</label>
                        <div className="flex-row items-center gap-3 premium-input">
                            <Lock size={18} className="text-muted" />
                            <input 
                                type={showPasswords ? "text" : "password"} 
                                required 
                                className="flex-1"
                                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit' }}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repite la nueva contraseña"
                            />
                        </div>
                    </div>

                    <div className="flex-row justify-between items-center" style={{ marginTop: '0.5rem' }}>
                        <button 
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="flex-row items-center gap-2 text-small font-bold"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                        >
                            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                            {showPasswords ? "Ocultar Contraseñas" : "Mostrar Contraseñas"}
                        </button>

                        <Button type="submit" variant="primary" isLoading={loading}>
                            Actualizar Contraseña
                        </Button>
                    </div>
                </form>
            </Card>

            <Card className="glass" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                <div className="flex-row gap-3 items-start">
                    <AlertCircle color="#f59e0b" size={20} style={{ marginTop: '2px' }} />
                    <div className="flex-col gap-1">
                        <span className="font-bold" style={{ color: '#d97706' }}>Nota sobre Seguridad</span>
                        <p className="text-small" style={{ color: '#92400e', lineHeight: '1.5' }}>
                            Al cambiar tu contraseña, tu sesión se mantendrá activa en este dispositivo, pero es posible que se requiera volver a iniciar sesión en otros navegadores o aplicaciones asociadas con tu cuenta corporativa `{user?.email}`.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
