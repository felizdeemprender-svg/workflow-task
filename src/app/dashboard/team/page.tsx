"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { where } from "firebase/firestore";
import { Users, Shield, User as UserIcon, Mail, Plus, UserPlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { userActions } from "@/lib/firebase/userActions";

export default function TeamPage() {
    const { user } = useAuth();

    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [loadingAction, setLoadingAction] = React.useState(false);
    const [newMember, setNewMember] = React.useState({ 
        email: '', 
        password: '',
        area: 'General', 
        role: 'Empleado' as 'Empleado' | 'Admin'
    });
    const [accessibleAreas, setAccessibleAreas] = React.useState<string[]>(['General']);
    const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null);

    const areas = ["General", "Ventas", "Logística", "Soporte", "Administración", "Producción", "Recursos Humanos"];

    const constraints = React.useMemo(() => {
        if (!user?.company_id) return [];
        return [where('company_id', '==', user.company_id)];
    }, [user?.company_id]);

    const { data: teamMembers, loading } = useFirestoreQuery<any>('users', constraints, !!user?.company_id);
    const [searchTerm, setSearchTerm] = React.useState("");

    const filteredMembers = React.useMemo(() => {
        return (teamMembers || []).filter((m: any) => 
            m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [teamMembers, searchTerm]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.company_id) return;
        setLoadingAction(true);
        try {
            if (editingMemberId) {
                // UPDATE MODE
                await userActions.updateUser({
                    targetUid: editingMemberId,
                    role: newMember.role,
                    area: newMember.area,
                    accessibleAreas: Array.from(new Set([...accessibleAreas, newMember.area])),
                    ...(newMember.password ? { password: newMember.password } : {})
                });
                alert("Miembro actualizado con éxito.");
            } else {
                // CREATE MODE
                await userActions.createUser({
                    ...newMember,
                    company_id: user.company_id,
                    accessibleAreas: Array.from(new Set([...accessibleAreas, newMember.area]))
                });
                alert("Miembro registrado con éxito.");
            }
            setIsAddModalOpen(false);
            setEditingMemberId(null);
            setNewMember({ email: '', password: '', area: 'General', role: 'Empleado' });
            setAccessibleAreas(['General']);
        } catch (error: any) {
            console.error(error);
            alert("Error: " + (error.message || "Error desconocido"));
        } finally {
            setLoadingAction(false);
        }
    };

    const openEditModal = (member: any) => {
        setEditingMemberId(member.id);
        setNewMember({
            email: member.email,
            password: '', // We don't show the password
            area: member.area || 'General',
            role: member.role || 'Empleado'
        });
        setAccessibleAreas(member.accessibleAreas || [member.area || 'General']);
        setIsAddModalOpen(true);
    };

    const getRoleStyles = (role: string) => {
        switch (role) {
            case 'Admin': return { bg: '#eef2ff', color: '#4f46e5', icon: Shield };
            case 'CEO': return { bg: '#fff7ed', color: '#ea580c', icon: Shield };
            default: return { bg: '#f1f5f9', color: '#64748b', icon: UserIcon };
        }
    };

    return (
        <div className="flex-col gap-8 fade-in">
            <div className="flex-row justify-between items-center">
                <div>
                    <h1>{user?.role === 'Empleado' ? 'Nuestro Equipo' : 'Gestión de Equipo'}</h1>
                    <p className="text-muted">
                        {user?.role === 'Empleado' 
                            ? 'Conoce a tus compañeros y sus áreas de especialidad.' 
                            : 'Administra los miembros de tu organización y sus permisos.'}
                    </p>
                </div>
                <div className="flex-row gap-4">
                    <div className="premium-input flex-row gap-2" style={{ width: '300px', padding: '0.5rem 1rem' }}>
                        <Users size={18} className="text-muted" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o email..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div className="flex-row gap-4" style={{ backgroundColor: 'var(--bg-main)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                        <span className="font-bold text-primary">{teamMembers.length} Miembros</span>
                    </div>
                    {(user?.role === 'Admin' || user?.role === 'CEO') && (
                        <Button variant="primary" onClick={() => {
                            setEditingMemberId(null);
                            setNewMember({ email: '', password: '', area: 'General', role: 'Empleado' });
                            setAccessibleAreas(['General']);
                            setIsAddModalOpen(true);
                        }}>
                            <UserPlus size={18} /> Agregar
                        </Button>
                    )}
                </div>
            </div>

            <Card title="Directorio de Miembros">
                {loading ? (
                    <div className="flex-row justify-center" style={{ padding: '4rem' }}>
                        <Loader2 className="animate-spin" color="var(--primary)" size={40} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
                        {filteredMembers.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'white' }}>
                                No se encontraron miembros.
                            </div>
                        ) : filteredMembers.map((member: any) => {
                            const styles = getRoleStyles(member.role);
                            const Icon = styles.icon;

                            return (
                                <div key={member.id} className="fade-in" style={{
                                    padding: '1.25rem',
                                    backgroundColor: 'white',
                                    borderBottom: '1px solid var(--border-light)',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 150px'
                                }}>
                                    <div className="flex-row gap-4">
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            backgroundColor: styles.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: styles.color
                                        }}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold" style={{ fontSize: '0.925rem' }}>{member.email?.split('@')[0]}</p>
                                            <p className="text-small text-muted flex-row gap-1">
                                                <Mail size={12} /> {member.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-small text-muted font-bold" style={{ textTransform: 'uppercase', marginBottom: '2px' }}>Área</p>
                                        <p className="text-muted font-bold" style={{ color: 'var(--text-main)' }}>{member.area || 'General'}</p>
                                    </div>
                                     <div className="flex-row gap-2" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                                         {(user?.role === 'Admin' || user?.role === 'CEO') && (
                                             <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => openEditModal(member)}
                                                style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}
                                             >
                                                 Editar
                                             </Button>
                                         )}
                                         <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: styles.bg,
                                            color: styles.color,
                                            textTransform: 'uppercase'
                                         }}>
                                             {member.role}
                                         </span>
                                     </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <Modal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                title={editingMemberId ? "Editar Miembro" : "Agregar Nuevo Miembro"}
            >
                <form onSubmit={handleAddMember} className="flex-col gap-3">
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold" style={{ color: 'var(--text-muted)' }}>Email del Colaborador</label>
                        <input
                            type="email"
                            required
                            disabled={!!editingMemberId}
                            className="premium-input"
                            value={newMember.email}
                            onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                            placeholder="empleado@empresa.com"
                        />
                    </div>
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold" style={{ color: 'var(--text-muted)' }}>
                            {editingMemberId ? "Nueva Contraseña (Dejar vacío para no cambiar)" : "Contraseña Inicial"}
                        </label>
                        <input
                            type="password"
                            required={!editingMemberId}
                            minLength={6}
                            className="premium-input"
                            value={newMember.password}
                            onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                            placeholder={editingMemberId ? "Opcional" : "Mínimo 6 caracteres"}
                        />
                    </div>
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold" style={{ color: 'var(--text-muted)' }}>Área de Injerencia (Principal)</label>
                        <select
                            required
                            className="premium-input"
                            value={newMember.area}
                            onChange={e => {
                                const newArea = e.target.value;
                                setNewMember({ ...newMember, area: newArea });
                                if (!accessibleAreas.includes(newArea)) {
                                    setAccessibleAreas([...accessibleAreas, newArea]);
                                }
                            }}
                        >
                            {areas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-col gap-1">
                        <label className="text-small font-bold" style={{ color: 'var(--text-muted)' }}>Rol</label>
                        <select
                            className="premium-input"
                            value={newMember.role}
                            onChange={e => setNewMember({ ...newMember, role: e.target.value as any })}
                        >
                            <option value="Empleado">Empleado</option>
                            <option value="Admin">Administrador</option>
                        </select>
                    </div>

                    <div className="flex-col gap-2" style={{ marginTop: '0.25rem' }}>
                        <label className="text-small font-bold" style={{ color: 'var(--text-muted)' }}>Otras Áreas con Acceso Permitido</label>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '0.75rem',
                            padding: '1rem',
                            backgroundColor: 'var(--bg-main)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-light)'
                        }}>
                            {areas.map(area => (
                                <label key={area} className="flex-row gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={accessibleAreas.includes(area)}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setAccessibleAreas([...accessibleAreas, area]);
                                            } else {
                                                if (area !== newMember.area) {
                                                    setAccessibleAreas(accessibleAreas.filter(a => a !== area));
                                                }
                                            }
                                        }}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{area}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex-row gap-4" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" isLoading={loadingAction}>
                            {editingMemberId ? "Guardar Cambios" : "Registrar Miembro"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
