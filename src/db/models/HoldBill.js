// db/models/HoldBill.js
import { Model } from '@nozbe/watermelondb';

export default class HoldBill extends Model {
  static table = 'hold_bills';
  
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
  
  // Get number of items
  getItemCount() {
    return this.getItems().length;
  }
  
  // Get total quantity
  getTotalQuantity() {
    return this.getItems().reduce((sum, item) => sum + (item.pcs || 0), 0);
  }
  
  // Get formatted amount
  getFormattedAmount() {
    return (this.amount || 0).toLocaleString('en-PK');
  }
  
  // Get formatted previous balance
  getFormattedPrevBalance() {
    return (this.prevBalance || 0).toLocaleString('en-PK');
  }
  
  // Get formatted extra discount
  getFormattedExtraDiscount() {
    return (this.extraDiscount || 0).toLocaleString('en-PK');
  }
  
  // Get customer display
  getCustomerDisplay() {
    return this.buyerName || 'COUNTER SALE';
  }
  
  // Get display title
  getDisplayTitle() {
    return `${this.invoiceNo} - ${this.getCustomerDisplay()} - ${this.getFormattedAmount()}`;
  }
  
  // Get age in days
  getAgeInDays() {
    if (!this.created_at) return 0;
    const created = new Date(this.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  // Get age display
  getAgeDisplay() {
    const days = this.getAgeInDays();
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }
  
  // Check if hold bill is old (more than 7 days)
  isOld() {
    return this.getAgeInDays() > 7;
  }
  
  // Calculate net amount after discount
  getNetAmount() {
    return (this.amount || 0) - (this.extraDiscount || 0);
  }
  
  // Get formatted net amount
  getFormattedNetAmount() {
    return this.getNetAmount().toLocaleString('en-PK');
  }
  
  // Mark as dirty (needs sync)
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
  
  // Mark as failed
  async markAsFailed(error) {
    await this.update(() => {
      this.syncError = error;
      this.updated_at = Date.now();
    });
  }
  
  // Convert to JSON for API
  toJSON() {
    return {
      _id: this._id && !this._id.toString().startsWith('local_') ? this._id : undefined,
      invoiceNo: this.invoiceNo,
      amount: this.amount,
      buyerName: this.buyerName,
      buyerCode: this.buyerCode,
      customerId: this.customerId,
      customerType: this.customerType,
      prevBalance: this.prevBalance,
      extraDiscount: this.extraDiscount,
      paymentMode: this.paymentMode,
      saleSource: this.saleSource,
      items: this.getItems(),
      createdAt: this.created_at,
      updatedAt: this.updated_at
    };
  }
}