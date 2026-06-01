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
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      // Use the new PURCHASE_RETURNS endpoint
      const response = await api.get(EP.PURCHASE_RETURNS.GET_ALL);
      if (response.data.success && response.data.data) {
        setReturns(response.data.data);
        console.log("Found purchase returns:", response.data.data.length);
      } else {
        // Fallback: try to get from purchases with type purchase_return
        const purchaseResponse = await api.get(EP.PURCHASES.GET_ALL);
        if (purchaseResponse.data.success && purchaseResponse.data.data) {
          const returnsList = purchaseResponse.data.data.filter(p => 
            p.type === "purchase_return" || p.saleType === "purchase_return"
          );
          setReturns(returnsList);
        }
      }
    } catch (error) {
      console.error("Failed to fetch purchase returns:", error);
    }
    setLoading(false);
  };

  const handleViewDetails = (returnItem) => {
    setSelectedReturn(returnItem);
    setShowModal(true);
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = 
      (r.returnNo || r.invoiceNo || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.supplierName || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.purchaseInvNo || "").toLowerCase().includes(search.toLowerCase());
    
    const returnDate = r.returnDate || r.invoiceDate || "";
    const matchesDate = returnDate >= fromDate && returnDate <= toDate;
    const matchesSupplier = !supplierFilter || (r.supplierName || "").toLowerCase().includes(supplierFilter.toLowerCase());
    
    return matchesSearch && matchesDate && matchesSupplier;
  }).sort((a, b) => new Date(b.returnDate || b.invoiceDate || 0) - new Date(a.returnDate || a.invoiceDate || 0));

  const totalAmount = filteredReturns.reduce((sum, r) => sum + (r.netTotal || r.totalAmount || r.subTotal || 0), 0);
  const totalItems = filteredReturns.reduce((sum, r) => sum + (r.items?.length || 0), 0);
  const totalQty = filteredReturns.reduce((sum, r) => {
    const itemsQty = (r.items || []).reduce((s, i) => s + (i.pcs || i.qty || i.quantity || 0), 0);
    return sum + itemsQty;
  }, 0);

  const handlePrint = () => {
    if (filteredReturns.length === 0) {
      alert("No records to print");
      return;
    }
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
        <td style="padding:10px;border:2px solid #000;text-align:right;font-weight:bold;color:#dc2626">${fmt(r.netTotal || r.totalAmount || r.subTotal || 0)}</td>
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
        <div class="shop-name">DGS/div>
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
      <div className="xp-titlebar" style={{ background: "#dc2626", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "18px" }}>←</button>
          <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Purchase Return Report — DGS Store</span>
        </div>
        <div className="xp-tb-actions" style={{ display: "flex", gap: "8px" }}>
          <button onClick={fetchReturns} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "4px 12px", borderRadius: "4px", cursor: "pointer" }}>⟳ Refresh</button>
          <button onClick={handlePrint} disabled={filteredReturns.length === 0} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "4px 12px", borderRadius: "4px", cursor: "pointer" }}>🖨 Print</button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{ background: "#f8fafc", borderRadius: "6px", padding: "12px", marginBottom: "16px", border: "2px solid #dc2626" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>FROM DATE</label>
              <input type="date" className="xp-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "6px 8px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>TO DATE</label>
              <input type="date" className="xp-input" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "6px 8px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SUPPLIER</label>
              <input type="text" placeholder="Filter by supplier..." value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "6px 8px", width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SEARCH</label>
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

        <div className="xp-table-panel" style={{ border: "2px solid #dc2626", borderRadius: "6px", overflow: "hidden" }}>
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
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center" }}>QTY</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center", width: "80px" }}>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="9" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>}
                {!loading && filteredReturns.length === 0 && <tr><td colSpan="9" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No purchase return records found</td></tr>}
                {filteredReturns.map((r, i) => {
                  const itemQty = (r.items || []).reduce((s, it) => s + (it.pcs || it.qty || it.quantity || 0), 0);
                  return (
                    <tr key={r._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                      <td style={{ padding: "8px", border: "1px solid #dc2626", fontWeight: "bold", fontFamily: "monospace" }}>{r.returnNo || r.invoiceNo}</td>
                      <td style={{ padding: "8px", border: "1px solid #dc2626" }}>{(r.returnDate || r.invoiceDate)?.split("T")[0]}</td>
                      <td style={{ padding: "8px", border: "1px solid #dc2626", fontWeight: "bold" }}>{r.supplierName || "—"}</td>
                      <td style={{ padding: "8px", border: "1px solid #dc2626", fontFamily: "monospace" }}>{r.purchaseInvNo || "—"}</td>
                      <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center" }}>{r.items?.length || 0}</td>
                      <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center" }}>{itemQty}</td>
                      <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>{fmt(r.netTotal || r.totalAmount || r.subTotal || 0)}</td>
                      <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center" }}>
                        <button onClick={() => handleViewDetails(r)} className="xp-btn xp-btn-sm" style={{ fontSize: "10px", padding: "4px 10px", background: "#dc2626", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>VIEW</button>
                      </td>
                     </tr>
                  );
                })}
              </tbody>
              <tfoot style={{ background: "#f8fafc", borderTop: "2px solid #dc2626" }}>
                <tr>
                  <td colSpan="7" style={{ padding: "10px", textAlign: "right", fontWeight: "bold", fontSize: "13px" }}>GRAND TOTAL:</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold", color: "#dc2626", fontSize: "14px" }}>PKR {fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedReturn && (
        <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)} style={{ zIndex: 2000 }}>
          <div className="xp-modal" style={{ width: "90%", maxWidth: "1000px", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: "12px", overflow: "hidden" }}>
            <div className="xp-modal-tb" style={{ background: "#dc2626", padding: "12px 16px" }}>
              <span className="xp-modal-title" style={{ color: "white", fontWeight: "bold" }}>Purchase Return Details — {selectedReturn.returnNo || selectedReturn.invoiceNo}</span>
              <button className="xp-cap-btn xp-cap-close" onClick={() => setShowModal(false)} style={{ color: "white" }}>✕</button>
            </div>
            <div className="xp-modal-body" style={{ padding: "16px", overflow: "auto", flex: 1, background: "#f9fafb" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px", padding: "16px", background: "white", borderRadius: "10px" }}>
                <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Return #</div><div style={{ fontSize: "18px", fontWeight: "bold", color: "#dc2626" }}>{selectedReturn.returnNo || selectedReturn.invoiceNo}</div></div>
                <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Date</div><div style={{ fontSize: "14px", fontWeight: "500" }}>{selectedReturn.returnDate || selectedReturn.invoiceDate?.split("T")[0]}</div></div>
                <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Supplier</div><div style={{ fontSize: "14px", fontWeight: "500" }}>{selectedReturn.supplierName}</div></div>
                {selectedReturn.purchaseInvNo && <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Reference Purchase</div><div style={{ fontSize: "14px" }}>{selectedReturn.purchaseInvNo}</div></div>}
                {selectedReturn.notes && <div style={{ gridColumn: "span 2" }}><div style={{ fontSize: "11px", color: "#6b7280" }}>Remarks</div><div style={{ fontSize: "13px", padding: "8px", background: "#fef2f2", borderRadius: "6px" }}>{selectedReturn.notes}</div></div>}
              </div>
              <div style={{ background: "white", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead style={{ background: "#dc2626", color: "white" }}>
                    <tr><th style={{ padding: "10px" }}>#</th><th>Code</th><th>Product Name</th><th>UOM</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
                  </thead>
                  <tbody>
                    {(selectedReturn.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "8px", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ padding: "8px" }}>{it.code || "—"}</td>
                        <td style={{ padding: "8px", fontWeight: "500" }}>{it.name || it.description || "—"}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{it.uom || it.measurement || "—"}</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>{it.pcs || it.quantity || it.qty || 0}</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>{fmt(it.rate || it.unitPrice || 0)}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>{fmt(it.amount || it.total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: "#fef2f2", fontWeight: "bold" }}>
                    <tr><td colSpan="4" style={{ padding: "10px", textAlign: "right" }}>Totals:</td><td style={{ padding: "10px", textAlign: "right" }}>{(selectedReturn.items || []).reduce((s, it) => s + (it.pcs || it.quantity || it.qty || 0), 0)}</td><td></td><td style={{ padding: "10px", textAlign: "right", color: "#dc2626" }}>PKR {fmt(selectedReturn.netTotal || selectedReturn.totalAmount || selectedReturn.subTotal || 0)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px", justifyContent: "flex-end", background: "white" }}>
              <button className="xp-btn" onClick={() => setShowModal(false)}>Close</button>
              <button className="xp-btn" style={{ background: "#f59e0b", color: "white", borderColor: "#d97706" }} onClick={() => {
                const printWindow = window.open("", "_blank", "width=800,height=600");
                printWindow.document.write(buildPrintHtmlForSingle(selectedReturn));
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 500);
              }}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #dc2626", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Purchase Return Report</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Records: {filteredReturns.length}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Total: PKR {fmt(totalAmount)}</div>
      </div>
    </div>
  );
}

// Helper function for printing single return
function buildPrintHtmlForSingle(ret) {
  const rows = (ret.items || []).map((it, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #000">${i + 1}</td>
      <td style="padding:8px;border:1px solid #000">${it.code || "—"}</td>
      <td style="padding:8px;border:1px solid #000">${it.name || it.description || "—"}</td>
      <td style="padding:8px;border:1px solid #000;text-align:center">${it.uom || it.measurement || "—"}</td>
      <td style="padding:8px;border:1px solid #000;text-align:right">${it.pcs || it.quantity || it.qty || 0}</td>
      <td style="padding:8px;border:1px solid #000;text-align:right">${fmt(it.rate || it.unitPrice || 0)}</td>
      <td style="padding:8px;border:1px solid #000;text-align:right;font-weight:bold">${fmt(it.amount || it.total || 0)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Purchase Return ${ret.returnNo}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:20px}
    .header{text-align:center;margin-bottom:20px}
    .title{font-size:18px;font-weight:bold;color:#dc2626}
    table{width:100%;border-collapse:collapse;margin:15px 0}
    th{background:#dc2626;color:#fff;padding:10px;border:1px solid #000}
    td{padding:8px;border:1px solid #000}
    .r{text-align:right}
  </style>
  </head>
  <body>
    <div class="header">
      <div class="title">PURCHASE RETURN</div>
    </div>
    <p><strong>Return #:</strong> ${ret.returnNo}</p>
    <p><strong>Date:</strong> ${ret.returnDate}</p>
    <p><strong>Supplier:</strong> ${ret.supplierName}</p>
    ${ret.purchaseInvNo ? `<p><strong>Reference Purchase:</strong> ${ret.purchaseInvNo}</p>` : ""}
    <table>
      <thead><tr><th>#</th><th>Code</th><th>Product</th><th>UOM</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="6" class="r"><strong>Total:</strong></td><td class="r"><strong>${fmt(ret.netTotal || ret.totalAmount || ret.subTotal || 0)}</strong></td></tr></tfoot>
    </table>
  </body>
  </html>`;
}