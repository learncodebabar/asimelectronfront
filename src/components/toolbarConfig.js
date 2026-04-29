// components/toolbarConfig.js
const ALL_BUTTONS = [
  { icon: "purchase", label: "Purchase", route: "/purchase", permission: "purchase" },
  { icon: "sale", label: "Sale", route: "/sale", permission: "cash_sale" },
  { icon: "saleReturn", label: "Sale Return", route: "/sale-return", permission: "sale_return" },
  { icon: "rawPurchase", label: "Raw Purchase", route: "/raw-purchase", permission: "raw_purchase" },
  { icon: "ledgers", label: "Gen. Ledgers", route: "/general-ledger", permission: "general_ledger" },
  { icon: "products", label: "Prod. History", route: "/product-history", permission: "product_history" },
  { divider: true },
  { icon: "exit", label: "Exit", action: "exit" },
];

const TOOLBAR_CONFIG = {
  "/sale": ALL_BUTTONS,
  "/sale-return": ALL_BUTTONS,
  "/products": ALL_BUTTONS,
  "/customers": ALL_BUTTONS,
  "/sale-history": ALL_BUTTONS,
  "/purchase": ALL_BUTTONS,
  "/raw-purchase": ALL_BUTTONS,
  "/general-ledger": ALL_BUTTONS,
  "/quotation": ALL_BUTTONS,
  DEFAULT: ALL_BUTTONS,
};

export default TOOLBAR_CONFIG;