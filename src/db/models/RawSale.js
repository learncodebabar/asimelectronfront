// db/models/RawSale.js
import { Model } from '@nozbe/watermelondb';

export default class RawSale extends Model {
  static table = 'raw_sales';
  
  // Get items as array
  getItems() {
    if (!this.items) return [];
    try {
      return JSON.parse(this.items);
    } catch {
      return [];
    }
  }
  
  // Set items
  setItems(itemsArray) {
    this.items = JSON.stringify(itemsArray || []);
  }
  
  // Get total quantity
  getTotalQuantity() {
    return this.getItems().reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0);
  }
  
  // Get number of items
  getItemCount() {
    return this.getItems().length;
  }
  
  // Get formatted total amount
  getFormattedTotalAmount() {
    return (this.totalAmount || 0).toLocaleString('en-PK');
  }
  
  // Mark as dirty
  async markAsDirty() {
    await this.update(() => {
      this.synced = false;
      this.updated_at = Date.now();
      this.syncError = null;
    });
  }
  
  // Mark as synced
  async markAsSynced(serverId = null) {
    await this.update(() => {
      if (serverId) this._id = serverId;
      this.synced = true;
      this.updated_at = Date.now();
      this.syncError = null;
    });
  }
  
  // Convert to JSON for API
  toJSON() {
    return {
      _id: this._id && !this._id.toString().startsWith('local_') ? this._id : undefined,
      invoiceNo: this.invoiceNo,
      items: this.getItems(),
      totalAmount: this.totalAmount,
      saleDate: this.saleDate,
      customerName: this.customerName,
      updatedAt: this.updated_at
    };
  }
}