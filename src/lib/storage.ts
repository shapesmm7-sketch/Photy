export const DB_NAME = "photy_edits_db";
export const STORE_NAME = "recent_edits";

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface RecentEdit {
  id: string; // timestamp
  originalImage: string | Blob;
  thumbnail: string;
  createdAt: number;
}

export async function saveRecentEdit(edit: Omit<RecentEdit, "id" | "createdAt">): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const newEdit: RecentEdit = {
      ...edit,
      id: Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };

    store.put(newEdit);

    // Keep only last 10
    const allReq = store.getAll();
    return new Promise((resolve, reject) => {
      allReq.onsuccess = () => {
        let items = allReq.result as RecentEdit[];
        items.sort((a, b) => b.createdAt - a.createdAt);
        if (items.length > 10) {
          items.slice(10).forEach(item => {
            store.delete(item.id);
          });
        }
        tx.oncomplete = () => resolve();
      };
      allReq.onerror = () => reject();
    });
  } catch (e) {
    console.error("Failed to save to indexedDB", e);
  }
}

export async function getRecentEdits(): Promise<RecentEdit[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as RecentEdit[];
        items.sort((a, b) => b.createdAt - a.createdAt);
        const processedItems = items.map(item => {
          if (item.originalImage instanceof Blob) {
            return { ...item, originalImage: URL.createObjectURL(item.originalImage) };
          }
          return item;
        });
        resolve(processedItems);
      };
      req.onerror = () => reject();
    });
  } catch (e) {
    console.error("Failed to get from indexedDB", e);
    return [];
  }
}

export async function deleteRecentEdit(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject();
    });
  } catch (e) {
    console.error("Failed to delete from indexedDB", e);
  }
}
