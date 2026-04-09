import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onTaskAssignment = functions.firestore
  .document('tasks/{taskId}')
  .onWrite(async (change, context) => {
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
          const fcmToken = userDoc.data().fcmToken;

          if (fcmToken) {
            await messaging.send({
              token: fcmToken,
              notification: {
                title: 'Nueva Tarea Asignada',
                body: `Se te ha asignado la tarea: "${after.title}"`
              },
              data: {
                taskId: context.params.taskId
              }
            });
            console.log(`Notification sent to ${email}`);
          } else {
            console.log(`User ${email} has no FCM token saved.`);
          }
        } else {
          console.log(`User document not found for email: ${email}`);
        }
      } catch (error) {
        console.error(`Failed to send notification to ${email}:`, error);
      }
    }
  });
