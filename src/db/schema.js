// db/schema.js
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    // Customers (matches Customer model)
    tableSchema({
      name: 'customers',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'nameUrdu', type: 'string', isOptional: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'otherPhone', type: 'string', isOptional: true },
        { name: 'cell', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'area', type: 'string', isOptional: true },
        { name: 'contactPerson', type: 'string', isOptional: true },
        { name: 'creditLimit', type: 'number' },
        { name: 'type', type: 'string' },
        { name: 'currentBalance', type: 'number' },
        { name: 'openingBalance', type: 'number' },
        { name: 'openingBalanceType', type: 'string' },
        { name: 'openingBalanceDate', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'imageFront', type: 'string', isOptional: true },
        { name: 'imageBack', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Products (matches Product model)
    tableSchema({
      name: 'products',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'productId', type: 'string' },
        { name: 'code', type: 'string', isOptional: true },
        { name: 'company', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'webCategory', type: 'string', isOptional: true },
        { name: 'rackNo', type: 'string', isOptional: true },
        { name: 'description', type: 'string' },
        { name: 'urduDesc', type: 'string', isOptional: true },
        { name: 'orderName', type: 'string', isOptional: true },
        { name: 'remarks', type: 'string', isOptional: true },
        { name: 'uploadProduct', type: 'boolean' },
        { name: 'packingInfo', type: 'string' }, // JSON string
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Sales (matches Sale model)
    tableSchema({
      name: 'sales',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'invoiceNo', type: 'string' },
        { name: 'invoiceDate', type: 'string' },
        { name: 'saleType', type: 'string' },
        { name: 'saleSource', type: 'string' },
        { name: 'paymentMode', type: 'string' },
        { name: 'customerId', type: 'string', isOptional: true },
        { name: 'customerName', type: 'string' },
        { name: 'customerPhone', type: 'string', isOptional: true },
        { name: 'items', type: 'string' }, // JSON string
        { name: 'subTotal', type: 'number' },
        { name: 'extraDisc', type: 'number' },
        { name: 'discAmount', type: 'number' },
        { name: 'netTotal', type: 'number' },
        { name: 'prevBalance', type: 'number' },
        { name: 'paidAmount', type: 'number' },
        { name: 'balance', type: 'number' },
        { name: 'sendSms', type: 'boolean' },
        { name: 'remarks', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Purchases (matches Purchase model)
    tableSchema({
      name: 'purchases',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'purchaseNo', type: 'string' },
        { name: 'supplierId', type: 'string' },
        { name: 'supplierName', type: 'string' },
        { name: 'purchaseDate', type: 'string' },
        { name: 'items', type: 'string' }, // JSON string
        { name: 'subtotal', type: 'number' },
        { name: 'discount', type: 'number' },
        { name: 'tax', type: 'number' },
        { name: 'totalAmount', type: 'number' },
        { name: 'paidAmount', type: 'number' },
        { name: 'paymentStatus', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Raw Purchases
    tableSchema({
      name: 'raw_purchases',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'invoiceNo', type: 'string' },
        { name: 'items', type: 'string' }, // JSON string
        { name: 'totalAmount', type: 'number' },
        { name: 'purchaseDate', type: 'string' },
        { name: 'supplierName', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Raw Sales
    tableSchema({
      name: 'raw_sales',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'invoiceNo', type: 'string' },
        { name: 'items', type: 'string' }, // JSON string
        { name: 'totalAmount', type: 'number' },
        { name: 'saleDate', type: 'string' },
        { name: 'customerName', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Payments (matches Payment model)
    tableSchema({
      name: 'payments',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'customerId', type: 'string' },
        { name: 'customerType', type: 'string' },
        { name: 'saleId', type: 'string', isOptional: true },
        { name: 'invoiceNo', type: 'string', isOptional: true },
        { name: 'amount', type: 'number' },
        { name: 'paymentDate', type: 'string' },
        { name: 'paymentMode', type: 'string' },
        { name: 'remarks', type: 'string', isOptional: true },
        { name: 'recordedBy', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Quotations (matches Quotation model)
    tableSchema({
      name: 'quotations',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'qtNo', type: 'string' },
        { name: 'qtDate', type: 'string' },
        { name: 'validTill', type: 'string', isOptional: true },
        { name: 'custName', type: 'string', isOptional: true },
        { name: 'custPhone', type: 'string', isOptional: true },
        { name: 'items', type: 'string' }, // JSON string
        { name: 'subTotal', type: 'number' },
        { name: 'discAmt', type: 'number' },
        { name: 'netTotal', type: 'number' },
        { name: 'extraDisc', type: 'number' },
        { name: 'remarks', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Hold Bills (matches HoldBill model)
    tableSchema({
      name: 'hold_bills',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'invoiceNo', type: 'string', isOptional: true },
        { name: 'amount', type: 'number' },
        { name: 'buyerName', type: 'string' },
        { name: 'buyerCode', type: 'string', isOptional: true },
        { name: 'customerId', type: 'string', isOptional: true },
        { name: 'customerType', type: 'string', isOptional: true },
        { name: 'prevBalance', type: 'number' },
        { name: 'extraDiscount', type: 'number' },
        { name: 'paymentMode', type: 'string' },
        { name: 'saleSource', type: 'string' },
        { name: 'items', type: 'string' }, // JSON string
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Damage (matches Damage model)
    tableSchema({
      name: 'damage',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'damageNo', type: 'string' },
        { name: 'damageDate', type: 'string' },
        { name: 'invoiceNo', type: 'string' },
        { name: 'invoiceDate', type: 'string' },
        { name: 'items', type: 'string' }, // JSON string
        { name: 'totalQty', type: 'number' },
        { name: 'totalAmount', type: 'number' },
        { name: 'type', type: 'string' }, // 'in' or 'out'
        { name: 'createdBy', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Journal Vouchers (matches JournalVoucher model)
    tableSchema({
      name: 'journal_vouchers',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'jvNo', type: 'string' },
        { name: 'date', type: 'string' },
        { name: 'debitCode', type: 'string', isOptional: true },
        { name: 'debitAccountId', type: 'string', isOptional: true },
        { name: 'debitAccountTitle', type: 'string' },
        { name: 'debitDescription', type: 'string', isOptional: true },
        { name: 'debitInvoice', type: 'string', isOptional: true },
        { name: 'debitAmount', type: 'number' },
        { name: 'creditCode', type: 'string', isOptional: true },
        { name: 'creditAccountId', type: 'string', isOptional: true },
        { name: 'creditAccountTitle', type: 'string' },
        { name: 'creditDescription', type: 'string', isOptional: true },
        { name: 'creditInvoice', type: 'string', isOptional: true },
        { name: 'creditAmount', type: 'number' },
        { name: 'remarks', type: 'string', isOptional: true },
        { name: 'sendSms', type: 'boolean' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Cash Receipts (matches CashReceipt model)
    tableSchema({
      name: 'cash_receipts',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'receiptNo', type: 'string' },
        { name: 'customerId', type: 'string' },
        { name: 'customerCode', type: 'string' },
        { name: 'customerName', type: 'string' },
        { name: 'customerPhoto', type: 'string', isOptional: true },
        { name: 'amount', type: 'number' },
        { name: 'remarks', type: 'string', isOptional: true },
        { name: 'receiptDate', type: 'string' },
        { name: 'previousBalance', type: 'number' },
        { name: 'newBalance', type: 'number' },
        { name: 'createdBy', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    }),

    // Cash Payments (matches CashPayment model)
    tableSchema({
      name: 'cash_payments',
      columns: [
        { name: '_id', type: 'string', isOptional: true },
        { name: 'cpv_number', type: 'number' },
        { name: 'date', type: 'number' }, // Date as timestamp
        { name: 'code', type: 'string', isOptional: true },
        { name: 'account_title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'invoice', type: 'number' },
        { name: 'amount', type: 'number' },
        { name: 'send_sms', type: 'boolean' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' }
      ]
    })
  ]
});