// db/models/Payment.js
import { Model } from '@nozbe/watermelondb';

export default class Payment extends Model {
  static table = 'payments';
  
  // Get formatted amount
  getFormattedAmount() {
    return (this.amount || 0).toLocaleString('en-PK');
  }
  
  // Get payment mode with icon
  getPaymentModeDisplay() {
    const icons = {
      'Cash': '💵',
      'Bank': '🏦',
      'Cheque': '📝',
      'Online': '💻'
    };
    return `${icons[this.paymentMode] || '💰'} ${this.paymentMode}`;
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
      customerId: this.customerId,
      customerType: this.customerType,
      saleId: this.saleId,
      invoiceNo: this.invoiceNo,
      amount: this.amount,
      paymentDate: this.paymentDate,
      paymentMode: this.paymentMode,
      remarks: this.remarks,
      recordedBy: this.recordedBy,
      updatedAt: this.updated_at
    };
  }
}