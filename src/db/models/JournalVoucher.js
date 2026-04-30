// db/models/JournalVoucher.js
import { Model } from '@nozbe/watermelondb';

export default class JournalVoucher extends Model {
  static table = 'journal_vouchers';
  
  // Check if both sides balance
  isBalanced() {
    return (this.debitAmount || 0) === (this.creditAmount || 0);
  }
  
  // Get balance difference
  getBalanceDifference() {
    return (this.debitAmount || 0) - (this.creditAmount || 0);
  }
  
  // Get formatted JV number
  getFormattedJvNo() {
    return this.jvNo || 'JV-New';
  }
  
  // Get formatted amounts
  getFormattedDebitAmount() {
    return (this.debitAmount || 0).toLocaleString('en-PK');
  }
  
  getFormattedCreditAmount() {
    return (this.creditAmount || 0).toLocaleString('en-PK');
  }
  
  // Get formatted date
  getFormattedDate() {
    if (!this.date) return 'N/A';
    if (this.date.includes('-')) return this.date;
    return new Date(this.date).toLocaleDateString('en-PK');
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
  async markAsSynced(serverId = null, serverJvNo = null) {
    await this.update(() => {
      if (serverId) this._id = serverId;
      if (serverJvNo) this.jvNo = serverJvNo;
      this.synced = true;
      this.updated_at = Date.now();
      this.syncError = null;
    });
  }
  
  // Convert to JSON for API
  toJSON() {
    return {
      _id: this._id && !this._id.toString().startsWith('local_') ? this._id : undefined,
      jvNo: this.jvNo,
      date: this.date,
      debitCode: this.debitCode,
      debitAccountId: this.debitAccountId,
      debitAccountTitle: this.debitAccountTitle,
      debitDescription: this.debitDescription,
      debitInvoice: this.debitInvoice,
      debitAmount: this.debitAmount,
      creditCode: this.creditCode,
      creditAccountId: this.creditAccountId,
      creditAccountTitle: this.creditAccountTitle,
      creditDescription: this.creditDescription,
      creditInvoice: this.creditInvoice,
      creditAmount: this.creditAmount,
      remarks: this.remarks,
      sendSms: this.sendSms === 1 || this.sendSms === true,
      updatedAt: this.updated_at
    };
  }
}