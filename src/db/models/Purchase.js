// db/models/Purchase.js
import { Model } from '@nozbe/watermelondb';

export default class Purchase extends Model {
  static table = 'purchases';
  
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
    return this.getItems().reduce((sum, item) => sum + (item.quantity || 0), 0);
  }
  
  // Get remaining amount
  getRemainingAmount() {
    return (this.totalAmount || 0) - (this.paidAmount || 0);
  }
  
  // Check if fully paid
  isFullyPaid() {
    return this.getRemainingAmount() <= 0;
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
      purchaseNo: this.purchaseNo,
      supplierId: this.supplierId,
      supplierName: this.supplierName,
      purchaseDate: this.purchaseDate,
      items: this.getItems(),
      subtotal: this.subtotal,
      discount: this.discount,
      tax: this.tax,
      totalAmount: this.totalAmount,
      paidAmount: this.paidAmount,
      paymentStatus: this.paymentStatus,
      notes: this.notes,
      updatedAt: this.updated_at
    };
  }
}