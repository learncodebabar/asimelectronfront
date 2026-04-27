// pages/CounterSummaryPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function CounterSummaryPage() {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(isoD());
  const [toDate, setToDate] = useState(isoD());
  const [searchTerm, setSearchTerm] = useState("");
  const [summaryData, setSummaryData] = useState({
    sales: {
      total: 0,
      count: 0,
      items: 0,
      qty: 0,
      cash: 0,
      credit: 0,
      bank: 0,
      cheque: 0
    },
    purchases: {
      total: 0,
      count: 0,
      items: 0,
      qty: 0
    },
    receipts: {
      total: 0,
      count: 0
    },
    payments: {
      total: 0,
      count: 0
    },
    customers: {
      new: 0,
      total: 0
    },
    products: {
      total: 0,
      lowStock: 0
    }
  });
  
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedType, setSelectedType] = useState("all");
  
  const searchRef = useRef(null);
  
  useEffect(() => {
    fetchSummary();
    searchRef.current?.focus();
  }, [fromDate, toDate]);
  
  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Fetch all required data
      const [salesRes, purchasesRes, receiptsRes, paymentsRes, customersRes, productsRes] = await Promise.all([
        api.get(EP.SALES.GET_ALL),
        api.get(EP.PURCHASES.GET_ALL),
        api.get(EP.CASH_RECEIPTS.GET_ALL),
        api.get(EP.CPV.GET_ALL),
        api.get(EP.CUSTOMERS.GET_ALL),
        api.get(EP.PRODUCTS.GET_ALL)
      ]);
      
      // Filter by date range
      const sales = (salesRes.data.data || []).filter(s => s.invoiceDate >= fromDate && s.invoiceDate <= toDate);
      const purchases = (purchasesRes.data.data || []).filter(p => p.invoiceDate >= fromDate && p.invoiceDate <= toDate);
      const receipts = (receiptsRes.data.data || []).filter(r => (r.receiptDate || r.date) >= fromDate && (r.receiptDate || r.date) <= toDate);
      const payments = (paymentsRes.data.data || []).filter(p => (p.date || p.createdAt?.split("T")[0]) >= fromDate && (p.date || p.createdAt?.split("T")[0]) <= toDate);
      
      // Calculate sales summary
      const salesTotal = sales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
      const salesCash = sales.filter(s => s.paymentMode === "Cash").reduce((sum, s) => sum + (s.netTotal || 0), 0);
      const salesCredit = sales.filter(s => s.paymentMode === "Credit").reduce((sum, s) => sum + (s.netTotal || 0), 0);
      const salesBank = sales.filter(s => s.paymentMode === "Bank").reduce((sum, s) => sum + (s.netTotal || 0), 0);
      const salesCheque = sales.filter(s => s.paymentMode === "Cheque").reduce((sum, s) => sum + (s.netTotal || 0), 0);
      const salesCount = sales.length;
      const salesItems = sales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
      const salesQty = sales.reduce((sum, s) => {
        const itemsQty = (s.items || []).reduce((itemSum, item) => itemSum + (item.pcs || item.qty || 0), 0);
        return sum + itemsQty;
      }, 0);
      
      // Calculate purchases summary
      const purchasesTotal = purchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
      const purchasesCount = purchases.length;
      const purchasesItems = purchases.reduce((sum, p) => sum + (p.items?.length || 0), 0);
      const purchasesQty = purchases.reduce((sum, p) => {
        const itemsQty = (p.items || []).reduce((itemSum, item) => itemSum + (item.pcs || item.qty || 0), 0);
        return sum + itemsQty;
      }, 0);
      
      // Calculate receipts summary
      const receiptsTotal = receipts.reduce((sum, r) => sum + (r.amount || r.amountReceived || 0), 0);
      const receiptsCount = receipts.length;
      
      // Calculate payments summary
      const paymentsTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const paymentsCount = payments.length;
      
      // Calculate customers summary
      const customers = customersRes.data.data || [];
      const newCustomers = customers.filter(c => {
        const createdAt = c.createdAt?.split("T")[0];
        return createdAt >= fromDate && createdAt <= toDate;
      });
      
      // Calculate products summary
      const products = productsRes.data.data || [];
      const lowStockProducts = products.filter(p => {
        const pk = p.packingInfo?.[0];
        return pk && (pk.openingQty || 0) < (pk.minQty || 5);
      });
      
      setSummaryData({
        sales: {
          total: salesTotal,
          count: salesCount,
          items: salesItems,
          qty: salesQty,
          cash: salesCash,
          credit: salesCredit,
          bank: salesBank,
          cheque: salesCheque
        },
        purchases: {
          total: purchasesTotal,
          count: purchasesCount,
          items: purchasesItems,
          qty: purchasesQty
        },
        receipts: {
          total: receiptsTotal,
          count: receiptsCount
        },
        payments: {
          total: paymentsTotal,
          count: paymentsCount
        },
        customers: {
          new: newCustomers.length,
          total: customers.length
        },
        products: {
          total: products.length,
          lowStock: lowStockProducts.length
        }
      });
      
      // Build transactions list for table
      const allTransactions = [
        ...sales.map(s => ({
          ...s,
          type: "sale",
          displayType: "SALE",
          date: s.invoiceDate,
          refNo: s.invoiceNo,
          customerName: s.customerName || "COUNTER SALE",
          amount: s.netTotal || 0,
          paymentMode: s.paymentMode,
          icon: "🛒"
        })),
        ...purchases.map(p => ({
          ...p,
          type: "purchase",
          displayType: "PURCHASE",
          date: p.invoiceDate,
          refNo: p.invoiceNo,
          customerName: p.supplierName || "—",
          amount: p.netTotal || 0,
          paymentMode: "Cash",
          icon: "📦"
        })),
        ...receipts.map(r => ({
          ...r,
          type: "receipt",
          displayType: "CASH RECEIPT",
          date: r.receiptDate || r.date,
          refNo: r.receiptNo,
          customerName: r.customerName,
          amount: r.amount || r.amountReceived || 0,
          paymentMode: "Received",
          icon: "💰"
        })),
        ...payments.map(p => ({
          ...p,
          type: "payment",
          displayType: "CASH PAYMENT",
          date: p.date || p.createdAt?.split("T")[0],
          refNo: p.cpv_number,
          customerName: p.account_title,
          amount: p.amount || 0,
          paymentMode: "Paid",
          icon: "💵"
        }))
      ];
      
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
      
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
    setLoading(false);
  };
  
  // Filter transactions based on search term and type
  useEffect(() => {
    let filtered = [...transactions];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.refNo?.toLowerCase().includes(term) ||
        t.customerName?.toLowerCase().includes(term) ||
        t.displayType?.toLowerCase().includes(term)
      );
    }
    
    if (selectedType !== "all") {
      filtered = filtered.filter(t => t.type === selectedType);
    }
    
    setFilteredTransactions(filtered);
  }, [searchTerm, selectedType, transactions]);
  
  const clearSearch = () => {
    setSearchTerm("");
    setSelectedType("all");
    searchRef.current?.focus();
  };
  
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };
  
  const buildPrintHtml = () => {
    const printDateTime = new Date().toLocaleString("en-PK");
    
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Counter Summary Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #000}
        .shop-name{font-size:22px;font-weight:bold}
        .shop-addr{font-size:11px;color:#444}
        .title{font-size:18px;font-weight:bold;margin:15px 0;background:#1e40af;color:#fff;padding:10px;text-align:center}
        .date-range{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:2px solid #000}
        .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin:20px 0}
        .summary-card{border:2px solid #000;padding:15px;border-radius:8px}
        .summary-card h3{margin-bottom:10px;font-size:14px}
        .row{display:flex;justify-content:space-between;padding:5px 0}
        .total{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:5px}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th{background:#000;color:#fff;padding:10px;border:1px solid #000}
        td{padding:8px;border:1px solid #000}
        .text-right{text-align:right}
        .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
      </div>
      <div class="title">COUNTER SUMMARY REPORT</div>
      <div class="date-range">Period: ${fromDate} to ${toDate} | Printed: ${printDateTime}</div>
      
      <div class="summary-grid">
        <div class="summary-card">
          <h3>🛒 SALES</h3>
          <div class="row"><span>Total Sales:</span><span>PKR ${fmt(summaryData.sales.total)}</span></div>
          <div class="row"><span>Invoices:</span><span>${summaryData.sales.count}</span></div>
          <div class="row"><span>Items Sold:</span><span>${summaryData.sales.items}</span></div>
          <div class="row"><span>Total Qty:</span><span>${summaryData.sales.qty}</span></div>
          <div class="row"><span>Cash:</span><span>PKR ${fmt(summaryData.sales.cash)}</span></div>
          <div class="row"><span>Credit:</span><span>PKR ${fmt(summaryData.sales.credit)}</span></div>
          <div class="row"><span>Bank:</span><span>PKR ${fmt(summaryData.sales.bank)}</span></div>
          <div class="row total"><span>Net Sales:</span><span>PKR ${fmt(summaryData.sales.total)}</span></div>
        </div>
        <div class="summary-card">
          <h3>📦 PURCHASES</h3>
          <div class="row"><span>Total Purchases:</span><span>PKR ${fmt(summaryData.purchases.total)}</span></div>
          <div class="row"><span>Invoices:</span><span>${summaryData.purchases.count}</span></div>
          <div class="row"><span>Items:</span><span>${summaryData.purchases.items}</span></div>
          <div class="row"><span>Total Qty:</span><span>${summaryData.purchases.qty}</span></div>
          <div class="row total"><span>Total Purchases:</span><span>PKR ${fmt(summaryData.purchases.total)}</span></div>
        </div>
        <div class="summary-card">
          <h3>💰 RECEIPTS & PAYMENTS</h3>
          <div class="row"><span>Cash Receipts:</span><span>PKR ${fmt(summaryData.receipts.total)}</span></div>
          <div class="row"><span>Receipts Count:</span><span>${summaryData.receipts.count}</span></div>
          <div class="row"><span>Cash Payments:</span><span>PKR ${fmt(summaryData.payments.total)}</span></div>
          <div class="row"><span>Payments Count:</span><span>${summaryData.payments.count}</span></div>
          <div class="row total"><span>Net Cash Flow:</span><span>PKR ${fmt(summaryData.receipts.total - summaryData.payments.total)}</span></div>
        </div>
        <div class="summary-card">
          <h3>👥 CUSTOMERS & PRODUCTS</h3>
          <div class="row"><span>New Customers:</span><span>${summaryData.customers.new}</span></div>
          <div class="row"><span>Total Customers:</span><span>${summaryData.customers.total}</span></div>
          <div class="row"><span>Total Products:</span><span>${summaryData.products.total}</span></div>
          <div class="row"><span>Low Stock:</span><span style="color:#dc2626">${summaryData.products.lowStock}</span></div>
        </div>
      </div>
      
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Ref #</th><th>Type</th><th>Customer/Account</th><th class="text-right">Amount</th><th>Payment</th></tr></thead>
        <tbody>
          ${filteredTransactions.slice(0, 50).map((t, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${t.date}</td>
              <td>${t.refNo}</td>
              <td>${t.displayType}</td>
              <td>${t.customerName}</td>
              <td class="text-right">PKR ${fmt(t.amount)}</td>
              <td>${t.paymentMode || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="footer">Developed by: Creative Babar / 03098325271</div>
    </body>
    </html>`;
  };
  
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Counter Summary — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={fetchSummary} disabled={loading} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrint} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>🖨 Print</button>
          <button className="xp-cap-btn xp-cap-close" onClick={() => navigate("/")}>✕</button>
        </div>
      </div>
      
      <div className="sl-page-body" style={{ padding: "12px 16px", background: "#ffffff", flex: 1, overflow: "auto" }}>
        
        {/* Date Range Row */}
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
          marginBottom: "16px",
          padding: "10px 12px",
          background: "#f8fafc",
          borderRadius: "8px",
          border: "2px solid #000000",
          flexWrap: "wrap"
        }}>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px" }}>FROM DATE</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ height: "32px", padding: "0 10px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px" }} />
          </div>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px" }}>TO DATE</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ height: "32px", padding: "0 10px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px" }} />
          </div>
          <div>
            <button onClick={() => { setFromDate(isoD()); setToDate(isoD()); }} style={{ height: "32px", padding: "0 16px", fontSize: "11px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}>Today</button>
          </div>
          <div>
            <button onClick={() => {
              const today = new Date();
              const weekAgo = new Date();
              weekAgo.setDate(today.getDate() - 7);
              setFromDate(weekAgo.toISOString().split("T")[0]);
              setToDate(isoD());
            }} style={{ height: "32px", padding: "0 16px", fontSize: "11px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}>Last 7 Days</button>
          </div>
          <div>
            <button onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setFromDate(firstDay.toISOString().split("T")[0]);
              setToDate(isoD());
            }} style={{ height: "32px", padding: "0 16px", fontSize: "11px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}>This Month</button>
          </div>
        </div>
        
        {/* Summary Cards - 4x2 Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {/* Sales Card */}
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "#1e40af" }}>🛒 SALES</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Total:</span><span style={{ fontWeight: "bold" }}>PKR {fmt(summaryData.sales.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Invoices:</span><span>{summaryData.sales.count}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Items:</span><span>{summaryData.sales.items}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Cash/ Credit/ Bank:</span>
              <span>{fmt(summaryData.sales.cash)} / {fmt(summaryData.sales.credit)} / {fmt(summaryData.sales.bank)}</span>
            </div>
          </div>
          
          {/* Purchases Card */}
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "#d97706" }}>📦 PURCHASES</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Total:</span><span style={{ fontWeight: "bold" }}>PKR {fmt(summaryData.purchases.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Invoices:</span><span>{summaryData.purchases.count}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Items:</span><span>{summaryData.purchases.items}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Total Qty:</span><span>{summaryData.purchases.qty}</span>
            </div>
          </div>
          
          {/* Receipts Card */}
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "#059669" }}>💰 RECEIPTS</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Total:</span><span style={{ fontWeight: "bold", color: "#059669" }}>PKR {fmt(summaryData.receipts.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Count:</span><span>{summaryData.receipts.count}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Payments:</span><span style={{ color: "#dc2626" }}>PKR {fmt(summaryData.payments.total)}</span>
            </div>
          </div>
          
          {/* Customers & Products Card */}
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "#8b5cf6" }}>👥 CUSTOMERS</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>New:</span><span>{summaryData.customers.new}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span>Total:</span><span>{summaryData.customers.total}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Low Stock:</span><span style={{ color: "#dc2626" }}>{summaryData.products.lowStock}</span>
            </div>
          </div>
        </div>
        
        {/* Search & Filter Bar */}
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          marginBottom: "16px",
          padding: "10px 12px",
          background: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #000000",
          flexWrap: "wrap"
        }}>
          <div style={{ flex: 2, minWidth: "200px", position: "relative" }}>
            <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#666" }} viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by Ref #, Customer, Type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #000000", borderRadius: "4px", fontSize: "12px" }}
            />
          </div>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #000000", borderRadius: "4px", fontSize: "12px", background: "#ffffff" }}>
            <option value="all">All Types</option>
            <option value="sale">Sales Only</option>
            <option value="purchase">Purchases Only</option>
            <option value="receipt">Receipts Only</option>
            <option value="payment">Payments Only</option>
          </select>
          {(searchTerm || selectedType !== "all") && (
            <button onClick={clearSearch} style={{ padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>✕ Clear</button>
          )}
          <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "bold" }}>Total: PKR {fmt(totalAmount)}</span>
        </div>
        
        {/* Transactions Table */}
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "2px solid #000000", overflow: "auto", maxHeight: "calc(100vh - 480px)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead style={{ position: "sticky", top: 0, background: "#f1f5f9", zIndex: 10 }}>
              <tr>
                <th style={{ padding: "8px 6px", textAlign: "center", width: "40px", border: "1px solid #000000", fontWeight: "bold" }}>#</th>
                <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Date</th>
                <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Ref #</th>
                <th style={{ padding: "8px 6px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold", width: "100px" }}>Type</th>
                <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Customer / Account</th>
                <th style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", width: "120px" }}>Amount (PKR)</th>
                <th style={{ padding: "8px 6px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold", width: "80px" }}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>
              )}
              {!loading && filteredTransactions.length === 0 && (
                <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No transactions found</td></tr>
              )}
              {!loading && filteredTransactions.map((t, i) => (
                <tr key={t._id || i} style={{ borderBottom: "1px solid #000000" }}>
                  <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000", fontWeight: "600" }}>{i + 1}</td>
                  <td style={{ padding: "6px", border: "1px solid #000000" }}>{t.date}</td>
                  <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold", fontFamily: "monospace" }}>{t.refNo}</td>
                  <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000" }}>
                    <span style={{ 
                      padding: "2px 8px", 
                      borderRadius: "3px", 
                      fontSize: "10px", 
                      fontWeight: "bold", 
                      background: t.type === "sale" ? "#dbeafe" : t.type === "purchase" ? "#fef3c7" : t.type === "receipt" ? "#dcfce7" : "#fef2f2",
                      border: "1px solid #000000",
                      whiteSpace: "nowrap"
                    }}>
                      {t.icon} {t.displayType}
                    </span>
                  </td>
                  <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold" }}>{t.customerName}</td>
                  <td style={{ padding: "6px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: t.type === "receipt" ? "#059669" : t.type === "payment" ? "#dc2626" : "#1e40af" }}>
                    PKR {fmt(t.amount)}
                  </td>
                  <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000" }}>{t.paymentMode || "—"}</td>
                </tr>
              ))}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot style={{ background: "#f8fafc", position: "sticky", bottom: 0 }}>
                <tr>
                  <td colSpan="5" style={{ padding: "8px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Total:</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", fontSize: "14px", border: "1px solid #000000" }}>PKR {fmt(totalAmount)}</td>
                  <td style={{ border: "1px solid #000000" }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>📊 Counter Summary</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Period: {fromDate} to {toDate}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Total Transactions: {filteredTransactions.length}</div>
      </div>
    </div>
  );
}