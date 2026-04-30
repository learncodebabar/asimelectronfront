// services/SyncService.js
import { database } from '../db';
import api from '../api/api';
import EP from '../api/apiEndpoints';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
  }

  async sync() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }
    
    this.isSyncing = true;
    
    try {
      console.log('Starting sync...');
      
      // Step 1: Push local changes to server
      await this.pushAllTables();
      
      // Step 2: Pull latest data from server
      await this.pullAllTables();
      
      console.log('Sync completed successfully');
      
      // Dispatch event for UI to show success
      window.dispatchEvent(new CustomEvent('sync-completed', { 
        detail: { success: true, timestamp: new Date() }
      }));
      
    } catch (error) {
      console.error('Sync failed:', error);
      
      window.dispatchEvent(new CustomEvent('sync-completed', { 
        detail: { success: false, error: error.message }
      }));
      
    } finally {
      this.isSyncing = false;
    }
  }

  async pushAllTables() {
    const tables = [
      { name: 'customers', endpoint: EP.CUSTOMERS.CREATE, updateEndpoint: EP.CUSTOMERS.UPDATE },
      { name: 'products', endpoint: EP.PRODUCTS.CREATE, updateEndpoint: EP.PRODUCTS.UPDATE },
      { name: 'sales', endpoint: EP.SALES.CREATE, updateEndpoint: EP.SALES.UPDATE },
      { name: 'purchases', endpoint: EP.PURCHASES.CREATE, updateEndpoint: EP.PURCHASES.UPDATE },
      { name: 'payments', endpoint: EP.PAYMENTS.CREATE, updateEndpoint: EP.PAYMENTS.DELETE },
      { name: 'quotations', endpoint: EP.QUOTATIONS.CREATE, updateEndpoint: (id) => `/quotations/${id}` },
      { name: 'damage', endpoint: EP.DAMAGE.CREATE, updateEndpoint: EP.DAMAGE.UPDATE },
      { name: 'cash_receipts', endpoint: EP.CASH_RECEIPTS.CREATE, updateEndpoint: EP.CASH_RECEIPTS.DELETE },
      { name: 'cash_payments', endpoint: EP.CPV.CREATE, updateEndpoint: EP.CPV.UPDATE }
    ];

    for (const table of tables) {
      const unsynced = await database.collections
        .get(table.name)
        .query(Q.where('synced', false))
        .fetch();
      
      for (const record of unsynced) {
        try {
          const recordData = this.prepareDataForServer(record);
          const hasServerId = record.serverId && !record.serverId.startsWith('local_');
          
          let response;
          if (hasServerId) {
            // Update existing record
            const updateUrl = typeof table.updateEndpoint === 'function' 
              ? table.updateEndpoint(record.serverId)
              : `${table.updateEndpoint}/${record.serverId}`;
            response = await api.put(updateUrl, recordData);
          } else {
            // Create new record
            response = await api.post(table.endpoint, recordData);
          }
          
          // Mark as synced
          await database.write(async () => {
            await record.update(() => {
              if (response.data._id) record._id = response.data._id;
              if (response.data.code) record.code = response.data.code;
              record.synced = true;
              record.updatedAt = Date.now();
            });
          });
          
          console.log(`Synced ${table.name}: ${record.id}`);
          
        } catch (error) {
          console.error(`Failed to sync ${table.name} record ${record.id}:`, error);
          
          // If server rejected (validation error), mark as error
          if (error.response?.status === 400) {
            await database.write(async () => {
              await record.update(() => {
                record.synced = true; // Mark as synced to avoid retry
                record.syncError = error.response.data.message;
              });
            });
          }
        }
      }
    }
  }

  async pullAllTables() {
    const endpoints = [
      { table: 'customers', url: EP.CUSTOMERS.GET_ALL },
      { table: 'products', url: EP.PRODUCTS.GET_ALL },
      { table: 'sales', url: EP.SALES.GET_ALL },
      { table: 'purchases', url: EP.PURCHASES.GET_ALL },
      { table: 'payments', url: EP.PAYMENTS.GET_ALL },
      { table: 'quotations', url: EP.QUOTATIONS.GET_ALL_SEARCH() },
      { table: 'damage', url: EP.DAMAGE.GET_ALL },
      { table: 'cash_receipts', url: EP.CASH_RECEIPTS.GET_BY_DATE },
      { table: 'cash_payments', url: EP.CPV.GET_ALL_SEARCH() },
      { table: 'raw_purchases', url: EP.RAW_PURCHASES.GET_ALL },
      { table: 'raw_sales', url: EP.RAW_SALES.GET_ALL },
      { table: 'journal_vouchers', url: '/journal-vouchers' } // Add if exists
    ];

    for (const { table, url } of endpoints) {
      try {
        const response = await api.get(url);
        const serverRecords = response.data;
        
        if (!Array.isArray(serverRecords)) continue;
        
        await database.write(async () => {
          for (const serverRecord of serverRecords) {
            // Check if record exists locally
            const existing = await database.collections
              .get(table)
              .query(Q.where('_id', serverRecord._id || serverRecord.id))
              .fetch();
            
            const serverTimestamp = new Date(serverRecord.updatedAt || serverRecord.createdAt).getTime();
            
            if (existing.length === 0) {
              // New record from server
              await database.collections.get(table).create(record => {
                Object.keys(serverRecord).forEach(key => {
                  if (key !== '_id' && key !== '__v' && key !== 'createdAt') {
                    if (typeof serverRecord[key] === 'object') {
                      record[key] = JSON.stringify(serverRecord[key]);
                    } else {
                      record[key] = serverRecord[key];
                    }
                  }
                });
                record._id = serverRecord._id || serverRecord.id;
                record.synced = true;
                record.updatedAt = serverTimestamp || Date.now();
              });
            } else if (serverTimestamp > (existing[0].updatedAt || 0)) {
              // Update existing record (server version is newer)
              await existing[0].update(() => {
                Object.keys(serverRecord).forEach(key => {
                  if (key !== '_id' && key !== '__v' && key !== 'createdAt') {
                    if (typeof serverRecord[key] === 'object') {
                      existing[0][key] = JSON.stringify(serverRecord[key]);
                    } else {
                      existing[0][key] = serverRecord[key];
                    }
                  }
                });
                existing[0].synced = true;
                existing[0].updatedAt = serverTimestamp;
              });
            }
          }
        });
        
        console.log(`Pulled ${response.data.length} records from ${table}`);
        
      } catch (error) {
        console.error(`Failed to pull ${table}:`, error);
      }
    }
  }

  prepareDataForServer(record) {
    const data = {};
    
    // Convert WatermelonDB record to plain object
    for (const [key, value] of Object.entries(record._raw)) {
      if (key !== 'id' && key !== 'synced' && key !== 'updated_at') {
        // Parse JSON strings back to objects
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        } else {
          data[key] = value;
        }
      }
    }
    
    // Remove local ID if it's a temporary one
    if (data._id && data._id.startsWith('local_')) {
      delete data._id;
    }
    
    return data;
  }
}

export default new SyncService();