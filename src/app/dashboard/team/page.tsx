"use client";

import React, { useState, useMemo } from "react";
import { 
    Users, Plus, Mail, Shield, Trash2, 
    MoreVertical, Search, CheckCircle2, X,
    Calendar, Lock, Settings, Globe, Key,
    MailCheck, AlertCircle, ExternalLink,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, updateDoc, doc, deleteDoc, where, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { TeamChatModal } from "@/components/dashboard/TeamChatModal";

export default function TeamPage() {
    const { user } = useAuth();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Auth and Logic for System Calendar
    const [syncMode, setSyncMode] = useState<'oauth' | 'service'>('oauth');
    const [serviceAccountJson, setServiceAccountJson] = useState("");
    const [isConfiguring, setIsConfiguring] = useState(false);

    // Edit User State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [editForm, setEditForm] = useState({ name: "", area: "", role: "", initials: "" });
    const [isSaving, setIsSaving] = useState(false);

    // Add User State
    const [newUserForm, setNewUserForm] = useState({ name: "", email: "", area: "General", role: "Employee", password: "", initials: "" });
    const [isAdding, setIsAdding] = useState(false);

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatRecipient, setChatRecipient] = useState<any>(null);

    const [availableAreas, setAvailableAreas] = useState<string[]>([]);

    const userConstraints = useMemo(() => 
        user?.company_id ? [where('company_id', '==', user.company_id)] : [],
        [user?.company_id]
    );

    const { data: teamMembers, loading } = useFirestoreQuery<any>('users', userConstraints, !!user?.company_id);

    const filteredMembers = useMemo(() => {
        if (!teamMembers) return [];
        return teamMembers.filter(m => 
            m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.area?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [teamMembers, searchTerm]);

    const handleLinkSystemCalendar = async () => {
        if (!user?.company_id) return;
        setIsSyncing(true);
        try {
            // Google OAuth2 Popup for the SYSTEM account
            const G_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            const G_SCOPES = 'https://www.googleapis.com/auth/calendar.events';
            
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${G_CLIENT_ID}&redirect_uri=${window.location.origin}/dashboard/team&response_type=code&scope=${encodeURIComponent(G_SCOPES)}&access_type=offline&prompt=consent`;
            
            // For this demo/implementation, we assume the user finishes the flow.
            // In a real app, you'd handle the redirect. 
            // Here, we provide a button to test the connection.
            window.open(authUrl, '_blank');
            toast.info("Por favor, completa la autenticación en la nueva ventana.");
        } catch (error) {
            console.error("Link error:", error);
            toast.error("Error al iniciar vinculación");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveServiceAccount = async () => {
        if (!user?.company_id || !serviceAccountJson) return;
        setIsConfiguring(true);
        try {
            const config = JSON.parse(serviceAccountJson);
            if (!config.project_id || !config.private_key) {
                throw new Error("Formato de JSON inválido");
            }

            await setDoc(doc(db, 'companies', user.company_id, 'config', 'calendar'), {
                type: 'service_account',
                credentials: config,
                updatedAt: serverTimestamp(),
                updatedBy: user.email
            }, { merge: true });

            toast.success("Cuenta de servicio configurada correctamente");
            setServiceAccountJson("");
            setIsSyncModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error al guardar configuración");
        } finally {
            setIsConfiguring(false);
        }
    };

    // Fetch areas for the company
    React.useEffect(() => {
        const fetchAreas = async () => {
            if (!user?.company_id) return;
            const companyDoc = await getDoc(doc(db, "companies", user.company_id));
            if (companyDoc.exists()) {
                setAvailableAreas(companyDoc.data().areas || ["General", "Ventas", "Logística", "Soporte", "Administración"]);
            }
        };
        fetchAreas();
    }, [user?.company_id]);

    const handleEditUser = (member: any) => {
        setEditingMember(member);
        setEditForm({ 
            name: member.name || "", 
            area: member.area || "General", 
            role: member.role || "Employee",
            initials: member.initials || ""
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingMember) return;
        setIsSaving(true);
        try {
            const adminUpdateUser = httpsCallable(functions, 'adminUpdateUser');
            await adminUpdateUser({
                targetUid: editingMember.id,
                name: editForm.name,
                area: editForm.area,
                role: editForm.role
            });
            toast.success("Usuario actualizado correctamente");
            setIsEditModalOpen(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al actualizar usuario");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddUser = async () => {
        if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !user?.company_id) {
            toast.error("Por favor completa todos los campos, incluyendo contraseña");
            return;
        }
        setIsAdding(true);
        try {
            const adminCreateUser = httpsCallable(functions, 'adminCreateUser');
            await adminCreateUser({
                ...newUserForm,
                company_id: user.company_id,
                accessibleAreas: [newUserForm.area]
            });
            toast.success("Miembro creado y activado correctamente");
            setNewUserForm({ name: "", email: "", area: "General", role: "Employee", password: "", initials: "" });
            setIsAddUserOpen(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al crear miembro");
        } finally {
            setIsAdding(false);
        }
    };

    const handleOpenChat = (member: any) => {
        if (member.id === user?.uid) {
            toast.info("No puedes chatear contigo mismo (a menos que seas muy solitario)");
            return;
        }
        setChatRecipient(member);
        setIsChatOpen(true);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-primary" size={32} />
        </div>
    );

    const isCEO = user?.role === 'CEO' || user?.role === 'Admin';

    return (
        <div className="flex-col gap-6 fade-in">
            {/* Header / Stats */}
            <div className="flex-row justify-between items-end gap-4">
                <div className="flex-col gap-1">
                    <h1 className="text-2xl font-black text-main">Equipo</h1>
                    <p className="text-muted text-sm font-medium">Gestiona los miembros y permisos de tu organización.</p>
                </div>
                
                <div className="flex-row gap-3">
                    <Button variant="primary" className="flex-row gap-2" onClick={() => setIsAddUserOpen(true)}>
                        <Plus size={18} />
                        Añadir Miembro
                    </Button>
                </div>
            </div>


            {/* Search & List */}
            <div className="flex-col gap-4">
                <div className="flex-row gap-3">
                    <div className="card-pill flex-row items-center gap-3 px-4 flex-1 max-w-md">
                        <Search size={18} className="text-muted opacity-40" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre, email o área..." 
                            className="text-sm font-medium bg-transparent border-none outline-none w-full py-2"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {filteredMembers.map((member) => (
                        <Card key={member.id} className="hover-lift group" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '1.25rem', alignItems: 'center' }}>
                                {/* Avatar Circle - Fixed "Loose Letter" Issue */}
                                <div style={{ 
                                    width: '64px', 
                                    height: '64px', 
                                    borderRadius: '50%', 
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.5rem',
                                    fontWeight: 900,
                                    boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.3)',
                                    flexShrink: 0,
                                    border: '4px solid white'
                                }}>
                                    {member.initials || member.name?.charAt(0).toUpperCase() || <Users size={24} />}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                                            {member.name || "Sin nombre"}
                                        </h3>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 w-8 p-0"
                                            onClick={() => handleEditUser(member)}
                                            style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px' }}
                                        >
                                            <Settings size={14} className="text-muted" />
                                        </Button>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Mail size={12} style={{ opacity: 0.5 }} />
                                        {member.email}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                                <span style={{ 
                                    fontSize: '10px', 
                                    fontWeight: 800, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.05em', 
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-light)'
                                }}>
                                    {member.area || "General"}
                                </span>
                                <span style={{ 
                                    fontSize: '10px', 
                                    fontWeight: 800, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.05em', 
                                    backgroundColor: member.role === 'Admin' || member.role === 'CEO' ? '#eef2ff' : '#f8fafc',
                                    color: member.role === 'Admin' || member.role === 'CEO' ? '#4f46e5' : '#64748b',
                                    padding: '4px 10px',
                                    borderRadius: '8px'
                                }}>
                                    {member.role || "Miembro"}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Activo</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-9 w-9 p-0"
                                        onClick={() => handleOpenChat(member)}
                                        style={{ backgroundColor: '#f0fdf4', color: '#059669', borderRadius: '12px' }}
                                    >
                                        <MessageCircle size={16} />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-9 w-9 p-0"
                                        style={{ backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '12px' }}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Add Member Modal */}
            <Modal
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                title="Añadir Nuevo Miembro"
            >
                <div className="flex-col gap-5 py-4">
                    <div className="grid-2">
                        <div className="flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Nombre Completo</label>
                            <input 
                                type="text" 
                                className="premium-input w-full" 
                                placeholder="Ej. Juan Pérez" 
                                value={newUserForm.name}
                                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                            />
                        </div>
                        <div className="flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Inicial / Alias</label>
                            <input 
                                type="text" 
                                className="premium-input w-full" 
                                placeholder="Ej. JP" 
                                maxLength={2}
                                value={newUserForm.initials}
                                onChange={(e) => setNewUserForm({ ...newUserForm, initials: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <div className="flex-col gap-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Correo Electrónico</label>
                        <input 
                            type="email" 
                            className="premium-input w-full" 
                            placeholder="juan@empresa.com" 
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        />
                    </div>

                    <div className="flex-col gap-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Contraseña Temporal</label>
                        <input 
                            type="password" 
                            className="premium-input w-full" 
                            placeholder="Mínimo 6 caracteres" 
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        />
                    </div>

                    <div className="grid-2">
                        <div className="flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Área / Departamento</label>
                            <select 
                                className="premium-input w-full"
                                value={newUserForm.area}
                                onChange={(e) => setNewUserForm({ ...newUserForm, area: e.target.value })}
                            >
                                {availableAreas.map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Rol Administrativo</label>
                            <select 
                                className="premium-input w-full"
                                value={newUserForm.role}
                                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                            >
                                <option value="Employee">Empleado</option>
                                <option value="Admin">Administrador</option>
                                <option value="CEO">CEO / Dueño</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-row justify-end gap-3 pt-4 border-t border-light mt-2">
                        <Button variant="ghost" onClick={() => setIsAddUserOpen(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleAddUser} isLoading={isAdding}>
                            Crear y Activar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Member Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Miembro de Equipo"
            >
                <div className="flex-col gap-5 py-4">
                    <div className="grid-2">
                        <div className="flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Nombre Completo</label>
                            <input 
                                type="text" 
                                className="premium-input w-full" 
                                placeholder="Nombre del empleado..." 
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Inicial / Alias</label>
                            <input 
                                type="text" 
                                className="premium-input w-full" 
                                placeholder="Ej. JP" 
                                maxLength={2}
                                value={editForm.initials}
                                onChange={(e) => setEditForm({ ...editForm, initials: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Área / Departamento</label>
                            <select 
                                className="premium-input w-full"
                                value={editForm.area}
                                onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                            >
                                {availableAreas.map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Rol Administrativo</label>
                            <select 
                                className="premium-input w-full"
                                value={editForm.role}
                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            >
                                <option value="Employee">Empleado</option>
                                <option value="Admin">Administrador</option>
                                <option value="CEO">CEO / Dueño</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-row justify-end gap-3 pt-4 border-t border-light mt-2">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleSaveEdit} isLoading={isSaving}>
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </Modal>

            <TeamChatModal 
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                recipient={chatRecipient}
            />

        </div>
    );
}
