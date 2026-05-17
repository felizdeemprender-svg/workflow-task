"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { where } from "firebase/firestore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Briefcase, Plus, Loader2, Search, Edit2, Trash2, 
    Building, Phone, MapPin, Instagram, Youtube, Linkedin 
} from "lucide-react";
import { ClientModal } from "@/components/dashboard/ClientModal";
import { clientActions, ClientData } from "@/lib/firebase/clientActions";
import { toast } from "sonner";

export default function ClientsPage() {
    const { user, loading: authLoading } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);

    // Queries
    const companyConstraints = React.useMemo(() => user?.company_id ? [where('__name__', '==', user.company_id)] : [], [user?.company_id]);
    const { data: companies, loading: companyLoading } = useFirestoreQuery<any>('companies', companyConstraints, !authLoading && !!user?.company_id);
    
    const clientConstraints = React.useMemo(() => user?.company_id ? [where('company_id', '==', user.company_id)] : [], [user?.company_id]);
    const { data: clients, loading: clientsLoading } = useFirestoreQuery<ClientData & {id: string}>('clients', clientConstraints, !authLoading && !!user?.company_id);

    if (authLoading || companyLoading || clientsLoading) {
        return (
            <div className="flex-row items-center justify-center" style={{ height: '50vh' }}>
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!user || !user.company_id) return null;

    const currentCompany = companies[0];
    const isAgency = currentCompany?.isAgency === true;

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreate = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (client: any) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleDelete = async (clientId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return;
        try {
            await clientActions.deleteClient(clientId);
            toast.success("Cliente eliminado correctamente.");
        } catch (error) {
            console.error("Error deleting client:", error);
            toast.error("Error al eliminar el cliente.");
        }
    };

    return (
        <div className="flex-col gap-8 fade-in" style={{ padding: 'var(--main-p)' }}>
            <div className="flex-row justify-between items-end stack-mobile">
                <div>
                    <div className="flex-row gap-2 items-center" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        <Briefcase size={28} />
                        <span className="font-bold" style={{ letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                            {isAgency ? 'Agencia MKT / ' : ''}Directorio de Clientes
                        </span>
                    </div>
                    <h1>Mis Clientes</h1>
                    <p className="text-muted">Gestiona el portfolio de clientes de tu empresa.</p>
                </div>
                <div className="flex-row gap-3">
                    <Button variant="primary" onClick={handleOpenCreate}>
                        <Plus size={18} style={{ marginRight: '8px' }} /> Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* Búsqueda */}
            <div className="flex-row items-center gap-3 glass" style={{ padding: '0.75rem 1.25rem', borderRadius: '12px' }}>
                <Search size={20} className="text-muted" />
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o contacto..." 
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', fontSize: '0.95rem' }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Listado de Clientes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {filteredClients.map((client) => (
                    <Card key={client.id} style={{ position: 'relative', overflow: 'hidden' }}>
                        {isAgency && client.marketing_logo && (
                            <div style={{ 
                                position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', 
                                backgroundImage: `url(${client.marketing_logo})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                                opacity: 0.2, borderBottomLeftRadius: '20px'
                            }} />
                        )}
                        
                        <div className="flex-row justify-between items-start" style={{ marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{client.name}</h3>
                                <p className="text-small text-muted">{client.type || 'Regular'}</p>
                            </div>
                            <div className="flex-row gap-2">
                                <button onClick={() => handleOpenEdit(client)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="Editar">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(client.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} title="Eliminar">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-col gap-2" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                            <div className="flex-row gap-3 items-center">
                                <Building size={14} className="text-muted" />
                                <span className="text-small font-bold">{client.contactName || 'Sin contacto'}</span>
                            </div>
                            <div className="flex-row gap-3 items-center">
                                <Phone size={14} className="text-muted" />
                                <span className="text-small">{client.phone || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex-row gap-3 items-center">
                                <MapPin size={14} className="text-muted" />
                                <span className="text-small">{client.address || 'Sin dirección'}</span>
                            </div>
                        </div>

                        {/* Agencia: Redes Sociales rápidas */}
                        {isAgency && (client.social_instagram || client.social_tiktok || client.social_youtube || client.social_linkedin) && (
                            <div className="flex-row gap-2" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(236, 72, 153, 0.3)' }}>
                                {client.social_instagram && <Instagram size={14} color="#ec4899" title="Instagram configurado" />}
                                {client.social_tiktok && <span style={{ fontSize: '12px', fontWeight: 800, color: '#ec4899' }} title="TikTok configurado">T</span>}
                                {client.social_youtube && <Youtube size={14} color="#ec4899" title="YouTube configurado" />}
                                {client.social_linkedin && <Linkedin size={14} color="#ec4899" title="LinkedIn configurado" />}
                            </div>
                        )}
                    </Card>
                ))}

                {filteredClients.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)' }}>
                        <Briefcase size={48} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No hay clientes registrados</h3>
                        <p className="text-muted">Añade tu primer cliente haciendo clic en el botón "Nuevo Cliente".</p>
                    </div>
                )}
            </div>

            <ClientModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                client={editingClient}
                companyId={user.company_id}
                isAgency={isAgency}
            />
        </div>
    );
}
