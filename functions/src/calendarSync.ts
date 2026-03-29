import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";

/**
 * Helper to get the Google OAuth2 client with the system token.
 */
async function getAuthClient(companyId: string) {
    const db = admin.firestore();
    const configSnap = await db.collection("companies").doc(companyId).collection("config").doc("calendar").get();
    const configData = configSnap.data();

    if (!configData) {
        console.error(`Google Calendar Sync failed: No config found for company ${companyId}`);
        return null;
    }

    // Option 1: Service Account JSON (Recommended)
    if (configData.serviceAccountJson) {
        try {
            const credentials = JSON.parse(configData.serviceAccountJson);
            return new google.auth.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: ["https://www.googleapis.com/auth/calendar"]
            });
        } catch (e) {
            console.error("Error parsing serviceAccountJson:", e);
        }
    }

    // Option 2: OAuth2 Refresh Token
    if (configData.refreshToken || configData.accessToken) {
        const clientId = process.env.GOOGLE_CLIENT_ID || configData.clientId;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || configData.clientSecret;

        if (!clientId || !clientSecret) {
            console.warn("Google Calendar Sync: Missing clientId/clientSecret for OAuth2. Falling back to simple accessToken if available.");
            if (configData.accessToken) {
                const auth = new google.auth.OAuth2();
                auth.setCredentials({ access_token: configData.accessToken });
                return auth;
            }
            return null;
        }

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({
            refresh_token: configData.refreshToken,
            access_token: configData.accessToken
        });

        return oauth2Client;
    }

    return null;
}

/**
 * Trigger: onCreate Task
 */
export const onTaskCreatedSync = functions.firestore
    .document("tasks/{taskId}")
    .onCreate(async (snapshot, context) => {
        const taskData = snapshot.data();
        if (!taskData) return;

        const auth = await getAuthClient(taskData.company_id);
        if (!auth) return;

        const calendar = google.calendar({ version: "v3", auth });

        const event = {
            summary: `📌 Tarea: ${taskData.title}`,
            description: `${taskData.description || ""}\n\nVer tarea: https://workflow-project-studio.web.app/dashboard/tasks/${context.params.taskId}`,
            start: { date: taskData.dueDate || new Date().toISOString().split("T")[0] },
            end: { date: taskData.dueDate || new Date().toISOString().split("T")[0] },
            attendees: (taskData.assignedEmails || []).map((email: string) => ({ email })),
            reminders: {
                useDefault: false,
                overrides: [{ method: "popup", minutes: 30 }]
            }
        };

        try {
            const response = await calendar.events.insert({
                calendarId: "primary",
                requestBody: event,
                sendUpdates: "all"
            });

            const eventId = response.data.id;
            if (eventId) {
                await snapshot.ref.update({ googleEventId: eventId });
                console.log(`Sync Success: Created event ${eventId} for task ${context.params.taskId}`);
            }
        } catch (error) {
            console.error("Google Calendar Insert Error:", error);
        }
    });

/**
 * Trigger: onUpdate Task
 */
export const onTaskUpdatedSync = functions.firestore
    .document("tasks/{taskId}")
    .onUpdate(async (change, context) => {
        const after = change.after.data();
        const before = change.before.data();
        if (!after) return;

        // Only sync if relevant fields changed or if googleEventId was missing
        const relevantChange =
            after.title !== before.title ||
            after.description !== before.description ||
            after.dueDate !== before.dueDate ||
            JSON.stringify(after.assignedEmails) !== JSON.stringify(before.assignedEmails) ||
            (after.status === "Finalizado" && before.status !== "Finalizado");

        if (!relevantChange && after.googleEventId) return;

        const auth = await getAuthClient(after.company_id);
        if (!auth) return;

        const calendar = google.calendar({ version: "v3", auth });

        // If status changed to Finalizado, we might want to mark it differently in calendar?
        // For now, just update.

        const event = {
            summary: `${after.status === "Finalizado" ? "✅ " : "📌 "}Tarea: ${after.title}`,
            description: `${after.description || ""}\n\nVer tarea: https://workflow-project-studio.web.app/dashboard/tasks/${context.params.taskId}`,
            start: { date: after.dueDate || new Date().toISOString().split("T")[0] },
            end: { date: after.dueDate || new Date().toISOString().split("T")[0] },
            attendees: (after.assignedEmails || []).map((email: string) => ({ email })),
        };

        try {
            if (after.googleEventId) {
                await calendar.events.patch({
                    calendarId: "primary",
                    eventId: after.googleEventId,
                    requestBody: event,
                    sendUpdates: "all"
                });
                console.log(`Sync Success: Updated event ${after.googleEventId} for task ${context.params.taskId}`);
            } else {
                // If it didn't have an event yet, create it
                const response = await calendar.events.insert({
                    calendarId: "primary",
                    requestBody: event,
                    sendUpdates: "all"
                });
                await change.after.ref.update({ googleEventId: response.data.id });
                console.log(`Sync Success: Created missing event for task ${context.params.taskId}`);
            }
        } catch (error) {
            console.error("Google Calendar Update Error:", error);
        }
    });

/**
 * Trigger: onDelete Task
 */
export const onTaskDeletedSync = functions.firestore
    .document("tasks/{taskId}")
    .onDelete(async (snapshot, context) => {
        const taskData = snapshot.data();
        const eventId = taskData?.googleEventId;
        if (!eventId) return;

        const auth = await getAuthClient(taskData.company_id);
        if (!auth) return;

        const calendar = google.calendar({ version: "v3", auth });

        try {
            await calendar.events.delete({
                calendarId: "primary",
                eventId: eventId,
                sendUpdates: "all"
            });
            console.log(`Sync Success: Deleted event ${eventId} for task ${context.params.taskId}`);
        } catch (error) {
            console.error("Google Calendar Delete Error:", error);
        }
    });
