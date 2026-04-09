"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { onAuthStateChanged, User, getIdTokenResult } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

interface AuthUser extends User {
    company_id?: string;
    role?: "Admin" | "Empleado" | "CEO";
    area?: string;
    accessibleAreas?: string[];
    spiritPoints?: number;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    claims: any;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    claims: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [claims, setClaims] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Safe storage helper
    const safeStorage = {
        getItem: (key: string) => {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn("Storage access blocked:", e);
                return null;
            }
        },
        setItem: (key: string, value: string) => {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn("Storage access blocked:", e);
            }
        },
        removeItem: (key: string) => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn("Storage access blocked:", e);
            }
        }
    };


    useEffect(() => {
        let unsubscribeUserDoc: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    // 1. Get initial token result for claims
                    const tokenResult = await getIdTokenResult(firebaseUser, true);
                    setClaims(tokenResult.claims);

                    // 2. Real-time listener for user profile
                    unsubscribeUserDoc = onSnapshot(doc(db, "users", firebaseUser.uid), (userSnapshot) => {
                        const userData = userSnapshot.exists() ? userSnapshot.data() : {};
                        
                        setUser({
                            ...firebaseUser,
                            company_id: (tokenResult.claims.company_id || userData.company_id) as string,
                            role: (tokenResult.claims.role || userData.role) as ("Admin" | "Empleado" | "CEO"),
                            area: (tokenResult.claims.area || userData.area) as string,
                            accessibleAreas: userData.accessibleAreas || (userData.area ? [userData.area] : []),
                            spiritPoints: userData.spiritPoints || 0,
                        });
                        setLoading(false);
                    }, (error) => {
                        console.error("AuthContext - Error listening to user doc:", error);
                        setLoading(false);
                    });
                } else {
                    setUser(null);
                    setClaims(null);
                    setLoading(false);
                }
            } catch (err) {
                console.error("AuthContext - Auth state change error:", err);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) unsubscribeUserDoc();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, claims }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
