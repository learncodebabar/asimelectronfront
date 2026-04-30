// db/index.js
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { Q } from '@nozbe/watermelondb';
import schema from './schema';

// Import all models
import Product from './models/Product';
import Sale from './models/Sale';
import Customer from './models/Customer';
import Purchase from './models/Purchase';
import Payment from './models/Payment';
import Quotation from './models/Quotation';
import Damage from './models/Damage';
import HoldBill from './models/HoldBill';
import CashReceipt from './models/CashReceipt';
import CashPayment from './models/CashPayment';
import RawPurchase from './models/RawPurchase';
import RawSale from './models/RawSale';
import JournalVoucher from './models/JournalVoucher';

// Import API
import api from '../api/api';
import EP from '../api/apiEndpoints';

// Create adapter
const adapter = new LokiJSAdapter({
  dbName: 'erp_app_db',
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
});

// Initialize database
export const database = new Database({
  adapter,
  modelClasses: [
    Product, Sale, Customer, Purchase, Payment, Quotation,
    Damage, HoldBill, CashReceipt, CashPayment, RawPurchase, RawSale, JournalVoucher
  ],
});

// Database ready promise
let dbReadyPromise = null;
let isDbReady = false;

// Wait for database to be fully ready
export const waitForDB = async () => {
  if (isDbReady) return true;
  
  if (dbReadyPromise) return dbReadyPromise;
  
  dbReadyPromise = new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 100;
    
    const checkDb = () => {
      attempts++;
      try {
        if (database && database.collections && database.collections._collections) {
          const collections = database.collections._collections;
          if (collections && Object.keys(collections).length > 0) {
            console.log('✅ Database ready after', attempts, 'attempts');
            isDbReady = true;
            resolve(true);
            return;
          }
        }
      } catch (e) {
        // Not ready yet
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkDb, 100);
      } else {
        console.log('⚠️ Database timeout, continuing anyway');
        isDbReady = true;
        resolve(true);
      }
    };
    
    checkDb();
  });
  
  return dbReadyPromise;
};

// Safe way to get collection - EXPORT THIS
export const getCollection = async (tableName) => {
  await waitForDB();
  if (database && database.collections && database.collections.get) {
    return database.collections.get(tableName);
  }
  throw new Error(`Collection ${tableName} not available`);
};

// Generate local ID
export const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Sync queue management
let isSyncing = false;

const loadSyncQueue = () => {
  try {
    const queue = localStorage.getItem('sync_queue');
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
};

const saveSyncQueue = (queue) => {
  try {
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save sync queue:', error);
  }
};

export const queueForSync = (table, record, operation = 'create') => {
  const queue = loadSyncQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    table, record, operation, timestamp: Date.now(), retries: 0
  });
  saveSyncQueue(queue);
  window.dispatchEvent(new CustomEvent('sync-queued', { detail: { queueLength: queue.length } }));
};

const removeFromQueue = (itemId) => {
  const queue = loadSyncQueue();
  saveSyncQueue(queue.filter(item => item.id !== itemId));
  window.dispatchEvent(new CustomEvent('sync-queued', { detail: { queueLength: loadSyncQueue().length } }));
};

// Get endpoint
const getEndpoint = (table, operation, recordId = null) => {
  const endpoints = {
    products: {
      create: EP.PRODUCTS.CREATE,
      update: (id) => EP.PRODUCTS.UPDATE(id),
      delete: (id) => EP.PRODUCTS.DELETE(id)
    },
    sales: {
      create: EP.SALES.CREATE,
      update: (id) => EP.SALES.UPDATE(id),
      delete: (id) => EP.SALES.DELETE(id)
    },
    customers: {
      create: EP.CUSTOMERS.CREATE,
      update: (id) => EP.CUSTOMERS.UPDATE(id),
      delete: (id) => EP.CUSTOMERS.DELETE(id)
    },
    purchases: {
      create: EP.PURCHASES.CREATE,
      update: (id) => EP.PURCHASES.UPDATE(id),
      delete: (id) => EP.PURCHASES.DELETE(id)
    },
    payments: {
      create: EP.PAYMENTS.CREATE,
      update: (id) => EP.PAYMENTS.DELETE(id),
      delete: (id) => EP.PAYMENTS.DELETE(id)
    },
    quotations: {
      create: EP.QUOTATIONS.CREATE,
      update: (id) => `/quotations/${id}`,
      delete: (id) => EP.QUOTATIONS.DELETE(id)
    },
    damage: {
      create: EP.DAMAGE.CREATE,
      update: (id) => EP.DAMAGE.UPDATE(id),
      delete: (id) => EP.DAMAGE.DELETE(id)
    },
    cash_receipts: {
      create: EP.CASH_RECEIPTS.CREATE,
      update: (id) => EP.CASH_RECEIPTS.DELETE(id),
      delete: (id) => EP.CASH_RECEIPTS.DELETE(id)
    },
    cash_payments: {
      create: EP.CPV.CREATE,
      update: (id) => EP.CPV.UPDATE(id),
      delete: (id) => EP.CPV.DELETE(id)
    },
    raw_purchases: {
      create: EP.RAW_PURCHASES.CREATE,
      update: (id) => EP.RAW_PURCHASES.UPDATE(id),
      delete: (id) => EP.RAW_PURCHASES.DELETE(id)
    },
    raw_sales: {
      create: EP.RAW_SALES.CREATE,
      update: (id) => EP.RAW_SALES.UPDATE(id),
      delete: (id) => EP.RAW_SALES.DELETE(id)
    },
    hold_bills: {
      create: EP.HOLD_BILLS.CREATE,
      delete: (id) => EP.HOLD_BILLS.DELETE(id)
    },
    journal_vouchers: {
      create: '/journal-vouchers',
      update: (id) => `/journal-vouchers/${id}`,
      delete: (id) => `/journal-vouchers/${id}`
    }
  };
  const tableEndpoints = endpoints[table];
  if (!tableEndpoints) return null;
  if (operation === 'create') return tableEndpoints.create;
  if (operation === 'update') return tableEndpoints.update(recordId);
  if (operation === 'delete') return tableEndpoints.delete(recordId);
  return null;
};

