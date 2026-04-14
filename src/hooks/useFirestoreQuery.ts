import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    QueryConstraint,
    DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export function useFirestoreQuery<T = DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
    enabled: boolean = true,
    deps: any[] = []
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<Error | null>(null);

    // Track constraints more reliably. Use a simpler hash for the key.
    const [retryCount, setRetryCount] = useState(0);
    const constraintsKey = `${collectionName}-${enabled}-${constraints.length}-${retryCount}-${deps.join(",")}`;

    useEffect(() => {
        if (!collectionName || !enabled) {
            setLoading(false);
            return;
        }

        setLoading(true);
        console.log(`[useFirestoreQuery] Fetching ${collectionName}...`);
        
        try {
            console.log(`[useFirestoreQuery] Querying ${collectionName} with constraints:`, constraints.length);
            const q = query(collection(db, collectionName), ...constraints);

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    console.log(`[useFirestoreQuery] ${collectionName} snapshot received:`, snapshot.size, "items");
                    const items = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...(doc.data() as T),
                    }));
                    setData(items);
                    setLoading(false);
                },
                (err) => {
                    if (err.code === 'permission-denied') {
                        if (retryCount < 2) {
                            setTimeout(() => setRetryCount(p => p + 1), 2000);
                        }
                    } else if (process.env.NODE_ENV === 'development') {
                        console.error(`Error in useFirestoreQuery (${collectionName}):`, err);
                    }
                    setError(err);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err: any) {
            console.error("Query buildup error:", err);
            setError(err);
            setLoading(false);
        }
    }, [collectionName, constraintsKey, enabled]);

    return { data, loading, error };
}
