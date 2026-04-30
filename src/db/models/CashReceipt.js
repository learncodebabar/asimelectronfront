// db/models/CashReceipt.js
import { Model } from '@nozbe/watermelondb';

export default class CashReceipt extends Model {
  static table = 'cash_receipts';
  
  // Get formatted amount
  getFormattedAmount() {
    return (this.amount || 0).toLocaleString('en-PK');
  }
  
  // Get formatted previous balance
  getFormattedPreviousBalance() {
    return (this.previousBalance || 0).toLocaleString('en-PK');
  }
  
  // Get formatted new balance
  getFormattedNewBalance() {
    return (this.newBalance || 0).toLocaleString('en-PK');
  }
  
  // Check if receipt improved balance
  isBeneficial() {
    return this.newBalance < this.previousBalance;
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
      receiptNo: this.receiptNo,
      customerId: this.customerId,
      customerCode: this.customerCode,
      customerName: this.customerName,
      customerPhoto: this.customerPhoto,
      amount: this.amount,
      remarks: this.remarks,
      receiptDate: this.receiptDate,
      previousBalance: this.previousBalance,
      newBalance: this.newBalance,
      createdBy: this.createdBy,
      updatedAt: this.updated_at
    };
  }
}