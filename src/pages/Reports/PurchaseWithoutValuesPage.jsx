// pages/PurchaseWithoutValuesPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";
import "../../styles/SalePage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoDate = () => new Date().toISOString().split("T")[0];

export default function PurchaseWithoutValuesPage() {
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
      p.supplierName?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDate = p.invoiceDate >= fromDate && p.invoiceDate <= toDate;
    const matchesSupplier = !supplierFilter || p.supplierName?.toLowerCase().includes(supplierFilter.toLowerCase());
    
    return matchesSearch && matchesDate && matchesSupplier;
  }).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

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
        <td style="padding:10px;border:2px solid #000;text-align:center">${i + 1}</td>
        <td style="padding:10px;border:2px solid #000;font-weight:bold">${p.invoiceNo}</td>
        <td style="padding:10px;border:2px solid #000">${p.invoiceDate}</td>
        <td style="padding:10px;border:2px solid #000;font-weight:bold">${p.supplierName || "—"}</td>
        <td style="padding:10px;border:2px solid #000;text-align:center">${p.items?.length || 0}</td>
        <td style="padding:10px;border:2px solid #000;text-align:center">******</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Report (Without Values)</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:3px solid #000}
        .shop-name{font-size:24px;font-weight:bold}
        .title{font-size:18px;font-weight:bold;margin:15px 0;background:#d97706;color:#fff;padding:8px;text-align:center}
        .date-range{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:1px solid #000}
        .note{text-align:center;margin:10px 0;padding:6px;background:#fef3c7;border:1px solid #d97706;color:#78350f;font-size:11px;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th{background:#d97706;color:#fff;padding:12px;border:2px solid #000}
        td{padding:10px;border:2px solid #000;font-size:12px}
        .totals{width:400px;margin-left:auto;margin-top:20px}
        .totals-row{display:flex;justify-content:space-between;padding:8px 0}
        .totals-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:10px}
        .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
      </div>
      <div class="title">PURCHASE REPORT (WITHOUT VALUES)</div>
      <div class="date-range">Period: ${fromDate} to ${toDate}</div>
      <div class="note">⚠ CONFIDENTIAL - PRICES HIDDEN ⚠</div>
      <table>
        <thead><tr><th>#</th><th>INVOICE #</th><th>DATE</th><th>SUPPLIER</th><th>ITEMS</th><th>AMOUNT</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center">No records found</td></tr>'}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Total Invoices:</span><span>${filteredPurchases.length}</span></div>
        <div class="totals-row"><span>Total Items:</span><span>${totalItems}</span></div>
        <div class="totals-row"><span>Total Quantity:</span><span>${totalQty}</span></div>
        <div class="totals-row bold"><span>Total Amount:</span><span>[CONFIDENTIAL]</span></div>
      </div>
      <div class="footer">Printed on: ${new Date().toLocaleString()}</div>
    </body>
    </html>`;
  };

  return (
    <div className="sl-page">
      <div className="xp-titlebar" style={{ background: "#d97706" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Purchase Report (Without Values) — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={fetchPurchases}>⟳ Refresh</button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrint} disabled={filteredPurchases.length === 0}>🖨 Print</button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{ background: "#fef3c7", padding: "10px", marginBottom: "16px", borderRadius: "6px", border: "1px solid #d97706", textAlign: "center" }}>
          <span style={{ fontWeight: "bold", color: "#78350f" }}>⚠ CONFIDENTIAL REPORT - PRICES ARE HIDDEN ⚠</span>
        </div>

        <div style={{ background: "#f8fafc", borderRadius: "6px", padding: "12px", marginBottom: "16px", border: "2px solid #d97706" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div><label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>FROM DATE</label>
              <input type="date" className="xp-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: "1px solid #d97706", borderRadius: "4px", padding: "6px 8px" }} />
            </div>
            <div><label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>TO DATE</label>
              <input type="date" className="xp-input" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: "1px solid #d97706", borderRadius: "4px", padding: "6px 8px" }} />
            </div>
            <div style={{ flex: 1 }}><label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SUPPLIER</label>
              <input type="text" placeholder="Filter by supplier..." value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} style={{ border: "1px solid #d97706", borderRadius: "4px", padding: "6px 8px", width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}><label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SEARCH</label>
              <input type="text" placeholder="Invoice #, Supplier..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "1px solid #d97706", borderRadius: "4px", padding: "6px 8px", width: "100%" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <div style={{ background: "#d97706", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "11px" }}>INVOICES</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{filteredPurchases.length}</div>
          </div>
          <div style={{ background: "#059669", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "11px" }}>TOTAL ITEMS</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalItems}</div>
          </div>
          <div style={{ background: "#6b7280", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "11px" }}>TOTAL QTY</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalQty}</div>
          </div>
        </div>

        <div className="xp-table-panel" style={{ border: "2px solid #d97706", borderRadius: "6px" }}>
          <div className="xp-table-scroll" style={{ maxHeight: "calc(100vh - 380px)", overflow: "auto" }}>
            <table className="xp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#d97706", color: "white", position: "sticky", top: 0 }}>
                  <th style={{ padding: "10px", border: "1px solid #000", width: "50px" }}>#</th>
                  <th style={{ padding: "10px", border: "1px solid #000" }}>INVOICE #</th>
                  <th style={{ padding: "10px", border: "1px solid #000" }}>DATE</th>
                  <th style={{ padding: "10px", border: "1px solid #000" }}>SUPPLIER</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center" }}>ITEMS</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center" }}>AMOUNT</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center", width: "80px" }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>}
                {!loading && filteredPurchases.length === 0 && <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center" }}>No records found</td></tr>}
                {filteredPurchases.map((p, i) => (
                  <tr key={p._id}>
                    <td style={{ padding: "8px", border: "1px solid #d97706", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                    <td style={{ padding: "8px", border: "1px solid #d97706", fontWeight: "bold", fontFamily: "monospace" }}>{p.invoiceNo}</td>
                    <td style={{ padding: "8px", border: "1px solid #d97706" }}>{p.invoiceDate?.split("T")[0]}</td>
                    <td style={{ padding: "8px", border: "1px solid #d97706", fontWeight: "bold" }}>{p.supplierName || "—"}</td>
                    <td style={{ padding: "8px", border: "1px solid #d97706", textAlign: "center" }}>{p.items?.length || 0}</td>
                    <td style={{ padding: "8px", border: "1px solid #d97706", textAlign: "center", fontWeight: "bold", color: "#78350f" }}>******</td>
                    <td style={{ padding: "8px", border: "1px solid #d97706", textAlign: "center" }}>
                      <button className="xp-btn xp-btn-sm" style={{ fontSize: "10px", background: "#d97706", color: "white" }}>VIEW</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}