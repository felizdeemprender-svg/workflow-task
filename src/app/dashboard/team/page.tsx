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
                    <Button variant="primary" className="flex-row gap-2" onClick={() => setIsAddUserOpen(true)}>
                        <Plus size={18} />
                        Añadir Miembro
                    </Button>
                </div>
            </div>


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

        </div>
    );
}
