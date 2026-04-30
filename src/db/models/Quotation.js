// db/models/Quotation.js
import { Model } from '@nozbe/watermelondb';

export default class Quotation extends Model {
  static table = 'quotations';
  
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
    return this.getItems().reduce((sum, item) => sum + (item.qty || 0), 0);
  }
  
  // Get number of items
  getItemCount() {
    return this.getItems().length;
  }
  
  // Check if quotation is valid
  isValid() {
    if (!this.validTill) return true;
    const today = new Date().toISOString().split('T')[0];
    return this.validTill >= today;
  }
  
  // Get formatted amounts
  getFormattedSubTotal() {
    return (this.subTotal || 0).toLocaleString('en-PK');
  }
  
  getFormattedNetTotal() {
    return (this.netTotal || 0).toLocaleString('en-PK');
  }
  
  getFormattedExtraDisc() {
    return (this.extraDisc || 0).toLocaleString('en-PK');
  }
  
  // Get total discount
  getTotalDiscount() {
    return (this.discAmt || 0) + (this.extraDisc || 0);
  }
  
  // Get validity status
  getValidityStatus() {
    if (!this.validTill) return 'No expiry';
    const today = new Date().toISOString().split('T')[0];
    if (this.validTill < today) return 'Expired';
    if (this.validTill === today) return 'Expires today';
    return `Valid until ${this.validTill}`;
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
      qtNo: this.qtNo,
      qtDate: this.qtDate,
      validTill: this.validTill,
      custName: this.custName,
      custPhone: this.custPhone,
      items: this.getItems(),
      subTotal: this.subTotal,
      discAmt: this.discAmt,
      netTotal: this.netTotal,
      extraDisc: this.extraDisc,
      remarks: this.remarks,
      updatedAt: this.updated_at
    };
  }
}