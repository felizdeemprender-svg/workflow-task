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
    googleAccessToken: string | null;
    setGoogleAccessToken: (token: string | null) => void;
    clearGoogleAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    claims: null,
    googleAccessToken: null,
    setGoogleAccessToken: () => {},
    clearGoogleAccessToken: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [claims, setClaims] = useState<any>(null);
    const [googleAccessToken, setGoogleAccessTokenState] = useState<string | null>(null);
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

    const setGoogleAccessToken = (token: string | null) => {
        setGoogleAccessTokenState(token);
        if (token) {
            safeStorage.setItem('google_access_token', token);
        } else {
            safeStorage.removeItem('google_access_token');
        }
    };

    const clearGoogleAccessToken = async () => {
        setGoogleAccessTokenState(null);
        safeStorage.removeItem('google_access_token');
        if (user?.uid) {
            const { updateDoc, doc: fireDoc, serverTimestamp } = await import("firebase/firestore");
            await updateDoc(fireDoc(db, "users", user.uid), {
                googleAccessToken: null,
                updatedAt: serverTimestamp()
            });
        }
    };

    useEffect(() => {
        let unsubscribeUserDoc: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    // Try to load token from localStorage first, then Firestore
                    const savedToken = safeStorage.getItem('google_access_token');
                    if (savedToken) setGoogleAccessTokenState(savedToken);

                    // 1. Get initial token result for claims
                    const tokenResult = await getIdTokenResult(firebaseUser, true);
                    setClaims(tokenResult.claims);

                    // 2. Real-time listener for user profile
                    unsubscribeUserDoc = onSnapshot(doc(db, "users", firebaseUser.uid), (userSnapshot) => {
                        const userData = userSnapshot.exists() ? userSnapshot.data() : {};
                        
                        // Fallback for token from Firestore if not in memory
                        if (!googleAccessToken && userData.googleAccessToken) {
                            console.log("Found Google token in Firestore");
                            setGoogleAccessTokenState(userData.googleAccessToken);
                        }

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
        <AuthContext.Provider value={{ user, loading, claims, googleAccessToken, setGoogleAccessToken, clearGoogleAccessToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
