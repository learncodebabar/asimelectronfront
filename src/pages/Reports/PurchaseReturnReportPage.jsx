// pages/PurchaseReturnReportPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";
import "../../styles/SalePage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoDate = () => new Date().toISOString().split("T")[0];

export default function PurchaseReturnReportPage() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(isoDate());
  const [toDate, setToDate] = useState(isoDate());
  const [supplierFilter, setSupplierFilter] = useState("");

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.PURCHASES.GET_ALL);
      if (response.data.success && response.data.data) {
        const returnsList = response.data.data.filter(p => 
          p.type === "purchase_return" || p.saleType === "purchase_return"
        );
        setReturns(returnsList);
      }
    } catch (error) {
      console.error("Failed to fetch purchase returns:", error);
    }
    setLoading(false);
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = 
      (r.returnNo || r.invoiceNo)?.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      r.purchaseInvNo?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDate = (r.returnDate || r.invoiceDate) >= fromDate && (r.returnDate || r.invoiceDate) <= toDate;
    const matchesSupplier = !supplierFilter || r.supplierName?.toLowerCase().includes(supplierFilter.toLowerCase());
    
    return matchesSearch && matchesDate && matchesSupplier;
  }).sort((a, b) => new Date(b.returnDate || b.invoiceDate) - new Date(a.returnDate || a.invoiceDate));

  const totalAmount = filteredReturns.reduce((sum, r) => sum + (r.netTotal || 0), 0);
  const totalItems = filteredReturns.reduce((sum, r) => sum + (r.items?.length || 0), 0);
  const totalQty = filteredReturns.reduce((sum, r) => {
    const itemsQty = (r.items || []).reduce((s, i) => s + (i.pcs || i.qty || 0), 0);
    return sum + itemsQty;
  }, 0);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const buildPrintHtml = () => {
    const rows = filteredReturns.map((r, i) => `
      <tr>
        <td style="padding:10px;border:2px solid #000;text-align:center">${i + 1}</td>
        <td style="padding:10px;border:2px solid #000;font-weight:bold">${r.returnNo || r.invoiceNo}</td>
        <td style="padding:10px;border:2px solid #000">${r.returnDate || r.invoiceDate?.split("T")[0]}</td>
        <td style="padding:10px;border:2px solid #000;font-weight:bold">${r.supplierName || "—"}</td>
        <td style="padding:10px;border:2px solid #000">${r.purchaseInvNo || "—"}</td>
        <td style="padding:10px;border:2px solid #000;text-align:center">${r.items?.length || 0}</td>
        <td style="padding:10px;border:2px solid #000;text-align:right;font-weight:bold;color:#dc2626">${fmt(r.netTotal || 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Return Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:3px solid #000}
        .shop-name{font-size:24px;font-weight:bold}
        .shop-addr{font-size:11px;color:#444}
        .title{font-size:18px;font-weight:bold;margin:15px 0;background:#dc2626;color:#fff;padding:8px;text-align:center}
        .date-range{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:1px solid #000}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th{background:#dc2626;color:#fff;padding:12px;border:2px solid #000}
        td{padding:10px;border:2px solid #000;font-size:12px}
        .totals{width:400px;margin-left:auto;margin-top:20px}
        .totals-row{display:flex;justify-content:space-between;padding:8px 0}
        .totals-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:10px;font-size:16px}
        .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px}
        .text-right{text-align:right}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
      </div>
      <div class="title">PURCHASE RETURN REPORT</div>
      <div class="date-range">Period: ${fromDate} to ${toDate}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>RETURN #</th>
            <th>DATE</th>
            <th>SUPPLIER</th>
            <th>REF INVOICE</th>
            <th>ITEMS</th>
            <th class="text-right">AMOUNT</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center">No records found</td></tr>'}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Total Returns:</span><span>${filteredReturns.length}</span></div>
        <div class="totals-row"><span>Total Items:</span><span>${totalItems}</span></div>
        <div class="totals-row"><span>Total Quantity:</span><span>${totalQty}</span></div>
        <div class="totals-row bold"><span>Total Return Amount:</span><span>PKR ${fmt(totalAmount)}</span></div>
      </div>
      <div class="footer">Printed on: ${new Date().toLocaleString()} | Developed by: Creative Babar / 03098325271</div>
    </body>
    </html>`;
  };

  return (
    <div className="sl-page">
      <div className="xp-titlebar" style={{ background: "#dc2626" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Purchase Return Report — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={fetchReturns}>⟳ Refresh</button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrint} disabled={filteredReturns.length === 0}>🖨 Print</button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{ background: "#f8fafc", borderRadius: "6px", padding: "12px", marginBottom: "16px", border: "2px solid #dc2626" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div><label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>FROM DATE</label>
              <input type="date" className="xp-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "6px 8px" }} />
            </div>
            <div><label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>TO DATE</label>
              <input type="date" className="xp-input" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "6px 8px" }} />
            </div>
            <div style={{ flex: 1 }}><label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SUPPLIER</label>
              <input type="text" placeholder="Filter by supplier..." value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "6px 8px", width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}><label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SEARCH</label>
              <input type="text" placeholder="Return #, Invoice #, Supplier..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "6px 8px", width: "100%" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ background: "#dc2626", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
            <div style={{ fontSize: "11px", opacity: 0.9 }}>TOTAL RETURNS</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{filteredReturns.length}</div>
          </div>
          <div style={{ background: "#059669", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
            <div style={{ fontSize: "11px", opacity: 0.9 }}>TOTAL ITEMS</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalItems}</div>
          </div>
          <div style={{ background: "#d97706", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
            <div style={{ fontSize: "11px", opacity: 0.9 }}>TOTAL QTY</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalQty}</div>
          </div>
          <div style={{ background: "#1e40af", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
            <div style={{ fontSize: "11px", opacity: 0.9 }}>RETURN AMOUNT</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>PKR {fmt(totalAmount)}</div>
          </div>
        </div>

        <div className="xp-table-panel" style={{ border: "2px solid #dc2626", borderRadius: "6px" }}>
          <div className="xp-table-scroll" style={{ maxHeight: "calc(100vh - 380px)", overflow: "auto" }}>
            <table className="xp-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#dc2626", color: "white", position: "sticky", top: 0 }}>
                  <th style={{ padding: "10px", border: "1px solid #000", width: "50px" }}>#</th>
                  <th style={{ padding: "10px", border: "1px solid #000" }}>RETURN #</th>
                  <th style={{ padding: "10px", border: "1px solid #000" }}>DATE</th>
                  <th style={{ padding: "10px", border: "1px solid #000" }}>SUPPLIER</th>
                  <th style={{ padding: "10px", border: "1px solid #000" }}>REF INVOICE</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center" }}>ITEMS</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center", width: "80px" }}>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>}
                {!loading && filteredReturns.length === 0 && <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No purchase return records found</td></tr>}
                {filteredReturns.map((r, i) => (
                  <tr key={r._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", fontWeight: "bold", fontFamily: "monospace" }}>{r.returnNo || r.invoiceNo}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626" }}>{(r.returnDate || r.invoiceDate)?.split("T")[0]}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", fontWeight: "bold" }}>{r.supplierName || "—"}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", fontFamily: "monospace" }}>{r.purchaseInvNo || "—"}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center" }}>{r.items?.length || 0}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>{fmt(r.netTotal || 0)}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center" }}>
                      <button className="xp-btn xp-btn-sm" style={{ fontSize: "10px", padding: "2px 8px", background: "#dc2626", color: "white" }}>VIEW</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: "#f8fafc", borderTop: "2px solid #dc2626" }}>
                <tr>
                  <td colSpan="6" style={{ padding: "10px", textAlign: "right", fontWeight: "bold", fontSize: "13px" }}>GRAND TOTAL:</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold", color: "#dc2626", fontSize: "14px" }}>PKR {fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #dc2626", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Purchase Return Report</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Records: {filteredReturns.length}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Total: PKR {fmt(totalAmount)}</div>
      </div>
    </div>
  );
}