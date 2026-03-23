"use client";

import React, { useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";

export default function SetupPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const seedData = async () => {
        setLoading(true);
        console.log("Starting Seeding Process...");
        try {
            const companyId = "demo-company-123";

            // 1. Update Current User FIRST
            if (user?.uid) {
                console.log("Step 1/4: Updating user profile for UID:", user.uid);
                await setDoc(doc(db, "users", user.uid), {
                    company_id: companyId,
                    role: "Admin",
                    area: "General"
                });
                console.log("Step 1/4 Success: User profile updated.");
            } else {
                console.warn("User UID missing. Skipping step 1.");
            }

            // 2. Create Company Replica
            console.log("Step 2/4: Creating company replica...");
            await setDoc(doc(db, "companies", companyId), {
                name: "Empresa Demo",
                max_employees: 50,
                max_storage: "10GB",
                ai_quota: 100,
                has_workflow_access: true,
                updatedAt: serverTimestamp()
            });
            console.log("Step 2/4 Success: Company created.");

            // 3. Create sample tasks
            console.log("Step 3/4: Creating sample tasks and logs...");
            const tasks = [
                { title: "Planificar Q2", description: "Reunión de equipo para objetivos del segundo trimestre.", area: "General", priority: "Alta", status: "Pendiente" },
                { title: "Actualizar diseño", description: "Mejorar la coherencia visual del dashboard.", area: "Diseño", priority: "Media", status: "En Proceso" }
            ];

            for (const t of tasks) {
                const taskRef = await addDoc(collection(db, "tasks"), {
                    ...t,
                    company_id: companyId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                console.log(`Task created: ${t.title}`);

                await addDoc(collection(db, `tasks/${taskRef.id}/log`), {
                    action: "CREACION",
                    user: "Sistema",
                    details: "Tarea de ejemplo creada automáticamente",
                    createdAt: serverTimestamp()
                });
                console.log(`Log created for task: ${t.title}`);
            }
            console.log("Step 3/4 Success: Tasks and logs created.");

            // 4. Create Sample Poll
            console.log("Step 4/4: Creating sample poll...");
            await addDoc(collection(db, "polls"), {
                question: "¿Cuál debería ser el próximo beneficio?",
                company_id: companyId,
                options: [
                    { text: "Gimnasio", votes: 12 },
                    { text: "Café premium", votes: 5 },
                    { text: "Día libre", votes: 20 }
                ],
                voters: [],
                createdAt: serverTimestamp()
            });
            console.log("Step 4/4 Success: Poll created.");

            setDone(true);
            console.log("Seeding process completed successfully!");
        } catch (error) {
            console.error("Seed error details:", error);
            alert("Error: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const makeMeCEO = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            await setDoc(doc(db, "users", user.uid), {
                role: "CEO",
                email: user.email,
                company_id: "global-ceo"
            }, { merge: true });
            alert("¡Ahora eres CEO! Refresca la página para ver el panel.");
            setDone(true);
        } catch (error) {
            alert("Error: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <Card title="Configuración de Datos de Prueba">
                <p style={{ marginBottom: '1rem' }}>
                    Este asistente creará una empresa de prueba, tareas y encuestas para que puedas ver el sistema funcionando.
                </p>

                {!user && (
                    <p style={{ color: 'red', marginBottom: '1rem' }}>
                        Debes iniciar sesión primero para asignar los datos a tu usuario.
                    </p>
                )}

                {done ? (
                    <div className="flex-col gap-4">
                        <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '8px' }}>
                            ¡Acción completada con éxito! Ya puedes ir al Dashboard.
                        </div>
                        <Button onClick={() => window.location.href = '/dashboard/ceo'}>
                            Ir al Panel CEO
                        </Button>
                    </div>
                ) : (
                    <div className="flex-row gap-4">
                        <Button onClick={seedData} isLoading={loading} disabled={!user}>
                            Generar Datos Demo (Admin)
                        </Button>
                        <Button variant="outline" onClick={makeMeCEO} isLoading={loading} disabled={!user}>
                            Hacerse CEO Global
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
