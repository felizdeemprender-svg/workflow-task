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
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, updateDoc, doc, deleteDoc, where, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

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
                    {isCEO && (
                        <Button 
                            variant="outline" 
                            className="flex-row gap-2"
                            onClick={() => setIsSyncModalOpen(true)}
                        >
                            <Calendar size={18} />
                            Vincular Google Calendar
                        </Button>
                    )}
                    <Button variant="primary" className="flex-row gap-2" onClick={() => setIsAddUserOpen(true)}>
                        <Plus size={18} />
                        Añadir Miembro
                    </Button>
                </div>
            </div>

            {/* Config Info Card (Admins Only) */}
            {isCEO && (
                <Card className="p-4 border-dashed border-2 flex-row items-center justify-between gap-4" style={{ background: 'rgba(var(--primary-rgb), 0.03)' }}>
                    <div className="flex-row items-center gap-4">
                        <div className="p-3 bg-primary-light rounded-2xl text-primary">
                            <Globe size={24} />
                        </div>
                        <div className="flex-col">
                            <h3 className="text-sm font-bold text-main">Sincronización Centralizada</h3>
                            <p className="text-xs text-muted font-medium">Las tareas creadas por cualquier miembro se sincronizarán con el calendario de la empresa.</p>
                        </div>
                    </div>
                    <div className="flex-row gap-2">
                        <span className="pill text-[10px] bg-green-100 text-green-700 border-green-200">ACTIVO</span>
                    </div>
                </Card>
            )}

            {/* Search & List */}
            <div className="flex-col gap-4">
                <div className="flex-row gap-3">
                    <div className="card flex-row items-center gap-3 px-4 py-2 flex-1 max-w-md">
                        <Search size={18} className="text-muted opacity-40" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre, email o área..." 
                            className="text-sm font-medium bg-transparent border-none outline-none w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembers.map((member) => (
                        <Card key={member.id} className="p-5 flex-col gap-4 hover-lift group">
                            <div className="flex-row justify-between items-start">
                                <div className="flex-row gap-3 items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">
                                        {member.name?.charAt(0) || <Users size={24} />}
                                    </div>
                                    <div className="flex-col">
                                        <h3 className="text-base font-extrabold text-main leading-none">{member.name || "Sin nombre"}</h3>
                                        <span className="text-xs font-semibold text-muted flex-row items-center gap-1 mt-1">
                                            <Mail size={12} />
                                            {member.email}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical size={16} />
                                </Button>
                            </div>

                            <div className="flex-row gap-2 flex-wrap">
                                <span className="pill text-[10px] font-black uppercase tracking-wider bg-sidebar text-main border-light">
                                    {member.area || "General"}
                                </span>
                                <span className={`pill text-[10px] font-black uppercase tracking-wider border-none ${
                                    member.role === 'CEO' ? 'bg-indigo-100 text-indigo-700' :
                                    member.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                                    'bg-slate-100 text-slate-700'
                                }`}>
                                    {member.role || "Miembro"}
                                </span>
                            </div>

                            <div className="flex-row justify-between items-center mt-2 pt-4 border-t border-light">
                                <span className="text-[10px] font-bold text-muted uppercase">Activo</span>
                                <div className="flex-row gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Sync Modal */}
            <Modal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                title="Configuración de Calendario Global"
            >
                <div className="flex-col gap-6 p-2">
                    <div className="flex-col gap-2">
                        <p className="text-sm text-muted">
                            Configura la cuenta de Google donde se centralizarán todas las tareas de <strong>{user?.company_name || 'la empresa'}</strong>.
                        </p>
                    </div>

                    <div className="flex-row p-1 bg-sidebar rounded-xl gap-1">
                        <button 
                            onClick={() => setSyncMode('oauth')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${syncMode === 'oauth' ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-main'}`}
                        >
                            Cuenta de Usuario (OAuth)
                        </button>
                        <button 
                            onClick={() => setSyncMode('service')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${syncMode === 'service' ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-main'}`}
                        >
                            Cuenta de Servicio (JSON)
                        </button>
                    </div>

                    {syncMode === 'oauth' ? (
                        <div className="flex-col gap-4 py-4 items-center text-center">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
                                <Globe size={32} />
                            </div>
                            <div className="flex-col gap-2">
                                <h4 className="text-sm font-bold text-main">Conectar mediante Google</h4>
                                <p className="text-xs text-muted max-w-xs mx-auto">Vinculará el calendario de la cuenta admin actual como el centro de notificaciones global.</p>
                            </div>
                            <Button 
                                variant="primary" 
                                className="w-full flex-row gap-2 h-11"
                                onClick={handleLinkSystemCalendar}
                                isLoading={isSyncing}
                            >
                                <ExternalLink size={18} />
                                Autenticar con Google
                            </Button>
                            <span className="text-[10px] text-muted font-medium flex-row gap-1 items-center">
                                <Shield size={10} /> Conexión segura via OAuth2.0
                            </span>
                        </div>
                    ) : (
                        <div className="flex-col gap-4">
                            <div className="flex-col gap-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest">JSON de Credenciales</label>
                                <textarea 
                                    className="textarea min-h-[150px] text-[11px] font-mono leading-relaxed"
                                    placeholder='{ "type": "service_account", ... }'
                                    value={serviceAccountJson}
                                    onChange={(e) => setServiceAccountJson(e.target.value)}
                                />
                                <p className="caption text-muted flex-row gap-1 items-center">
                                    <AlertCircle size={10} /> Pega el contenido del archivo .json descargado de Google Cloud Console.
                                </p>
                            </div>
                            <Button 
                                variant="primary" 
                                className="w-full h-11"
                                onClick={handleSaveServiceAccount}
                                isLoading={isConfiguring}
                                disabled={!serviceAccountJson}
                            >
                                <Settings size={18} className="mr-2" />
                                Guardar Configuración API
                            </Button>
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex-row gap-3">
                        <div className="text-amber-500 shrink-0">
                            <AlertCircle size={20} />
                        </div>
                        <div className="flex-col gap-1">
                            <h5 className="text-xs font-black text-amber-800 uppercase">Aviso Importante</h5>
                            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                Esta configuración afecta a <strong>todos</strong> los miembros del equipo. Se recomienda usar una cuenta de Google corporativa dedicada.
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
