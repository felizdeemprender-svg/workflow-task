"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    Building2,
    Zap,
    Plus,
    UserPlus,
    Loader2,
    Mail,
    Phone,
    User as UserIcon,
    StickyNote,
    ShieldCheck,
    Search
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { userActions } from "@/lib/firebase/userActions";

const CEO_EMAIL = "felizdeemprender@gmail.com";

export default function SuperAdminCEOPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const emptyConstraints = React.useMemo(() => [], []);

    const { data: companies, loading: companiesLoading } = useFirestoreQuery<any>('companies', emptyConstraints, !authLoading);
    const { data: allUsers } = useFirestoreQuery<any>('users', emptyConstraints, !authLoading);

    const [searchTerm, setSearchTerm] = React.useState('');
    const [isCompanyModalOpen, setIsCompanyModalOpen] = React.useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    const [editingCompanyId, setEditingCompanyId] = React.useState<string | null>(null);
    const [editingAdminId, setEditingAdminId] = React.useState<string | null>(null);

    const [newCompany, setNewCompany] = React.useState({ 
        name: '', 
        phone: '', 
        contactName: '', 
        notes: '', 
        main_area: 'General' 
    });
    const [newAdmin, setNewAdmin] = React.useState({ 
        email: '', 
        password: '', 
        name: '', 
        phone: '', 
        company_id: '', 
        area: 'Administración' 
    });

    React.useEffect(() => {
        if (!authLoading) {
            if (!user || user.email !== CEO_EMAIL) {
                console.warn("Access denied provided to /ceo. Redirecting...");
                router.push('/dashboard');
            }
        }
    }, [user, authLoading, router]);

    const handleSaveCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingCompanyId) {
                await userActions.updateCompany(editingCompanyId, newCompany);
                alert("Empresa actualizada con éxito.");
            } else {
                await userActions.createCompany(newCompany);
                alert("Empresa creada con éxito.");
            }
            setIsCompanyModalOpen(false);
            setEditingCompanyId(null);
            setNewCompany({ name: '', phone: '', contactName: '', notes: '', main_area: 'General' });
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingAdminId) {
                await userActions.updateUser({
                    targetUid: editingAdminId,
                    name: newAdmin.name,
                    phone: newAdmin.phone,
                    area: newAdmin.area,
                    ...(newAdmin.password ? { password: newAdmin.password } : {})
                });
                alert("Administrador actualizado con éxito.");
            } else {
                await userActions.createUser({
                    ...newAdmin,
                    role: 'Admin'
                });
                alert("Administrador corporativo asignado con éxito.");
            }
            setIsAdminModalOpen(false);
            setEditingAdminId(null);
            setNewAdmin({ email: '', password: '', name: '', phone: '', company_id: '', area: 'Administración' });
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const openEditCompany = (company: any) => {
        setEditingCompanyId(company.id);
        setNewCompany({
            name: company.name || '',
            phone: company.phone || '',
            contactName: company.contactName || '',
            notes: company.notes || '',
            main_area: company.main_area || 'General'
        });
        setIsCompanyModalOpen(true);
    };

    const openEditAdmin = (admin: any) => {
        setEditingAdminId(admin.id);
        setNewAdmin({
            email: admin.email,
            password: '',
            name: admin.name || '',
            phone: admin.phone || '',
            company_id: admin.company_id || '',
            area: admin.area || 'Administración'
        });
        setIsAdminModalOpen(true);
    };

    const filteredCompanies = companies.filter((c: any) => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || companiesLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
                 <div className="flex-col items-center gap-4">
                    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                    <p className="text-muted font-bold">Verificando Credenciales de Super-Admin...</p>
                 </div>
            </div>
        );
    }

    if (user?.email !== CEO_EMAIL) return null;

    return (
        <div className="flex-col gap-8 fade-in" style={{ padding: 'var(--main-p)', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="flex-row justify-between items-end stack-mobile">
                <div>
                    <div className="flex-row gap-2 items-center" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        <ShieldCheck size={28} />
                        <span className="font-bold" style={{ letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.75rem' }}>Super Admin Access</span>
                    </div>
                    <h1>Panel Central Workflow</h1>
                    <p className="text-muted">Gestión maestra de corporaciones y accesos de nivel 1.</p>
                </div>
                <div className="flex-row gap-4">
                    <Button variant="outline" onClick={() => {
                        setEditingAdminId(null);
                        setNewAdmin({ email: '', password: '', name: '', phone: '', company_id: '', area: 'Administración' });
                        setIsAdminModalOpen(true);
                    }}>
                        <UserPlus size={18} style={{ marginRight: '8px' }} /> Vincular Administrador
                    </Button>
                    <Button variant="primary" onClick={() => {
                        setEditingCompanyId(null);
                        setNewCompany({ name: '', phone: '', contactName: '', notes: '', main_area: 'General' });
                        setIsCompanyModalOpen(true);
                    }}>
                        <Plus size={18} style={{ marginRight: '8px' }} /> Registrar Empresa
                    </Button>
                </div>
            </div>

            <div className="grid-3">
                <Card style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div className="flex-row gap-3 items-center">
                        <Building2 color="var(--primary)" size={24} />
                        <span className="font-bold">Empresas en Red</span>
                    </div>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {companies.length}
                    </p>
                </Card>
                <Card style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="flex-row gap-3 items-center">
                        <Zap color="#f59e0b" size={24} />
                        <span className="font-bold">Tráfico de Usuarios</span>
                    </div>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>{allUsers.length}</p>
                </Card>
                <Card style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="flex-row gap-3 items-center">
                        <ShieldCheck color="#10b981" size={24} />
                        <span className="font-bold">Estado del Sistema</span>
                    </div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '1.25rem', color: '#10b981' }}>OPERATIVO</p>
                </Card>
            </div>

            <div className="flex-row items-center gap-3 glass" style={{ padding: '0.75rem 1.25rem', borderRadius: '12px' }}>
                <Search size={20} className="text-muted" />
                <input 
                    type="text" 
                    placeholder="Buscar por nombre, contacto o ID de empresa..." 
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', fontSize: '0.95rem' }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <Card title={`Directorio Corporativo (${filteredCompanies.length})`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
                    {filteredCompanies.map((c: any) => {
                        const companyAdmin = allUsers.find((u: any) => u.company_id === c.id && (u.role === 'Admin' || u.role === 'CEO'));
                        
                        return (
                            <div key={c.id} className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', minWidth: 0 }}>
                                <div className="flex-row justify-between items-start" style={{ marginBottom: '1rem' }}>
                                    <div>
                                        <div className="flex-row gap-2 items-center" style={{ minWidth: 0 }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</h3>
                                            <button 
                                                onClick={() => openEditCompany(c)}
                                                style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                            >
                                                <StickyNote size={14} />
                                            </button>
                                        </div>
                                        <p className="text-small text-muted">ID: {c.id}</p>
                                    </div>
                                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {c.main_area || 'General'}
                                    </div>
                                </div>
                                
                                <div className="flex-col gap-2" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                                    <div className="flex-row justify-between items-center">
                                        <span className="text-small font-bold" style={{ color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>ADMINISTRADOR</span>
                                        {companyAdmin && (
                                            <button 
                                                onClick={() => openEditAdmin(companyAdmin)}
                                                style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                                            >
                                                EDITAR
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-row gap-3 items-center">
                                        <UserIcon size={14} className="text-muted" />
                                        <span className="text-small font-bold">{companyAdmin?.name || c.contactName || 'Sin contacto'}</span>
                                    </div>
                                    <div className="flex-row gap-3 items-center">
                                        <Mail size={14} className="text-muted" />
                                        <span className="text-small" style={{ wordBreak: 'break-all' }}>{companyAdmin?.email || 'Sin email'}</span>
                                    </div>
                                    <div className="flex-row gap-3 items-center">
                                        <Phone size={14} className="text-muted" />
                                        <span className="text-small">{companyAdmin?.phone || c.phone || 'Sin teléfono'}</span>
                                    </div>

                                    {c.notes && (
                                        <div className="flex-row gap-3 items-start" style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                                            <StickyNote size={14} className="text-muted" style={{ marginTop: '2px' }} />
                                            <p className="text-small italic" style={{ lineHeight: '1.4' }}>{c.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Modal Nueva/Editar Empresa */}
            <Modal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} title={editingCompanyId ? "Editar Corporación" : "Registrar Nueva Corporación"}>
                <form onSubmit={handleSaveCompany} className="flex-col gap-3">
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold text-muted">Nombre de la Empresa</label>
                        <input type="text" required className="premium-input" value={newCompany.name} onChange={e => setNewCompany({ ...newCompany, name: e.target.value })} placeholder="Ej. Acme Global" />
                    </div>
                    <div className="flex-row gap-3">
                        <div className="flex-col gap-1 flex-1">
                            <label className="text-small font-bold text-muted">Persona de Contacto</label>
                            <input type="text" className="premium-input" value={newCompany.contactName} onChange={e => setNewCompany({ ...newCompany, contactName: e.target.value })} placeholder="Nombre completo" />
                        </div>
                        <div className="flex-col gap-1 flex-1">
                            <label className="text-small font-bold text-muted">Teléfono</label>
                            <input type="text" className="premium-input" value={newCompany.phone} onChange={e => setNewCompany({ ...newCompany, phone: e.target.value })} placeholder="+12 345..." />
                        </div>
                    </div>
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold text-muted">Área Principal</label>
                        <input type="text" className="premium-input" value={newCompany.main_area} onChange={e => setNewCompany({ ...newCompany, main_area: e.target.value })} />
                    </div>
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold text-muted">Notas Internas</label>
                        <textarea className="premium-input" style={{ minHeight: '80px', resize: 'vertical' }} value={newCompany.notes} onChange={e => setNewCompany({ ...newCompany, notes: e.target.value })} placeholder="Detalles de facturación, acuerdos, etc." />
                    </div>
                    <div className="flex-row gap-4" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="outline" onClick={() => setIsCompanyModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" isLoading={loading}>{editingCompanyId ? "Guardar Cambios" : "Finalizar Registro"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Nuevo/Editar Admin */}
            <Modal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} title={editingAdminId ? "Editar Administrador" : "Vincular Administrador Maestro"}>
                <form onSubmit={handleSaveAdmin} className="flex-col gap-3">
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold text-muted">Nombre Completo</label>
                        <input type="text" required className="premium-input" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} placeholder="Nombre del Administrador" />
                    </div>
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold text-muted">Email Corporativo</label>
                         <div className="flex-row items-center gap-2 premium-input" style={{ opacity: editingAdminId ? 0.7 : 1 }}>
                            <Mail size={16} className="text-muted" />
                            <input 
                                type="email" 
                                required 
                                disabled={!!editingAdminId}
                                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }} 
                                value={newAdmin.email} 
                                onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} 
                                placeholder="admin@empresa.com" 
                            />
                         </div>
                    </div>
                    <div className="flex-row gap-3">
                        <div className="flex-col gap-1 flex-1">
                            <label className="text-small font-bold text-muted">Teléfono Directo</label>
                            <input type="text" className="premium-input" value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} placeholder="+123..." />
                        </div>
                        <div className="flex-col gap-1 flex-1">
                            <label className="text-small font-bold text-muted">{editingAdminId ? "Reset Password (Opcional)" : "Contraseña"}</label>
                            <input type="password" required={!editingAdminId} minLength={6} className="premium-input" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} placeholder={editingAdminId ? "Dejar vacío" : "6+ caracteres"} />
                        </div>
                    </div>
                    {!editingAdminId && (
                        <div className="flex-col gap-1">
                            <label className="text-small font-bold text-muted">Asignar a Empresa</label>
                            <select required className="premium-input" value={newAdmin.company_id} onChange={e => setNewAdmin({ ...newAdmin, company_id: e.target.value })}>
                                <option value="">Seleccionar empresa corporativa...</option>
                                {companies.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex-row gap-4" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="outline" onClick={() => setIsAdminModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" isLoading={loading}>{editingAdminId ? "Guardar Cambios" : "Completar Vinculación"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
