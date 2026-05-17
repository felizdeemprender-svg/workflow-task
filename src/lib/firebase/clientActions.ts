import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface ClientData {
    company_id: string;
    name: string;
    cuit?: string;
    phone?: string;
    address?: string;
    type?: string;
    contactName?: string;
    notes?: string;
    // Campos específicos para Agencias
    social_instagram?: string;
    social_tiktok?: string;
    social_youtube?: string;
    social_linkedin?: string;
    marketing_logo?: string;
    marketing_colors?: string;
    marketing_typography?: string;
}

export const clientActions = {
    /**
     * Creates a new client in Firestore.
     */
    createClient: async (data: ClientData) => {
        const clientRef = await addDoc(collection(db, 'clients'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return clientRef.id;
    },

    /**
     * Updates an existing client in Firestore.
     */
    updateClient: async (clientId: string, data: Partial<ClientData>) => {
        const clientRef = doc(db, 'clients', clientId);
        await updateDoc(clientRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Deletes a client from Firestore.
     */
    deleteClient: async (clientId: string) => {
        const clientRef = doc(db, 'clients', clientId);
        await deleteDoc(clientRef);
    }
};