// Prepare data for server
const prepareDataForServer = (record) => {
  const data = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'id' || key === 'synced' || key === 'updated_at' || key === 'syncError') continue;
    if (key === '_id') {
      if (value && !value.toString().startsWith('local_')) data[key] = value;
      continue;
    }
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try { data[key] = JSON.parse(value); } catch { data[key] = value; }
    } else {
      data[key] = value;
    }
  }
  if (data._id && data._id.toString().startsWith('local_')) delete data._id;
  return data;
};

// Sync a single item
const syncItem = async (item) => {
  const { id, table, record, operation, retries } = item;
  if (!navigator.onLine) return false;
  
  try {
    const endpoint = getEndpoint(table, operation, record._id);
    if (!endpoint) { removeFromQueue(id); return false; }
    
    const preparedData = prepareDataForServer(record);
    let response;
    
    switch (operation) {
      case 'create':
        response = await api.post(endpoint, preparedData);
        break;
      case 'update':
        response = await api.put(endpoint, preparedData);
        break;
      case 'delete':
        response = await api.delete(endpoint);
        break;
      default:
        removeFromQueue(id);
        return false;
    }
    
    if (response.data?.success) {
      removeFromQueue(id);
      return true;
    }
    throw new Error(response.data?.message || 'Sync failed');
  } catch (error) {
    if (retries >= 5) { removeFromQueue(id); return false; }
    const queue = loadSyncQueue();
    const itemIndex = queue.findIndex(q => q.id === id);
    if (itemIndex !== -1) {
      queue[itemIndex].retries = (queue[itemIndex].retries || 0) + 1;
      saveSyncQueue(queue);
    }
    return false;
  }
};

// Process all pending sync items
export const processSyncQueue = async () => {
  if (isSyncing) return;
  const queue = loadSyncQueue();
  if (queue.length === 0 || !navigator.onLine) return;
  
  isSyncing = true;
  window.dispatchEvent(new CustomEvent('sync-start', { detail: { queueLength: queue.length } }));
  
  for (const item of queue) {
    await syncItem(item);
  }
  
  isSyncing = false;
  window.dispatchEvent(new CustomEvent('sync-complete', { detail: { remainingCount: loadSyncQueue().length } }));
};

// Pull from server
export const pullFromServer = async (table, url) => {
  if (!navigator.onLine) return;
  
  try {
    const response = await api.get(url);
    const serverRecords = response.data?.data || response.data;
    if (!Array.isArray(serverRecords) || serverRecords.length === 0) return;
    
    await waitForDB();
    
    try {
      const collection = await getCollection(table);
      if (!collection) return;
      
      let savedCount = 0;
      await database.write(async () => {
        for (const serverRecord of serverRecords) {
          if (!serverRecord._id) continue;
          
          const existing = await collection.query(Q.where('_id', serverRecord._id)).fetch();
          if (existing.length === 0) {
            await collection.create(record => {
              for (const [key, value] of Object.entries(serverRecord)) {
                if (key === '__v' || key === 'createdAt') continue;
                if (value === null || value === undefined) {
                  record[key] = '';
                } else if (key === 'packingInfo' || key === 'items') {
                  record[key] = JSON.stringify(value || []);
                } else if (typeof value === 'object') {
                  record[key] = JSON.stringify(value);
                } else {
                  record[key] = value;
                }
              }
              record.synced = true;
              record.updated_at = Date.now();
            });
            savedCount++;
          }
        }
      });
      if (savedCount > 0) console.log(`Pulled ${savedCount} new records from ${table}`);
    } catch (collectionError) {
      console.log(`Collection ${table} not ready yet`);
    }
  } catch (error) {
    if (error.code !== 'ERR_NETWORK') {
      console.warn(`Failed to pull ${table}:`, error.message);
    }
  }
};

// Full sync
export const fullSync = async () => {
  if (!navigator.onLine) return;
  
  await processSyncQueue();
  
  if (navigator.onLine) {
    const endpoints = [
      { table: 'products', url: EP.PRODUCTS.GET_ALL },
      { table: 'customers', url: EP.CUSTOMERS.GET_ALL },
    ];
    for (const { table, url } of endpoints) {
      await pullFromServer(table, url);
    }
  }
};

// Initialize database
export const initDB = async () => {
  console.log('Initializing offline-first database...');
  await waitForDB();
  console.log('Database ready');
  return true;
};

export const getSyncQueueLength = () => loadSyncQueue().length;
export const clearSyncQueue = () => localStorage.setItem('sync_queue', '[]');

// Auto-sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setTimeout(() => fullSync(), 1000));
  setInterval(() => { if (navigator.onLine) processSyncQueue(); }, 5 * 60 * 1000);
}

// Export Q
export { Q };

// Default export
export default {
  database,
  generateLocalId,
  queueForSync,
  processSyncQueue,
  pullFromServer,
  fullSync,
  initDB,
  waitForDB,
  getCollection,
  getSyncQueueLength,
  clearSyncQueue,
  Q
};