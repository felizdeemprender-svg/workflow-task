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

    useEffect(() => {
        let unsubscribeUserDoc: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // 1. Get initial token result for claims
                const tokenResult = await getIdTokenResult(firebaseUser, true);
                setClaims(tokenResult.claims);

                // 2. Real-time listener for user profile (points, areas, etc.)
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
                    console.error("Error listening to user doc:", error);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setClaims(null);
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
