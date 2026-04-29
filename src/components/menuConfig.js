// components/menuConfig.jsx
import { PERMISSIONS } from '../constants/permissions';

export const getMenuConfig = (hasPermission) => {
  // Define all menu items with their permissions (show all, mark disabled)
  const defineItems = [
    { label: "Products", route: "/products", permission: PERMISSIONS.PRODUCTS_VIEW },
    { label: "Customers", route: "/customers", permission: PERMISSIONS.CUSTOMERS_VIEW },
    { label: "Suppliers", route: "/suppliers", permission: PERMISSIONS.SUPPLIERS_VIEW },
    { label: "Chart of Products", route: "/chart-of-products", permission: PERMISSIONS.CHART_OF_PRODUCTS_VIEW },
  ];

  const voucherItems = [
    { label: "Cash Sale", route: "/sale", shortcut: "F3", permission: PERMISSIONS.CASH_SALE },
    { label: "Cash Receipts", route: "/cash-receipts", permission: PERMISSIONS.CASH_RECEIPTS },
    { label: "Cash Payment", route: "/cash-payment", permission: PERMISSIONS.CASH_PAYMENT },
    { label: "Bank Payment", route: "/bank-payments", permission: PERMISSIONS.BANK_PAYMENT },
    { label: "───" },
    { label: "Manual Sale Bill", route: "/manual-sale", permission: PERMISSIONS.MANUAL_SALE },
    { label: "Manual Purchase Bill", route: "/manual-purchase", permission: PERMISSIONS.MANUAL_PURCHASE },
    { label: "───" },
    { label: "Sale Return", route: "/sale-return", permission: PERMISSIONS.SALE_RETURN },
    { label: "Purchase Return", route: "/purchase-return", permission: PERMISSIONS.PURCHASE_RETURN },
    { label: "Quotation", route: "/quotation-page", shortcut: "Ctrl+Q", permission: PERMISSIONS.QUOTATION },
    { label: "Purchase Order", route: "/purchase-order", permission: PERMISSIONS.PURCHASE_ORDER },
    { label: "───" },
    { label: "Raw Sale", route: "/raw-sale", permission: PERMISSIONS.RAW_SALE },
    { label: "Damage In", route: "/damage-in", permission: PERMISSIONS.DAMAGE_IN },
    { label: "Damage Out", route: "/damage-out", permission: PERMISSIONS.DAMAGE_OUT },
    { label: "Raw Purchase", route: "/raw-purchase", permission: PERMISSIONS.RAW_PURCHASE },
    { label: "Purchase", route: "/purchase", permission: PERMISSIONS.PURCHASE },
    { label: "───" },
    { label: "Exchange", route: "/exchange", permission: PERMISSIONS.EXCHANGE },
    { label: "Expenses", route: "/expenses", permission: PERMISSIONS.EXPENSES },
    { label: "Product History", route: "/product-history", permission: PERMISSIONS.PRODUCT_HISTORY },
  ];

  const customerItems = [
    { label: "Debit Customers", route: "/debit-customers", permission: PERMISSIONS.DEBIT_CUSTOMERS_VIEW },
    { label: "Credit Customers", route: "/credit-customers", permission: PERMISSIONS.CREDIT_CUSTOMERS_VIEW },
    { label: "All Customers", route: "/customers", permission: PERMISSIONS.CUSTOMERS_VIEW },
    { label: "───" },
    { label: "Accounts Receivable", route: "/receivables", permission: PERMISSIONS.RECEIVABLES },
    { label: "Accounts Payable", route: "/payables", permission: PERMISSIONS.PAYABLES },
  ];

  const reportItems = [
    { label: "Chart of Products", route: "/chart-of-products", permission: PERMISSIONS.CHART_OF_PRODUCTS_VIEW },
    { label: "───" },
    { label: "P.O", route: "/purchase-order-list", permission: PERMISSIONS.PURCHASE_ORDER_LIST },
    { label: "Purchase", route: "/purchase-list", permission: PERMISSIONS.PURCHASE_LIST },
    { label: "Purchase w/o Values", route: "/purchase-without-values", permission: PERMISSIONS.PURCHASE_WITHOUT_VALUES },
    { label: "Purchase Return", route: "/purchase-return-list", permission: PERMISSIONS.PURCHASE_RETURN_LIST },
    { label: "Purchase Report", route: "/purchase-report", permission: PERMISSIONS.PURCHASE_REPORT },
    { label: "───" },
    { label: "Quotation", route: "/quotation-list", permission: PERMISSIONS.QUOTATION_LIST },
    { label: "───" },
    { label: "Sale", route: "/sale-history", permission: PERMISSIONS.SALE_HISTORY },
    { label: "Sale Party wise", route: "/sale-party-wise", permission: PERMISSIONS.SALE_PARTY_WISE },
    { label: "Top Sales", route: "/top-sales", permission: PERMISSIONS.TOP_SALES },
    { label: "Sales Return", route: "/sales-return", permission: PERMISSIONS.SALES_RETURN },
    { label: "Sale Return w/o Values", route: "/sale-return-without-values", permission: PERMISSIONS.SALE_RETURN_WITHOUT_VALUES },
    { label: "───" },
    { label: "Exchange", route: "/exchange-list", permission: PERMISSIONS.EXCHANGE_LIST },
    { label: "───" },
    { label: "Profit Report Number wise", route: "/profit-report-number-wise", permission: PERMISSIONS.PROFIT_REPORT },
    { label: "Raw Purchase", route: "/raw-purchase-list", permission: PERMISSIONS.RAW_PURCHASE_LIST },
    { label: "Raw Sale", route: "/raw-sale-list", permission: PERMISSIONS.RAW_SALE_LIST },
    { label: "───" },
    { label: "Counter Summary", route: "/counter-summary", permission: PERMISSIONS.COUNTER_SUMMARY },
    { label: "Stock", route: "/stock-report", permission: PERMISSIONS.STOCK_REPORT },
    { label: "───" },
    { label: "Cash Receipt", route: "/cash-receipts-report", permission: PERMISSIONS.CASH_RECEIPT_REPORT },
    { label: "Cash Payment", route: "/cash-payment-report", permission: PERMISSIONS.CASH_PAYMENT_REPORT },
    { label: "Bank Deposits", route: "/bank-deposits", permission: PERMISSIONS.BANK_DEPOSITS },
    { label: "Bank Payments", route: "/bank-payments", permission: PERMISSIONS.BANK_PAYMENTS },
    { label: "───" },
    { label: "Journal Voucher", route: "/journal-voucher-list", permission: PERMISSIONS.JOURNAL_VOUCHER_LIST },
    { label: "Expenses", route: "/expenses-list", permission: PERMISSIONS.EXPENSES_LIST },
    { label: "───" },
    { label: "Accounts Payable / Receivable", route: "/accounts-payable-receivable", permission: PERMISSIONS.ACCOUNTS_PAYABLE_RECEIVABLE },
    { label: "General Ledger", route: "/general-ledger", permission: PERMISSIONS.GENERAL_LEDGER },
  ];

  const finalAccountItems = [
    { label: "General Ledger", route: "/general-ledger", permission: PERMISSIONS.GENERAL_LEDGER },
    { label: "Trial Balance", route: "/trial-balance", permission: PERMISSIONS.TRIAL_BALANCE },
    { label: "Balance Sheet", route: "/balance-sheet", permission: PERMISSIONS.BALANCE_SHEET },
    { label: "Profit & Loss", route: "/profit-loss", permission: PERMISSIONS.PROFIT_LOSS },
    { label: "───" },
    { label: "Cash Book", route: "/cash-book", permission: PERMISSIONS.CASH_BOOK },
    { label: "Receivables", route: "/receivables", permission: PERMISSIONS.RECEIVABLES },
    { label: "Payables", route: "/payables", permission: PERMISSIONS.PAYABLES },
  ];

  const toolItems = [
    { label: "Company Information", route: "/company-info", permission: PERMISSIONS.COMPANY_INFO },
    { label: "Backup Data", route: "/backup", permission: PERMISSIONS.BACKUP },
    { label: "───" },
    { label: "Settings", route: "/settings", permission: PERMISSIONS.SETTINGS },
    { label: "Preferences", route: "/preferences", permission: PERMISSIONS.PREFERENCES },
    { label: "User Management", route: "/user-management", permission: PERMISSIONS.USER_MANAGEMENT },
  ];

  const helpItems = [
    { label: "About Software", route: "/about", permission: PERMISSIONS.ABOUT },
    { label: "Contact Support", route: "/support", permission: PERMISSIONS.SUPPORT },
  ];

  const allMenus = [
    { label: "Define", items: defineItems },
    { label: "Vouchers", items: voucherItems },
    { label: "Customers", items: customerItems },
    { label: "Reports", items: reportItems },
    { label: "Final Accounts", items: finalAccountItems },
    { label: "Tools", items: toolItems },
    { label: "Help", items: helpItems },
  ];

  // Return all menus with disabled property
  return allMenus.map(menu => ({
    ...menu,
    items: menu.items.map(item => ({
      ...item,
      disabled: item.label !== "───" && item.permission ? !hasPermission(item.permission) : false
    }))
  }));
};