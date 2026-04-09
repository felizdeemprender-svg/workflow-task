"use client";

import { useEffect, useState } from 'react';
import { messaging, db } from '../lib/firebase/config';
import { getToken, onMessage } from 'firebase/messaging';
import { setDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';

export const useFCM = (userId: string | undefined) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (!messaging || !userId) return;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // If no VAPID is provided, it tries to use default keys, but might fail depending on project setup.
          // VAPID key is usually needed for web push.
          const currentToken = await getToken(messaging, { 
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
          });

          if (currentToken) {
            setFcmToken(currentToken);
            // Save token to user profile
            await setDoc(doc(db, 'users', userId), { fcmToken: currentToken }, { merge: true });
            console.log('FCM Token stored successfully');
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Permission not granted for Notification');
        }
      } catch (error) {
        console.error('Error fetching FCM token:', error);
      }
    };

    requestPermission();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received: ', payload);
      if (payload.notification) {
        toast.info(payload.notification.title || 'Nueva Alerta', {
            description: payload.notification.body,
            icon: '🔔'
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { fcmToken };
};
