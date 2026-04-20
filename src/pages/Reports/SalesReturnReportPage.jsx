// pages/Reports/SalesReturnReportPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";
import "../../styles/SalePage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoDate = () => new Date().toISOString().split("T")[0];

export default function SalesReturnReportPage() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(isoDate());
  const [toDate, setToDate] = useState(isoDate());
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes] = await Promise.all([
        api.get(EP.SALES.GET_ALL),
        api.get(EP.CUSTOMERS.GET_ALL)
      ]);
      
      if (salesRes.data.success) {
        // Filter only sale returns
        const saleReturns = salesRes.data.data.filter(s => 
          s.saleType === "return" || s.type === "return"
        );
        setReturns(saleReturns);
      }
      if (customersRes.data.success) {
        setCustomers(customersRes.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  const filteredReturns = returns.filter(r => {
    const matchesDate = (r.returnDate || r.invoiceDate) >= fromDate && (r.returnDate || r.invoiceDate) <= toDate;
    const matchesSearch = 
      (r.returnNo || r.invoiceNo)?.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.originalInvoiceNo?.toLowerCase().includes(search.toLowerCase());
    const matchesCustomer = !customerFilter || r.customerName?.toLowerCase().includes(customerFilter.toLowerCase());
    
    return matchesDate && matchesSearch && matchesCustomer;
  }).sort((a, b) => new Date(b.returnDate || b.invoiceDate) - new Date(a.returnDate || a.invoiceDate));

  const totalAmount = filteredReturns.reduce((sum, r) => sum + (r.netTotal || 0), 0);
  const totalItems = filteredReturns.reduce((sum, r) => sum + (r.items?.length || 0), 0);
  const totalQty = filteredReturns.reduce((sum, r) => {
    const itemsQty = (r.items || []).reduce((acc, i) => acc + (i.pcs || i.qty || 0), 0);
    return sum + itemsQty;
  }, 0);

  const handlePrint = () => {
    if (!filteredReturns.length) {
      alert("No data to print");
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
        <td style="padding:10px;border:2px solid #000;text-align:center;font-size:13px;font-weight:bold">${i + 1}</td>
        <td style="padding:10px;border:2px solid #000;font-size:13px;font-weight:bold;font-family:monospace">${r.returnNo || r.invoiceNo}</td>
        <td style="padding:10px;border:2px solid #000;font-size:13px">${(r.returnDate || r.invoiceDate)?.split("T")[0]}</td>
        <td style="padding:10px;border:2px solid #000;font-size:13px;font-weight:bold">${r.customerName || "—"}</td>
        <td style="padding:10px;border:2px solid #000;font-size:13px;font-family:monospace">${r.originalInvoiceNo || "—"}</td>
        <td style="padding:10px;border:2px solid #000;text-align:center;font-size:13px">${r.items?.length || 0}</td>
        <td style="padding:10px;border:2px solid #000;text-align:right;font-size:13px;font-weight:bold;color:#dc2626">${fmt(r.netTotal || 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sales Return Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px;font-size:14px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:3px solid #000}
        .shop-name{font-size:24px;font-weight:bold;margin-bottom:5px}
        .shop-addr{font-size:11px;color:#444;margin-bottom:3px}
        .title{font-size:18px;font-weight:bold;margin:15px 0;padding:10px;background:#dc2626;color:#fff;text-align:center}
        .date-range{background:#f8fafc;padding:10px;margin:15px 0;border:2px solid #000;text-align:center;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th{background:#dc2626;color:#fff;padding:12px;border:2px solid #000;font-size:13px}
        td{padding:10px;border:2px solid #000;font-size:12px}
        .totals{width:400px;margin-left:auto;margin-top:20px}
        .totals-row{display:flex;justify-content:space-between;padding:8px 0;font-size:13px}
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
      <div class="title">SALES RETURN REPORT</div>
      <div class="date-range">Period: ${fromDate} to ${toDate}</div>
      <table>
        <thead>
          <tr>
            <th style="width:50px">#</th>
            <th>RETURN #</th>
            <th>DATE</th>
            <th>CUSTOMER</th>
            <th>REF INVOICE</th>
            <th style="width:80px">ITEMS</th>
            <th style="width:150px" class="text-right">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" style="text-align:center">No records found</td></tr>'}
        </tbody>
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

  const handleViewReturn = (returnItem) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(buildSingleReturnHtml(returnItem));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const buildSingleReturnHtml = (returnItem) => {
    const rows = (returnItem.items || []).map((item, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #000;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #000">${item.code || "—"}</td>
        <td style="padding:8px;border:1px solid #000">${item.name || item.description || "—"}</td>
        <td style="padding:8px;border:1px solid #000;text-align:center">${item.uom || "—"}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right">${item.pcs || item.qty || 1}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right">${fmt(item.rate || 0)}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right;font-weight:bold;color:#dc2626">${fmt(item.amount || 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sales Return - ${returnItem.returnNo || returnItem.invoiceNo}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #000}
        .shop-name{font-size:22px;font-weight:bold}
        .shop-addr{font-size:11px;color:#444}
        .title{font-size:16px;font-weight:bold;margin:15px 0;background:#dc2626;color:#fff;padding:8px;text-align:center}
        .info{display:flex;justify-content:space-between;margin:15px 0;padding:10px;background:#f8fafc;border:1px solid #000}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th{background:#dc2626;color:#fff;padding:10px;border:1px solid #000;font-size:12px}
        td{padding:8px;border:1px solid #000;font-size:11px}
        .total{text-align:right;margin-top:15px;padding:10px;border-top:2px solid #000;font-weight:bold;font-size:14px;color:#dc2626}
        .footer{text-align:center;margin-top:20px;padding-top:8px;border-top:1px solid #ddd;font-size:10px}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
      </div>
      <div class="title">SALES RETURN VOUCHER</div>
      <div class="info">
        <div><strong>Return #:</strong> ${returnItem.returnNo || returnItem.invoiceNo}</div>
        <div><strong>Date:</strong> ${(returnItem.returnDate || returnItem.invoiceDate)?.split("T")[0]}</div>
        <div><strong>Customer:</strong> ${returnItem.customerName || "—"}</div>
        <div><strong>Original Invoice:</strong> ${returnItem.originalInvoiceNo || "—"}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>CODE</th><th>PRODUCT</th><th>UOM</th><th>QTY</th><th>RATE</th><th>AMOUNT</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">TOTAL RETURN AMOUNT: PKR ${fmt(returnItem.netTotal || 0)}</div>
      <div class="footer">Printed on: ${new Date().toLocaleString()}</div>
    </body>
    </html>`;
  };

  const clearFilters = () => {
    setSearch("");
    setCustomerFilter("");
    setFromDate(isoDate());
    setToDate(isoDate());
  };

  return (
    <div className="sl-page">
      <div className="xp-titlebar" style={{ background: "#dc2626" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Sales Return Report — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={fetchData} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrint} disabled={!filteredReturns.length} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold", marginLeft: "8px" }}>🖨 Print</button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Filter Section */}
        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "16px", marginBottom: "20px", border: "2px solid #dc2626" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>From Date</label>
              <input type="date" className="xp-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "8px", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>To Date</label>
              <input type="date" className="xp-input" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "8px", fontSize: "13px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Customer Name</label>
              <input type="text" className="xp-input" placeholder="Filter by customer..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "8px", fontSize: "13px", width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Search</label>
              <input type="text" className="xp-input" placeholder="Return #, Invoice #..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "1px solid #dc2626", borderRadius: "4px", padding: "8px", fontSize: "13px", width: "100%" }} />
            </div>
            <div>
              <button className="xp-btn xp-btn-sm" onClick={clearFilters} style={{ padding: "8px 16px", fontWeight: "bold" }}>Clear Filters</button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {filteredReturns.length > 0 && (
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ background: "#dc2626", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "11px", opacity: 0.9 }}>TOTAL RETURNS</div>
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>{filteredReturns.length}</div>
            </div>
            <div style={{ background: "#059669", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "11px", opacity: 0.9 }}>TOTAL ITEMS</div>
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalItems}</div>
            </div>
            <div style={{ background: "#d97706", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "11px", opacity: 0.9 }}>TOTAL QUANTITY</div>
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalQty}</div>
            </div>
            <div style={{ background: "#1e40af", color: "white", padding: "12px 20px", borderRadius: "6px", flex: 1, textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "11px", opacity: 0.9 }}>RETURN AMOUNT</div>
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>PKR {fmt(totalAmount)}</div>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="xp-table-panel" style={{ border: "2px solid #dc2626", borderRadius: "8px" }}>
          <div className="xp-table-scroll" style={{ maxHeight: "calc(100vh - 380px)", overflow: "auto" }}>
            <table className="xp-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#dc2626", color: "white", position: "sticky", top: 0 }}>
                  <th style={{ padding: "10px", border: "1px solid #000", width: "50px", textAlign: "center" }}>#</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "left" }}>RETURN #</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "left" }}>DATE</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "left" }}>CUSTOMER</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "left" }}>REF INVOICE</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center", width: "80px" }}>ITEMS</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "right", width: "150px" }}>AMOUNT</th>
                  <th style={{ padding: "10px", border: "1px solid #000", textAlign: "center", width: "80px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && filteredReturns.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No sales return records found</td></tr>
                )}
                {filteredReturns.map((r, i) => (
                  <tr key={r._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", fontWeight: "bold", fontFamily: "monospace" }}>{r.returnNo || r.invoiceNo}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626" }}>{(r.returnDate || r.invoiceDate)?.split("T")[0]}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", fontWeight: "bold" }}>{r.customerName || "—"}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", fontFamily: "monospace" }}>{r.originalInvoiceNo || "—"}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center" }}>{r.items?.length || 0}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>{fmt(r.netTotal || 0)}</td>
                    <td style={{ padding: "8px", border: "1px solid #dc2626", textAlign: "center" }}>
                      <button className="xp-btn xp-btn-sm" style={{ fontSize: "10px", padding: "4px 8px", background: "#dc2626", color: "white" }} onClick={() => handleViewReturn(r)}>VIEW</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredReturns.length > 0 && (
                <tfoot style={{ background: "#f8fafc", borderTop: "2px solid #dc2626" }}>
                  <tr>
                    <td colSpan="6" style={{ padding: "10px", textAlign: "right", fontWeight: "bold", fontSize: "13px" }}>GRAND TOTAL:</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold", color: "#dc2626", fontSize: "14px" }}>PKR {fmt(totalAmount)}</td>
                    <td style={{ padding: "10px" }}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #dc2626", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Sales Return Report</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Records: {filteredReturns.length}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Total: PKR {fmt(totalAmount)}</div>
      </div>
    </div>
  );
}