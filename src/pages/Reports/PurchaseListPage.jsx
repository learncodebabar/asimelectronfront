// pages/PurchaseListPage.jsx - Complete Purchase Invoice List with Supplier Names
import { useState, useEffect } from "react";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";
import "../../styles/SalePage.css";

// Helper function to format date
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString("en-PK");
};

const SHOP_INFO = {
  name: "عاصم الیکٹرک اینڈ الیکٹرونکس سٹور",
  nameEn: "Asim Electric & Electronic Store",
  address: "مین بازار نہاری ٹاؤن نزد بجلی گھر سٹاپ گوجرانوالہ روڈ فیصل آباد",
  phone1: "Faqir Hussain 0300 7262129",
  phone2: "PTCL 041 8711575",
  phone3: "Shop 0315 7262129",
  urduBanner: "یہاں پر چانک فراڈ کی وارپس، جانچ فلک، وارنگ سیلز اور ریکارڈ کے تمام اخیری ہول سیل ریٹ پر دستیاب ہے۔",
  urduTerms: "الیکٹرانک اور چانٹا کے سپیئر پارٹس کی واپسی یا تبدیلی ہر صورت ممکن نہیں ہوگی۔\nبلی ہوئی آئٹم، پکلاہوا اکا ول واپس قابل واپسی نہیں ہے۔\nبارک کے سامان کی واپس کی صورت میں (7) دن کے اند پہلی ہوگی۔\nکل پیلی کلائی کی تمام واپسی قابل قبول نہیں ہوگی۔",
  devBy: "Software developed by: Creative Babar / 03098325271",
};

