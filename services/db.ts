import { openDB, IDBPDatabase } from 'idb';
import { Resource } from '../types';

const DB_NAME = 'CognifyDB';
const DB_VERSION = 1;
const RESOURCE_STORE_NAME = 'resources';

interface DBResource extends Resource {
    id: string; // composite key "topicId_name"
    topicId: string;
    subjectId: string;
}

class DatabaseService {
    private dbPromise: Promise<IDBPDatabase>;

    constructor() {
        this.dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(RESOURCE_STORE_NAME)) {
                    const store = db.createObjectStore(RESOURCE_STORE_NAME, {
                        keyPath: 'id',
                    });
                    store.createIndex('topicId', 'topicId', { unique: false });
                    store.createIndex('subjectId', 'subjectId', { unique: false });
                }
            },
        });
    }

    async addResource(subjectId: string, topicId: string, resource: Resource): Promise<void> {
        if (!resource.name || !resource.url) {
            console.error("Resource name or url is missing");
            return;
        }
        const db = await this.dbPromise;
        const dbResource: DBResource = {
            ...resource,
            id: `${topicId}_${resource.name}`,
            topicId,
            subjectId,
        };
        await db.put(RESOURCE_STORE_NAME, dbResource);
    }

    async getResource(resourceName: string, topicId: string): Promise<DBResource | undefined> {
        const db = await this.dbPromise;
        return db.get(RESOURCE_STORE_NAME, `${topicId}_${resourceName}`);
    }
    
    async getResourcesForTopic(topicId: string): Promise<DBResource[]> {
        const db = await this.dbPromise;
        return db.getAllFromIndex(RESOURCE_STORE_NAME, 'topicId', topicId);
    }
    
    async deleteResource(resourceName: string, topicId: string): Promise<void> {
        const db = await this.dbPromise;
        await db.delete(RESOURCE_STORE_NAME, `${topicId}_${resourceName}`);
    }

    async deleteResourcesForTopic(topicId: string): Promise<void> {
        const db = await this.dbPromise;
        const keys = await db.getAllKeysFromIndex(RESOURCE_STORE_NAME, 'topicId', topicId);
        const tx = db.transaction(RESOURCE_STORE_NAME, 'readwrite');
        await Promise.all(keys.map(key => tx.store.delete(key)));
        await tx.done;
    }

    async deleteResourcesForSubject(subjectId: string): Promise<void> {
        const db = await this.dbPromise;
        const keys = await db.getAllKeysFromIndex(RESOURCE_STORE_NAME, 'subjectId', subjectId);
        const tx = db.transaction(RESOURCE_STORE_NAME, 'readwrite');
        await Promise.all(keys.map(key => tx.store.delete(key)));
        await tx.done;
    }
}

export const dbService = new DatabaseService();