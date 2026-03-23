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
    enabled: boolean = true
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<Error | null>(null);

    // Simplified key for constraints to avoid [object Object] issues
    // Using length and the enabled flag as a proxy for changes in this specific app's patterns
    const constraintsKey = `${collectionName}-${enabled}-${constraints.length}`;

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
                    // Fail silently for standard permission errors during auth transitions
                    if (err.code === 'permission-denied') {
                        console.warn(`Permission denied for ${collectionName}. Waiting for auth sync...`);
                    } else {
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