/* ══════════════════════════════════════════════════════════
   PRINT HTML BUILDER — Purchase Invoice
══════════════════════════════════════════════════════════ */
const buildPrintHtml = (purchase, type, overrides = {}) => {
  const buyerName = overrides.buyerName ?? purchase.supplierName;
  const buyerPhone = overrides.buyerPhone ?? "";
  const remarks = overrides.remarks || purchase.remarks || "";
  const rows = purchase.items.map((it, i) => ({ ...it, sr: i + 1 }));
  const totalQty = rows.reduce((s, r) => s + (r.pcs || 0), 0);

  const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
  const GOOGLE_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">`;

  if (type === "Thermal") {
    const itemRows = rows
      .map(
        (it) => `
        <tr>
          <td style="font-size:9px;vertical-align:top">${it.sr}</td>
          <td style="font-size:9.5px;vertical-align:top;word-break:break-word;max-width:100px">${it.name}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right">${it.pcs} ${it.uom || ""}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right">${Number(it.rate).toLocaleString()}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right"><b>${Number(it.amount).toLocaleString()}</b></td>
        </tr>`
      )
      .join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',Courier,monospace;font-size:10px;width:80mm;margin:0 auto;padding:2mm 3mm;color:#000}
      .urdu{font-family:${URDU_FONT};direction:rtl;text-align:center}
      .shop-urdu{font-size:16px;font-weight:bold;text-align:center;margin-bottom:2px;font-family:${URDU_FONT};direction:rtl}
      .shop-addr{font-size:9px;text-align:center;margin-bottom:1px;font-family:${URDU_FONT};direction:rtl}
      .shop-phones{font-size:8.5px;text-align:center;font-weight:bold;margin-bottom:3px}
      .banner{background:#555;color:#fff;font-size:8px;text-align:center;padding:2px 4px;margin:3px 0;font-family:${URDU_FONT};direction:rtl;line-height:1.8}
      .meta-row{display:flex;justify-content:space-between;font-size:9px;margin:2px 0}
      .meta-bold{font-weight:bold;font-size:10px}
      .divider-solid{border:none;border-top:2px solid #000;margin:3px 0}
      .divider-dash{border:none;border-top:1px dashed #666;margin:3px 0}
      table{width:100%;border-collapse:collapse}
      thead tr{border-bottom:1px solid #000}
      th{font-size:8.5px;font-weight:bold;padding:2px 1px;text-align:left}
      th.r{text-align:right}
      td{padding:2px 1px;font-size:9px;vertical-align:top}
      .sum-row{display:flex;justify-content:space-between;font-size:10px;padding:1.5px 0}
      .sum-row.bold{font-weight:bold;font-size:11px}
      .sum-row.sep{border-top:1px dashed #555;margin-top:2px;padding-top:2px}
      .red{color:#b00}.green{color:#060}
      .totals-box{margin-top:4px}
      .remarks-box{font-size:8px;color:#555;margin-top:3px;padding:2px;border-top:1px dashed #ccc;word-break:break-word}
      .terms{font-family:${URDU_FONT};direction:rtl;font-size:9px;color:#333;border:1px dashed #999;padding:4px;margin-top:4px;line-height:2;text-align:right}
      .devby{text-align:center;font-size:7.5px;color:#777;margin-top:4px;border-top:1px dashed #ccc;padding-top:3px}
      @media print{@page{size:80mm auto;margin:1mm}body{width:78mm}}
    </style></head><body>
      <div class="shop-urdu">${SHOP_INFO.name}</div>
      <div class="shop-addr">${SHOP_INFO.address}</div>
      <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
      <div class="banner">${SHOP_INFO.urduBanner}</div>
      <div class="meta-row">
        <span><b>Purchase Invoice</b></span>
        <span>ADMIN</span>
        <span>Shop Server</span>
      </div>
      <hr class="divider-dash">
      <div class="meta-row">
        <span class="meta-bold">${purchase.invoiceNo}</span>
        <span>${purchase.invoiceDate}</span>
      </div>
      <div class="meta-row"><span>Supplier:</span></div>
      <div style="font-size:10px;font-weight:bold;margin-bottom:1px">${buyerName}</div>
      ${buyerPhone ? `<div style="font-size:9px;color:#555">${buyerPhone}</div>` : ""}
      ${remarks ? `<div class="remarks-box"><b>Remarks:</b> ${remarks}</div>` : ""}
      <hr class="divider-solid">
      <tr>
        <thead><tr><th style="width:20px">#</th><th>Product</th><th class="r">Qty.</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <hr class="divider-dash">
      <div class="totals-box">
        <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px">
          <span>T.Qty: <b>${totalQty}</b></span>
          <span>T.Items: <b>${rows.length}</b></span>
        </div>
        <div class="sum-row bold sep"><span>Total Amount:</span><span>${Number(purchase.netTotal).toLocaleString()}</span></div>
        <div class="sum-row green"><span>Paid:</span><span>PKR ${Number(purchase.paidAmount).toLocaleString()}</span></div>
        <div class="sum-row bold sep green"><span>Balance Payable:</span><span>PKR 0</span></div>
      </div>
      <div class="terms">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
      <div class="devby">${SHOP_INFO.devBy}</div>
    </body></html>`;
  }

  // A4 format
  const itemRows = rows.map((it) => `
    <tr>
      <td style="padding:6px;border:1px solid #000">${it.sr}</td>
      <td style="padding:6px;border:1px solid #000">${it.name}</td>
      <td style="padding:6px;border:1px solid #000;text-align:center">${it.uom || "—"}</td>
      <td style="padding:6px;border:1px solid #000;text-align:right">${it.pcs}</td>
      <td style="padding:6px;border:1px solid #000;text-align:right">${Number(it.rate).toLocaleString()}</td>
      <td style="padding:6px;border:1px solid #000;text-align:right;font-weight:bold">${Number(it.amount).toLocaleString()}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;padding:20px}
    .shop-name-line{font-family:${URDU_FONT};font-size:22px;font-weight:700;text-align:center;direction:rtl;margin-bottom:4px}
    .sub-header{font-family:${URDU_FONT};font-size:11px;text-align:center;direction:rtl;margin-bottom:2px}
    .contact-line{font-size:10px;text-align:center;margin-bottom:3px}
    .title{font-size:16px;font-weight:bold;margin:15px 0;padding:8px;background:#10b981;color:#fff;text-align:center}
    .meta-box{border:1px solid #000;padding:10px;margin:10px 0}
    table{width:100%;border-collapse:collapse;margin:10px 0}
    th{background:#333;color:#fff;padding:8px;border:1px solid #000}
    td{padding:6px;border:1px solid #000}
    .total-box{border:2px solid #000;padding:10px;margin-top:10px;text-align:right}
    .footer{text-align:center;margin-top:20px;font-size:9px;color:#666}
  </style></head><body>
    <div class="shop-name-line">${SHOP_INFO.name}</div>
    <div class="sub-header">${SHOP_INFO.address}</div>
    <div class="contact-line">${SHOP_INFO.phone1} | ${SHOP_INFO.phone2} | ${SHOP_INFO.phone3}</div>
    <div class="title">PURCHASE INVOICE</div>
    <div class="meta-box">
      <div><strong>Purchase #:</strong> ${purchase.invoiceNo}</div>
      <div><strong>Date:</strong> ${purchase.invoiceDate}</div>
      <div><strong>Supplier:</strong> ${buyerName}</div>
      ${remarks ? `<div><strong>Remarks:</strong> ${remarks}</div>` : ""}
    </div>
    <table>
      <thead><tr><th>#</th><th>Product</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right"><strong>Total:</strong></td><td><strong>PKR ${Number(purchase.netTotal).toLocaleString()}</strong></td></tr></tfoot>
    </table>
    <div class="footer">${SHOP_INFO.devBy}</div>
  </body></html>`;
};

const doPrint = (purchase, type) => {
  try {
    const printWindow = window.open("", "_blank", type === "Thermal" ? "width=420,height=640" : "width=900,height=700");
    if (!printWindow) {
      alert("Popup blocked! Please allow popups for this website.");
      return false;
    }
    printWindow.document.write(buildPrintHtml(purchase, type, { buyerName: purchase.supplierName, remarks: purchase.remarks }));
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };
    return true;
  } catch (error) {
    console.error("Print error:", error);
    alert("Error preparing print: " + error.message);
    return false;
  }
};

/* ══════════════════════════════════════════════════════════
   PURCHASE INVOICE DETAIL MODAL
══════════════════════════════════════════════════════════ */
function PurchaseDetailModal({ invoice, onClose, onPrint, onDelete, printType }) {
  if (!invoice) return null;

  const totalQty = (invoice.items || []).reduce((s, r) => s + (r.pcs || r.qty || 0), 0);
  const totalAmount = invoice.netTotal || invoice.subTotal || 
    (invoice.items || []).reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: "90%", maxWidth: "1000px", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: "12px", overflow: "hidden" }}>
        <div className="xp-modal-tb" style={{ background: "#10b981", padding: "12px 16px" }}>
          <span className="xp-modal-title" style={{ color: "white", fontWeight: "bold" }}>Purchase Invoice Details — {invoice.invoiceNo}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "white" }}>✕</button>
        </div>
        
        <div className="xp-modal-body" style={{ padding: "16px", overflow: "auto", flex: 1, background: "#f9fafb" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px", padding: "16px", background: "white", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Invoice Number</div><div style={{ fontSize: "18px", fontWeight: "bold", color: "#065f46" }}>{invoice.invoiceNo}</div></div>
            <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Date</div><div style={{ fontSize: "14px", fontWeight: "500" }}>{formatDate(invoice.invoiceDate)}</div></div>
            <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Supplier</div><div style={{ fontSize: "14px", fontWeight: "500", color: "#065f46" }}>{invoice.supplierName || "Cash Purchase"}</div></div>
            <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Phone</div><div style={{ fontSize: "14px" }}>{invoice.supplierPhone || invoice.supplierCode || "—"}</div></div>
            {invoice.remarks && <div style={{ gridColumn: "span 2" }}><div style={{ fontSize: "11px", color: "#6b7280" }}>Remarks</div><div style={{ fontSize: "13px", padding: "8px", background: "#f0fdf4", borderRadius: "6px" }}>{invoice.remarks}</div></div>}
          </div>

          <div style={{ background: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ overflowX: "auto", maxHeight: "400px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#10b981", color: "white" }}>
                  <tr>
                    <th style={{ padding: "10px", textAlign: "center", width: 50 }}>#</th>
                    <th style={{ padding: "10px", textAlign: "left", width: 100 }}>Code</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>Product Name</th>
                    <th style={{ padding: "10px", textAlign: "center", width: 70 }}>UOM</th>
                    <th style={{ padding: "10px", textAlign: "right", width: 70 }}>Qty</th>
                    <th style={{ padding: "10px", textAlign: "right", width: 100 }}>Rate</th>
                    <th style={{ padding: "10px", textAlign: "right", width: 110 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px", textAlign: "center" }}>{i + 1}</td>
                      <td style={{ padding: "8px" }}>{it.code || "—"}</td>
                      <td style={{ padding: "8px", fontWeight: "500" }}>{it.name || it.description || "—"}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>{it.uom || "—"}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{it.pcs || it.qty || 0}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{formatCurrency(it.rate)}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#10b981" }}>{formatCurrency(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f0fdf4", fontWeight: "bold" }}>
                  <tr>
                    <td colSpan="4" style={{ padding: "10px", textAlign: "right" }}>Totals:</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{totalQty.toLocaleString()}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}></td>
                    <td style={{ padding: "10px", textAlign: "right", color: "#065f46", fontSize: "15px" }}>PKR {totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px", justifyContent: "flex-end", background: "white" }}>
          <button className="xp-btn" onClick={onClose}>Close</button>
          <button className="xp-btn" style={{ background: "#f59e0b", color: "white", borderColor: "#d97706" }} onClick={() => onPrint(invoice)}>🖨️ Print</button>
          <button className="xp-btn xp-btn-danger" onClick={() => onDelete(invoice._id, invoice.invoiceNo)}>🗑️ Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PURCHASE LIST PAGE
══════════════════════════════════════════════════════════ */
export default function PurchaseListPage() {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });
  
  // Date filter states
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const [sortBy, setSortBy] = useState("date_desc");
  const [printType, setPrintType] = useState("Thermal");

  // Load purchases on mount
  useEffect(() => {
    loadPurchases();
  }, []);

  // Filter and sort purchases when dependencies change
  useEffect(() => {
    let filtered = [...purchases];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(purchase => 
        purchase.invoiceNo?.toLowerCase().includes(term) ||
        purchase.supplierName?.toLowerCase().includes(term) ||
        purchase.supplierPhone?.toLowerCase().includes(term) ||
        purchase.remarks?.toLowerCase().includes(term) ||
        (purchase.items || []).some(item => 
          item.name?.toLowerCase().includes(term) ||
          item.code?.toLowerCase().includes(term)
        )
      );
    }
    
    // Apply date range filter
    if (fromDate) {
      filtered = filtered.filter(purchase => purchase.invoiceDate >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(purchase => purchase.invoiceDate <= toDate);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const getNum = (str) => {
        let numStr = String(str || "0");
        numStr = numStr.replace(/^PUR-/i, '').replace(/^0+/, '');
        return parseInt(numStr, 10) || 0;
      };
      
      switch(sortBy) {
        case "date_desc": return new Date(b.invoiceDate) - new Date(a.invoiceDate);
        case "date_asc": return new Date(a.invoiceDate) - new Date(b.invoiceDate);
        case "inv_desc": return getNum(b.invoiceNo) - getNum(a.invoiceNo);
        case "inv_asc": return getNum(a.invoiceNo) - getNum(b.invoiceNo);
        case "supplier": return (a.supplierName || "").localeCompare(b.supplierName || "");
        case "amount_desc": return (b.netTotal || b.subTotal || 0) - (a.netTotal || a.subTotal || 0);
        default: return new Date(b.invoiceDate) - new Date(a.invoiceDate);
      }
    });
    
    setFilteredPurchases(filtered);
  }, [searchTerm, fromDate, toDate, sortBy, purchases]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.PURCHASES.GET_ALL);
      console.log("Purchase API Response:", response.data);
      
      if (response.data.success && response.data.data) {
        setPurchases(response.data.data);
        setFilteredPurchases(response.data.data);
        console.log("Loaded purchases:", response.data.data.length);
        // Log first purchase to check supplier name
        if (response.data.data.length > 0) {
          console.log("First purchase supplier:", response.data.data[0].supplierName);
        }
      } else {
        showMsg("Failed to load purchases", "error");
      }
    } catch (error) {
      console.error("Failed to load purchases:", error);
      showMsg("Error loading purchases", "error");
    }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const handleDelete = async (id, invoiceNo) => {
    if (window.confirm(`Are you sure you want to delete Purchase Invoice ${invoiceNo}? This action cannot be undone.`)) {
      try {
        await api.delete(EP.PURCHASES.DELETE(id));
        showMsg(`Purchase Invoice ${invoiceNo} deleted successfully`, "success");
        loadPurchases();
        setSelectedInvoice(null);
      } catch (error) {
        console.error("Delete failed:", error);
        showMsg("Failed to delete purchase invoice", "error");
      }
    }
  };

  const handlePrint = (invoice) => {
    doPrint(invoice, printType);
  };

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const clearDateFilters = () => {
    setFromDate("");
    setToDate("");
  };

  const getSummaryStats = () => {
    const totalInvoices = filteredPurchases.length;
    const totalAmount = filteredPurchases.reduce((sum, p) => sum + (p.netTotal || p.subTotal || 0), 0);
    const totalItems = filteredPurchases.reduce((sum, p) => 
      sum + (p.items || []).reduce((s, item) => s + (item.pcs || item.qty || 0), 0), 0
    );
    const uniqueSuppliers = new Set(filteredPurchases.map(p => p.supplierName)).size;
    return { totalInvoices, totalAmount, totalItems, uniqueSuppliers };
  };

  const stats = getSummaryStats();

  return (
    <div className="sl-page purchase-list-page" style={{ background: "#f3f4f6", minHeight: "100vh" }}>
      {/* Title Bar */}
      <div className="xp-titlebar" style={{ background: "#10b981", borderRadius: "8px 8px 0 0", padding: "12px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "18px" }}>←</button>
          <span className="xp-tb-title" style={{ color: "white", fontWeight: "bold", fontSize: "16px" }}>Purchase Invoices List — Asim Electric Store</span>
        </div>
        <div className="xp-tb-actions">
          <button onClick={loadPurchases} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "4px 12px", borderRadius: "4px", cursor: "pointer" }}>⟳ Refresh</button>
        </div>
      </div>

      {/* Message Alert */}
      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "12px", flexShrink: 0, borderRadius: "8px", padding: "10px 16px" }}>
          {msg.text}
        </div>
      )}

      {/* Main Content */}
      <div style={{ padding: "20px" }}>
        
        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #10b981" }}>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>Total Invoices</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#065f46" }}>{stats.totalInvoices}</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>Total Purchase Value</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#d97706" }}>PKR {formatCurrency(stats.totalAmount)}</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>Total Items Purchased</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2563eb" }}>{stats.totalItems.toLocaleString()}</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #8b5cf6" }}>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>Unique Suppliers</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#7c3aed" }}>{stats.uniqueSuppliers}</div>
          </div>
        </div>

        {/* Filters Card */}
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
            {/* Search Input */}
            <div style={{ flex: 2, minWidth: "250px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>🔍 Search</label>
              <input
                type="text"
                className="xp-input"
                placeholder="Invoice#, Supplier, Phone, Remarks, Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px" }}
              />
            </div>

            {/* From Date */}
            <div style={{ minWidth: "160px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>📅 From Date</label>
              <input
                type="date"
                className="xp-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px" }}
              />
            </div>

            {/* To Date */}
            <div style={{ minWidth: "160px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>📅 To Date</label>
              <input
                type="date"
                className="xp-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px" }}
              />
            </div>

            {/* Sort By */}
            <div style={{ minWidth: "160px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Sort By</label>
              <select
                className="xp-input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", background: "white" }}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="inv_desc">Invoice # (High to Low)</option>
                <option value="inv_asc">Invoice # (Low to High)</option>
                <option value="supplier">Supplier Name</option>
                <option value="amount_desc">Highest Amount</option>
              </select>
            </div>

            {/* Print Type */}
            <div style={{ minWidth: "140px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>🖨️ Print Type</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "6px 0" }}>
                {["Thermal", "A4", "A5"].map((pt) => (
                  <label key={pt} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="radio" name="pt" checked={printType === pt} onChange={() => setPrintType(pt)} style={{ accentColor: "#10b981" }} /> {pt}
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={clearDateFilters} style={{ padding: "10px 16px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>Clear Dates</button>
              <button onClick={loadPurchases} style={{ padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>🔄 Refresh</button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || fromDate || toDate) && (
            <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>Active Filters:</span>
              {searchTerm && <span style={{ background: "#e0e7ff", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>🔍 {searchTerm} <button onClick={() => setSearchTerm("")} style={{ marginLeft: "6px", background: "none", border: "none", cursor: "pointer", color: "#4f46e5" }}>✕</button></span>}
              {fromDate && <span style={{ background: "#d1fae5", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>📅 From: {formatDate(fromDate)} <button onClick={() => setFromDate("")} style={{ marginLeft: "6px", background: "none", border: "none", cursor: "pointer", color: "#065f46" }}>✕</button></span>}
              {toDate && <span style={{ background: "#d1fae5", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>📅 To: {formatDate(toDate)} <button onClick={() => setToDate("")} style={{ marginLeft: "6px", background: "none", border: "none", cursor: "pointer", color: "#065f46" }}>✕</button></span>}
              <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "auto" }}>{filteredPurchases.length} invoice(s) found</span>
            </div>
          )}
        </div>

        {/* Results Table */}
        <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 480px)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "14px 12px", textAlign: "center", width: 50 }}>#</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", width: 120 }}>Invoice #</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", width: 110 }}>Date</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", minWidth: 200 }}>Supplier Name</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", width: 130 }}>Phone</th>
                  <th style={{ padding: "14px 12px", textAlign: "center", width: 70 }}>Items</th>
                  <th style={{ padding: "14px 12px", textAlign: "center", width: 80 }}>Qty</th>
                  <th style={{ padding: "14px 12px", textAlign: "right", width: 130 }}>Total (PKR)</th>
                  <th style={{ padding: "14px 12px", textAlign: "center", width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>Loading purchase invoices...</td></tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>No purchase invoices found</td></tr>
                ) : (
                  filteredPurchases.map((purchase, idx) => {
                    const totalQty = (purchase.items || []).reduce((s, r) => s + (r.pcs || r.qty || 0), 0);
                    const totalAmount = purchase.netTotal || purchase.subTotal || 0;
                    return (
                      <tr key={purchase._id || purchase.invoiceNo} style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                        onDoubleClick={() => handleViewDetails(purchase)} onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                        <td style={{ padding: "12px", textAlign: "center", color: "#6b7280" }}>{idx + 1}</td>
                        <td style={{ padding: "12px", fontWeight: "bold", color: "#065f46" }}>{purchase.invoiceNo}</td>
                        <td style={{ padding: "12px", color: "#4b5563" }}>{formatDate(purchase.invoiceDate)}</td>
                        <td style={{ padding: "12px", fontWeight: "500", color: "#1e3a5f" }}>{purchase.supplierName || "Cash Purchase"}</td>
                        <td style={{ padding: "12px", color: "#6b7280" }}>{purchase.supplierPhone || purchase.supplierCode || "—"}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>{(purchase.items || []).length}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>{totalQty.toLocaleString()}</td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold", color: "#065f46" }}>PKR {formatCurrency(totalAmount)}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button onClick={(e) => { e.stopPropagation(); handleViewDetails(purchase); }} style={{ padding: "5px 10px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>View</button>
                            <button onClick={(e) => { e.stopPropagation(); handlePrint(purchase); }} style={{ padding: "5px 10px", background: "#f59e0b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>Print</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(purchase._id, purchase.invoiceNo); }} style={{ padding: "5px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>Delete</button>
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
      {selectedInvoice && (
        <PurchaseDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={handlePrint}
          onDelete={handleDelete}
          printType={printType}
        />
      )}

      <style>{`
        .xp-input:focus {
          outline: none;
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
        }
        button {
          transition: all 0.2s ease;
        }
        button:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }
      `}</style>
    </div>
  );
}