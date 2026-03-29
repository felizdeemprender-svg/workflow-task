import {
    collection,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/lib/firebase/config';

const functions = getFunctions(app);

export const userActions = {
    /**
     * Creates a new company document in Firestore.
     */
    createCompany: async (companyData: {
        name: string;
        phone?: string;
        contactName?: string;
        notes?: string;
        max_employees?: number;
        max_storage?: string;
        ai_quota?: number;
        main_area?: string;
    }) => {
        const companyRef = await addDoc(collection(db, 'companies'), {
            ...companyData,
            has_workflow_access: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return companyRef.id;
    },

    updateCompany: async (companyId: string, companyData: Partial<{
        name: string;
        phone: string;
        contactName: string;
        notes: string;
        main_area: string;
        ai_quota: number;
    }>) => {
        const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');
        const companyRef = doc(db, 'companies', companyId);
        await updateDoc(companyRef, {
            ...companyData,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Administrative user creation (Auth + Firestore) via Cloud Function.
     * Use this for both Admins (by CEO) and Employees (by Admins).
     */
    createUser: async (userData: {
        email: string;
        password: string;
        company_id: string;
        role: 'Admin' | 'Empleado' | 'CEO';
        area: string;
        name?: string;
        phone?: string;
        accessibleAreas?: string[];
    }) => {
        const adminCreateUserFn = httpsCallable(functions, 'adminCreateUser');
        const result = await adminCreateUserFn(userData);
        return result.data;
    },

    updateUser: async (updateData: {
        targetUid: string;
        role?: 'Admin' | 'Empleado' | 'CEO';
        area?: string;
        name?: string;
        phone?: string;
        password?: string;
        accessibleAreas?: string[];
    }) => {
        const adminUpdateUserFn = httpsCallable(functions, 'adminUpdateUser');
        const result = await adminUpdateUserFn(updateData);
        return result.data;
    },

    /**
     * Invite a user by email (Firestore only).
     * This prepares the profile so the user can link it via Google later.
     */
    inviteUser: async (inviteData: {
        email: string;
        company_id: string;
        role: 'Admin' | 'Empleado' | 'CEO';
        area: string;
        accessibleAreas?: string[];
        name?: string;
    }) => {
        const inviteUserFn = httpsCallable(functions, 'adminInviteUser');
        const result = await inviteUserFn(inviteData);
        return result.data;
    },

    /**
     * Change current user password with re-authentication.
     */
    changePassword: async (currentPassword: string, newPassword: string) => {
        const { auth } = await import('@/lib/firebase/config');
        const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
        
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error("Usuario no autenticado.");

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        
        // 1. Re-authenticate
        await reauthenticateWithCredential(user, credential);
        
        // 2. Update password
        await updatePassword(user, newPassword);
    }
};
