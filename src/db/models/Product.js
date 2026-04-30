// db/models/Sale.js
import { Model } from '@nozbe/watermelondb';

export default class Sale extends Model {
  static table = 'sales';
  
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
  getTotalQty() {
    return this.getItems().reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
  }
  
  // Get number of items
  getItemCount() {
    return this.getItems().length;
  }
  
  // Get net total
  getNetTotal() {
    return this.netTotal || 0;
  }
  
  // Get balance
  getBalance() {
    return this.balance || 0;
  }
  
  // Get formatted net total
  getFormattedNetTotal() {
    return (this.netTotal || 0).toLocaleString('en-PK');
  }
  
  // Get formatted balance
  getFormattedBalance() {
    return (this.balance || 0).toLocaleString('en-PK');
  }
  
  // Get formatted paid amount
  getFormattedPaidAmount() {
    return (this.paidAmount || 0).toLocaleString('en-PK');
  }
  
  // Check if sale is credit
  isCreditSale() {
    return this.paymentMode === 'Credit';
  }
  
  // Check if sale is fully paid
  isFullyPaid() {
    return this.balance <= 0;
  }
  
  // Check if sale is partially paid
  isPartiallyPaid() {
    return this.balance > 0 && this.paidAmount > 0;
  }
  
  // Get sale status
  getStatus() {
    if (this.status === 'Cancelled') return 'Cancelled';
    if (this.balance > 0) return 'Partial';
    return 'Completed';
  }
  
  // Get status badge color
  getStatusBadge() {
    switch(this.getStatus()) {
      case 'Completed': return { bg: '#d1fae5', color: '#065f46', text: '✅ Completed' };
      case 'Partial': return { bg: '#fef3c7', color: '#92400e', text: '⚠️ Partial' };
      case 'Cancelled': return { bg: '#fee2e2', color: '#991b1b', text: '❌ Cancelled' };
      default: return { bg: '#e5e7eb', color: '#374151', text: 'Unknown' };
    }
  }
  
  // Get sale type display
  getSaleTypeDisplay() {
    const types = {
      sale: 'Sale',
      return: 'Return',
      purchase: 'Purchase',
      'raw-sale': 'Raw Sale',
      'raw-purchase': 'Raw Purchase',
      debit: 'Debit'
    };
    return types[this.saleType] || this.saleType;
  }
  
  // Get payment mode with icon
  getPaymentModeDisplay() {
    const icons = {
      Cash: '💵 Cash',
      Credit: '💳 Credit',
      Bank: '🏦 Bank',
      Cheque: '📝 Cheque',
      Partial: '💰 Partial'
    };
    return icons[this.paymentMode] || this.paymentMode;
  }
  
  // Get formatted date
  getFormattedDate() {
    if (!this.invoiceDate) return 'N/A';
    return this.invoiceDate;
  }
  
  // Get customer display name
  getCustomerDisplay() {
    return this.customerName || 'COUNTER SALE';
  }
  
  // Check if sale has remarks/notes
  hasRemarks() {
    return this.remarks && this.remarks.trim().length > 0;
  }
  
  // Get invoice number with padding
  getFormattedInvoiceNo() {
    return String(this.invoiceNo).padStart(5, '0');
  }
  
  // Calculate discount percentage
  getDiscountPercentage() {
    if (this.subTotal <= 0) return 0;
    return ((this.extraDisc || 0) / this.subTotal) * 100;
  }
  
  // Mark as dirty (needs sync)
  async markAsDirty() {
    await this.update(() => {
      this.synced = false;
      this.updated_at = Date.now();
      this.syncError = null;
    });
  }
  
  // Mark as synced after server confirmation
  async markAsSynced(serverId = null) {
    await this.update(() => {
      if (serverId) this._id = serverId;
      this.synced = true;
      this.updated_at = Date.now();
      this.syncError = null;
    });
  }
  
  // Mark as failed with error
  async markAsFailed(error) {
    await this.update(() => {
      this.syncError = error;
      this.updated_at = Date.now();
    });
  }
  
  // Update payment (add received amount)
  async addPayment(amount) {
    const newPaidAmount = (this.paidAmount || 0) + amount;
    const newBalance = (this.netTotal || 0) - newPaidAmount;
    
    await this.update(() => {
      this.paidAmount = newPaidAmount;
      this.balance = newBalance;
      this.synced = false;
      this.updated_at = Date.now();
    });
  }
  
  // Cancel sale
  async cancel() {
    await this.update(() => {
      this.status = 'Cancelled';
      this.synced = false;
      this.updated_at = Date.now();
    });
  }
  
  // Validate sale data
  validate() {
    const errors = [];
    if (!this.invoiceNo) errors.push('Invoice number is required');
    if (!this.invoiceDate) errors.push('Invoice date is required');
    if (!this.customerName) errors.push('Customer name is required');
    if (!this.items || this.getItems().length === 0) errors.push('At least one item is required');
    if (this.netTotal < 0) errors.push('Net total cannot be negative');
    if (this.paidAmount < 0) errors.push('Paid amount cannot be negative');
    if (this.balance < 0) errors.push('Balance cannot be negative');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Convert to plain object for API submission
  toJSON() {
    return {
      _id: this._id && !this._id.toString().startsWith('local_') ? this._id : undefined,
      invoiceNo: parseInt(this.invoiceNo) || 1,
      invoiceDate: this.invoiceDate,
      saleType: this.saleType || 'sale',
      saleSource: this.saleSource || 'cash',
      paymentMode: this.paymentMode || 'Cash',
      customerId: this.customerId || undefined,
      customerName: this.customerName || 'COUNTER SALE',
      customerPhone: this.customerPhone || '',
      items: this.getItems(),
      subTotal: this.subTotal || 0,
      extraDisc: this.extraDisc || 0,
      discAmount: this.discAmount || 0,
      netTotal: this.netTotal || 0,
      prevBalance: this.prevBalance || 0,
      paidAmount: this.paidAmount || 0,
      balance: this.balance || 0,
      sendSms: this.sendSms === 1 || this.sendSms === true,
      remarks: this.remarks || '',
      status: this.status || 'Active',
      updatedAt: this.updated_at
    };
  }
}