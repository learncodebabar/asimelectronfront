// pages/PurchaseOrderListPage.jsx - Purchase Order List with Search, Filter, and Actions
import { useState, useEffect } from "react";
import "../styles/theme.css";
import "../styles/SalePage.css";

const PURCHASE_ORDERS_STORAGE_KEY = "asim_purchase_orders_v1";

// Helper function to extract just the number from Purchase Order ID
const extractPONumber = (poNo) => {
  if (!poNo) return "";
  if (poNo.includes('PO-')) {
    return poNo.split('PO-')[1];
  }
  const num = parseInt(poNo);
  return isNaN(num) ? poNo : String(num);
};

// Helper function to format date
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PK");
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString("en-PK");
};

// Load purchase orders from localStorage
const loadPurchaseOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(PURCHASE_ORDERS_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

// Delete purchase order from storage
const deletePurchaseOrderFromStorage = (poNo) => {
  try {
    const orders = loadPurchaseOrders();
    const filtered = orders.filter(order => order.poNo !== poNo);
    localStorage.setItem(PURCHASE_ORDERS_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
};

/* ══════════════════════════════════════════════════════════
   PRINT HTML BUILDER — Purchase Order (Same as main page)
══════════════════════════════════════════════════════════ */
const buildPurchaseOrderPrintHtml = (purchaseOrder) => {
  const vendorName = purchaseOrder.vendorName || "GUEST VENDOR";
  const vendorPhone = purchaseOrder.vendorPhone || "";
  const rows = (purchaseOrder.items || []).map((it, i) => ({ ...it, sr: i + 1 }));
  const totalQty = rows.reduce((s, r) => s + (r.pcs || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);

  const itemRows = rows
    .map(
      (it) => `
      <tr>
        <td style="padding:6px 3px; text-align:center; border-bottom:1px solid #ddd">${it.sr}</td>
        <td style="padding:6px 3px; border-bottom:1px solid #ddd">${it.code || ""}</td>
        <td style="padding:6px 3px; border-bottom:1px solid #ddd">${it.name || ""}</td>
        <td style="padding:6px 3px; text-align:center; border-bottom:1px solid #ddd">${it.uom || ""}</td>
        <td style="padding:6px 3px; text-align:center; border-bottom:1px solid #ddd">${it.pcs}</td>
        <td style="padding:6px 3px; text-align:right; border-bottom:1px solid #ddd">${Number(it.rate).toLocaleString("en-PK")}</td>
        <td style="padding:6px 3px; text-align:right; border-bottom:1px solid #ddd"><b>${Number(it.amount).toLocaleString("en-PK")}</b></td>
      </tr>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Purchase Order ${extractPONumber(purchaseOrder.poNo)}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        width: 80mm;
        margin: 0 auto;
        padding: 3mm;
      }
      .header {
        text-align: center;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid #000;
      }
      .title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .shop-name {
        font-size: 12px;
        font-weight: bold;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        margin: 5px 0;
        font-size: 10px;
      }
      .divider {
        border-top: 1px dashed #999;
        margin: 5px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 5px 0;
      }
      th {
        background: #f5f5f5;
        padding: 5px 3px;
        text-align: left;
        font-size: 10px;
        border-bottom: 1px solid #000;
      }
      th.r {
        text-align: right;
      }
      th.c {
        text-align: center;
      }
      .totals {
        margin-top: 10px;
        padding-top: 5px;
        border-top: 1px solid #000;
        text-align: right;
      }
      .totals-row {
        margin: 3px 0;
      }
      .totals-row.bold {
        font-weight: bold;
        font-size: 12px;
        margin-top: 5px;
      }
      .footer {
        text-align: center;
        font-size: 8px;
        color: #999;
        margin-top: 15px;
        padding-top: 5px;
        border-top: 1px dashed #ccc;
      }
      @media print {
        @page {
          size: 80mm auto;
          margin: 2mm;
        }
        body {
          width: 76mm;
        }
      }
    </style>
  </head>
  <body>

    <div class="header">
      <div class="title">PURCHASE ORDER</div>
      <div class="shop-name">Asim Electric & Electronic Store</div>
    </div>

    <div class="meta-row">
      <span><b>PO No:</b> ${extractPONumber(purchaseOrder.poNo)}</span>
      <span><b>Date:</b> ${purchaseOrder.poDate}</span>
    </div>
    <div class="meta-row">
      <span><b>Vendor:</b> ${vendorName}</span>
      ${vendorPhone ? `<span><b>Phone:</b> ${vendorPhone}</span>` : ""}
    </div>
    
    <div class="divider"></div>

    <table>
      <thead>
        <tr>
          <th style="width:25px;text-align:center">#</th>
          <th style="width:60px">Code</th>
          <th>Description</th>
          <th style="width:35px;text-align:center">UOM</th>
          <th style="width:40px;text-align:center">Qty</th>
          <th style="width:55px;text-align:right">Rate</th>
          <th style="width:65px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Total Items: ${rows.length} | Total Quantity: ${totalQty}</span>
      </div>
      <div class="totals-row bold">
        <span>GRAND TOTAL: PKR ${totalAmount.toLocaleString("en-PK")}</span>
      </div>
    </div>

    <div class="footer">
      Thank you for your business
    </div>

  </body>
  </html>`;
};

const doPrint = (purchaseOrder) => {
  const w = window.open("", "_blank", "width=650,height=800");
  w.document.write(buildPurchaseOrderPrintHtml(purchaseOrder));
  w.document.close();
  setTimeout(() => w.print(), 400);
};

/* ══════════════════════════════════════════════════════════
   PURCHASE ORDER DETAIL MODAL
══════════════════════════════════════════════════════════ */
function PurchaseOrderDetailModal({ order, onClose, onPrint, onDelete }) {
  if (!order) return null;

  const totalQty = (order.items || []).reduce((s, r) => s + (r.pcs || 0), 0);
  const totalAmount = (order.items || []).reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div
      className="xp-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 2000 }}
    >
      <div className="xp-modal" style={{ width: "90%", maxWidth: "1200px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="xp-modal-tb" style={{ background: "#1e3a5f" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z"/>
          </svg>
          <span className="xp-modal-title">Purchase Order Details — PO-{extractPONumber(order.poNo)}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="xp-modal-body" style={{ padding: "12px", overflow: "auto", flex: 1 }}>
          {/* Order Info */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "12px",
            marginBottom: "16px",
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0"
          }}>
            <div>
              <div style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>PO Number</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1e3a5f" }}>{order.poNo}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>Date</div>
              <div style={{ fontSize: "14px", fontWeight: "500" }}>{order.poDate}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>Vendor Name</div>
              <div style={{ fontSize: "14px", fontWeight: "500" }}>{order.vendorName || "GUEST VENDOR"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>Phone</div>
              <div style={{ fontSize: "14px" }}>{order.vendorPhone || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>Saved At</div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {order.savedAt ? new Date(order.savedAt).toLocaleString() : "—"}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="xp-table-panel">
            <div className="xp-table-scroll" style={{ maxHeight: "400px", overflow: "auto" }}>
              <table className="xp-table" style={{ fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", position: "sticky", top: 0 }}>
                    <th style={{ width: 50, textAlign: "center" }}>#</th>
                    <th style={{ width: 100 }}>Code</th>
                    <th>Product Name</th>
                    <th style={{ width: 80, textAlign: "center" }}>UOM</th>
                    <th style={{ width: 80, textAlign: "right" }}>Qty</th>
                    <th style={{ width: 100, textAlign: "right" }}>Rate (PKR)</th>
                    <th style={{ width: 120, textAlign: "right" }}>Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((it, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: "center" }}>{i + 1}</td>
                      <td>{it.code || "—"}</td>
                      <td>{it.name || it.description || "—"}</td>
                      <td style={{ textAlign: "center" }}>{it.uom || it.measurement || "—"}</td>
                      <td style={{ textAlign: "right" }}>{it.pcs || it.qty || 0}</td>
                      <td style={{ textAlign: "right" }}>{formatCurrency(it.rate)}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold", color: "#1e3a5f" }}>{formatCurrency(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", fontWeight: "bold" }}>
                    <td colSpan="4" style={{ textAlign: "right", padding: "8px" }}>Totals:</td>
                    <td style={{ textAlign: "right", padding: "8px" }}>{totalQty.toLocaleString()}</td>
                    <td style={{ textAlign: "right", padding: "8px" }}></td>
                    <td style={{ textAlign: "right", padding: "8px", color: "#1e3a5f", fontSize: "14px" }}>PKR {totalAmount.toLocaleString("en-PK")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="scm-actions" style={{ 
          padding: "12px", 
          borderTop: "1px solid #e2e8f0", 
          display: "flex", 
          gap: "8px", 
          justifyContent: "flex-end",
          background: "#f8fafc"
        }}>
          <button className="xp-btn" onClick={onClose}>Close</button>
          <button 
            className="xp-btn" 
            style={{ background: "#f59e0b", borderColor: "#d97706", color: "white" }}
            onClick={() => onPrint(order)}
          >
            🖨️ Print
          </button>
          <button 
            className="xp-btn xp-btn-danger" 
            onClick={() => onDelete(order.poNo)}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PURCHASE ORDER LIST PAGE
══════════════════════════════════════════════════════════ */
export default function PurchaseOrderListPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Load purchase orders on mount
  useEffect(() => {
    loadOrders();
  }, []);

  // Filter orders when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(purchaseOrders);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = purchaseOrders.filter(order => 
        order.poNo?.toLowerCase().includes(term) ||
        order.vendorName?.toLowerCase().includes(term) ||
        order.vendorPhone?.toLowerCase().includes(term) ||
        (order.items || []).some(item => 
          item.name?.toLowerCase().includes(term) ||
          item.code?.toLowerCase().includes(term)
        )
      );
      setFilteredOrders(filtered);
    }
  }, [searchTerm, purchaseOrders]);

  const loadOrders = () => {
    setLoading(true);
    const orders = loadPurchaseOrders();
    // Sort by PO number descending (newest first)
    const sorted = orders.sort((a, b) => {
      const getNum = (str) => {
        let numStr = str.toString();
        if (numStr.includes('PO-')) {
          return parseInt(numStr.split('PO-')[1]) || 0;
        }
        return parseInt(numStr) || 0;
      };
      return getNum(b.poNo) - getNum(a.poNo);
    });
    setPurchaseOrders(sorted);
    setFilteredOrders(sorted);
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const handleDelete = (poNo) => {
    if (window.confirm(`Are you sure you want to delete Purchase Order ${poNo}? This action cannot be undone.`)) {
      const success = deletePurchaseOrderFromStorage(poNo);
      if (success) {
        showMsg(`Purchase Order ${poNo} deleted successfully`, "success");
        loadOrders();
        setSelectedOrder(null);
      } else {
        showMsg("Failed to delete purchase order", "error");
      }
    }
  };

  const handlePrint = (order) => {
    doPrint(order);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
  };

  const getSummaryStats = () => {
    const totalOrders = purchaseOrders.length;
    const totalAmount = purchaseOrders.reduce((sum, order) => sum + (order.subTotal || order.netTotal || 0), 0);
    const totalItems = purchaseOrders.reduce((sum, order) => 
      sum + (order.items || []).reduce((s, item) => s + (item.pcs || item.qty || 0), 0), 0
    );
    return { totalOrders, totalAmount, totalItems };
  };

  const stats = getSummaryStats();

  return (
    <div className="sl-page purchaseorder-list-page">
      {/* Title Bar */}
      <div className="xp-titlebar" style={{ background: "#1e3a5f" }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM2 10h2a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2m4 0h6a1 1 0 0 1 0 2H6a1 1 0 0 1 0-2" />
        </svg>
        <span className="xp-tb-title">Purchase Orders List — Asim Electric &amp; Electronic Store</span>
        <div className="xp-tb-actions">
          <div className="xp-tb-divider" />
          <button className="xp-cap-btn">─</button>
          <button className="xp-cap-btn">□</button>
          <button className="xp-cap-btn xp-cap-close">✕</button>
        </div>
      </div>

      {/* Message Alert */}
      {msg.text && (
        <div
          className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`}
          style={{ margin: "8px 12px 0", flexShrink: 0 }}
        >
          {msg.text}
        </div>
      )}

      {/* Main Content */}
      <div className="sl-body" style={{ padding: "12px", flexDirection: "column" }}>
        
        {/* Stats Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "12px",
          marginBottom: "16px"
        }}>
          <div style={{ 
            background: "linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)", 
            padding: "16px", 
            borderRadius: "10px",
            color: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>Total Purchase Orders</div>
            <div style={{ fontSize: "28px", fontWeight: "bold" }}>{stats.totalOrders}</div>
          </div>
          <div style={{ 
            background: "linear-gradient(135deg, #2b6cb0 0%, #3182ce 100%)", 
            padding: "16px", 
            borderRadius: "10px",
            color: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>Total Purchase Value</div>
            <div style={{ fontSize: "22px", fontWeight: "bold" }}>PKR {formatCurrency(stats.totalAmount)}</div>
          </div>
          <div style={{ 
            background: "linear-gradient(135deg, #2c5282 0%, #4299e1 100%)", 
            padding: "16px", 
            borderRadius: "10px",
            color: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>Total Items Purchased</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{stats.totalItems.toLocaleString()}</div>
          </div>
        </div>

        {/* Search and Toolbar */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          marginBottom: "16px",
          alignItems: "center",
          flexWrap: "wrap"
        }}>
          <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
            <input
              type="text"
              className="xp-input"
              placeholder="🔍 Search by PO#, Vendor name, phone, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                padding: "10px 14px", 
                fontSize: "14px",
                borderColor: "#1e3a5f",
                width: "100%"
              }}
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#999"
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button 
            className="xp-btn" 
            onClick={loadOrders}
            style={{ padding: "8px 16px" }}
          >
            🔄 Refresh
          </button>
          <div style={{ fontSize: "13px", color: "#666" }}>
            Showing {filteredOrders.length} of {purchaseOrders.length} orders
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="xp-table-panel" style={{ flex: 1, overflow: "auto" }}>
          <div className="xp-table-scroll" style={{ maxHeight: "calc(100vh - 320px)", overflow: "auto" }}>
            <table className="xp-table" style={{ fontSize: "13px", width: "100%" }}>
              <thead>
                <tr style={{ background: "#1e3a5f", color: "white", position: "sticky", top: 0 }}>
                  <th style={{ width: 50, textAlign: "center", padding: "12px 8px" }}>#</th>
                  <th style={{ width: 120, padding: "12px 8px" }}>PO Number</th>
                  <th style={{ width: 120, padding: "12px 8px" }}>Date</th>
                  <th style={{ minWidth: 180, padding: "12px 8px" }}>Vendor Name</th>
                  <th style={{ width: 130, padding: "12px 8px" }}>Phone</th>
                  <th style={{ width: 80, textAlign: "center", padding: "12px 8px" }}>Items</th>
                  <th style={{ width: 80, textAlign: "center", padding: "12px 8px" }}>Qty</th>
                  <th style={{ width: 130, textAlign: "right", padding: "12px 8px" }}>Total (PKR)</th>
                  <th style={{ width: 150, textAlign: "center", padding: "12px 8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "40px" }}>
                      <div>Loading purchase orders...</div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "40px" }}>
                      <div style={{ fontSize: "14px", color: "#666" }}>
                        {searchTerm ? "No purchase orders match your search" : "No purchase orders found. Create your first purchase order!"}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, idx) => {
                    const totalQty = (order.items || []).reduce((s, r) => s + (r.pcs || r.qty || 0), 0);
                    const totalAmount = order.subTotal || order.netTotal || 
                      (order.items || []).reduce((s, r) => s + (r.amount || 0), 0);
                    
                    return (
                      <tr 
                        key={order.poNo} 
                        style={{ cursor: "pointer", borderBottom: "1px solid #e2e8f0" }}
                        onDoubleClick={() => handleViewDetails(order)}
                      >
                        <td style={{ textAlign: "center", padding: "10px 8px" }}>{idx + 1}</td>
                        <td style={{ fontWeight: "bold", color: "#1e3a5f", padding: "10px 8px" }}>{order.poNo}</td>
                        <td style={{ padding: "10px 8px" }}>{order.poDate}</td>
                        <td style={{ padding: "10px 8px" }}>{order.vendorName || "GUEST VENDOR"}</td>
                        <td style={{ padding: "10px 8px", color: "#666" }}>{order.vendorPhone || "—"}</td>
                        <td style={{ textAlign: "center", padding: "10px 8px" }}>{(order.items || []).length}</td>
                        <td style={{ textAlign: "center", padding: "10px 8px" }}>{totalQty.toLocaleString()}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", color: "#1e3a5f", padding: "10px 8px" }}>
                          PKR {formatCurrency(totalAmount)}
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 8px" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              className="xp-btn xp-btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(order);
                              }}
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                              title="View Details"
                            >
                              👁️ View
                            </button>
                            <button
                              className="xp-btn xp-btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrint(order);
                              }}
                              style={{ padding: "4px 10px", fontSize: "11px", background: "#f59e0b", color: "white", borderColor: "#d97706" }}
                              title="Print"
                            >
                              🖨️ Print
                            </button>
                            <button
                              className="xp-btn xp-btn-sm xp-btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(order.poNo);
                              }}
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                              title="Delete"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <PurchaseOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPrint={handlePrint}
          onDelete={(poNo) => {
            setSelectedOrder(null);
            handleDelete(poNo);
          }}
        />
      )}

      <style>{`
        .purchaseorder-list-page {
          background: #f1f5f9;
        }
        
        .purchaseorder-list-page .xp-table th {
          background: #1e3a5f !important;
          color: white !important;
          font-weight: 600;
        }
        
        .purchaseorder-list-page .xp-table tr:hover {
          background: #e3f2fd !important;
        }
        
        .purchaseorder-list-page .xp-table td {
          border-bottom: 1px solid #e2e8f0;
        }
        
        .purchaseorder-list-page .xp-input:focus {
          border-color: #1e3a5f !important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
        }
      `}</style>
    </div>
  );
}