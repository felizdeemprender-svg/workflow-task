import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

const getDb = () => admin.firestore();
const getAuth = () => admin.auth();

/**
 * Webhook to sync companies from the master database.
 * This is a simplified version of the listener requested.
 */
export const syncCompany = functions.https.onRequest(async (req, res) => {
    const secret = req.headers["x-workflow-secret"];
    if (secret !== process.env.SYNC_SECRET) {
        res.status(401).send("Unauthorized");
        return;
    }

    const { id, data } = req.body;

    try {
        await getDb().collection("companies").doc(id).set({
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        res.status(200).send("Sync successful");
    } catch (error) {
        console.error("Sync error:", error);
        res.status(500).send("Sync failed");
    }
});

/**
 * Trigger to update custom claims when a user's company or role changes.
 */
export const onUserUpdate = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
        const data = change.after.data();
        if (!data) return;

        const { company_id, role, area } = data;
        const userId = context.params.userId;

        try {
            await getAuth().setCustomUserClaims(userId, {
                company_id,
                role,
                area,
            });
            console.log(`Claims updated for user ${userId}`);
        } catch (error) {
            console.error("Update claims error:", error);
        }
    });

/**
 * AI Bot response function for DeepSeek integration.
 */
export const botResponse = functions.runWith({ secrets: ["DEEPSEEK_API_KEY"] }).firestore
    .document("tasks/{taskId}/chat/{messageId}")
    .onCreate(async (snapshot, context) => {
        const message = snapshot.data();
        if (!message || !message.text.includes("@bot")) return;

        const { taskId } = context.params;
        const taskRef = getDb().collection("tasks").doc(taskId);

        try {
            // 1. Get Task Context
            const taskDoc = await taskRef.get();
            const taskData = taskDoc.data();
            if (!taskData) return;

            // 2. Validate Company Quota
            const companyId = taskData.company_id;
            const companyDoc = await getDb().collection("companies").doc(companyId).get();
            const companyData = companyDoc.data();

            if (!companyData || !companyData.has_workflow_access || companyData.ai_quota <= 0) {
                await taskRef.collection("chat").add({
                    text: "Lo siento, la empresa no tiene cuota de IA disponible o acceso al sistema.",
                    sender: "System",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return;
            }

            // 3. Call DeepSeek (Real Integration)
            const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
            let botReply = "Lo siento, hubo un error conectando con mi cerebro de IA.";
            let shouldUpdateStatus = "";

            if (DEEPSEEK_API_KEY) {
                const response = await axios.post("https://api.deepseek.com/v1/chat/completions", {
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content: `Eres un asistente experto en gestión de tareas para el sistema Workflow. 
                            Analiza el contexto de la tarea: "${taskData.title}" - "${taskData.description}".
                            Estado actual: ${taskData.status}. Prioridad: ${taskData.priority}.
                            Si el usuario te pide explícitamente cambiar el estado a 'Pendiente', 'En Proceso' o 'Finalizado', responde de forma amable y añade al final de tu respuesta exactamente la cadena: [ACTION:UPDATE_STATUS:NUEVO_ESTADO]`
                        },
                        { role: "user", content: message.text }
                    ]
                }, {
                    headers: { "Authorization": `Bearer ${DEEPSEEK_API_KEY}` }
                });

                botReply = response.data.choices[0].message.content;

                // 4. Parse Actions from IA Response
                const actionMatch = botReply.match(/\[ACTION:UPDATE_STATUS:(Pendiente|En Proceso|Finalizado)\]/);
                if (actionMatch) {
                    shouldUpdateStatus = actionMatch[1];
                    botReply = botReply.replace(/\[ACTION:.*\]/, "").trim();
                }
            } else {
                botReply = `[MOCK MODE] Hola! Soy el agente de Workflow. He analizado la tarea "${taskData.title}". Para usarme con DeepSeek, configura DEEPSEEK_API_KEY en las functions.`;
            }

            // 5. Execute IA Action if requested
            if (shouldUpdateStatus) {
                await taskRef.update({
                    status: shouldUpdateStatus,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                await taskRef.collection("log").add({
                    action: "AI_AUTOMATED_STATUS_CHANGE",
                    user: "DeepSeek Bot",
                    details: `Estado cambiado automáticamente a ${shouldUpdateStatus} tras petición del usuario.`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            // 6. Record Action in Log
            await taskRef.collection("log").add({
                action: "AI_INVOCATION",
                user: "DeepSeek Bot",
                details: "Respuesta generada automáticamente tras mención @bot",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 7. Post Reply
            await taskRef.collection("chat").add({
                text: botReply,
                sender: "Bot",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 8. Discount AI Quota
            await getDb().collection("companies").doc(companyId).update({
                ai_quota: admin.firestore.FieldValue.increment(-1)
            });

        } catch (error) {
            console.error("AI Bot Error:", error);
        }
    });

/**
 * Administrative user creation (Auth + Firestore).
 * Allows CEOs and Admins to create accounts without logging out.
 */
export const adminCreateUser = functions.https.onCall(async (data, context) => {
    // 1. Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado.");
    }

    // 2. Validate permissions (CEO or Admin)
    const callerUid = context.auth.uid;
    const callerDoc = await getDb().collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || (callerData.role !== "CEO" && callerData.role !== "Admin")) {
        throw new functions.https.HttpsError("permission-denied", "No tiene permisos para crear usuarios.");
    }

    const { email, password, company_id, role, area, accessibleAreas, name, phone } = data;

    // 3. Validation
    if (!email || !password || !company_id || !role) {
        throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios (email, password, company_id, role).");
    }

    // Admin constraint: can only manage their own company
    if (callerData.role === "Admin" && company_id !== callerData.company_id) {
        throw new functions.https.HttpsError("permission-denied", "Como Administrador solo puede crear usuarios para su propia empresa.");
    }

    try {
        // 4. Create User in Firebase Auth
        const userRecord = await getAuth().createUser({
            email,
            password,
            displayName: email.split("@")[0],
        });

        const newUserId = userRecord.uid;

        // 5. Set Custom Claims immediately
        await getAuth().setCustomUserClaims(newUserId, {
            company_id,
            role,
            area: area || "General",
        });

        // 6. Create Firestore Profile
        await getDb().collection("users").doc(newUserId).set({
            email,
            company_id,
            role,
            area: area || "General",
            accessibleAreas: Array.isArray(accessibleAreas) ? accessibleAreas : [area || "General"],
            name: name || "",
            phone: phone || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, uid: newUserId };
    } catch (error: any) {
        console.error("Error en adminCreateUser:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error al crear el usuario.");
    }
});

/**
 * Invite a user by email (Firestore only).
 * Allows CEOs and Admins to pre-register users for Google getAuth().
 */
export const adminInviteUser = functions.https.onCall(async (data, context) => {
    // 1. Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado.");
    }

    // 2. Validate permissions (CEO or Admin)
    const callerUid = context.auth.uid;
    const callerDoc = await getDb().collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || (callerData.role !== "CEO" && callerData.role !== "Admin")) {
        throw new functions.https.HttpsError("permission-denied", "No tiene permisos para invitar usuarios.");
    }

    const { email, company_id, role, area, accessibleAreas, name } = data;

    // 3. Validation
    if (!email || !company_id || !role) {
        throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios (email, company_id, role).");
    }

    // Admin constraint: can only manage their own company
    if (callerData.role === "Admin" && company_id !== callerData.company_id) {
        throw new functions.https.HttpsError("permission-denied", "Como Administrador solo puede invitar a usuarios para su propia empresa.");
    }

    try {
        const inviteId = `invite_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
        
        await getDb().collection("users").doc(inviteId).set({
            email,
            company_id,
            role,
            area: area || "General",
            accessibleAreas: Array.isArray(accessibleAreas) ? accessibleAreas : [area || "General"],
            name: name || "",
            status: "invited",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, inviteId };
    } catch (error: any) {
        console.error("Error en adminInviteUser:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error al invitar al usuario.");
    }
});

/**
 * Update an existing user's profile and claims (CEO/Admin only)
 */
export const adminUpdateUser = functions.https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado.");
    }

    const callerUid = context.auth.uid;
    const callerDoc = await getDb().collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || (callerData.role !== "CEO" && callerData.role !== "Admin")) {
        throw new functions.https.HttpsError("permission-denied", "No tiene permisos para editar usuarios.");
    }

    const { targetUid, role, area, accessibleAreas, password, name, phone } = data;

    if (!targetUid) {
        throw new functions.https.HttpsError("invalid-argument", "Falta el ID del usuario a editar (targetUid).");
    }

    try {
        const targetDoc = await getDb().collection("users").doc(targetUid).get();
        if (!targetDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Usuario no encontrado.");
        }

        const targetData = targetDoc.data()!;
        
        // Admin constraint: can only manage their own company
        if (callerData.role === "Admin" && targetData.company_id !== callerData.company_id) {
            throw new functions.https.HttpsError("permission-denied", "Solo puede editar usuarios de su propia empresa.");
        }

        // update password if provided
        if (password && password.length >= 6) {
            await getAuth().updateUser(targetUid, { password });
        }

        // 2. Update Auth Claims if role or area changed
        if (role || area) {
            await getAuth().setCustomUserClaims(targetUid, {
                company_id: targetData.company_id,
                role: role || targetData.role,
                area: area || targetData.area,
            });
        }

        // 3. Update Firestore Profile
        const updates: any = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (role) updates.role = role;
        if (area) updates.area = area;
        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (accessibleAreas) updates.accessibleAreas = accessibleAreas;

        await getDb().collection("users").doc(targetUid).update(updates);

        return { success: true };
    } catch (error: any) {
        console.error("Error in adminUpdateUser:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error al actualizar usuario.");
    }
});
/**
 * Get personalized daily briefing using DeepSeek
 */
export const getDailyBriefing = functions.runWith({ secrets: ["DEEPSEEK_API_KEY"] }).https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");
    
    const uid = context.auth.uid;
    const userDoc = await getDb().collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (!userData) throw new functions.https.HttpsError("not-found", "User not found");

    // Fetch pending tasks
    const tasksSnapshot = await getDb().collection("tasks")
        .where("company_id", "==", userData.company_id)
        .where("assignedEmail", "==", userData.email)
        .where("status", "!=", "Finalizado")
        .limit(10)
        .get();

    const tasks = tasksSnapshot.docs.map(d => ({ 
        title: d.data().title, 
        priority: d.data().priority || "Media",
        dueDate: d.data().dueDate 
    }));
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    if (!DEEPSEEK_API_KEY) {
        return { briefing: `¡Hola ${userData.name || 'compañero'}! Tienes ${tasks.length} tareas pendientes. ¡A por todas!` };
    }

    try {
        const response = await axios.post("https://api.deepseek.com/v1/chat/completions", {
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente de productividad ultra-eficiente. 
                    1. Resume las tareas del usuario.
                    2. Ordénalas por prioridad (Alta > Media > Baja).
                    3. Estima brevemente la dificultad de cada una (Baja, Media, Alta) basándote en el título.
                    4. Sé extremadamente breve y directo. Usa viñetas. Sin introducciones innecesarias.`
                },
                { role: "user", content: `Usuario: ${userData.name}. Tareas: ${JSON.stringify(tasks)}` }
            ]
        }, {
            headers: { "Authorization": `Bearer ${DEEPSEEK_API_KEY}` }
        });

        return { briefing: response.data.choices[0].message.content };
    } catch (error) {
        console.error("Briefing Error:", error);
        return { briefing: "Hubo un problema al generar tu resumen, pero confío en que hoy será un gran día." };
    }
});

/**
 * Process natural language command to create task
 */
export const processAICommand = functions.runWith({ secrets: ["DEEPSEEK_API_KEY"] }).https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");
    const { command } = data;
    if (!command) throw new functions.https.HttpsError("invalid-argument", "Command required");

    const uid = context.auth.uid;
    const userDoc = await getDb().collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (!userData) throw new functions.https.HttpsError("not-found", "User not found");

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) throw new functions.https.HttpsError("failed-precondition", "AI missing API key");

    try {
        // Fetch company areas
        const companyId = userData.company_id;
        const companyDoc = await getDb().collection("companies").doc(companyId).get();
        const companyData = companyDoc.data();
        const availableAreas = companyData?.areas || ["General", "Ventas", "Logística", "Soporte"];
        const areasStr = availableAreas.join("/");

        const response = await axios.post("https://api.deepseek.com/v1/chat/completions", {
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: `Extrae los datos de esta petición para crear una tarea en JSON. 
                    Campos: title, description, priority (Alta/Media/Baja), dueDate (YYYY-MM-DD), area (${areasStr}).
                    Hoy es ${new Date().toISOString().split('T')[0]}.
                    Respuesta: SOLO el JSON puro.`
                },
                { role: "user", content: command }
            ]
        }, {
            headers: { "Authorization": `Bearer ${DEEPSEEK_API_KEY}` }
        });

        const taskData = JSON.parse(response.data.choices[0].message.content);
        
        const taskRef = await getDb().collection("tasks").add({
            ...taskData,
            company_id: userData.company_id,
            assignedEmail: userData.email,
            status: "Pendiente",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: userData.email
        });

        await getDb().collection(`tasks/${taskRef.id}/log`).add({
            action: "AI_COMMAND_CREATION",
            user: "AI Assistant",
            details: `Tarea creada automáticamente vía comando: "${command}"`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, taskId: taskRef.id, taskData };
    } catch (error) {
        console.error("AI Command Error:", error);
        throw new functions.https.HttpsError("internal", "Error processing command");
    }
});

