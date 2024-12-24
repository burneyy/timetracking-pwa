import { useState, useEffect } from 'react';

// IndexedDB setup
const DB_NAME = 'timer-app';
const DB_VERSION = 2;
const STORE_NAME = 'timers';

let db: IDBDatabase | null = null;

interface Timer {
    id: number;
    startDate: Date;
    running: boolean;
}

const openDB = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            db = (event.target as IDBRequest).result;
            if (db!.objectStoreNames.contains(STORE_NAME)) {
                db!.deleteObjectStore(STORE_NAME);
            }
            db!.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = (event: Event) => {
            db = (event.target as IDBRequest).result;
            resolve();
        };
        request.onerror = (event: Event) => {
            reject((event.target as IDBRequest).error);
        };
    });
};

const getTimers = async (): Promise<Timer[]> => {
    await openDB();
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve([]);
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const timers = request.result as Timer[];
            resolve(timers);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

const saveTimer = async (timer: Omit<Timer, 'id'>): Promise<void> => {
    await openDB();
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve();
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(timer);
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

const deleteTimer = async (id: number): Promise<void> => {
    await openDB();
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve();
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

function App(): JSX.Element {
    const [running, setRunning] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [storedTimers, setStoredTimers] = useState<Timer[]>([]);

    useEffect(() => {
        const loadTimers = async () => {
            const timers = await getTimers();
            setStoredTimers(timers);
        };
        loadTimers();
    }, []);

    useEffect(() => {
        if (running && !startDate) {
            setStartDate(new Date());
        }
    }, [running, startDate]);

    const handleStart = () => {
        setRunning(true);
    };

    const handleStop = () => {
        setRunning(false);
        if (startDate) {
            const timer: Omit<Timer, 'id'> = { startDate, running: false };
            saveTimer(timer).then(() => {
                const loadTimers = async () => {
                    const timers = await getTimers();
                    setStoredTimers(timers);
                };
                loadTimers();
            });
        }
    };

    const handleReset = () => {
        setRunning(false);
        setStartDate(null);
    };

    const handleDelete = async (id: number) => {
        await deleteTimer(id);
        const loadTimers = async () => {
            const timers = await getTimers();
            setStoredTimers(timers);
        };
        loadTimers();
    };

    const formatDate = (date: Date): string => {
        const dayOfWeek = date.toLocaleString('de-DE', { weekday: 'short' });
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${dayOfWeek}. ${day}.${month}.${year} ${hours}:${minutes}`;
    };

    return (
        <div>
            {startDate && <h1>Started at: {formatDate(startDate)}</h1>}
            <button onClick={handleStart}>Start</button>
            <button onClick={handleStop}>Stop</button>
            <button onClick={handleReset}>Reset</button>
            <h2>Stored Timers:</h2>
            <ul>
                {storedTimers.map((timer) => (
                    <li key={timer.id}>
                        {formatDate(timer.startDate)}
                        <button onClick={() => handleDelete(timer.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default App;
