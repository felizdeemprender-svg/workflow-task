import {
    collection,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    increment,
    arrayUnion,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const taskActions = {
    createTask: async (companyId: string, taskData: any) => {
        console.log("taskActions.createTask - Payload:", { companyId, taskData });
        const defaultDueDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dueDate = taskData.dueDate || defaultDueDate;
        
        const taskRef = await addDoc(collection(db, 'tasks'), {
            ...taskData,
            dueDate,
            company_id: companyId,
            assignedEmail: taskData.assignedEmail || null,
            recurrence: taskData.recurrence || { frequency: 'None' },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Add initial log
        await addDoc(collection(db, `tasks/${taskRef.id}/log`), {
            action: 'CREACION',
            user: taskData.createdBy || 'Sistema',
            details: `Tarea creada${taskData.assignedEmail ? ` y asignada a ${taskData.assignedEmail}` : ''}`,
            createdAt: serverTimestamp(),
        });

        // Notifications
        try {
            const { query, where, getDocs } = await import('firebase/firestore');
            
            // Notify Assigned User by Email
            if (taskData.assignedEmail) {
                const userQuery = query(
                    collection(db, 'users'),
                    where('email', '==', taskData.assignedEmail),
                    where('company_id', '==', companyId)
                );
                const userSnapshot = await getDocs(userQuery);
                
                if (!userSnapshot.empty) {
                    const assignedUserId = userSnapshot.docs[0].id;
                    await notificationActions.create(assignedUserId, {
                        title: 'Se te ha asignado una tarea',
                        message: `Has sido asignado a la tarea "${taskData.title}". Vence el: ${dueDate}`,
                        type: 'TASK_ASSIGNED',
                        link: `/dashboard/tasks/${taskRef.id}`
                    });
                }
            } else {
                // Notify Area Users ONLY if no specific assignment was made
                const usersQuery = query(
                    collection(db, 'users'), 
                    where('company_id', '==', companyId),
                    where('area', '==', taskData.area)
                );
                const usersSnapshot = await getDocs(usersQuery);
                
                const notificationPromises = usersSnapshot.docs.map(userDoc => 
                    notificationActions.create(userDoc.id, {
                        title: 'Nueva Tarea en tu Área',
                        message: `Se ha creado la tarea "${taskData.title}" para el área ${taskData.area}. Vence el: ${dueDate}`,
                        type: 'TASK_CREATED',
                        link: `/dashboard/tasks/${taskRef.id}`
                    })
                );
                await Promise.all(notificationPromises);
            }
        } catch (err) {
            console.error("Error creating notifications for area users:", err);
        }

        return taskRef.id;
    },

    updateStatus: async (taskId: string, newStatus: string, userId: string) => {
        const taskRef = doc(db, 'tasks', taskId);
        const taskDoc = await getDoc(taskRef);
        if (!taskDoc.exists()) return;
        const taskData = taskDoc.data();

        let finalStatus = newStatus;
        let nextDueDate = taskData.dueDate;

        // Recurring task logic
        if (newStatus === 'Finalizado' && taskData.recurrence?.frequency && taskData.recurrence.frequency !== 'None') {
            const current = new Date(taskData.dueDate + 'T00:00:00');
            const end = new Date(taskData.recurrence.endDate + 'T23:59:59');
            
            // Calculate next date
            if (taskData.recurrence.frequency === 'Diaria') {
                current.setDate(current.getDate() + 1);
            } else if (taskData.recurrence.frequency === 'Semanal') {
                current.setDate(current.getDate() + 7);
            } else if (taskData.recurrence.frequency === 'Mensual') {
                current.setMonth(current.getMonth() + 1);
            }

            if (current <= end) {
                finalStatus = 'Pendiente'; // Reset for next occurrence
                nextDueDate = current.toISOString().split('T')[0];
            }
        }

        await updateDoc(taskRef, {
            status: finalStatus,
            dueDate: nextDueDate,
            lastCompletedAt: newStatus === 'Finalizado' ? serverTimestamp() : taskData.lastCompletedAt || null,
            updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, `tasks/${taskId}/log`), {
            action: 'CAMBIO_ESTADO',
            user: userId,
            details: `Estado cambiado a: ${newStatus}${finalStatus === 'Pendiente' ? `. Reprogramada para: ${nextDueDate}` : ''}`,
            createdAt: serverTimestamp(),
        });
    },

    sendMessage: async (taskId: string, messageData: any) => {
        await addDoc(collection(db, `tasks/${taskId}/chat`), {
            ...messageData,
            createdAt: serverTimestamp(),
        });
    },

    updateTask: async (taskId: string, taskData: any) => {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, {
            ...taskData,
            updatedAt: serverTimestamp(),
        });
    },

    deleteTask: async (taskId: string) => {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'tasks', taskId));
    }
};

export const pollActions = {
    vote: async (pollId: string, optionIndex: number, userId: string) => {
        const pollRef = doc(db, 'polls', pollId);
        const pollDoc = await getDoc(pollRef);
        if (!pollDoc.exists()) return;

        const data = pollDoc.data();
        if (data.voters?.includes(userId)) return;

        const newOptions = [...data.options];
        newOptions[optionIndex].votes += 1;

        await updateDoc(pollRef, {
            options: newOptions,
            voters: arrayUnion(userId)
        });
    },

    createPoll: async (companyId: string, question: string, options: string[]) => {
        const pollData = {
            company_id: companyId,
            question,
            options: options.map(text => ({ text, votes: 0 })),
            voters: [],
            createdAt: serverTimestamp(),
            status: 'active'
        };
        const pollRef = await addDoc(collection(db, 'polls'), pollData);
        return pollRef.id;
    }
};

export const notificationActions = {
    create: async (userId: string, data: any) => {
        await addDoc(collection(db, 'notifications'), {
            ...data,
            userId,
            read: false,
            createdAt: serverTimestamp(),
        });
    }
};
