// pages/PurchaseReportPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";
import "../../styles/SalePage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoDate = () => new Date().toISOString().split("T")[0];

export default function PurchaseReportPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(isoDate());
  const [toDate, setToDate] = useState(isoDate());
  const [supplierFilter, setSupplierFilter] = useState("");

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.PURCHASES.GET_ALL);
      if (response.data.success && response.data.data) {
        // Filter only purchase invoices (not returns)
        const purchasesList = response.data.data.filter(p => 
          p.type !== "purchase_return" && p.saleType !== "purchase_return"
        );
        setPurchases(purchasesList);
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
    }
    setLoading(false);
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = 
      p.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierCode?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDate = p.invoiceDate >= fromDate && p.invoiceDate <= toDate;
    const matchesSupplier = !supplierFilter || p.supplierName?.toLowerCase().includes(supplierFilter.toLowerCase());
    
    return matchesSearch && matchesDate && matchesSupplier;
  }).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  const totalAmount = filteredPurchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
  const totalItems = filteredPurchases.reduce((sum, p) => sum + (p.items?.length || 0), 0);
  const totalQty = filteredPurchases.reduce((sum, p) => {
    const itemsQty = (p.items || []).reduce((s, i) => s + (i.pcs || i.qty || 0), 0);
    return sum + itemsQty;
  }, 0);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const buildPrintHtml = () => {
    const rows = filteredPurchases.map((p, i) => `
      <tr>
        <td style="padding:10px;border:2px solid #000;text-align:center;font-size:13px;font-weight:bold">${i + 1}</td>
        <td style="padding:10px;border:2px solid #000;font-size:13px;font-weight:bold">${p.invoiceNo}</td>
        <td style="padding:10px;border:2px solid #000;font-size:13px">${p.invoiceDate}</td>
        <td style="padding:10px;border:2px solid #000;font-size:13px;font-weight:bold">${p.supplierName || "—"}</td>
        <td style="padding:10px;border:2px solid #000;text-align:center;font-size:13px">${p.items?.length || 0}</td>
        <td style="padding:10px;border:2px solid #000;text-align:right;font-size:13px;font-weight:bold">${fmt(p.netTotal || 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px;font-size:14px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:3px solid #000}
        .shop-name{font-size:24px;font-weight:bold;margin-bottom:5px}
        .shop-addr{font-size:11px;color:#444;margin-bottom:3px}
        .title{font-size:18px;font-weight:bold;margin:15px 0;background:#1e40af;color:#fff;padding:8px;text-align:center}
        .date-range{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:1px solid #000;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th{background:#1e40af;color:#fff;padding:12px;border:2px solid #000;font-size:13px}
        td{padding:10px;border:2px solid #000;font-size:12px}
        .totals{width:400px;margin-left:auto;margin-top:20px}
        .totals-row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px}
        .totals-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:10px;font-size:16px}
        .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#666}
        .text-right{text-align:right}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
        <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
      </div>
      <div class="title">PURCHASE REPORT</div>
      <div class="date-range">Period: ${fromDate} to ${toDate}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>INVOICE #</th>
            <th>DATE</th>
            <th>SUPPLIER</th>
            <th>ITEMS</th>
            <th class="text-right">AMOUNT</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center">No records found</td></tr>'}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Total Invoices:</span><span>${filteredPurchases.length}</span></div>
        <div class="totals-row"><span>Total Items:</span><span>${totalItems}</span></div>
        <div class="totals-row"><span>Total Quantity:</span><span>${totalQty}</span></div>
        <div class="totals-row bold"><span>Total Amount:</span><span>PKR ${fmt(totalAmount)}</span></div>
      </div>
      <div class="footer">Printed on: ${new Date().toLocaleString()} | Developed by: Creative Babar / 03098325271</div>
    </body>
    </html>`;
  };

  return (
    <div className="sl-page">
      <div className="xp-titlebar" style={{ background: "#1e40af" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Purchase Report — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={fetchPurchases} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrint} disabled={filteredPurchases.length === 0} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold", marginLeft: "8px" }}>🖨 Print</button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Filter Bar */}
        <div style={{ background: "#f8fafc", borderRadius: "6px", padding: "12px", marginBottom: "16px", border: "2px solid #000000" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>FROM DATE</label>
              <input type="date" className="xp-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: "1px solid #000", borderRadius: "4px", padding: "6px 8px", fontSize: "12px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>TO DATE</label>
              <input type="date" className="xp-input" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: "1px solid #000", borderRadius: "4px", padding: "6px 8px", fontSize: "12px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SUPPLIER</label>
              <input type="text" className="xp-input" placeholder="Filter by supplier..." value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} style={{ border: "1px solid #000", borderRadius: "4px", padding: "6px 8px", fontSize: "12px", width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SEARCH</label>
              <input type="text" className="xp-input" placeholder="Invoice #, Supplier..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "1px solid #000", borderRadius: "4px", padding: "6px 8px", fontSize: "12px", width: "100%" }} />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ background: "#1e40af", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.9 }}>TOTAL INVOICES</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{filteredPurchases.length}</div>
          </div>
          <div style={{ background: "#059669", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.9 }}>TOTAL ITEMS</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalItems}</div>
          </div>
          <div style={{ background: "#d97706", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.9 }}>TOTAL QTY</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalQty}</div>
          </div>
          <div style={{ background: "#dc2626", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.9 }}>TOTAL AMOUNT</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>PKR {fmt(totalAmount)}</div>
          </div>
        </div>

        {/* Table */}
        <div className="xp-table-panel" style={{ border: "2px solid #000", borderRadius: "6px" }}>
          <div className="xp-table-scroll" style={{ maxHeight: "calc(100vh - 350px)", overflow: "auto" }}>
            <table className="xp-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#1e40af", color: "white", position: "sticky", top: 0 }}>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center", width: "50px" }}>#</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "left" }}>INVOICE #</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "left" }}>DATE</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "left" }}>SUPPLIER</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center" }}>ITEMS</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center", width: "50px" }}>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && filteredPurchases.length === 0 && (
                  <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No purchase records found</td></tr>
                )}
                {filteredPurchases.map((p, i) => (
                  <tr key={p._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px", border: "1px solid #000", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                    <td style={{ padding: "8px", border: "1px solid #000", fontWeight: "bold", fontFamily: "monospace" }}>{p.invoiceNo}</td>
                    <td style={{ padding: "8px", border: "1px solid #000" }}>{p.invoiceDate?.split("T")[0]}</td>
                    <td style={{ padding: "8px", border: "1px solid #000", fontWeight: "bold" }}>{p.supplierName || "—"}</td>
                    <td style={{ padding: "8px", border: "1px solid #000", textAlign: "center" }}>{p.items?.length || 0}</td>
                    <td style={{ padding: "8px", border: "1px solid #000", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>{fmt(p.netTotal || 0)}</td>
                    <td style={{ padding: "8px", border: "1px solid #000", textAlign: "center" }}>
                      <button className="xp-btn xp-btn-sm" style={{ fontSize: "10px", padding: "2px 8px" }} onClick={() => {
                        const printWindow = window.open("", "_blank", "width=900,height=700");
                        // Build print HTML for single invoice
                        printWindow.document.write(buildSinglePrintHtml(p));
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 300);
                      }}>VIEW</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: "#f8fafc", borderTop: "2px solid #000" }}>
                <tr>
                  <td colSpan="5" style={{ padding: "10px", textAlign: "right", fontWeight: "bold", fontSize: "13px" }}>GRAND TOTAL:</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold", color: "#dc2626", fontSize: "14px" }}>PKR {fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Purchase Report</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Records: {filteredPurchases.length}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Total: PKR {fmt(totalAmount)}</div>
      </div>
    </div>
  );
}

const buildSinglePrintHtml = (purchase) => {
  const rows = (purchase.items || []).map((it, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #000;text-align:center">${i + 1}</td>
      <td style="padding:8px;border:1px solid #000">${it.code || "—"}</td>
      <td style="padding:8px;border:1px solid #000">${it.name || it.description || "—"}</td>
      <td style="padding:8px;border:1px solid #000;text-align:center">${it.uom || it.measurement || "—"}</td>
      <td style="padding:8px;border:1px solid #000;text-align:right">${it.pcs || it.qty || 1}</td>
      <td style="padding:8px;border:1px solid #000;text-align:right">${fmt(it.rate || 0)}</td>
      <td style="padding:8px;border:1px solid #000;text-align:right;font-weight:bold">${fmt(it.amount || 0)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Purchase Invoice - ${purchase.invoiceNo}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:20px}
      .header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #000}
      .shop-name{font-size:22px;font-weight:bold}
      .shop-addr{font-size:11px;color:#444}
      .title{font-size:16px;font-weight:bold;margin:15px 0;background:#1e40af;color:#fff;padding:6px;text-align:center}
      .info{display:flex;justify-content:space-between;margin:15px 0;padding:10px;background:#f8fafc;border:1px solid #000}
      table{width:100%;border-collapse:collapse;margin:15px 0}
      th{background:#1e40af;color:#fff;padding:8px;border:1px solid #000;font-size:12px}
      td{padding:8px;border:1px solid #000;font-size:11px}
      .total{text-align:right;margin-top:15px;padding:10px;border-top:2px solid #000;font-weight:bold;font-size:14px}
      .footer{text-align:center;margin-top:20px;padding-top:8px;border-top:1px solid #ddd;font-size:10px}
    </style>
  </head>
  <body>
    <div class="header">
      <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
      <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
    </div>
    <div class="title">PURCHASE INVOICE</div>
    <div class="info">
      <div><strong>Invoice #:</strong> ${purchase.invoiceNo}</div>
      <div><strong>Date:</strong> ${purchase.invoiceDate?.split("T")[0]}</div>
      <div><strong>Supplier:</strong> ${purchase.supplierName || "—"}</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>CODE</th><th>PRODUCT</th><th>UOM</th><th>QTY</th><th>RATE</th><th>AMOUNT</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total">TOTAL: PKR ${fmt(purchase.netTotal || 0)}</div>
    <div class="footer">Printed on: ${new Date().toLocaleString()}</div>
  </body>
  </html>`;
};