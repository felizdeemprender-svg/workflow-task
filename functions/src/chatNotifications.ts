import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Throttled Chat Notifications: Sends a notification (FCM + Bell) 
 * for new chat messages, but limited to 1 every 5 minutes per chat conversation.
 */
export const onChatMessageCreatedHandler = async (snapshot: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const message = snapshot.data();
    if (!message) return;

    const { chatId } = context.params;
    const { recipientId, senderName, text } = message;

    if (!recipientId || !senderName) {
        console.log(`Missing data for notification: recipientId=${recipientId}, senderName=${senderName}`);
        return;
    }

    const db = admin.firestore();
    const now = Date.now();
    const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

    // 1. Check Throttling
    const throttleRef = db.collection('users').doc(recipientId).collection('notifications_meta').doc(`chat_${chatId}`);
    const throttleDoc = await throttleRef.get();
    
    if (throttleDoc.exists) {
        const lastSent = throttleDoc.data()?.lastChatNotificationAt?.toMillis() || 0;
        if (now - lastSent < THROTTLE_MS) {
            console.log(`Notification throttled for chat ${chatId} to user ${recipientId}. Last sent: ${new Date(lastSent).toISOString()}`);
            return;
        }
    }

    // 2. Update Throttle Timestamp
    await throttleRef.set({
        lastChatNotificationAt: admin.firestore.FieldValue.serverTimestamp(),
        senderName,
        chatId
    }, { merge: true });

    // 3. Create Bell Notification
    await db.collection('notifications').add({
        userId: recipientId,
        title: `Nuevo mensaje de ${senderName}`,
        message: text.length > 60 ? text.substring(0, 60) + "..." : text,
        type: 'CHAT_MESSAGE',
        link: `/dashboard/team?chatId=${chatId}`, // Redirect to team page or chat
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Send FCM Push Notification
    try {
        const userDoc = await db.collection('users').doc(recipientId).get();
        if (userDoc.exists) {
            const userData = userDoc.data()!;
            const tokens = new Set<string>();
            if (userData.fcmToken) tokens.add(userData.fcmToken);
            if (Array.isArray(userData.fcmTokens)) {
                userData.fcmTokens.forEach((t: string) => tokens.add(t));
            }

            if (tokens.size > 0) {
                const messaging = admin.messaging();
                const sendPromises = Array.from(tokens).map(async (token) => {
                    try {
                        await messaging.send({
                            token: token,
                            webpush: {
                                headers: { Urgency: "high" },
                                notification: {
                                    title: `Mensaje de ${senderName}`,
                                    body: text.length > 100 ? text.substring(0, 100) + "..." : text,
                                    tag: `chat-${chatId}`,
                                    icon: "/logo.png"
                                }
                            },
                            data: {
                                title: `Mensaje de ${senderName}`,
                                body: text,
                                chatId: chatId,
                                url: `https://workflow-project-studio.web.app/dashboard/team`
                            }
                        });
                    } catch (err) {
                        console.error(`Error sending to token ${token.substring(0, 10)}:`, err);
                    }
                });
                await Promise.all(sendPromises);
                console.log(`Chat notification sent to ${recipientId} (${tokens.size} devices)`);
            }
        }
    } catch (err) {
        console.error("Error in FCM sending:", err);
    }
};
