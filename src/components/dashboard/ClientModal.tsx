"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { clientActions, ClientData } from "@/lib/firebase/clientActions";
import { 
    User, Phone, MapPin, Building, StickyNote, 
    Instagram, Youtube, Linkedin, Palette, Image as ImageIcon, Type
} from "lucide-react";

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    client?: any; // null if creating
    companyId: string;
    isAgency: boolean;
}

const DEFAULT_CLIENT_DATA: Partial<ClientData> = {
    name: "",
    cuit: "",
    phone: "",
    address: "",
    type: "Regular",
    contactName: "",
    notes: "",
    social_instagram: "",
    social_tiktok: "",
    social_youtube: "",
    social_linkedin: "",
    marketing_logo: "",
    marketing_colors: "",
    marketing_typography: ""
};

export const ClientModal = ({ isOpen, onClose, client, companyId, isAgency }: ClientModalProps) => {
    const [formData, setFormData] = useState<Partial<ClientData>>(DEFAULT_CLIENT_DATA);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (client) {
            setFormData(client);
        } else {
            setFormData(DEFAULT_CLIENT_DATA);
        }
    }, [client, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) return;

        setLoading(true);
        try {
            if (client?.id) {
                await clientActions.updateClient(client.id, formData);
            } else {
                await clientActions.createClient({ ...formData, company_id: companyId } as ClientData);
            }
            onClose();
        } catch (error) {
            console.error("Error saving client:", error);
            alert("Error al guardar el cliente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={client ? "Editar Cliente" : "Nuevo Cliente"}
            maxWidth="600px"
        >
            <form onSubmit={handleSubmit} className="flex-col gap-4">
                
                {/* --- INFORMACIÓN BÁSICA --- */}
                <div className="flex-col gap-3">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Información Básica</h4>
                    
                    <div className="flex-col gap-1">
                        <label className="text-small font-bold text-muted">Nombre / Razón Social *</label>
                        <div className="flex-row items-center gap-2 premium-input">
                            <Building size={16} className="text-muted" />
                            <input 
                                type="text" 
                                required 
                                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                value={formData.name || ""} 
                                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                placeholder="Ej. Acme Corp" 
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="flex-col gap-1">
                            <label className="text-small font-bold text-muted">CUIT / RUT</label>
                            <input 
                                type="text" 
                                className="premium-input" 
                                value={formData.cuit || ""} 
                                onChange={e => setFormData({ ...formData, cuit: e.target.value })} 
                                placeholder="Identificación fiscal" 
                            />
                        </div>
                        <div className="flex-col gap-1">
                            <label className="text-small font-bold text-muted">Tipo de Cliente</label>
                            <select 
                                className="premium-input" 
                                value={formData.type || "Regular"} 
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="Regular">Regular</option>
                                <option value="VIP">VIP</option>
                                <option value="B2B">B2B (Empresa)</option>
                                <option value="B2C">B2C (Consumidor)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- CONTACTO --- */}
                <div className="flex-col gap-3" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Contacto y Ubicación</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="flex-col gap-1">
                            <label className="text-small font-bold text-muted">Contacto Principal</label>
                            <div className="flex-row items-center gap-2 premium-input">
                                <User size={16} className="text-muted" />
                                <input 
                                    type="text" 
                                    style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                    value={formData.contactName || ""} 
                                    onChange={e => setFormData({ ...formData, contactName: e.target.value })} 
                                    placeholder="Nombre completo" 
                                />
                            </div>
                        </div>
                        <div className="flex-col gap-1">
                            <label className="text-small font-bold text-muted">Teléfono</label>
                            <div className="flex-row items-center gap-2 premium-input">
                                <Phone size={16} className="text-muted" />
                                <input 
                                    type="text" 
                                    style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                    value={formData.phone || ""} 
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                                    placeholder="+123456789" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-col gap-1">
                        <label className="text-small font-bold text-muted">Dirección</label>
                        <div className="flex-row items-center gap-2 premium-input">
                            <MapPin size={16} className="text-muted" />
                            <input 
                                type="text" 
                                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                value={formData.address || ""} 
                                onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                placeholder="Calle, Ciudad, País" 
                            />
                        </div>
                    </div>
                </div>

                {/* --- SECCIÓN AGENCIA (CONDICIONAL) --- */}
                {isAgency && (
                    <div className="flex-col gap-3" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', backgroundColor: 'rgba(236, 72, 153, 0.02)', borderRadius: '8px', padding: '1rem' }}>
                        <div className="flex-row items-center gap-2">
                            <h4 style={{ fontSize: '0.85rem', color: '#ec4899', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Activos de Marketing</h4>
                            <span style={{ fontSize: '0.65rem', backgroundColor: '#ec4899', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>AGENCIA</span>
                        </div>
                        
                        {/* Redes Sociales */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="flex-col gap-1">
                                <label className="text-small font-bold text-muted">Instagram Token/URL</label>
                                <div className="flex-row items-center gap-2 premium-input" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                                    <Instagram size={16} color="#ec4899" />
                                    <input 
                                        type="text" 
                                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                        value={formData.social_instagram || ""} 
                                        onChange={e => setFormData({ ...formData, social_instagram: e.target.value })} 
                                    />
                                </div>
                            </div>
                            <div className="flex-col gap-1">
                                <label className="text-small font-bold text-muted">TikTok Token/URL</label>
                                <div className="flex-row items-center gap-2 premium-input" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                                    <span style={{ fontWeight: 800, color: '#ec4899', fontSize: '14px', lineHeight: '16px', display: 'inline-block' }}>T</span>
                                    <input 
                                        type="text" 
                                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                        value={formData.social_tiktok || ""} 
                                        onChange={e => setFormData({ ...formData, social_tiktok: e.target.value })} 
                                    />
                                </div>
                            </div>
                            <div className="flex-col gap-1">
                                <label className="text-small font-bold text-muted">YouTube Token/URL</label>
                                <div className="flex-row items-center gap-2 premium-input" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                                    <Youtube size={16} color="#ec4899" />
                                    <input 
                                        type="text" 
                                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                        value={formData.social_youtube || ""} 
                                        onChange={e => setFormData({ ...formData, social_youtube: e.target.value })} 
                                    />
                                </div>
                            </div>
                            <div className="flex-col gap-1">
                                <label className="text-small font-bold text-muted">LinkedIn Token/URL</label>
                                <div className="flex-row items-center gap-2 premium-input" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                                    <Linkedin size={16} color="#ec4899" />
                                    <input 
                                        type="text" 
                                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                        value={formData.social_linkedin || ""} 
                                        onChange={e => setFormData({ ...formData, social_linkedin: e.target.value })} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Branding */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.5rem' }}>
                            <div className="flex-col gap-1">
                                <label className="text-small font-bold text-muted">Logo (URL o Referencia Storage)</label>
                                <div className="flex-row items-center gap-2 premium-input" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                                    <ImageIcon size={16} color="#ec4899" />
                                    <input 
                                        type="text" 
                                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                        value={formData.marketing_logo || ""} 
                                        onChange={e => setFormData({ ...formData, marketing_logo: e.target.value })} 
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="flex-col gap-1">
                                    <label className="text-small font-bold text-muted">Paleta de Colores</label>
                                    <div className="flex-row items-center gap-2 premium-input" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                                        <Palette size={16} color="#ec4899" />
                                        <input 
                                            type="text" 
                                            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                            value={formData.marketing_colors || ""} 
                                            onChange={e => setFormData({ ...formData, marketing_colors: e.target.value })} 
                                            placeholder="Ej. #FF0000, #00FF00"
                                        />
                                    </div>
                                </div>
                                <div className="flex-col gap-1">
                                    <label className="text-small font-bold text-muted">Tipografías</label>
                                    <div className="flex-row items-center gap-2 premium-input" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                                        <Type size={16} color="#ec4899" />
                                        <input 
                                            type="text" 
                                            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                                            value={formData.marketing_typography || ""} 
                                            onChange={e => setFormData({ ...formData, marketing_typography: e.target.value })} 
                                            placeholder="Ej. Inter, Roboto"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- NOTAS --- */}
                <div className="flex-col gap-1" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                    <label className="text-small font-bold text-muted">Notas Adicionales</label>
                    <div className="flex-row items-start gap-2 premium-input">
                        <StickyNote size={16} className="text-muted" style={{ marginTop: '0.25rem' }} />
                        <textarea 
                            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', minHeight: '80px', resize: 'vertical' }}
                            value={formData.notes || ""} 
                            onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                            placeholder="Anotaciones internas del cliente..."
                        />
                    </div>
                </div>

                <div className="flex-row justify-end gap-3" style={{ marginTop: '1rem' }}>
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                        {client ? "Guardar Cambios" : "Crear Cliente"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
