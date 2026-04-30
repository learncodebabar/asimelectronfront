// hooks/useOfflineSync.js
import { useEffect, useRef } from 'react';
import { database, queueSync, processSyncQueue } from '../db';

export const useOfflineSync = () => {
  const syncInProgress = useRef(false);
  
  useEffect(() => {
    // Initial sync when app loads
    if (navigator.onLine) {
      processSyncQueue();
    }
    
    // Network listeners
    const handleOnline = () => {
      console.log('Online - syncing pending data');
      processSyncQueue();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
  
  const saveWithOffline = async (table, data, apiCall) => {
    try {
      // Try API first if online
      if (navigator.onLine) {
        const response = await apiCall();
        
        // Also save to local DB for offline access
        await database.write(async () => {
          const collection = database.collections.get(table);
          const existing = await collection.query(Q.where('_id', response.data.data._id)).fetch();
          
          if (existing.length === 0) {
            await collection.create(record => {
              Object.assign(record, response.data.data);
              record.synced = true;
              record.updatedAt = Date.now();
            });
          }
        });
        
        return response;
      } else {
        // Offline - save to local DB and queue for sync
        const localId = generateLocalId();
        
        await database.write(async () => {
          await database.collections.get(table).create(record => {
            record._id = localId;
            Object.assign(record, data);
            record.synced = false;
            record.updatedAt = Date.now();
          });
        });
        
        // Queue for later sync
        queueSync(table, data);
        
        return { 
          data: { 
            success: true, 
            data: { ...data, _id: localId },
            offline: true 
          } 
        };
      }
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    }
  };
  
  return { saveWithOffline };
};