// db/models/CashPayment.js
import { Model } from '@nozbe/watermelondb';

export default class CashPayment extends Model {
  static table = 'cash_payments';
  
  // Get formatted CPV number
  getFormattedCpvNumber() {
    return String(this.cpv_number || 0).padStart(8, '0');
  }
  
  // Get formatted amount
  getFormattedAmount() {
    return (this.amount || 0).toLocaleString('en-PK');
  }
  
  // Get formatted date
  getFormattedDate() {
    if (!this.date) return 'N/A';
    return new Date(this.date).toLocaleDateString('en-PK');
  }
  
  // Check if SMS should be sent
  shouldSendSms() {
    return this.send_sms === 1 || this.send_sms === true;
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
      cpv_number: this.cpv_number,
      date: this.date,
      code: this.code,
      account_title: this.account_title,
      description: this.description,
      invoice: this.invoice,
      amount: this.amount,
      send_sms: this.send_sms,
      updatedAt: this.updated_at
    };
  }
}