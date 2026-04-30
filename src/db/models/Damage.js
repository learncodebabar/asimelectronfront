// db/models/Damage.js
import { Model } from '@nozbe/watermelondb';

export default class Damage extends Model {
  static table = 'damage';
  
  // Get items as array
  getItems() {
    if (!this.items) return [];
    try {
      return JSON.parse(this.items);
    } catch {
      return [];
    }
  }
  
  // Set items and calculate totals
  setItems(itemsArray) {
    this.items = JSON.stringify(itemsArray || []);
    // Calculate totals
    this.totalQty = itemsArray.reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
    this.totalAmount = itemsArray.reduce((sum, item) => sum + (item.amount || 0), 0);
  }
  
  // Get damage type display
  getTypeDisplay() {
    return this.type === 'in' ? '📥 Damage In' : '📤 Damage Out';
  }
  
  // Get number of items
  getItemCount() {
    return this.getItems().length;
  }
  
  // Get formatted total amount
  getFormattedTotalAmount() {
    return (this.totalAmount || 0).toLocaleString('en-PK');
  }
  
  // Get formatted total quantity
  getFormattedTotalQty() {
    return (this.totalQty || 0).toLocaleString('en-PK');
  }
  
  // Get damage type badge style
  getTypeBadgeStyle() {
    return this.type === 'in' 
      ? { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }
      : { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' };
  }
  
  // Calculate totals (for validation)
  calculateTotals() {
    const items = this.getItems();
    const totalQty = items.reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    return { totalQty, totalAmount };
  }
  
  // Validate totals match
  validateTotals() {
    const calculated = this.calculateTotals();
    return calculated.totalQty === (this.totalQty || 0) && 
           calculated.totalAmount === (this.totalAmount || 0);
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
      damageNo: this.damageNo,
      damageDate: this.damageDate,
      invoiceNo: this.invoiceNo,
      invoiceDate: this.invoiceDate,
      items: this.getItems(),
      totalQty: this.totalQty,
      totalAmount: this.totalAmount,
      type: this.type,
      createdBy: this.createdBy,
      notes: this.notes,
      updatedAt: this.updated_at
    };
  }
}