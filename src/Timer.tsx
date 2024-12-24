import { useState, useEffect } from 'react';

// IndexedDB setup
const DB_NAME = 'timer-app';
const DB_VERSION = 1;
const STORE_NAME = 'timers';

let db: IDBDatabase | null = null;

interface Timer {
    seconds: number;
    running: boolean;
}

const openDB = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            db = (event.target as IDBRequest).result;
            db!.createObjectStore(STORE_NAME);
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

const getTimer = async (): Promise<Timer | null> => {
    await openDB();
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve(null);
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(1);
        request.onsuccess = () => {
            const timer = request.result as Timer | null;
            resolve(timer);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

const saveTimer = async (timer: Timer): Promise<void> => {
    await openDB();
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve();
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(timer, 1);
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
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const loadTimer = async () => {
            const timer = await getTimer();
            if (timer) {
                setSeconds(timer.seconds);
                setRunning(timer.running);
            }
        };
        loadTimer();
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (running) {
                setSeconds((prevSeconds) => prevSeconds + 1);
            }
        }, 1000);
        return () => clearInterval(intervalId);
    }, [running]);

    const handleStart = () => {
        setRunning(true);
    };

    const handleStop = () => {
        setRunning(false);
    };

    const handleReset = () => {
        setRunning(false);
        setSeconds(0);
    };

    const handleDelete = async () => {
        await openDB();
        if (db) {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(1);
        }
        setSeconds(0);
        setRunning(false);
    };

    useEffect(() => {
        const saveCurrentTimer = async () => {
            await saveTimer({ seconds, running });
        };
        saveCurrentTimer();
    }, [seconds, running]);

    return (
        <div>
            <h1>Timer: {seconds}</h1>
            <button onClick={handleStart}>Start</button>
            <button onClick={handleStop}>Stop</button>
            <button onClick={handleReset}>Reset</button>
            <button onClick={handleDelete}>Delete</button>
        </div>
    );
}

export default App;