/**
 * Gamification: Award points when a task status changes to 'Finalizado'
 * Dynamic scoring based on AI analyzed difficulty.
 */
export const onTaskStatusFinalized = functions.runWith({ secrets: ["DEEPSEEK_API_KEY"] }).firestore
    .document("tasks/{taskId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const taskId = context.params.taskId;

        console.log(`[onTaskStatusFinalized] Started for task ${taskId}. Status: ${before.status} -> ${after.status}`);

        const wasCompletedNow = 
            (before.status !== "Finalizado" && after.status === "Finalizado") || 
            (after.lastCompletedAt && (!before.lastCompletedAt || (after.lastCompletedAt.toMillis() > before.lastCompletedAt.toMillis())));

        if (wasCompletedNow) {
            const email = (after.assignedEmail || "").toLowerCase();
            console.log(`[onTaskStatusFinalized] Condition met. assignedEmail (normalized): ${email}`);
            
            if (!email) {
                console.log(`[onTaskStatusFinalized] No email assigned. Skipping.`);
                return;
            }

            const userSnapshot = await getDb().collection("users").where("email", "==", email).get();
            // Try again with original casing if fails (just in case)
            let userDoc = userSnapshot.empty ? null : userSnapshot.docs[0];
            
            if (!userDoc && after.assignedEmail) {
                const userSnapshotOriginal = await getDb().collection("users").where("email", "==", after.assignedEmail).get();
                if (!userSnapshotOriginal.empty) userDoc = userSnapshotOriginal.docs[0];
            }

            if (!userDoc) {
                console.log(`[onTaskStatusFinalized] User not found for email: ${email}`);
                return;
            }

            const userRef = userDoc.ref;
            console.log(`[onTaskStatusFinalized] User found: ${userRef.id}`);
            const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

            let points = 100; // Default
            let difficulty = "Media";

            if (DEEPSEEK_API_KEY) {
                try {
                    const response = await axios.post("https://api.deepseek.com/v1/chat/completions", {
                        model: "deepseek-chat",
                        messages: [
                            {
                                role: "system",
                                content: "Analiza la tarea del usuario y clasifica su dificultad técnica y de esfuerzo en una de estas categorías: 'Baja', 'Media', 'Alta'. Responde únicamente con la palabra de la categoría."
                            },
                            { role: "user", content: `Tarea: ${after.title}. Descripción: ${after.description || 'Sin descripción'}.` }
                        ]
                    }, {
                        headers: { "Authorization": `Bearer ${DEEPSEEK_API_KEY}` }
                    });

                    const aiDiff = response.data.choices[0].message.content.trim();
                    if (aiDiff.includes("Alta")) {
                        points = 250;
                        difficulty = "Alta";
                    } else if (aiDiff.includes("Baja")) {
                        points = 50;
                        difficulty = "Baja";
                    } else {
                        points = 100;
                        difficulty = "Media";
                    }
                } catch (error) {
                    console.error("Difficulty analysis error:", error);
                }
            }

            console.log(`[onTaskStatusFinalized] Final points to award: ${points} (Difficulty: ${difficulty})`);

            await userRef.update({
                spiritPoints: admin.firestore.FieldValue.increment(points),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Log to user's global spirit history
            await userRef.collection("spirit_history").add({
                points,
                difficulty,
                taskTitle: after.title,
                taskId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[onTaskStatusFinalized] User points and history updated successfully.`);

            // Log the achievement in the task itself
            await getDb().collection("tasks").doc(taskId).collection("log").add({
                action: "SPIRIT_POINTS_AWARDED",
                user: "System",
                details: `Premiado con ${points} puntos Spirit (Dificultad IA: ${difficulty}).`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[onTaskStatusFinalized] Achievement logged in task ${taskId}.`);
        }
    });

/**
 * General chat with DeepSeek for the Floating Bot
 */
export const generalChat = functions.runWith({ secrets: ["DEEPSEEK_API_KEY"] }).https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");
    
    const { query, history } = data;
    if (!query) throw new functions.https.HttpsError("invalid-argument", "Query required");

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
        return { response: "El sistema de IA no está configurado (falta API Key)." };
    }

    try {
        const messages = [
            {
                role: "system",
                content: "Eres el asistente inteligente de Workflow. Ayudas a los usuarios a gestionar sus tareas, entender el sistema y ser más productivos. Responde de forma concisa y profesional."
            },
            ...(history || []).map((h: any) => ({ role: h.role === 'bot' ? 'assistant' : 'user', content: h.text })),
            { role: "user", content: query }
        ];

        const response = await axios.post("https://api.deepseek.com/v1/chat/completions", {
            model: "deepseek-chat",
            messages
        }, {
            headers: { "Authorization": `Bearer ${DEEPSEEK_API_KEY}` }
        });

        return { response: response.data.choices[0].message.content };
    } catch (error) {
        console.error("General Chat Error:", error);
        throw new functions.https.HttpsError("internal", "Error al conectar con la IA.");
    }
});

// Global Exports
export * from "./calendarSync";
