// db/models/Customer.js
import { Model } from '@nozbe/watermelondb';

export default class Customer extends Model {
  static table = 'customers';
  
  getFormattedBalance() {
    return (this.currentBalance || 0).toLocaleString('en-PK');
  }
  
  isCreditCustomer() {
    return this.type === 'credit';
  }
  
  isWholesale() {
    return this.type === 'wholesale';
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
      code: this.code,
      name: this.name,
      nameUrdu: this.nameUrdu,
      phone: this.phone,
      otherPhone: this.otherPhone,
      cell: this.cell,
      email: this.email,
      address: this.address,
      area: this.area,
      contactPerson: this.contactPerson,
      creditLimit: this.creditLimit,
      type: this.type,
      currentBalance: this.currentBalance,
      openingBalance: this.openingBalance,
      openingBalanceType: this.openingBalanceType,
      openingBalanceDate: this.openingBalanceDate,
      notes: this.notes,
      imageFront: this.imageFront,
      imageBack: this.imageBack,
      updatedAt: this.updated_at
    };
  }
}