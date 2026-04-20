// pages/Reports/TopSalesPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";
import "../../styles/SalePage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoDate = () => new Date().toISOString().split("T")[0];

export default function TopSalesPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(isoDate());
  const [toDate, setToDate] = useState(isoDate());
  const [topCount, setTopCount] = useState(10);
  const [sortBy, setSortBy] = useState("amount");
  const [topSales, setTopSales] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const salesRes = await api.get(EP.SALES.GET_ALL);
      if (salesRes.data.success) {
        const saleInvoices = salesRes.data.data.filter(s => 
          s.saleType !== "return" && s.type !== "return" && s.saleType !== "purchase"
        );
        setSales(saleInvoices);
        calculateTopSales(saleInvoices);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  const calculateTopSales = (salesData = sales) => {
    const customerMap = new Map();
    
    const filteredSales = salesData.filter(s => {
      const saleDate = s.invoiceDate;
      return saleDate >= fromDate && saleDate <= toDate;
    });

    filteredSales.forEach(sale => {
      const customerId = sale.customerId || sale.customerName;
      const customerName = sale.customerName || "COUNTER SALE";
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName,
          customerCode: sale.customerCode || "",
          customerPhone: sale.customerPhone || "",
          totalAmount: 0,
          totalQuantity: 0,
          totalItems: 0,
          invoiceCount: 0,
          invoices: []
        });
      }
      
      const customer = customerMap.get(customerId);
      const saleAmount = sale.netTotal || 0;
      const saleQuantity = (sale.items || []).reduce((sum, i) => sum + (i.pcs || i.qty || 0), 0);
      const saleItems = sale.items?.length || 0;
      
      customer.totalAmount += saleAmount;
      customer.totalQuantity += saleQuantity;
      customer.totalItems += saleItems;
      customer.invoiceCount += 1;
      customer.invoices.push({
        invoiceNo: sale.invoiceNo,
        date: sale.invoiceDate,
        amount: saleAmount,
        items: saleItems,
        quantity: saleQuantity
      });
    });
    
    let topList = Array.from(customerMap.values());
    
    if (sortBy === "amount") {
      topList.sort((a, b) => b.totalAmount - a.totalAmount);
    } else if (sortBy === "quantity") {
      topList.sort((a, b) => b.totalQuantity - a.totalQuantity);
    } else if (sortBy === "items") {
      topList.sort((a, b) => b.totalItems - a.totalItems);
    } else if (sortBy === "invoices") {
      topList.sort((a, b) => b.invoiceCount - a.invoiceCount);
    }
    
    setTopSales(topList.slice(0, topCount));
  };

  useEffect(() => {
    if (sales.length > 0) {
      calculateTopSales();
    }
  }, [fromDate, toDate, topCount, sortBy]);

  const handleRefresh = () => {
    fetchData();
  };

  const handlePrint = () => {
    if (!topSales.length) {
      alert("No data to print");
      return;
    }
    
    const printWindow = window.open("", "_blank", "width=1100,height=700");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const buildPrintHtml = () => {
    const rows = topSales.map((c, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #000;text-align:center">${i + 1}${i === 0 ? " 🏆" : i === 1 ? " 🥈" : i === 2 ? " 🥉" : ""}</td>
        <td style="padding:6px;border:1px solid #000;font-weight:bold">${c.customerName}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${c.customerCode || "—"}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${c.invoiceCount}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${c.totalItems}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${c.totalQuantity}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right;font-weight:bold">PKR ${fmt(c.totalAmount)}</td>
      </tr>
    `).join("");

    const totalAmount = topSales.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalQuantity = topSales.reduce((sum, c) => sum + c.totalQuantity, 0);
    const totalItems = topSales.reduce((sum, c) => sum + c.totalItems, 0);
    const totalInvoices = topSales.reduce((sum, c) => sum + c.invoiceCount, 0);

    const sortLabels = {
      amount: "Total Amount",
      quantity: "Total Quantity",
      items: "Number of Items",
      invoices: "Number of Invoices"
    };

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Top Sales Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:15px}
        .header{text-align:center;margin-bottom:15px;padding-bottom:8px;border-bottom:2px solid #000}
        .shop-name{font-size:20px;font-weight:bold;margin-bottom:3px}
        .shop-addr{font-size:10px;color:#444;margin-bottom:2px}
        .title{font-size:16px;font-weight:bold;margin:12px 0;padding:8px;background:#1a1a1a;color:#fff;text-align:center}
        .date-range{background:#f5f5f5;padding:6px;margin:10px 0;border:1px solid #000;text-align:center;font-size:11px}
        .info{display:flex;justify-content:space-between;margin:10px 0;padding:6px;background:#f5f5f5;border:1px solid #000;font-size:11px}
        table{width:100%;border-collapse:collapse;margin:10px 0}
        th{background:#1a1a1a;color:#fff;padding:8px;border:1px solid #000;font-size:11px}
        td{padding:6px;border:1px solid #000;font-size:10px}
        .totals{width:350px;margin-left:auto;margin-top:15px}
        .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:11px}
        .totals-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:8px;font-size:13px}
        .footer{text-align:center;margin-top:20px;padding-top:8px;border-top:1px solid #ddd;font-size:9px;color:#666}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
        <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
      </div>
      <div class="title">TOP ${topCount} SALES REPORT</div>
      <div class="date-range">Period: ${fromDate} to ${toDate}</div>
      <div class="info">
        <span><strong>Sorted by:</strong> ${sortLabels[sortBy]}</span>
        <span><strong>Printed:</strong> ${new Date().toLocaleString()}</span>
      </div>
      <table>
        <thead><tr><th>#</th><th>Customer</th><th>Code</th><th>Inv</th><th>Items</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center">No records found</td></tr>'}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Total Customers:</span><span>${topSales.length}</span></div>
        <div class="totals-row"><span>Total Invoices:</span><span>${totalInvoices}</span></div>
        <div class="totals-row"><span>Total Items:</span><span>${totalItems}</span></div>
        <div class="totals-row"><span>Total Quantity:</span><span>${totalQuantity}</span></div>
        <div class="totals-row bold"><span>Total Amount:</span><span>PKR ${fmt(totalAmount)}</span></div>
      </div>
      <div class="footer">Thank you for your business! | Developed by: Creative Babar / 03098325271</div>
    </body>
    </html>`;
  };

  const handleViewCustomer = (customer) => {
    const printWindow = window.open("", "_blank", "width=900,height=600");
    printWindow.document.write(buildCustomerDetailsHtml(customer));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const buildCustomerDetailsHtml = (customer) => {
    const rows = customer.invoices.map((inv, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #000;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #000;font-weight:bold">${inv.invoiceNo}</td>
        <td style="padding:6px;border:1px solid #000">${inv.date?.split("T")[0]}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${inv.items}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${inv.quantity}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right;font-weight:bold">${fmt(inv.amount)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Customer Details - ${customer.customerName}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:15px}
        .header{text-align:center;margin-bottom:15px;padding-bottom:8px;border-bottom:2px solid #000}
        .shop-name{font-size:18px;font-weight:bold}
        .shop-addr{font-size:10px;color:#444}
        .title{font-size:14px;font-weight:bold;margin:10px 0;padding:6px;background:#1a1a1a;color:#fff;text-align:center}
        .customer-info{background:#f5f5f5;padding:8px;margin:10px 0;border:1px solid #000;display:flex;justify-content:space-between;flex-wrap:wrap;font-size:11px}
        table{width:100%;border-collapse:collapse;margin:10px 0}
        th{background:#1a1a1a;color:#fff;padding:6px;border:1px solid #000;font-size:10px}
        td{padding:6px;border:1px solid #000;font-size:10px}
        .total{text-align:right;margin-top:10px;padding:8px;border-top:2px solid #000;font-weight:bold;font-size:14px}
        .footer{text-align:center;margin-top:15px;padding-top:6px;border-top:1px solid #ddd;font-size:9px}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
      </div>
      <div class="title">CUSTOMER SALES DETAILS</div>
      <div class="customer-info">
        <div><strong>Customer:</strong> ${customer.customerName}</div>
        <div><strong>Code:</strong> ${customer.customerCode || "—"}</div>
        <div><strong>Phone:</strong> ${customer.customerPhone || "—"}</div>
        <div><strong>Invoices:</strong> ${customer.invoiceCount}</div>
        <div><strong>Items:</strong> ${customer.totalItems}</div>
        <div><strong>Qty:</strong> ${customer.totalQuantity}</div>
        <div><strong>Amount:</strong> PKR ${fmt(customer.totalAmount)}</div>
      </div>
      <table>
        <thead><td><th>#</th><th>Invoice</th><th>Date</th><th>Items</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">TOTAL: PKR ${fmt(customer.totalAmount)}</div>
      <div class="footer">Printed: ${new Date().toLocaleString()}</div>
    </body>
    </html>`;
  };

  const getRankIcon = (index) => {
    if (index === 0) return "🏆";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  };

  const getRankStyle = (index) => {
    if (index === 0) return { background: "#f5f5f5", fontWeight: "bold" };
    return {};
  };

  const getSortLabel = () => {
    const labels = {
      amount: "Amount (Highest)",
      quantity: "Quantity (Most)",
      items: "Items (Most)",
      invoices: "Invoices (Most)"
    };
    return labels[sortBy];
  };

  return (
    <div className="sl-page" style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1a1a1a", borderBottom: "2px solid #000", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navigate("/")} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "4px 10px", cursor: "pointer", borderRadius: "3px", fontSize: "12px" }}>← Back</button>
          <span style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>Top Sales Report — Asim Electric Store</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleRefresh} style={{ padding: "4px 12px", background: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button onClick={handlePrint} disabled={!topSales.length} style={{ padding: "4px 12px", background: topSales.length ? "#1a1a1a" : "#ccc", color: "#fff", border: "1px solid #000", cursor: topSales.length ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: "bold" }}>🖨 Print</button>
        </div>
      </div>

      <div style={{ padding: "10px" }}>
        {/* Filter Section */}
        <div style={{ border: "1px solid #000", padding: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "11px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "11px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Top Count</label>
              <select value={topCount} onChange={(e) => setTopCount(Number(e.target.value))} style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "11px", background: "#fff" }}>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "11px", background: "#fff" }}>
                <option value="amount">Amount (Highest)</option>
                <option value="quantity">Quantity (Most)</option>
                <option value="items">Items (Most)</option>
                <option value="invoices">Invoices (Most)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Info */}
        {topSales.length > 0 && (
          <div style={{ background: "#f5f5f5", padding: "6px 10px", marginBottom: "10px", border: "1px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", fontSize: "11px" }}>
            <div>
              <span style={{ fontWeight: "bold" }}>📊 Top {topSales.length} Customers</span>
              <span style={{ marginLeft: "12px" }}>Sorted by: <strong>{getSortLabel()}</strong></span>
            </div>
            <div>
              <span>{fromDate} to {toDate}</span>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div style={{ border: "1px solid #000", overflow: "hidden" }}>
          <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 380px)", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "2px solid #000" }}>
                <tr>
                  <th style={{ width: 55, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Rank</th>
                  <th style={{ padding: "6px 8px", border: "1px solid #000", textAlign: "left" }}>Customer</th>
                  <th style={{ width: 80, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Code</th>
                  <th style={{ width: 65, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Inv</th>
                  <th style={{ width: 65, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Items</th>
                  <th style={{ width: 65, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Qty</th>
                  <th style={{ width: 110, padding: "6px 8px", border: "1px solid #000", textAlign: "right" }}>Amount</th>
                  <th style={{ width: 70, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="8" style={{ padding: "30px", textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && topSales.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: "30px", textAlign: "center", color: "#999" }}>No sales data found</td></tr>
                )}
                {topSales.map((customer, i) => (
                  <tr key={customer.customerId || i} style={{ borderBottom: "1px solid #ddd", ...getRankStyle(i) }}>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center", fontWeight: "bold", fontSize: "14px" }}>{getRankIcon(i)}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", fontWeight: "bold" }}>{customer.customerName}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center", fontFamily: "monospace" }}>{customer.customerCode || "—"}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center", fontWeight: "bold" }}>{customer.invoiceCount}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center" }}>{customer.totalItems}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center" }}>{customer.totalQuantity}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold" }}>{fmt(customer.totalAmount)}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center" }}>
                      <button onClick={() => handleViewCustomer(customer)} style={{ padding: "3px 10px", background: "#1a1a1a", color: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "10px" }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {topSales.length > 0 && (
                <tfoot style={{ background: "#f5f5f5", borderTop: "2px solid #000" }}>
                  <tr>
                    <td colSpan="6" style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>TOTAL:</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>PKR {fmt(topSales.reduce((sum, c) => sum + c.totalAmount, 0))}</td>
                    <td style={{ padding: "6px 8px" }}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Stats Cards */}
        {topSales.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "10px" }}>
            <div style={{ background: "#1a1a1a", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>🏆 TOP CUSTOMER</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>{topSales[0]?.customerName?.substring(0, 20)}</div>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>{fmt(topSales[0]?.totalAmount)}</div>
            </div>
            <div style={{ background: "#059669", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>📦 MOST ITEMS</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>{topSales.reduce((max, c) => c.totalItems > max.totalItems ? c : max, topSales[0])?.customerName?.substring(0, 20)}</div>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>{topSales.reduce((max, c) => Math.max(max, c.totalItems), 0)} items</div>
            </div>
            <div style={{ background: "#1e40af", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>📄 MOST INVOICES</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>{topSales.reduce((max, c) => c.invoiceCount > max.invoiceCount ? c : max, topSales[0])?.customerName?.substring(0, 20)}</div>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>{topSales.reduce((max, c) => Math.max(max, c.invoiceCount), 0)} inv</div>
            </div>
            <div style={{ background: "#dc2626", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>💰 HIGHEST QTY</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>{topSales.reduce((max, c) => c.totalQuantity > max.totalQuantity ? c : max, topSales[0])?.customerName?.substring(0, 20)}</div>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>{topSales.reduce((max, c) => Math.max(max, c.totalQuantity), 0)} units</div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{ background: "#f5f5f5", borderTop: "1px solid #000", padding: "4px 12px", display: "flex", justifyContent: "space-between", fontSize: "10px", position: "fixed", bottom: 0, left: 0, right: 0 }}>
        <div>Top Sales Report</div>
        <div>Customers: {topSales.length}</div>
        <div>Total: PKR {fmt(topSales.reduce((sum, c) => sum + c.totalAmount, 0))}</div>
      </div>
    </div>
  );
}