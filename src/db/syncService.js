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

// Import API and endpoints
import api from '../api/api';
import EP from '../api/apiEndpoints';

// Import sync service functions
import syncService from './syncService';

// Create adapter for web (IndexedDB)
const adapter = new LokiJSAdapter({
  dbName: 'erp_app_db',
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,  // Required for newer versions
});

// Initialize database
export const database = new Database({
  adapter,
  modelClasses: [
    Product,
    Sale,
    Customer,
    Purchase,
    Payment,
    Quotation,
    Damage,
    HoldBill,
    CashReceipt,
    CashPayment,
    RawPurchase,
    RawSale,
    JournalVoucher
  ],
});

// Generate local ID for offline records
export const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Export sync service functions
export const queueForSync = syncService.queueForSync;
export const processSyncQueue = syncService.processSyncQueue;
export const pullFromServer = syncService.pullFromServer;
export const fullSync = syncService.fullSync;
export const getSyncQueueLength = syncService.getSyncQueueLength;

// Get endpoint for table (used internally)
const getEndpoint = (table, operation) => {
  const endpoints = {
    PRODUCTS: EP.PRODUCTS.CREATE,
    SALES: EP.SALES.CREATE,
    CUSTOMERS: EP.CUSTOMERS.CREATE,
    PURCHASES: EP.PURCHASES.CREATE,
    PAYMENTS: EP.PAYMENTS.CREATE,
    QUOTATIONS: EP.QUOTATIONS.CREATE,
    DAMAGE: EP.DAMAGE.CREATE,
    HOLD_BILLS: EP.HOLD_BILLS.CREATE,
    CASH_RECEIPTS: EP.CASH_RECEIPTS.CREATE,
    CASH_PAYMENTS: EP.CPV.CREATE,
    RAW_PURCHASES: EP.RAW_PURCHASES.CREATE,
    RAW_SALES: EP.RAW_SALES.CREATE,
    JOURNAL_VOUCHERS: '/journal-vouchers'
  };
  
  return endpoints[table.toUpperCase()];
};

// Prepare record for API (convert JSON strings back to objects)
const prepareRecordForAPI = (record) => {
  const prepared = {};
  
  for (const [key, value] of Object.entries(record)) {
    // Skip internal fields
    if (key === 'id' || key === 'synced' || key === 'updated_at' || key === 'syncError') {
      continue;
    }
    
    // Handle _id - only include if not a local ID
    if (key === '_id') {
      if (value && !value.toString().startsWith('local_')) {
        prepared[key] = value;
      }
      continue;
    }
    
    // Parse JSON strings back to objects
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        prepared[key] = JSON.parse(value);
      } catch {
        prepared[key] = value;
      }
    } else {
      prepared[key] = value;
    }
  }
  
  return prepared;
};

// Queue item for sync (alternative direct method)
export const queueSync = (table, record, operation = 'create') => {
  queueForSync(table, record, operation);
};

// Pull all data from server (offline initialization)
export const pullAllDataFromServer = async () => {
  if (!navigator.onLine) {
    console.log('Offline - skipping pull');
    return false;
  }
  
  console.log('Pulling all data from server for offline initialization...');
  
  const tables = [
    { table: 'products', url: EP.PRODUCTS.GET_ALL },
    { table: 'customers', url: EP.CUSTOMERS.GET_ALL },
    { table: 'sales', url: EP.SALES.GET_ALL },
    { table: 'purchases', url: EP.PURCHASES.GET_ALL },
    { table: 'payments', url: EP.PAYMENTS.GET_ALL },
    { table: 'quotations', url: EP.QUOTATIONS.GET_ALL_SEARCH() },
    { table: 'damage', url: EP.DAMAGE.GET_ALL }
  ];
  
  let successCount = 0;
  
  for (const { table, url } of tables) {
    try {
      const response = await api.get(url);
      if (response.data && response.data.success && response.data.data) {
        const records = response.data.data;
        
        await database.write(async () => {
          for (const record of records) {
            const existing = await database.collections
              .get(table)
              .query(Q.where('_id', record._id))
              .fetch();
            
            if (existing.length === 0) {
              await database.collections.get(table).create(doc => {
                Object.keys(record).forEach(key => {
                  if (key !== '__v' && key !== 'createdAt') {
                    if (typeof record[key] === 'object' && record[key] !== null) {
                      doc[key] = JSON.stringify(record[key]);
                    } else {
                      doc[key] = record[key];
                    }
                  }
                });
                doc.synced = true;
                doc.updated_at = Date.now();
              });
            }
          }
        });
        
        console.log(`Pulled ${records.length} ${table} from server`);
        successCount++;
      }
    } catch (error) {
      console.warn(`Failed to pull ${table}:`, error.message);
      // Don't fail - continue with other tables
    }
  }
  
  console.log(`Pull complete: ${successCount}/${tables.length} tables synced`);
  return successCount > 0;
};

// Initialize offline database with existing data
export const initializeOfflineDatabase = async () => {
  const isInitialized = localStorage.getItem('offline_db_initialized');
  
  // Check if we already have data
  let hasLocalData = false;
  try {
    const productCount = await database.collections.get('products').query().fetch();
    hasLocalData = productCount.length > 0;
  } catch (e) {
    console.log('Error checking local data:', e.message);
  }
  
  // If already initialized or has data, skip
  if (isInitialized || hasLocalData) {
    console.log('Offline database already has data, skipping initialization');
    return true;
  }
  
  // Try to pull data from server if online
  if (navigator.onLine) {
    console.log('Initializing offline database from server...');
    try {
      await pullAllDataFromServer();
      localStorage.setItem('offline_db_initialized', 'true');
      console.log('Offline database initialization complete!');
      return true;
    } catch (error) {
      console.warn('Could not initialize from server:', error.message);
      localStorage.setItem('offline_db_initialized', 'true');
      return false;
    }
  } else {
    console.log('Offline mode - database will be populated when online');
    localStorage.setItem('offline_db_initialized', 'true');
    return true;
  }
};

// Clear sync queue (for debugging)
export const clearSyncQueue = () => {
  localStorage.setItem('sync_queue', '[]');
  console.log('Sync queue cleared');
};

// Setup auto-sync listeners
if (typeof window !== 'undefined') {
  // Listen for online status
  window.addEventListener('online', () => {
    console.log('Back online, starting sync...');
    fullSync();
  });
  
  // Sync periodically when online (every 5 minutes)
  setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, 5 * 60 * 1000);
}

// Export Q for queries
export { Q };

// Export everything
export default {
  database,
  generateLocalId,
  queueSync,
  queueForSync,
  processSyncQueue,
  pullFromServer,
  pullAllDataFromServer,
  fullSync,
  initializeOfflineDatabase,
  getSyncQueueLength,
  clearSyncQueue,
  Q
};