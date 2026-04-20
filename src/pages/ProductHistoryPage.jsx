// pages/ProductHistoryPage.jsx - Complete Product Transaction History
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/SalePage.css";

/* ── helpers ── */
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-PK", {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString("en-PK");
};

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString("en-PK");
};

// Transaction type badges with different colors
const TransactionBadge = ({ type }) => {
  const styles = {
    PURCHASE: { background: "#10b981", color: "white", label: "Purchase" },
    SALE: { background: "#3b82f6", color: "white", label: "Sale" },
    SALE_RETURN: { background: "#f59e0b", color: "white", label: "Sale Return" },
    PURCHASE_RETURN: { background: "#ef4444", color: "white", label: "Purchase Return" },
  };
  
  const style = styles[type] || { background: "#6b7280", color: "white", label: type };
  
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: "bold",
      background: style.background,
      color: style.color,
    }}>
      {style.label}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════
   PRODUCT SEARCH MODAL
══════════════════════════════════════════════════════════ */
function ProductSearchModal({ allProducts, onSelect, onClose }) {
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [company, setCompany] = useState("");
  const [rows, setRows] = useState([]);
  const [hiIdx, setHiIdx] = useState(0);
  const rDesc = useRef(null);
  const rCat = useRef(null);
  const rCompany = useRef(null);
  const tbodyRef = useRef(null);

  const buildFlat = useCallback((products, d, c, co) => {
    const res = [];
    const ld = d.trim().toLowerCase(),
      lc = c.trim().toLowerCase(),
      lo = co.trim().toLowerCase();
    products.forEach((p) => {
      const ok =
        (!ld || p.description?.toLowerCase().includes(ld) || p.code?.toLowerCase().includes(ld)) &&
        (!lc || p.category?.toLowerCase().includes(lc)) &&
        (!lo || p.company?.toLowerCase().includes(lo));
      if (!ok) return;
      const _name = [p.category, p.description, p.company].filter(Boolean).join(" ");
      res.push({
        ...p,
        _name,
        _meas: p.packingInfo?.[0]?.measurement || "",
        _rate: p.packingInfo?.[0]?.saleRate || 0,
      });
    });
    return res;
  }, []);

  useEffect(() => {
    rDesc.current?.focus();
    setRows(buildFlat(allProducts, "", "", ""));
  }, [allProducts, buildFlat]);

  useEffect(() => {
    const f = buildFlat(allProducts, desc, cat, company);
    setRows(f);
    setHiIdx(f.length > 0 ? 0 : -1);
  }, [desc, cat, company, allProducts, buildFlat]);

  useEffect(() => {
    if (tbodyRef.current && hiIdx >= 0)
      tbodyRef.current.children[hiIdx]?.scrollIntoView({ block: "nearest" });
  }, [hiIdx]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHiIdx((i) => Math.min(i + 1, rows.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHiIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (hiIdx >= 0 && rows[hiIdx]) onSelect(rows[hiIdx]);
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: "90%", maxWidth: "1000px", maxHeight: "80vh", display: "flex", flexDirection: "column", border: "2px solid #000" }}>
        <div className="xp-modal-tb" style={{ background: "#1a1a1a", padding: "6px 12px", borderBottom: "1px solid #000" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span className="xp-modal-title" style={{ color: "white", fontWeight: "bold" }}>Select Product</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "white" }}>✕</button>
        </div>
        
        <div style={{ padding: "6px 10px", background: "#fff", borderBottom: "1px solid #000", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input 
            ref={rDesc} 
            type="text" 
            className="xp-input" 
            placeholder="Description / Code" 
            value={desc} 
            onChange={(e) => setDesc(e.target.value)} 
            style={{ flex: 2, padding: "4px 8px", fontSize: "12px", border: "1px solid #000" }} 
          />
          <input 
            ref={rCat} 
            type="text" 
            className="xp-input" 
            placeholder="Category" 
            value={cat} 
            onChange={(e) => setCat(e.target.value)} 
            style={{ flex: 1, padding: "4px 8px", fontSize: "12px", border: "1px solid #000" }} 
          />
          <input 
            ref={rCompany} 
            type="text" 
            className="xp-input" 
            placeholder="Company" 
            value={company} 
            onChange={(e) => setCompany(e.target.value)} 
            style={{ flex: 1, padding: "4px 8px", fontSize: "12px", border: "1px solid #000" }} 
          />
          <span style={{ fontSize: "11px", color: "#000", alignSelf: "center" }}>{rows.length} products</span>
        </div>
        
        <div className="xp-modal-body" style={{ padding: 0, flex: 1, overflow: "auto", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }} onKeyDown={handleKeyDown} tabIndex={0}>
            <thead style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "2px solid #000" }}>
              <tr>
                <th style={{ width: 40, padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>#</th>
                <th style={{ width: 90, padding: "4px 6px", textAlign: "left", border: "1px solid #000", color: "#000" }}>Code</th>
                <th style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #000", color: "#000" }}>Product Name</th>
                <th style={{ width: 70, padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>UOM</th>
                <th style={{ width: 90, padding: "4px 6px", textAlign: "right", border: "1px solid #000", color: "#000" }}>Sale Rate</th>
                <th style={{ width: 70, padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>Rack</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {rows.length === 0 && (
                <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#000", border: "1px solid #000" }}>No products found</td></tr>
              )}
              {rows.map((p, i) => (
                <tr 
                  key={p._id} 
                  style={{ background: i === hiIdx ? "#f5f5f5" : "white", cursor: "pointer" }}
                  onClick={() => setHiIdx(i)} 
                  onDoubleClick={() => onSelect(p)}
                >
                  <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>{i + 1}</td>
                  <td style={{ padding: "4px 6px", fontWeight: "500", border: "1px solid #000", color: "#000" }}>{p.code}</td>
                  <td style={{ padding: "4px 6px", border: "1px solid #000", color: "#000" }}>{p._name}</td>
                  <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>{p._meas || "—"}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #000", color: "#000" }}>{formatCurrency(p._rate)}</td>
                  <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>{p.rackNo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "4px 10px", borderTop: "1px solid #000", fontSize: "10px", color: "#000", background: "#f5f5f5" }}>
          ↑↓ Navigate | Enter / Double-click = Select | Esc = Close
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TRANSACTION DETAIL MODAL
══════════════════════════════════════════════════════════ */
function TransactionDetailModal({ transaction, onClose }) {
  if (!transaction) return null;

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: 450, maxWidth: "90%", border: "2px solid #000", background: "#fff" }}>
        <div className="xp-modal-tb" style={{ background: "#1a1a1a", padding: "6px 12px", borderBottom: "1px solid #000" }}>
          <span className="xp-modal-title" style={{ color: "white", fontWeight: "bold" }}>Transaction Details</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "white" }}>✕</button>
        </div>
        <div style={{ padding: "12px" }}>
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Type:</span>
              <TransactionBadge type={transaction.type} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Document #:</span>
              <span style={{ color: "#000" }}>{transaction.documentNo}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Date:</span>
              <span style={{ color: "#000" }}>{formatDateTime(transaction.date)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Party:</span>
              <span style={{ color: "#000" }}>{transaction.partyName || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Qty:</span>
              <span style={{ fontWeight: "bold", color: "#000" }}>{formatNumber(transaction.qty)} {transaction.uom}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Rate:</span>
              <span style={{ color: "#000" }}>PKR {formatCurrency(transaction.rate)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Amount:</span>
              <span style={{ fontWeight: "bold", fontSize: "16px", color: transaction.type === "PURCHASE" ? "#10b981" : "#3b82f6" }}>PKR {formatCurrency(transaction.amount)}</span>
            </div>
            {transaction.remarks && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "600", color: "#000" }}>Remarks:</span>
                <span style={{ color: "#000" }}>{transaction.remarks}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "8px 12px", borderTop: "1px solid #000", display: "flex", justifyContent: "flex-end", background: "#f5f5f5" }}>
          <button className="xp-btn" onClick={onClose} style={{ padding: "4px 12px", border: "1px solid #000", background: "#fff", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PRODUCT HISTORY PAGE
══════════════════════════════════════════════════════════ */
export default function ProductHistoryPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  
  const searchRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!transactions.length) {
      setFilteredTransactions([]);
      return;
    }
    
    let filtered = [...transactions];
    if (fromDate) filtered = filtered.filter(t => t.date >= fromDate);
    if (toDate) filtered = filtered.filter(t => t.date <= toDate);
    if (typeFilter !== "ALL") filtered = filtered.filter(t => t.type === typeFilter);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    setFilteredTransactions(filtered);
  }, [transactions, fromDate, toDate, typeFilter]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        setShowProductModal(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.PRODUCTS.GET_ALL);
      if (response.data.success) {
        setAllProducts(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
      showMsg("Failed to load products", "error");
    }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const fetchProductHistory = async (product) => {
    setSelectedProduct(product);
    setLoading(true);
    setTransactions([]);
    setFilteredTransactions([]);
    
    try {
      const [purchasesRes, salesRes] = await Promise.all([
        api.get(EP.PURCHASES.GET_ALL),
        api.get(EP.SALES.GET_ALL)
      ]);
      
      const allTransactions = [];
      
      if (purchasesRes.data.success && purchasesRes.data.data) {
        purchasesRes.data.data.forEach(purchase => {
          (purchase.items || []).forEach(item => {
            if (item.productId === product._id || item.code === product.code) {
              allTransactions.push({
                id: `${purchase._id}_${Date.now()}_${Math.random()}`,
                type: "PURCHASE",
                documentNo: purchase.invoiceNo || purchase.poNo || "PUR-XXX",
                date: purchase.invoiceDate || purchase.poDate || purchase.createdAt,
                partyName: purchase.supplierName || "Supplier",
                qty: item.pcs || item.qty || 0,
                rate: item.rate || 0,
                amount: item.amount || (item.qty * item.rate) || 0,
                uom: item.uom || item.measurement || "pcs",
                remarks: purchase.remarks || "",
              });
            }
          });
        });
      }
      
      if (salesRes.data.success && salesRes.data.data) {
        salesRes.data.data.forEach(sale => {
          (sale.items || []).forEach(item => {
            if (item.productId === product._id || item.code === product.code) {
              allTransactions.push({
                id: `${sale._id}_${Date.now()}_${Math.random()}`,
                type: "SALE",
                documentNo: sale.invoiceNo || sale.saleNo || "SAL-XXX",
                date: sale.invoiceDate || sale.saleDate || sale.createdAt,
                partyName: sale.customerName || "Customer",
                qty: item.pcs || item.qty || 0,
                rate: item.rate || 0,
                amount: item.amount || (item.qty * item.rate) || 0,
                uom: item.uom || item.measurement || "pcs",
                remarks: sale.remarks || "",
              });
            }
          });
        });
      }
      
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
      
      if (allTransactions.length === 0) {
        showMsg(`No transaction history found`, "info");
      } else {
        showMsg(`Found ${allTransactions.length} transaction(s)`, "success");
      }
    } catch (error) {
      console.error("Failed to fetch transaction history:", error);
      showMsg("Failed to load transaction history", "error");
    }
    setLoading(false);
  };

  const handleProductSelect = (product) => {
    setShowProductModal(false);
    fetchProductHistory(product);
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setTypeFilter("ALL");
  };

  const getSummaryStats = () => {
    const totalPurchases = filteredTransactions.filter(t => t.type === "PURCHASE").reduce((sum, t) => sum + t.qty, 0);
    const totalSales = filteredTransactions.filter(t => t.type === "SALE").reduce((sum, t) => sum + t.qty, 0);
    const totalPurchaseAmount = filteredTransactions.filter(t => t.type === "PURCHASE").reduce((sum, t) => sum + t.amount, 0);
    const totalSaleAmount = filteredTransactions.filter(t => t.type === "SALE").reduce((sum, t) => sum + t.amount, 0);
    const currentStock = totalPurchases - totalSales;
    return { totalPurchases, totalSales, totalPurchaseAmount, totalSaleAmount, currentStock };
  };

  const stats = getSummaryStats();

  return (
    <div className="sl-page" style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1a1a1a", borderBottom: "2px solid #000" }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
        </svg>
        <span className="xp-tb-title" style={{ color: "white", fontWeight: "bold" }}>Product Transaction History — Complete Audit Trail</span>
        <div className="xp-tb-actions">
          <div className="sl-shortcut-hints" style={{ color: "white" }}>
            <span>F2 = Select Product</span>
          </div>
          <button className="xp-cap-btn" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>─</button>
          <button className="xp-cap-btn" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>□</button>
          <button className="xp-cap-btn xp-cap-close" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>✕</button>
        </div>
      </div>

      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : msg.type === "info" ? "xp-alert-info" : "xp-alert-error"}`} style={{ margin: "6px 10px", border: "1px solid #000" }}>
          {msg.text}
        </div>
      )}

      <div style={{ padding: "10px" }}>
        
        {/* Product Selection */}
        <div style={{ background: "white", padding: "10px", marginBottom: "10px", border: "1px solid #000" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: "11px", fontWeight: "600", marginBottom: "2px", display: "block", color: "#000" }}>Select Product <span style={{ fontSize: "10px" }}>(Press F2)</span></label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Click to search product..."
                  value={selectedProduct ? `${selectedProduct.code} - ${selectedProduct.description}` : ""}
                  onClick={() => setShowProductModal(true)}
                  readOnly
                  style={{ flex: 1, padding: "4px 8px", border: "1px solid #000", fontSize: "12px", cursor: "pointer", background: "#f9fafb", color: "#000" }}
                />
                <button onClick={() => setShowProductModal(true)} style={{ padding: "4px 12px", background: "#1a1a1a", color: "white", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>Browse (F2)</button>
                {selectedProduct && (
                  <button onClick={() => { setSelectedProduct(null); setTransactions([]); setFilteredTransactions([]); }} style={{ padding: "4px 10px", background: "#fff", color: "#000", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>Clear</button>
                )}
              </div>
            </div>
          </div>
          
          {selectedProduct && (
            <div style={{ marginTop: "8px", padding: "6px", background: "#f5f5f5", border: "1px solid #000", display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11px" }}>
              <div><strong>Code:</strong> {selectedProduct.code}</div>
              <div><strong>Name:</strong> {selectedProduct.description}</div>
              <div><strong>Category:</strong> {selectedProduct.category || "—"}</div>
              <div><strong>Company:</strong> {selectedProduct.company || "—"}</div>
              <div><strong>Rack:</strong> {selectedProduct.rackNo || "—"}</div>
            </div>
          )}
        </div>

        {/* Statistics */}
        {selectedProduct && transactions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "10px" }}>
            <div style={{ background: "#f0fdf4", padding: "6px 8px", borderLeft: "3px solid #10b981", border: "1px solid #10b981" }}>
              <div style={{ fontSize: "10px", color: "#065f46" }}>Total Purchased</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#065f46" }}>{formatNumber(stats.totalPurchases)}</div>
            </div>
            <div style={{ background: "#eff6ff", padding: "6px 8px", borderLeft: "3px solid #3b82f6", border: "1px solid #3b82f6" }}>
              <div style={{ fontSize: "10px", color: "#1e40af" }}>Total Sold</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1e40af" }}>{formatNumber(stats.totalSales)}</div>
            </div>
            <div style={{ background: "#fffbeb", padding: "6px 8px", borderLeft: "3px solid #f59e0b", border: "1px solid #f59e0b" }}>
              <div style={{ fontSize: "10px", color: "#92400e" }}>Current Stock</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#92400e" }}>{formatNumber(stats.currentStock)}</div>
            </div>
            <div style={{ background: "#f5f3ff", padding: "6px 8px", borderLeft: "3px solid #8b5cf6", border: "1px solid #8b5cf6" }}>
              <div style={{ fontSize: "10px", color: "#5b21b6" }}>Purchase Value</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#5b21b6" }}>PKR {formatCurrency(stats.totalPurchaseAmount)}</div>
            </div>
            <div style={{ background: "#fce7f3", padding: "6px 8px", borderLeft: "3px solid #ec4898", border: "1px solid #ec4898" }}>
              <div style={{ fontSize: "10px", color: "#9d174d" }}>Sale Value</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#9d174d" }}>PKR {formatCurrency(stats.totalSaleAmount)}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {selectedProduct && transactions.length > 0 && (
          <div style={{ background: "white", padding: "8px 10px", marginBottom: "10px", border: "1px solid #000", display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "600", display: "block", marginBottom: "2px", color: "#000" }}>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: "4px 6px", border: "1px solid #000", fontSize: "11px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "600", display: "block", marginBottom: "2px", color: "#000" }}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: "4px 6px", border: "1px solid #000", fontSize: "11px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "600", display: "block", marginBottom: "2px", color: "#000" }}>Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: "4px 6px", border: "1px solid #000", fontSize: "11px", background: "white" }}>
                <option value="ALL">All</option>
                <option value="PURCHASE">Purchase</option>
                <option value="SALE">Sale</option>
              </select>
            </div>
            <button onClick={clearFilters} style={{ padding: "4px 10px", background: "#f5f5f5", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>Clear</button>
            <div style={{ fontSize: "11px", color: "#000", marginLeft: "auto" }}>
              {filteredTransactions.length} / {transactions.length}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {selectedProduct ? (
          <div style={{ background: "white", overflow: "hidden", border: "1px solid #000" }}>
            <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 380px)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "2px solid #000" }}>
                  <tr>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: 40, border: "1px solid #000", color: "#000" }}>#</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: 90, border: "1px solid #000", color: "#000" }}>Type</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: 100, border: "1px solid #000", color: "#000" }}>Doc #</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: 90, border: "1px solid #000", color: "#000" }}>Date</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", minWidth: 130, border: "1px solid #000", color: "#000" }}>Party</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 70, border: "1px solid #000", color: "#000" }}>Qty</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 80, border: "1px solid #000", color: "#000" }}>Rate</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 100, border: "1px solid #000", color: "#000" }}>Amount</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: 60, border: "1px solid #000", color: "#000" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#000", border: "1px solid #000" }}>Loading...</td></tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#000", border: "1px solid #000" }}>No transactions found</td></tr>
                  ) : (
                    filteredTransactions.map((transaction, idx) => (
                      <tr key={transaction.id} style={{ borderBottom: "1px solid #000" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"} 
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #000", color: "#000" }}>{idx + 1}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #000" }}><TransactionBadge type={transaction.type} /></td>
                        <td style={{ padding: "6px 8px", fontWeight: "500", border: "1px solid #000", color: "#000" }}>{transaction.documentNo}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #000", color: "#000" }}>{formatDate(transaction.date)}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #000", color: "#000" }}>{transaction.partyName}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "500", border: "1px solid #000", color: "#000" }}>{formatNumber(transaction.qty)} {transaction.uom}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>{formatCurrency(transaction.rate)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", border: "1px solid #000", color: transaction.type === "PURCHASE" ? "#10b981" : "#3b82f6" }}>{formatCurrency(transaction.amount)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #000" }}>
                          <button onClick={() => setSelectedTransaction(transaction)} style={{ padding: "2px 8px", background: transaction.type === "PURCHASE" ? "#10b981" : "#3b82f6", color: "white", border: "1px solid #000", cursor: "pointer", fontSize: "10px" }}>View</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredTransactions.length > 0 && (
                  <tfoot style={{ background: "#f5f5f5", fontWeight: "bold", borderTop: "2px solid #000" }}>
                    <tr>
                      <td colSpan="5" style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>Totals:</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>{formatNumber(filteredTransactions.reduce((s, t) => s + t.qty, 0))}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>—</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>PKR {formatCurrency(filteredTransactions.reduce((s, t) => s + t.amount, 0))}</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #000" }}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        ) : (
          <div style={{ background: "white", padding: "40px", textAlign: "center", border: "1px solid #000" }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1" style={{ marginBottom: "10px" }}>
              <path d="M20 7h-4.18A3 3 0 0 0 16 5.18V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              <path d="M16 5v4h4" />
              <path d="M12 11v6" />
              <path d="M9 14h6" />
            </svg>
            <h3 style={{ fontSize: "14px", marginBottom: "4px", color: "#000" }}>No Product Selected</h3>
            <p style={{ fontSize: "11px", color: "#000" }}>Click Browse or press <kbd style={{ background: "#f5f5f5", padding: "2px 5px", border: "1px solid #000" }}>F2</kbd> to select a product</p>
            <button onClick={() => setShowProductModal(true)} style={{ marginTop: "10px", padding: "4px 16px", background: "#1a1a1a", color: "white", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>Select Product</button>
          </div>
        )}
      </div>

      {showProductModal && (
        <ProductSearchModal
          allProducts={allProducts}
          onSelect={handleProductSelect}
          onClose={() => setShowProductModal(false)}
        />
      )}
      
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}