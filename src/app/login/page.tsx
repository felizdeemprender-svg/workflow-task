"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    GoogleAuthProvider, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithRedirect, 
    signInWithPopup,
    getRedirectResult,
    signOut,
    UserCredential
} from "firebase/auth";
import { auth, db, googleProvider } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const { user } = useAuth();

    const processAuthResult = useCallback(async (resultOrUser: UserCredential | { user: any }) => {
        const firebaseUser = resultOrUser.user;
        if (!firebaseUser) return;
        
        // 1. Check if user is pre-authorized
        console.log("Checking authorization for email:", firebaseUser.email);
        const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log("No user found for email:", firebaseUser.email);
            await signOut(auth);
            setError(`Acceso denegado: El correo ${firebaseUser.email} no está en la lista de invitados autorizados.`);
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        console.log("User authorized, ID:", userDoc.id);

        // 2. Auto-link or update user data including token
        const updates: any = {
            ...userData,
            status: 'active',
            uid: firebaseUser.uid,
            updatedAt: serverTimestamp()
        };


        await setDoc(doc(db, "users", firebaseUser.uid), updates);

        if (userDoc.id.startsWith('invite_')) {
            console.log("Deleting linked invitation doc:", userDoc.id);
            await deleteDoc(doc(db, "users", userDoc.id));
        }
        router.push("/dashboard");
    }, [router, setGoogleAccessToken]);

    useEffect(() => {
        const checkAuthStatus = async () => {
            console.log("Checking auth status...");
            try {
                // 1. Check for redirect result with timeout
                const redirectPromise = getRedirectResult(auth);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Timeout")), 5000)
                );

                try {
                    const result = await Promise.race([redirectPromise, timeoutPromise]) as UserCredential | null;
                    if (result) {
                        console.log("Redirect result found! User:", result.user?.email);
                        setLoading(true);
                        await processAuthResult(result);
                        return;
                    }
                } catch (timeoutErr) {
                    console.warn("getRedirectResult timed out or failed due to storage block. Falling back to normal check.");
                }

                // 2. Fallback to current user if already logged in but not redirected
                if (auth.currentUser) {
                    console.log("User already logged in. Checking authorization for:", auth.currentUser.email);
                    setLoading(true);
                    await processAuthResult({ user: auth.currentUser as any });
                }
            } catch (err: any) {
                // If it's a permission error during initial check, it often means the user isn't logged in yet
                if (err.code === 'permission-denied' || err.message?.includes('permission')) {
                    console.log("Initial auth check: No session yet.");
                    return;
                }
                
                console.warn("Auth Status Check Info:", err.message);
                // Don't block the UI if it's just a storage error
                if (err.code === 'auth/storage-error' || err.message?.includes('storage')) {
                    setError("El navegador está bloqueando el almacenamiento. Activa las ventanas emergentes o cookies de terceros.");
                } else {
                    setError(`Nota: ${err.message}`);
                }
            } finally {
                setLoading(false);
            }
        };
        checkAuthStatus();
    }, [processAuthResult]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isRegister) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.push("/dashboard");
        } catch (err: any) {
             setError(err.message || "Error en la autenticación");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError("");
        try {
            // Using Popup primary for better compatibility with Tracking Prevention
            const result = await signInWithPopup(auth, googleProvider);
            if (result) {
                await processAuthResult(result);
            }
        } catch (err: any) {
            console.error("signInWithPopup error:", err);
            if (err.code === 'auth/popup-blocked') {
                setError("La ventana emergente fue bloqueada. Por favor, permite las ventanas emergentes o usa el método de redirección arriba.");
            } else if (err.code === 'auth/storage-error' || err.message?.includes('storage')) {
                // If popup storage fails, try redirect as last resort
                try {
                    await signInWithRedirect(auth, googleProvider);
                } catch (reErr: any) {
                    setError(`Error de autenticación: ${reErr.message}`);
                }
            } else {
                setError(`Error de Google [${err.code || 'unknown'}]: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-main)'
        }}>
            <Card style={{ width: '400px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: 'var(--primary)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.5rem'
                    }}>
                        W
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Workflow</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isRegister ? "Crea tu cuenta corporativa" : "Ingresa a tu panel de control"}
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        marginBottom: '1.5rem',
                        border: '1px solid #fecaca'
                    }}>
                        {error}
                    </div>
                )}

                {loading && !error && (
                    <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--primary)', fontSize: '0.875rem' }}>
                        Procesando inicio de sesión...
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>CORREO ELECTRÓNICO</label>
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nombre@empresa.com"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>CONTRASEÑA</label>
                        <input
                            required
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}
                        />
                    </div>
                    <Button type="submit" isLoading={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                        {isRegister ? "Registrarse" : "Entrar al Sistema"}
                    </Button>
                </form>



                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nuevo? Crea una cuenta"}
                    </button>
                </div>
            </Card>
        </div>
    );
}
