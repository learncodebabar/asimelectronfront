// db/models/Sale.js - Use methods instead of getters
import { Model } from '@nozbe/watermelondb';

export default class Sale extends Model {
  static table = 'sales';
  
  getItems() {
    if (!this.items) return [];
    try {
      return JSON.parse(this.items);
    } catch {
      return [];
    }
  }
  
  setItems(itemsArray) {
    this.items = JSON.stringify(itemsArray || []);
  }
  
  getTotalQty() {
    return this.getItems().reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
  }
  
  getNetTotal() {
    return (this.netTotal || 0);
  }
  
  async markAsDirty() {
    await this.update(() => {
      this.synced = false;
      this.updated_at = Date.now();
    });
  }
  
  toJSON() {
    return {
      _id: this._id && !this._id.toString().startsWith('local_') ? this._id : undefined,
      invoiceNo: this.invoiceNo,
      invoiceDate: this.invoiceDate,
      saleType: this.saleType,
      saleSource: this.saleSource,
      paymentMode: this.paymentMode,
      customerId: this.customerId,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      items: this.getItems(),
      subTotal: this.subTotal,
      extraDisc: this.extraDisc,
      discAmount: this.discAmount,
      netTotal: this.netTotal,
      prevBalance: this.prevBalance,
      paidAmount: this.paidAmount,
      balance: this.balance,
      sendSms: this.sendSms === 1 || this.sendSms === true,
      remarks: this.remarks,
      status: this.status,
      updatedAt: this.updated_at
    };
  }
}