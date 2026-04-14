import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onTaskAssignmentHandler = async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!after) return; // Task deleted
    
    // Check if this is a new assignment
    const oldAssignees = before?.assignedEmails || [];
    const newAssignees = after.assignedEmails || [];

    const newlyAssigned = newAssignees.filter((email: string) => !oldAssignees.includes(email));
    
    // If it's a completely new task, oldAssignees is empty, so all are newly assigned.
    if (newlyAssigned.length === 0) return;

    console.log(`New assignments for task ${context.params.taskId}: ${newlyAssigned}`);

    const db = admin.firestore();
    const messaging = admin.messaging();

    for (const email of newlyAssigned) {
      try {
        const usersSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userData = userDoc.data();
          
          // Collect all unique tokens
          const tokens = new Set<string>();
          if (userData.fcmToken) tokens.add(userData.fcmToken);
          if (Array.isArray(userData.fcmTokens)) {
            userData.fcmTokens.forEach((t: string) => tokens.add(t));
          }

          if (tokens.size > 0) {
            const sendPromises = Array.from(tokens).map(async (token) => {
              try {
                await messaging.send({
                  token: token,
                  webpush: {
                    headers: {
                      Urgency: "high",
                    },
                    notification: {
                      title: "Nueva Tarea Asignada",
                      body: `Se te ha asignado la tarea: "${after.title}"`,
                      tag: `task-${context.params.taskId}`,
                      icon: "/logo.png"
                    }
                  },
                  data: {
                    title: 'Nueva Tarea Asignada',
                    body: `Se te ha asignado la tarea: "${after.title}"`,
                    taskId: context.params.taskId,
                    url: `https://workflow-project-studio.web.app/dashboard`
                  }
                });
                console.log(`Notification sent to device with token ${token.substring(0, 10)}...`);
              } catch (err: any) {
                console.error(`Error sending to token ${token.substring(0, 10)}...:`, err);
                // Optional: Cleanup invalid token if needed
              }
            });
            await Promise.all(sendPromises);
            console.log(`Notifications broadcasted to ${email} (${tokens.size} devices)`);
          } else {
            console.log(`User ${email} has no FCM tokens saved.`);
          }
        } else {
          console.log(`User document not found for email: ${email}`);
        }
      } catch (error) {
        console.error(`Failed to send notification to ${email}:`, error);
      }
    }
  };
