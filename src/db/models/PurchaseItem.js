// db/models/PurchaseItem.js (optional - for reference)
// This is not a WatermelonDB model, just a reference structure
const purchaseItemSchema = {
  productId: '',      // mongoose.Schema.Types.ObjectId
  productName: '',    // String, required
  quantity: 0,        // Number, required
  unitPrice: 0,       // Number, required
  total: 0            // Number, required
};

// Example usage:
const examplePurchase = {
  purchaseNo: 'PO-00001',
  supplierId: 'supplier_object_id',
  supplierName: 'ABC Suppliers',
  purchaseDate: '2024-01-15',
  items: [
    {
      productId: 'product_object_id',
      productName: 'LED Bulb 12W',
      quantity: 100,
      unitPrice: 150,
      total: 15000
    },
    {
      productId: 'product_object_id_2',
      productName: 'Wire 2.5mm',
      quantity: 50,
      unitPrice: 2500,
      total: 125000
    }
  ],
  subtotal: 140000,
  discount: 5000,
  tax: 0,
  totalAmount: 135000,
  paidAmount: 50000,
  paymentStatus: 'Partial',
  notes: 'Initial payment made'
};