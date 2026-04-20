// pages/Reports/SalePartyWisePage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";
import "../../styles/SalePage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoDate = () => new Date().toISOString().split("T")[0];

export default function SalePartyWisePage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(isoDate());
  const [toDate, setToDate] = useState(isoDate());
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes] = await Promise.all([
        api.get(EP.SALES.GET_ALL),
        api.get(EP.CUSTOMERS.GET_ALL)
      ]);
      
      if (salesRes.data.success) {
        const saleInvoices = salesRes.data.data.filter(s => s.saleType !== "return" && s.type !== "return");
        setSales(saleInvoices);
      }
      if (customersRes.data.success) {
        const creditCustomers = customersRes.data.data.filter(c => 
          (c.customerType === "credit" || c.type === "credit") && 
          c.name?.toUpperCase() !== "COUNTER SALE"
        );
        setCustomers(creditCustomers);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  const loadCustomerSales = () => {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }
    
    const filtered = sales.filter(s => {
      const matchesCustomer = s.customerId === selectedCustomer._id || s.customerName === selectedCustomer.name;
      const matchesDate = s.invoiceDate >= fromDate && s.invoiceDate <= toDate;
      return matchesCustomer && matchesDate;
    });
    
    setCustomerSales(filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate)));
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const totalAmount = customerSales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
  const totalItems = customerSales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
  const totalQty = customerSales.reduce((sum, s) => {
    const itemsQty = (s.items || []).reduce((acc, i) => acc + (i.pcs || i.qty || 0), 0);
    return sum + itemsQty;
  }, 0);

  const handlePrint = () => {
    if (!customerSales.length) {
      alert("No data to print");
      return;
    }
    
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const buildPrintHtml = () => {
    const rows = customerSales.map((s, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #000;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #000;font-weight:bold">${s.invoiceNo}</td>
        <td style="padding:6px;border:1px solid #000">${s.invoiceDate?.split("T")[0]}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${s.items?.length || 0}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right;font-weight:bold">${fmt(s.netTotal || 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sale Party Wise Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:15px}
        .header{text-align:center;margin-bottom:15px;padding-bottom:8px;border-bottom:2px solid #000}
        .shop-name{font-size:20px;font-weight:bold;margin-bottom:3px}
        .shop-addr{font-size:10px;color:#444;margin-bottom:2px}
        .title{font-size:16px;font-weight:bold;margin:12px 0;padding:8px;background:#1a1a1a;color:#fff;text-align:center}
        .customer-info{background:#f5f5f5;padding:8px 12px;margin:12px 0;border:1px solid #000;display:flex;justify-content:space-between}
        table{width:100%;border-collapse:collapse;margin:12px 0}
        th{background:#1a1a1a;color:#fff;padding:8px;border:1px solid #000;font-size:12px}
        td{padding:6px;border:1px solid #000;font-size:11px}
        .totals{width:350px;margin-left:auto;margin-top:15px}
        .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}
        .totals-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:8px;font-size:14px}
        .footer{text-align:center;margin-top:20px;padding-top:8px;border-top:1px solid #ddd;font-size:9px;color:#666}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
        <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
      </div>
      <div class="title">SALE PARTY WISE REPORT</div>
      <div class="customer-info">
        <div><strong>Customer:</strong> ${selectedCustomer?.name || ""}<br><strong>Code:</strong> ${selectedCustomer?.code || "—"} | <strong>Phone:</strong> ${selectedCustomer?.phone || "—"}</div>
        <div><strong>Period:</strong> ${fromDate} to ${toDate}<br><strong>Printed:</strong> ${new Date().toLocaleString()}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Invoice #</th><th>Date</th><th>Items</th><th>Amount</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center">No records found</td></tr>'}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Total Invoices:</span><span>${customerSales.length}</span></div>
        <div class="totals-row"><span>Total Items:</span><span>${totalItems}</span></div>
        <div class="totals-row"><span>Total Quantity:</span><span>${totalQty}</span></div>
        <div class="totals-row bold"><span>Total Amount:</span><span>PKR ${fmt(totalAmount)}</span></div>
      </div>
      <div class="footer">Thank you for your business! | Developed by: Creative Babar / 03098325271</div>
    </body>
    </html>`;
  };

  const handleViewInvoice = (invoice) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(buildSingleInvoiceHtml(invoice));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const buildSingleInvoiceHtml = (sale) => {
    const rows = (sale.items || []).map((item, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #000;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #000">${item.code || "—"}</td>
        <td style="padding:6px;border:1px solid #000">${item.name || item.description || "—"}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${item.uom || "—"}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right">${item.pcs || item.qty || 1}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right">${fmt(item.rate || 0)}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right;font-weight:bold">${fmt(item.amount || 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sale Invoice - ${sale.invoiceNo}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:15px}
        .header{text-align:center;margin-bottom:15px;padding-bottom:8px;border-bottom:2px solid #000}
        .shop-name{font-size:18px;font-weight:bold}
        .shop-addr{font-size:10px;color:#444}
        .title{font-size:14px;font-weight:bold;margin:12px 0;padding:6px;background:#1a1a1a;color:#fff;text-align:center}
        .info{display:flex;justify-content:space-between;margin:12px 0;padding:8px;background:#f5f5f5;border:1px solid #000}
        table{width:100%;border-collapse:collapse;margin:12px 0}
        th{background:#1a1a1a;color:#fff;padding:8px;border:1px solid #000;font-size:11px}
        td{padding:6px;border:1px solid #000;font-size:10px}
        .total{text-align:right;margin-top:12px;padding:8px;border-top:2px solid #000;font-weight:bold;font-size:13px}
        .footer{text-align:center;margin-top:15px;padding-top:6px;border-top:1px solid #ddd;font-size:9px}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
      </div>
      <div class="title">SALE INVOICE</div>
      <div class="info">
        <div><strong>Invoice:</strong> ${sale.invoiceNo}</div>
        <div><strong>Date:</strong> ${sale.invoiceDate?.split("T")[0]}</div>
        <div><strong>Customer:</strong> ${sale.customerName || "COUNTER SALE"}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Code</th><th>Product</th><th>UOM</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">TOTAL: PKR ${fmt(sale.netTotal || 0)}</div>
      <div class="footer">Printed: ${new Date().toLocaleString()}</div>
    </body>
    </html>`;
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedCustomer(null);
    setCustomerSales([]);
    setSearchTerm("");
    setShowDropdown(false);
  };

  return (
    <div className="sl-page" style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1a1a1a", borderBottom: "2px solid #000", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navigate("/")} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "4px 10px", cursor: "pointer", borderRadius: "3px", fontSize: "12px" }}>← Back</button>
          <span style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>Sale Party Wise Report — Asim Electric Store</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={fetchData} style={{ padding: "4px 12px", background: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button onClick={handlePrint} disabled={!customerSales.length} style={{ padding: "4px 12px", background: customerSales.length ? "#1a1a1a" : "#ccc", color: "#fff", border: "1px solid #000", cursor: customerSales.length ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: "bold" }}>🖨 Print</button>
        </div>
      </div>

      <div style={{ padding: "10px" }}>
        {/* Filter Section */}
        <div style={{ border: "1px solid #000", padding: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: "250px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Select Customer</label>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by name, code or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  if (e.target.value === "") {
                    setSelectedCustomer(null);
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                style={{ border: "1px solid #000", padding: "5px 8px", width: "100%", fontSize: "11px" }}
              />
              {showDropdown && filteredCustomers.length > 0 && (
                <div ref={dropdownRef} style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #000", maxHeight: "250px", overflowY: "auto", zIndex: 10, marginTop: "2px" }}>
                  {filteredCustomers.map(c => (
                    <div
                      key={c._id}
                      onClick={() => selectCustomer(c)}
                      style={{ padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #ddd" }}
                      onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
                      onMouseLeave={(e) => e.target.style.background = "#fff"}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "12px" }}>{c.name}</div>
                      <div style={{ fontSize: "10px", color: "#666" }}>Code: {c.code || "—"} | Phone: {c.phone || "—"} | Balance: PKR {fmt(c.currentBalance || 0)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "11px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "11px" }} />
            </div>
            <div>
              <button onClick={loadCustomerSales} disabled={!selectedCustomer} style={{ padding: "5px 16px", background: selectedCustomer ? "#1a1a1a" : "#ccc", color: "#fff", border: "1px solid #000", cursor: selectedCustomer ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: "bold" }}>Show Report</button>
            </div>
            <div>
              <button onClick={clearSelection} style={{ padding: "5px 12px", background: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>Clear</button>
            </div>
          </div>
        </div>

        {/* Selected Customer Info Card */}
        {selectedCustomer && (
          <div style={{ background: "#f5f5f5", padding: "8px 12px", marginBottom: "10px", border: "1px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "12px" }}>{selectedCustomer.name}</div>
              <div style={{ fontSize: "10px", marginTop: "2px" }}>
                Code: {selectedCustomer.code || "—"} | Phone: {selectedCustomer.phone || "—"} | Balance: <span style={{ fontWeight: "bold", color: (selectedCustomer.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>PKR {fmt(selectedCustomer.currentBalance || 0)}</span>
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "11px" }}>
              <div>Total Sales: <strong>{customerSales.length}</strong></div>
              <div>Total Amount: <strong>PKR {fmt(totalAmount)}</strong></div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {customerSales.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "10px" }}>
            <div style={{ background: "#1a1a1a", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "10px" }}>TOTAL INVOICES</div>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>{customerSales.length}</div>
            </div>
            <div style={{ background: "#059669", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "10px" }}>TOTAL ITEMS</div>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>{totalItems}</div>
            </div>
            <div style={{ background: "#d97706", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "10px" }}>TOTAL QUANTITY</div>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>{totalQty}</div>
            </div>
            <div style={{ background: "#dc2626", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "10px" }}>TOTAL AMOUNT</div>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>PKR {fmt(totalAmount)}</div>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div style={{ border: "1px solid #000", overflow: "hidden" }}>
          <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 400px)", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "2px solid #000" }}>
                <tr>
                  <th style={{ width: 45, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>#</th>
                  <th style={{ padding: "6px 8px", border: "1px solid #000", textAlign: "left" }}>Invoice #</th>
                  <th style={{ padding: "6px 8px", border: "1px solid #000", textAlign: "left" }}>Date</th>
                  <th style={{ width: 70, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Items</th>
                  <th style={{ width: 120, padding: "6px 8px", border: "1px solid #000", textAlign: "right" }}>Amount</th>
                  <th style={{ width: 70, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && !customerSales.length && selectedCustomer && (
                  <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#999" }}>No sales found for this customer in the selected date range</td></tr>
                )}
                {!loading && !selectedCustomer && (
                  <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#999" }}>Please select a customer from the dropdown above</td></tr>
                )}
                {customerSales.map((s, i) => (
                  <tr key={s._id} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", fontWeight: "bold", fontFamily: "monospace" }}>{s.invoiceNo}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>{s.invoiceDate?.split("T")[0]}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center" }}>{s.items?.length || 0}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold" }}>{fmt(s.netTotal || 0)}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center" }}>
                      <button onClick={() => handleViewInvoice(s)} style={{ padding: "3px 10px", background: "#1a1a1a", color: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "10px" }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {customerSales.length > 0 && (
                <tfoot style={{ background: "#f5f5f5", borderTop: "2px solid #000" }}>
                  <tr>
                    <td colSpan="4" style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>GRAND TOTAL:</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", fontSize: "12px" }}>PKR {fmt(totalAmount)}</td>
                    <td style={{ padding: "6px 8px" }}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ background: "#f5f5f5", borderTop: "1px solid #000", padding: "4px 12px", display: "flex", justifyContent: "space-between", fontSize: "10px", position: "fixed", bottom: 0, left: 0, right: 0 }}>
        <div>Sale Party Wise Report</div>
        <div>Records: {customerSales.length}</div>
        <div>Total: PKR {fmt(totalAmount)}</div>
      </div>
    </div>
  );
}