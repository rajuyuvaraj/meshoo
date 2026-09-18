/**
 * File utility functions for processing, compressing, and caching deposit receipts & proof files.
 */

// IndexedDB Helper for high-capacity offline storage of images & documents
const DB_NAME = 'vns_hub_storage_db';
const DB_VERSION = 1;
const STORE_RECEIPTS = 'deposit_receipts';

// In-memory fallback cache
const memoryReceiptCache = new Map();

function openReceiptDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
          db.createObjectStore(STORE_RECEIPTS, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => {
        console.warn('IndexedDB open error, falling back:', e);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB exception:', err);
      resolve(null);
    }
  });
}

export async function saveReceiptToStorage(key, receiptData) {
  if (!key || !receiptData) return;
  const strKey = String(key);
  
  // 1. Cache in memory
  memoryReceiptCache.set(strKey, { ...receiptData, updatedAt: Date.now() });

  // 2. Save to IndexedDB
  try {
    const db = await openReceiptDB();
    if (db) {
      const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
      const store = tx.objectStore(STORE_RECEIPTS);
      store.put({ key: strKey, ...receiptData, updatedAt: Date.now() });
      await new Promise((res) => {
        tx.oncomplete = res;
        tx.onerror = () => res();
      });
      return;
    }
  } catch (err) {
    console.warn('Failed to write receipt to IndexedDB:', err);
  }

  // 3. Fallback to localStorage if small enough
  try {
    if (receiptData.dataUrl && receiptData.dataUrl.length < 500000) {
      localStorage.setItem(`vns_receipt_${strKey}`, JSON.stringify(receiptData));
    }
  } catch (e) {
    // ignore quota error
  }
}

export async function getReceiptFromStorage(key) {
  if (!key) return null;
  const strKey = String(key);

  // 1. Check memory cache first
  if (memoryReceiptCache.has(strKey)) {
    return memoryReceiptCache.get(strKey);
  }

  // 2. Check IndexedDB
  try {
    const db = await openReceiptDB();
    if (db) {
      const tx = db.transaction(STORE_RECEIPTS, 'readonly');
      const store = tx.objectStore(STORE_RECEIPTS);
      const req = store.get(strKey);
      const result = await new Promise((res) => {
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => res(null);
      });
      if (result) {
        memoryReceiptCache.set(strKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Failed to read receipt from IndexedDB:', err);
  }

  // 3. Fallback to localStorage
  try {
    const fallback = localStorage.getItem(`vns_receipt_${strKey}`);
    if (fallback) {
      const parsed = JSON.parse(fallback);
      memoryReceiptCache.set(strKey, parsed);
      return parsed;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

export async function deleteReceiptFromStorage(key) {
  if (!key) return;
  const strKey = String(key);
  memoryReceiptCache.delete(strKey);

  try {
    localStorage.removeItem(`vns_receipt_${strKey}`);
  } catch (e) {}

  try {
    const db = await openReceiptDB();
    if (db) {
      const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
      const store = tx.objectStore(STORE_RECEIPTS);
      store.delete(strKey);
    }
  } catch (err) {
    console.warn('Failed to delete receipt from IndexedDB:', err);
  }
}

/**
 * Compress an image file to a lightweight, crystal-clear Base64 JPEG data URL.
 * Automatically resizes large camera photos to a max dimension of 1280px.
 */
export function compressImageFile(file, maxWidth = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');

    // If it's a PDF or non-image document, read directly as Data URL
    if (isPdf || (file.type && !file.type.startsWith('image/'))) {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: reader.result,
          filename: file.name || 'document.pdf',
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          isPdf: true,
        });
      };
      reader.onerror = () => {
        reject(new Error('Could not read file.'));
      };
      reader.readAsDataURL(file);
      return;
    }

    // Process image with HTML5 canvas
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result;
      if (!rawDataUrl) {
        reject(new Error('Could not load image source.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            dataUrl,
            filename: file.name || 'deposit_receipt.jpg',
            fileSize: Math.round((dataUrl.length * 3) / 4),
            fileType: 'image/jpeg',
            isPdf: false,
            width,
            height,
          });
        } catch (canvasErr) {
          // Fallback to raw data url if canvas processing fails
          resolve({
            dataUrl: rawDataUrl,
            filename: file.name || 'deposit_receipt.jpg',
            fileSize: file.size,
            fileType: file.type || 'image/jpeg',
            isPdf: false,
          });
        }
      };
      img.onerror = () => {
        // Fallback to raw data url if image decode fails
        resolve({
          dataUrl: rawDataUrl,
          filename: file.name || 'deposit_receipt.jpg',
          fileSize: file.size,
          fileType: file.type || 'image/jpeg',
          isPdf: false,
        });
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file from storage.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into a human-readable file size string.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
