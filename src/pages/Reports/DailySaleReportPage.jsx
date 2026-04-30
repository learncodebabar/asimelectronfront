// pages/DailySaleReportPage.jsx - CLEAN NEAT DESIGN
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function DailySaleReportPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [descSearch, setDescSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [dateRange, setDateRange] = useState({ from: isoD(), to: isoD() });
  const [summary, setSummary] = useState({ totalSales: 0, totalAmount: 0, totalItems: 0, totalQty: 0 });
  const [userSummary, setUserSummary] = useState([]);
  const [counterSummary, setCounterSummary] = useState([]);
  const [showUserReport, setShowUserReport] = useState(true);
  const [selectedFilterUser, setSelectedFilterUser] = useState("");
  const [selectedFilterCounter, setSelectedFilterCounter] = useState("");
  const [availableCounters, setAvailableCounters] = useState([]);
  
  const searchRef = useRef(null);

  useEffect(() => {
    fetchSales();
    fetchCounters();
  }, []);
  
  const fetchCounters = async () => {
    try {
      const response = await api.get('/api/counters');
      if (response.data && response.data.length > 0) {
        setAvailableCounters(response.data);
      } else {
        setAvailableCounters([{ counterId: 'default', counterName: 'Main Counter' }]);
      }
    } catch (error) {
      setAvailableCounters([{ counterId: 'default', counterName: 'Main Counter' }]);
    }
  };
  
  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.SALES.GET_ALL);
      if (data.success) {
        setSales(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch sales:", error);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    if (!sales.length) {
      setFilteredSales([]);
      setUserSummary([]);
      setCounterSummary([]);
      return;
    }
    
    let filtered = [...sales];
    
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(s => s.invoiceDate >= dateRange.from && s.invoiceDate <= dateRange.to);
    }
    
    if (selectedFilterUser) {
      filtered = filtered.filter(s => s.userId === selectedFilterUser || s.username === selectedFilterUser);
    }
    
    if (selectedFilterCounter) {
      filtered = filtered.filter(s => s.counterId === selectedFilterCounter);
    }
    
    if (descSearch.trim()) {
      const term = descSearch.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.items?.some(item => 
          (item.name?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term)) ||
          item.code?.toLowerCase().includes(term)
        ) ||
        s.customerName?.toLowerCase().includes(term) ||
        s.invoiceNo?.toString().includes(term)
      );
    }
    
    if (categorySearch.trim()) {
      const term = categorySearch.toLowerCase().trim();
      filtered = filtered.filter(s => s.items?.some(item => item.category?.toLowerCase().includes(term)));
    }
    
    if (companySearch.trim()) {
      const term = companySearch.toLowerCase().trim();
      filtered = filtered.filter(s => s.items?.some(item => item.company?.toLowerCase().includes(term)));
    }
    
    filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
    setFilteredSales(filtered);
    
    const totalAmount = filtered.reduce((sum, s) => sum + (s.netTotal || 0), 0);
    const totalItems = filtered.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const totalQty = filtered.reduce((sum, s) => {
      return sum + (s.items || []).reduce((itemSum, item) => itemSum + (item.pcs || item.qty || 0), 0);
    }, 0);
    
    setSummary({ totalSales: filtered.length, totalAmount, totalItems, totalQty });
    
    // User Summary
    const userMap = new Map();
    filtered.forEach(sale => {
      const key = sale.username || 'Unknown';
      if (!userMap.has(key)) {
        userMap.set(key, { username: key, count: 0, total: 0, cash: 0, credit: 0, qty: 0 });
      }
      const u = userMap.get(key);
      u.count++;
      u.total += sale.netTotal || 0;
      if (sale.paymentMode === 'Cash') u.cash += sale.netTotal || 0;
      if (sale.paymentMode === 'Credit') u.credit += sale.netTotal || 0;
      u.qty += (sale.items || []).reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
    });
    setUserSummary(Array.from(userMap.values()).sort((a, b) => b.total - a.total));
    
    // Counter Summary
    const counterMap = new Map();
    filtered.forEach(sale => {
      const key = sale.counterName || 'Main Counter';
      if (!counterMap.has(key)) {
        counterMap.set(key, { counterName: key, count: 0, total: 0, cash: 0, credit: 0, qty: 0 });
      }
      const c = counterMap.get(key);
      c.count++;
      c.total += sale.netTotal || 0;
      if (sale.paymentMode === 'Cash') c.cash += sale.netTotal || 0;
      if (sale.paymentMode === 'Credit') c.credit += sale.netTotal || 0;
      c.qty += (sale.items || []).reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
    });
    setCounterSummary(Array.from(counterMap.values()).sort((a, b) => b.total - a.total));
    
  }, [sales, descSearch, categorySearch, companySearch, dateRange, selectedFilterUser, selectedFilterCounter]);
  
  const clearFilters = () => {
    setDescSearch("");
    setCategorySearch("");
    setCompanySearch("");
    setSelectedFilterUser("");
    setSelectedFilterCounter("");
    setDateRange({ from: isoD(), to: isoD() });
    searchRef.current?.focus();
  };
  
  const handleViewDetails = (sale) => {
    setSelectedSale(selectedSale?._id === sale._id ? null : sale);
  };
  
  const formatCurrency = (value) => value ? parseFloat(value).toLocaleString() : "0";
  
  const exportToCSV = () => {
    const headers = ["Invoice #", "Date", "Customer", "User", "Counter", "Items", "Qty", "Total", "Paid", "Balance"];
    const rows = filteredSales.map(s => {
      const qty = (s.items || []).reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
      return [s.invoiceNo, s.invoiceDate, s.customerName || "COUNTER SALE", s.username || "Unknown", s.counterName || "Main Counter", s.items?.length || 0, qty, s.netTotal || 0, s.paidAmount || 0, s.balance || 0];
    });
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };
  
  const buildPrintHtml = () => {
    return `<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Sales Report</title>
    <style>
      body{font-family:Arial;padding:20px;font-size:11px}
      h2{color:#333;margin-bottom:5px}
      .header{text-align:center;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:10px}
      table{width:100%;border-collapse:collapse;margin-bottom:15px}
      th,td{border:1px solid #ccc;padding:6px;text-align:left}
      th{background:#333;color:#fff}
      .r{text-align:right}
      .section{margin:20px 0}
      .section-title{background:#555;color:#fff;padding:6px 10px;margin:10px 0}
    </style>
    </head>
    <body>
      <div class="header">
        <h2>ASIM ELECTRIC STORE</h2>
        <p>Sales Report | ${dateRange.from} to ${dateRange.to} | Generated: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="section">
        <div class="section-title">SALES BY USER</div>
        <table>
          <thead><tr><th>#</th><th>User</th><th class="r">Invoices</th><th class="r">Qty</th><th class="r">Cash</th><th class="r">Credit</th><th class="r">Total</th></tr></thead>
          <tbody>${userSummary.map((u, i) => `<tr><td>${i+1}${u.username}<td class="r">${u.count}<td class="r">${u.qty}<td class="r">PKR ${fmt(u.cash)}<td class="r">PKR ${fmt(u.credit)}<td class="r"><b>PKR ${fmt(u.total)}</b></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="6" class="r"><b>Total</b><td class="r"><b>PKR ${fmt(userSummary.reduce((s,u)=>s+u.total,0))}</b></tr></tfoot>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">SALES BY COUNTER</div>
        <table>
          <thead><tr><th>#</th><th>Counter</th><th class="r">Invoices</th><th class="r">Qty</th><th class="r">Cash</th><th class="r">Credit</th><th class="r">Total</th></tr></thead>
          <tbody>${counterSummary.map((c, i) => `<tr><td>${i+1}${c.counterName}<td class="r">${c.count}<td class="r">${c.qty}<td class="r">PKR ${fmt(c.cash)}<td class="r">PKR ${fmt(c.credit)}<td class="r"><b>PKR ${fmt(c.total)}</b></tr>`).join('')}</tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">DETAILED SALES</div>
        <table>
          <thead><tr><th>#</th><th>Invoice</th><th>Date</th><th>Customer</th><th>User</th><th>Counter</th><th>Items</th><th>Qty</th><th class="r">Total</th><th class="r">Paid</th><th class="r">Balance</th></tr></thead>
          <tbody>${filteredSales.map((s, i) => {
            const qty = (s.items || []).reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
            return `<tr><td>${i+1}<td>${s.invoiceNo}<td>${s.invoiceDate}<td>${s.customerName || "COUNTER SALE"}<td>${s.username || "Unknown"}<td>${s.counterName || "Main Counter"}<td class="r">${s.items?.length || 0}<td class="r">${qty}<td class="r">PKR ${fmt(s.netTotal)}<td class="r">PKR ${fmt(s.paidAmount)}<td class="r">PKR ${fmt(s.balance)}</tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      
      <div><b>Summary:</b> Total Invoices: ${filteredSales.length} | Total Amount: PKR ${fmt(summary.totalAmount)} | Total Received: PKR ${fmt(filteredSales.reduce((s,item)=>s+(item.paidAmount||0),0))}</div>
    </body>
    </html>`;
  };
  
  const hasActiveFilters = descSearch || categorySearch || companySearch || selectedFilterUser || selectedFilterCounter;
  const uniqueUsers = [...new Map(sales.filter(s => s.username).map(s => [s.username, s.username])).values()];
  
  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#2c3e50", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #34495e" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button onClick={() => navigate("/")} style={{ background: "#34495e", border: "none", color: "white", padding: "6px 12px", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>← Back</button>
          <h1 style={{ color: "white", fontSize: "18px", margin: 0 }}>Sales Report</h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={fetchSales} style={{ background: "#34495e", border: "none", color: "white", padding: "6px 12px", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>⟳ Refresh</button>
          <button onClick={handlePrint} style={{ background: "#34495e", border: "none", color: "white", padding: "6px 12px", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>🖨 Print</button>
          <button onClick={exportToCSV} style={{ background: "#27ae60", border: "none", color: "white", padding: "6px 12px", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>📥 Export</button>
        </div>
      </div>
      
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", padding: "20px" }}>
        <div style={{ background: "white", padding: "12px 15px", borderRadius: "4px", borderLeft: "3px solid #3498db" }}>
          <div style={{ fontSize: "11px", color: "#7f8c8d" }}>Total Invoices</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2c3e50" }}>{filteredSales.length}</div>
        </div>
        <div style={{ background: "white", padding: "12px 15px", borderRadius: "4px", borderLeft: "3px solid #27ae60" }}>
          <div style={{ fontSize: "11px", color: "#7f8c8d" }}>Items Sold</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2c3e50" }}>{summary.totalItems}</div>
        </div>
        <div style={{ background: "white", padding: "12px 15px", borderRadius: "4px", borderLeft: "3px solid #f39c12" }}>
          <div style={{ fontSize: "11px", color: "#7f8c8d" }}>Total Qty</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2c3e50" }}>{summary.totalQty}</div>
        </div>
        <div style={{ background: "white", padding: "12px 15px", borderRadius: "4px", borderLeft: "3px solid #e74c3c" }}>
          <div style={{ fontSize: "11px", color: "#7f8c8d" }}>Total Amount</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2c3e50" }}>PKR {formatCurrency(summary.totalAmount)}</div>
        </div>
      </div>
      
      {/* Filters */}
      <div style={{ background: "white", margin: "0 20px 20px", padding: "15px", borderRadius: "4px", border: "1px solid #ddd" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
          <span style={{ fontWeight: "bold", fontSize: "13px" }}>🔍 Filters</span>
          {hasActiveFilters && <button onClick={clearFilters} style={{ background: "#e74c3c", border: "none", color: "white", padding: "3px 8px", borderRadius: "3px", cursor: "pointer", fontSize: "10px" }}>Clear All</button>}
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "#7f8c8d", display: "block", marginBottom: "3px" }}>Date From</label>
            <input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "3px", fontSize: "12px" }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#7f8c8d", display: "block", marginBottom: "3px" }}>Date To</label>
            <input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "3px", fontSize: "12px" }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#7f8c8d", display: "block", marginBottom: "3px" }}>Search</label>
            <input ref={searchRef} type="text" placeholder="Product / Customer / Invoice" value={descSearch} onChange={(e) => setDescSearch(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "3px", fontSize: "12px" }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#7f8c8d", display: "block", marginBottom: "3px" }}>Category</label>
            <input type="text" placeholder="Category" value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "3px", fontSize: "12px" }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#7f8c8d", display: "block", marginBottom: "3px" }}>Company</label>
            <input type="text" placeholder="Company" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "3px", fontSize: "12px" }} />
          </div>
          {isAdmin && uniqueUsers.length > 0 && (
            <div>
              <label style={{ fontSize: "11px", color: "#7f8c8d", display: "block", marginBottom: "3px" }}>User</label>
              <select value={selectedFilterUser} onChange={(e) => setSelectedFilterUser(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "3px", fontSize: "12px" }}>
                <option value="">All Users</option>
                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: "11px", color: "#7f8c8d", display: "block", marginBottom: "3px" }}>Counter</label>
            <select value={selectedFilterCounter} onChange={(e) => setSelectedFilterCounter(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "3px", fontSize: "12px" }}>
              <option value="">All Counters</option>
              {availableCounters.map(c => <option key={c.counterId} value={c.counterId}>{c.counterName}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      {/* Toggle */}
      <div style={{ margin: "0 20px 15px", display: "flex", gap: "10px" }}>
        <button onClick={() => setShowUserReport(true)} style={{ padding: "6px 16px", background: showUserReport ? "#2c3e50" : "#ecf0f1", border: "1px solid #ddd", borderRadius: "3px", cursor: "pointer", color: showUserReport ? "white" : "#333", fontSize: "12px" }}>👤 By User</button>
        <button onClick={() => setShowUserReport(false)} style={{ padding: "6px 16px", background: !showUserReport ? "#2c3e50" : "#ecf0f1", border: "1px solid #ddd", borderRadius: "3px", cursor: "pointer", color: !showUserReport ? "white" : "#333", fontSize: "12px" }}>🏪 By Counter</button>
      </div>
      
      {/* Summary Table */}
      {showUserReport && userSummary.length > 0 && (
        <div style={{ background: "white", margin: "0 20px 20px", borderRadius: "4px", border: "1px solid #ddd", overflow: "hidden" }}>
          <div style={{ background: "#2c3e50", color: "white", padding: "8px 12px", fontSize: "13px", fontWeight: "bold" }}>👤 Sales by User</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>#</th><th style={{ padding: "8px", textAlign: "left" }}>User</th><th style={{ padding: "8px", textAlign: "right" }}>Invoices</th><th style={{ padding: "8px", textAlign: "right" }}>Qty</th><th style={{ padding: "8px", textAlign: "right" }}>Cash</th><th style={{ padding: "8px", textAlign: "right" }}>Credit</th><th style={{ padding: "8px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {userSummary.map((u, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>{i+1}</td>
                    <td style={{ padding: "8px", fontWeight: "bold" }}>{u.username}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>{u.count}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>{u.qty}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#27ae60" }}>PKR {fmt(u.cash)}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#e67e22" }}>PKR {fmt(u.credit)}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>PKR {fmt(u.total)}</td>
                  </tr>
                ))}
                <tr style={{ background: "#f8f9fa", fontWeight: "bold", borderTop: "2px solid #ddd" }}>
                  <td colSpan="2" style={{ padding: "8px" }}>TOTAL</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>{userSummary.reduce((s,u)=>s+u.count,0)}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>{userSummary.reduce((s,u)=>s+u.qty,0)}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>PKR {fmt(userSummary.reduce((s,u)=>s+u.cash,0))}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>PKR {fmt(userSummary.reduce((s,u)=>s+u.credit,0))}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>PKR {fmt(userSummary.reduce((s,u)=>s+u.total,0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {!showUserReport && counterSummary.length > 0 && (
        <div style={{ background: "white", margin: "0 20px 20px", borderRadius: "4px", border: "1px solid #ddd", overflow: "hidden" }}>
          <div style={{ background: "#2c3e50", color: "white", padding: "8px 12px", fontSize: "13px", fontWeight: "bold" }}>🏪 Sales by Counter</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>#</th><th style={{ padding: "8px", textAlign: "left" }}>Counter</th><th style={{ padding: "8px", textAlign: "right" }}>Invoices</th><th style={{ padding: "8px", textAlign: "right" }}>Qty</th><th style={{ padding: "8px", textAlign: "right" }}>Cash</th><th style={{ padding: "8px", textAlign: "right" }}>Credit</th><th style={{ padding: "8px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {counterSummary.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>{i+1}</td>
                    <td style={{ padding: "8px", fontWeight: "bold" }}>{c.counterName}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>{c.count}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>{c.qty}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#27ae60" }}>PKR {fmt(c.cash)}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#e67e22" }}>PKR {fmt(c.credit)}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>PKR {fmt(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Sales Table */}
      <div style={{ background: "white", margin: "0 20px 20px", borderRadius: "4px", border: "1px solid #ddd", overflow: "hidden" }}>
        <div style={{ background: "#2c3e50", color: "white", padding: "8px 12px", fontSize: "13px", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
          <span>📋 Sales Transactions</span>
          <span style={{ fontSize: "11px" }}>{filteredSales.length} records</span>
        </div>
        
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#7f8c8d" }}>Loading...</div>
        ) : filteredSales.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#7f8c8d" }}>No sales found</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "8px", textAlign: "left", width: "40px" }}>#</th>
                  <th style={{ padding: "8px", textAlign: "left", width: "90px" }}>Invoice</th>
                  <th style={{ padding: "8px", textAlign: "left", width: "90px" }}>Date</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Customer</th>
                  <th style={{ padding: "8px", textAlign: "left", width: "80px" }}>User</th>
                  <th style={{ padding: "8px", textAlign: "left", width: "100px" }}>Counter</th>
                  <th style={{ padding: "8px", textAlign: "right", width: "50px" }}>Items</th>
                  <th style={{ padding: "8px", textAlign: "right", width: "60px" }}>Qty</th>
                  <th style={{ padding: "8px", textAlign: "right", width: "100px" }}>Total</th>
                  <th style={{ padding: "8px", textAlign: "right", width: "100px" }}>Paid</th>
                  <th style={{ padding: "8px", textAlign: "right", width: "100px" }}>Balance</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, idx) => {
                  const qty = (sale.items || []).reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
                  const isExpanded = selectedSale?._id === sale._id;
                  return (
                    <React.Fragment key={sale._id}>
                      <tr style={{ borderBottom: "1px solid #eee", cursor: "pointer" }} onClick={() => handleViewDetails(sale)}>
                        <td style={{ padding: "8px" }}>{idx+1}</td>
                        <td style={{ padding: "8px", fontWeight: "bold" }}>{sale.invoiceNo}</td>
                        <td style={{ padding: "8px" }}>{sale.invoiceDate}</td>
                        <td style={{ padding: "8px" }}>{sale.customerName || "COUNTER SALE"}</td>
                        <td style={{ padding: "8px" }}><span style={{ background: "#e8f4fd", padding: "2px 6px", borderRadius: "3px", fontSize: "11px" }}>{sale.username || "Unknown"}</span></td>
                        <td style={{ padding: "8px" }}><span style={{ background: "#fef3e8", padding: "2px 6px", borderRadius: "3px", fontSize: "11px" }}>{sale.counterName || "Main Counter"}</span></td>
                        <td style={{ padding: "8px", textAlign: "right" }}>{sale.items?.length || 0}</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>{qty}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>PKR {formatCurrency(sale.netTotal)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: "#27ae60" }}>PKR {formatCurrency(sale.paidAmount)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: sale.balance > 0 ? "#e74c3c" : "#27ae60" }}>PKR {formatCurrency(sale.balance)}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{isExpanded ? "▲" : "▼"}</td>
                      </tr>
                      {isExpanded && sale.items && (
                        <tr>
                          <td colSpan="12" style={{ padding: "12px 20px", background: "#f9f9f9" }}>
                            <div style={{ fontSize: "12px", marginBottom: "8px", fontWeight: "bold" }}>📦 Items Details</div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                              <thead><tr><th style={{ padding: "6px", textAlign: "left" }}>#</th><th style={{ padding: "6px", textAlign: "left" }}>Code</th><th style={{ padding: "6px", textAlign: "left" }}>Product</th><th style={{ padding: "6px", textAlign: "left" }}>UOM</th><th style={{ padding: "6px", textAlign: "right" }}>Qty</th><th style={{ padding: "6px", textAlign: "right" }}>Rate</th><th style={{ padding: "6px", textAlign: "right" }}>Amount</th><th style={{ padding: "6px", textAlign: "left" }}>Rack</th></tr></thead>
                              <tbody>
                                {sale.items.map((item, i) => (
                                  <tr key={i}><td>{i+1}</td>
                                  <td style={{ padding: "6px" }}>{item.code || "-"}</td>
                                  <td style={{ padding: "6px" }}>{item.name || item.description}</td>
                                  <td style={{ padding: "6px" }}>{item.uom || item.measurement || "-"}</td>
                                  <td style={{ padding: "6px", textAlign: "right" }}>{item.pcs || item.qty}</td><td style={{ padding: "6px", textAlign: "right" }}>PKR {formatCurrency(item.rate)}</td>
                                  <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold" }}>PKR {formatCurrency(item.amount)}</td>
                                  <td style={{ padding: "6px" }}>{item.rack || "-"}</td></tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{ padding: "12px 20px", background: "#ecf0f1", borderTop: "1px solid #ddd", fontSize: "11px", color: "#7f8c8d", marginTop: "20px" }}>
        <span>📊 {filteredSales.length} of {sales.length} invoices</span>
        {hasActiveFilters && <span style={{ marginLeft: "20px" }}>🔍 Filtered results</span>}
        <span style={{ float: "right" }}>🕐 {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
}