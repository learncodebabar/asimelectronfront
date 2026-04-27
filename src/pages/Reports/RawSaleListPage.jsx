// pages/RawSaleListPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");

export default function RawSaleListPage() {
  const navigate = useNavigate();
  
  // State
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search inputs
  const [customerSearch, setCustomerSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [dateSearch, setDateSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("all"); // all, sale, purchase, return
  
  // Customer suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "invoiceDate", direction: "desc" });
  
  // Refs
  const customerInputRef = useRef(null);
  const invoiceInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  useEffect(() => {
    fetchRecords();
  }, []);
  
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.SALES.GET_ALL);
      if (data.success) {
        // Filter to get raw sales/purchases (excluding quotations)
        const rawRecords = data.data.filter(r => 
          r.saleType === "sale" || 
          r.saleType === "purchase" || 
          r.saleType === "return" ||
          r.type === "sale"
        );
        setRecords(rawRecords);
      }
    } catch (error) {
      console.error("Failed to fetch records:", error);
    }
    setLoading(false);
  };
  
  // Get unique customer names from records
  const getUniqueCustomerNames = () => {
    const names = new Set();
    records.forEach(r => {
      if (r.customerName && r.customerName !== "COUNTER SALE") {
        names.add(r.customerName);
      }
    });
    return Array.from(names).sort();
  };
  
  // Handle customer search with suggestions
  useEffect(() => {
    if (customerSearch.length >= 2) {
      const allCustomers = getUniqueCustomerNames();
      const filtered = allCustomers.filter(name => 
        name.toLowerCase().includes(customerSearch.toLowerCase())
      ).slice(0, 10);
      setCustomerSuggestions(filtered);
      setShowCustomerSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [customerSearch, records]);
  
  // Filter records based on search criteria
  useEffect(() => {
    if (!records.length) {
      setFilteredRecords([]);
      return;
    }
    
    let filtered = [...records];
    
    // Filter by Customer Name
    if (customerSearch.trim()) {
      const term = customerSearch.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.customerName?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Invoice #
    if (invoiceSearch.trim()) {
      const term = invoiceSearch.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.invoiceNo?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Date
    if (dateSearch.trim()) {
      filtered = filtered.filter(r => r.invoiceDate === dateSearch);
    }
    
    // Filter by Type
    if (typeSearch !== "all") {
      if (typeSearch === "sale") {
        filtered = filtered.filter(r => r.saleType === "sale" && r.paymentMode !== "Credit");
      } else if (typeSearch === "credit") {
        filtered = filtered.filter(r => r.paymentMode === "Credit");
      } else if (typeSearch === "purchase") {
        filtered = filtered.filter(r => r.saleType === "purchase");
      } else if (typeSearch === "return") {
        filtered = filtered.filter(r => r.saleType === "return");
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === "netTotal") {
        aVal = a.netTotal || 0;
        bVal = b.netTotal || 0;
      } else if (sortConfig.key === "invoiceDate") {
        aVal = a.invoiceDate || "";
        bVal = b.invoiceDate || "";
      } else if (sortConfig.key === "customerName") {
        aVal = a.customerName || "";
        bVal = b.customerName || "";
      } else if (sortConfig.key === "invoiceNo") {
        aVal = a.invoiceNo || "";
        bVal = b.invoiceNo || "";
      }
      
      if (typeof aVal === "string") {
        aVal = aVal?.toLowerCase() || "";
        bVal = bVal?.toLowerCase() || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      } else {
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }
    });
    
    setFilteredRecords(filtered);
  }, [records, customerSearch, invoiceSearch, dateSearch, typeSearch, sortConfig]);
  
  const handleSelectCustomerSuggestion = (customerName) => {
    setCustomerSearch(customerName);
    setShowCustomerSuggestions(false);
    setCustomerSuggestions([]);
    invoiceInputRef.current?.focus();
  };
  
  const handleCustomerKeyDown = (e) => {
    if (showCustomerSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < customerSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSelectCustomerSuggestion(customerSuggestions[selectedSuggestionIndex]);
      } else if (e.key === "Escape") {
        setShowCustomerSuggestions(false);
      }
    }
    
    if (e.key === "Enter" && !showCustomerSuggestions) {
      e.preventDefault();
      invoiceInputRef.current?.focus();
    }
  };
  
  const handleInvoiceKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dateInputRef.current?.focus();
    }
  };
  
  const handleDateKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };
  
  const clearFilters = () => {
    setCustomerSearch("");
    setInvoiceSearch("");
    setDateSearch("");
    setTypeSearch("all");
    setCustomerSuggestions([]);
    setShowCustomerSuggestions(false);
    setSelectedSuggestionIndex(-1);
    customerInputRef.current?.focus();
  };
  
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };
  
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };
  
  const getTypeBadge = (record) => {
    if (record.saleType === "purchase") {
      return { text: "PURCHASE", bg: "#dbeafe", color: "#1e40af" };
    } else if (record.saleType === "return") {
      return { text: "RETURN", bg: "#fef3c7", color: "#92400e" };
    } else if (record.paymentMode === "Credit") {
      return { text: "CREDIT SALE", bg: "#dcfce7", color: "#166534" };
    } else {
      return { text: "CASH SALE", bg: "#dbeafe", color: "#1e40af" };
    }
  };
  
  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setShowViewModal(true);
  };
  
  const handlePrintRecord = (record) => {
    // You can implement print functionality here
    const printWindow = window.open("", "_blank");
    printWindow.document.write(buildPrintHtml(record));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };
  
  const buildPrintHtml = (record) => {
    const rows = record.items?.map((it, i) => `
      <tr>
        <td style="padding:6px; border:1px solid #000">${i + 1}</td>
        <td style="padding:6px; border:1px solid #000">${it.code || ""}</td>
        <td style="padding:6px; border:1px solid #000">${it.description || it.name}</td>
        <td style="padding:6px; border:1px solid #000; text-align:center">${it.qty || it.pcs || 0} ${it.measurement || it.uom || ""}</td>
        <td style="padding:6px; border:1px solid #000; text-align:right">${fmt(it.rate || 0)}</td>
        <td style="padding:6px; border:1px solid #000; text-align:right">${fmt(it.amount || 0)}</td>
      </tr>
    `).join("");
    
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${record.invoiceNo}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
        .header{text-align:center;margin-bottom:20px}
        .title{font-size:18px;font-weight:bold}
        .meta-row{display:flex;justify-content:space-between;margin:10px 0}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th,td{border:1px solid #000;padding:8px;text-align:left}
        th{background:#333;color:#fff}
        .text-right{text-align:right}
        .totals{width:300px;margin-left:auto;margin-top:15px}
        .totals-row{display:flex;justify-content:space-between;padding:5px 0}
        .bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:8px}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">INVOICE</div>
      </div>
      <div class="meta-row">
        <span><b>Invoice No:</b> ${record.invoiceNo}</span>
        <span><b>Date:</b> ${record.invoiceDate}</span>
      </div>
      <div class="meta-row">
        <span><b>Customer:</b> ${record.customerName || "—"}</span>
        <span><b>Phone:</b> ${record.customerPhone || "—"}</span>
      </div>
      <table>
        <thead>
          <tr><th style="width:40px">#</th><th>Code</th><th>Description</th><th style="width:80px;text-align:center">Qty</th><th style="width:80px;text-align:right">Rate</th><th style="width:100px;text-align:right">Amount</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Sub Total:</span><span>PKR ${fmt(record.subTotal || 0)}</span></div>
        ${record.extraDisc > 0 ? `<div class="totals-row"><span>Discount:</span><span>PKR ${fmt(record.extraDisc)}</span></div>` : ""}
        <div class="totals-row bold"><span>Net Total:</span><span>PKR ${fmt(record.netTotal || 0)}</span></div>
        ${record.prevBalance > 0 ? `<div class="totals-row"><span>Previous Balance:</span><span>PKR ${fmt(record.prevBalance)}</span></div>` : ""}
        <div class="totals-row"><span>Paid:</span><span>PKR ${fmt(record.paidAmount || 0)}</span></div>
        <div class="totals-row bold ${(record.balance || 0) > 0 ? 'red' : 'green'}"><span>Balance:</span><span>PKR ${fmt(record.balance || 0)}</span></div>
      </div>
    </body>
    </html>`;
  };
  
  const totalAmount = filteredRecords.reduce((sum, r) => sum + (r.netTotal || 0), 0);
  const hasActiveFilters = customerSearch || invoiceSearch || dateSearch || typeSearch !== "all";
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px", flexShrink: 0 }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px", background: "none", border: "none", cursor: "pointer" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Raw Sale/Purchase Records — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-primary xp-btn-sm" onClick={fetchRecords} style={{ background: "#ffffff", color: "#1e40af", border: "1px solid #1e40af", fontWeight: "bold", padding: "6px 12px" }}>⟳ Refresh</button>
        </div>
      </div>
      
      {/* Search Inputs Row */}
      <div style={{ 
        display: "flex", 
        gap: "12px", 
        padding: "16px", 
        background: "#f8fafc", 
        borderBottom: "2px solid #1e40af",
        flexWrap: "wrap",
        alignItems: "flex-end",
        position: "relative"
      }}>
        <div style={{ flex: 2, minWidth: "200px", position: "relative" }}>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>👤 Customer Name</label>
          <input
            ref={customerInputRef}
            type="text"
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #1e40af", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            placeholder="Search by customer name (min 2 characters)..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            onKeyDown={handleCustomerKeyDown}
            autoFocus
          />
          
          {/* Customer Suggestions Dropdown */}
          {showCustomerSuggestions && customerSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #1e40af",
                borderRadius: "6px",
                maxHeight: "250px",
                overflowY: "auto",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                marginTop: "4px"
              }}
            >
              {customerSuggestions.map((customer, idx) => (
                <div
                  key={customer}
                  onClick={() => handleSelectCustomerSuggestion(customer)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    backgroundColor: idx === selectedSuggestionIndex ? "#dbeafe" : "white",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                  onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                >
                  <span style={{ fontSize: "16px" }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "13px", color: "#1e293b" }}>{customer}</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>Click to select</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>🔢 Invoice #</label>
          <input
            ref={invoiceInputRef}
            type="text"
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #1e40af", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            placeholder="Search by invoice number..."
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            onKeyDown={handleInvoiceKeyDown}
          />
        </div>
        
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>📅 Date</label>
          <input
            ref={dateInputRef}
            type="date"
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #1e40af", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            value={dateSearch}
            onChange={(e) => setDateSearch(e.target.value)}
            onKeyDown={handleDateKeyDown}
          />
        </div>
        
        <div style={{ flex: 1, minWidth: "130px" }}>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>📋 Type</label>
          <select
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #1e40af", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none",
              background: "white"
            }}
            value={typeSearch}
            onChange={(e) => setTypeSearch(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="sale">Cash Sale</option>
            <option value="credit">Credit Sale</option>
            <option value="purchase">Purchase</option>
            <option value="return">Return</option>
          </select>
        </div>
        
        <div style={{ flexShrink: 0 }}>
          {hasActiveFilters && (
            <button 
              onClick={clearFilters} 
              style={{ 
                padding: "8px 16px", 
                background: "#ef4444", 
                color: "white", 
                border: "none", 
                borderRadius: "6px", 
                fontSize: "12px", 
                fontWeight: "bold",
                cursor: "pointer",
                height: "38px"
              }}
            >
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Active Filters Tags */}
      {hasActiveFilters && (
        <div style={{ 
          display: "flex", 
          gap: "8px", 
          padding: "8px 16px", 
          background: "#fef9e6", 
          borderBottom: "1px solid #1e40af",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Active filters:</span>
          {customerSearch && (
            <span style={{ background: "#e0e0e0", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              👤 {customerSearch}
              <button onClick={() => setCustomerSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {invoiceSearch && (
            <span style={{ background: "#e0e0e0", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              🔢 {invoiceSearch}
              <button onClick={() => setInvoiceSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {dateSearch && (
            <span style={{ background: "#e0e0e0", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              📅 {dateSearch}
              <button onClick={() => setDateSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {typeSearch !== "all" && (
            <span style={{ background: "#e0e0e0", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              📋 {typeSearch === "sale" ? "Cash Sale" : typeSearch === "credit" ? "Credit Sale" : typeSearch === "purchase" ? "Purchase" : "Return"}
              <button onClick={() => setTypeSearch("all")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
        </div>
      )}
      
      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", padding: "16px", flexShrink: 0 }}>
        <div style={{ background: "#ffffff", border: "2px solid #1e40af", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", marginBottom: "6px" }}>Total Records</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", color: "#1e40af" }}>{filteredRecords.length}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #1e40af", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", marginBottom: "6px" }}>Total Amount</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#1e40af" }}>PKR {fmt(totalAmount)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #1e40af", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", marginBottom: "6px" }}>Avg Amount</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#1e40af" }}>PKR {fmt(filteredRecords.length ? totalAmount / filteredRecords.length : 0)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #1e40af", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", marginBottom: "6px" }}>Customers</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", color: "#1e40af" }}>
            {new Set(filteredRecords.map(r => r.customerName)).size}
          </div>
        </div>
      </div>
      
      {/* Records Table */}
      <div style={{ padding: "0 16px 16px 16px", flex: 1, overflow: "auto" }}>
        <div className="xp-table-panel" style={{ border: "2px solid #1e40af", borderRadius: "8px", overflow: "hidden" }}>
          {loading && <div className="xp-loading" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold" }}>Loading records...</div>}
          
          {!loading && filteredRecords.length === 0 && (
            <div className="xp-empty" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold", color: "#1e40af" }}>
              📭 No records found.
            </div>
          )}
          
          {!loading && filteredRecords.length > 0 && (
            <div className="xp-table-scroll" style={{ overflowX: "auto" }}>
              <table className="xp-table" style={{ fontSize: "13px", width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1e40af", color: "#ffffff" }}>
                    <th style={{ width: 50, padding: "12px 8px", textAlign: "center", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("invoiceNo")}>
                      Invoice # {getSortIndicator("invoiceNo")}
                    </th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "left", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("invoiceDate")}>
                      Date {getSortIndicator("invoiceDate")}
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("customerName")}>
                      Customer Name {getSortIndicator("customerName")}
                    </th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "left", border: "1px solid #3b82f6", fontWeight: "bold" }}>Phone</th>
                    <th style={{ width: 70, padding: "12px 8px", textAlign: "center", border: "1px solid #3b82f6", fontWeight: "bold" }}>Items</th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "right", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("netTotal")}>
                      Amount {getSortIndicator("netTotal")}
                    </th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "right", border: "1px solid #3b82f6", fontWeight: "bold" }}>Paid</th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "right", border: "1px solid #3b82f6", fontWeight: "bold" }}>Balance</th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "center", border: "1px solid #3b82f6", fontWeight: "bold" }}>Type</th>
                    <th style={{ width: 150, padding: "12px 8px", textAlign: "center", border: "1px solid #3b82f6", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, i) => {
                    const typeBadge = getTypeBadge(record);
                    return (
                      <tr key={record._id} style={{ borderBottom: "1px solid #1e40af", cursor: "pointer" }} onClick={() => handleViewRecord(record)}>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #1e40af", fontFamily: "monospace", fontSize: "13px", fontWeight: "bold", color: "#1e40af" }}>
                          {record.invoiceNo}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #1e40af" }}>{record.invoiceDate}</td>
                        <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #1e40af", fontWeight: "bold" }}>{record.customerName || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #1e40af", color: "#666" }}>{record.customerPhone || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #1e40af" }}>{record.items?.length || 0}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #1e40af", fontWeight: "bold", color: "#1e40af" }}>PKR {fmt(record.netTotal || 0)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #1e40af", fontWeight: "bold", color: "#059669" }}>PKR {fmt(record.paidAmount || 0)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #1e40af", fontWeight: "bold", color: (record.balance || 0) > 0 ? "#dc2626" : "#059669" }}>
                          PKR {fmt(record.balance || 0)}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #1e40af" }}>
                          <span style={{ background: typeBadge.bg, color: typeBadge.color, padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                            {typeBadge.text}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #1e40af" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button className="xp-btn xp-btn-sm" onClick={(e) => { e.stopPropagation(); handleViewRecord(record); }} style={{ border: "1px solid #1e40af", fontWeight: "bold", padding: "4px 10px", cursor: "pointer" }} title="View Details">👁️</button>
                            <button className="xp-btn xp-btn-sm" onClick={(e) => { e.stopPropagation(); handlePrintRecord(record); }} style={{ border: "1px solid #1e40af", fontWeight: "bold", padding: "4px 10px", cursor: "pointer" }} title="Print">🖨️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #1e40af" }}>
                  <tr>
                    <td colSpan="5" style={{ padding: "8px", textAlign: "right", border: "1px solid #1e40af" }}>GRAND TOTAL:</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#1e40af", fontSize: "14px", border: "1px solid #1e40af" }}>PKR {fmt(totalAmount)}</td>
                    <td colSpan="4" style={{ padding: "8px", border: "1px solid #1e40af" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* View Record Modal */}
      {showViewModal && selectedRecord && (
        <div className="xp-overlay" onClick={() => setShowViewModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div className="xp-modal" style={{ maxWidth: 900, width: "90%", maxHeight: "85vh", overflow: "auto", background: "#ffffff", border: "2px solid #1e40af", borderRadius: "8px" }}>
            <div className="xp-modal-tb" style={{ background: "#1e40af", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="xp-modal-title" style={{ fontSize: "16px", fontWeight: "bold", color: "#ffffff" }}>
                Invoice {selectedRecord.invoiceNo} - {selectedRecord.customerName || "GUEST"}
              </span>
              <button className="xp-cap-btn xp-cap-close" onClick={() => setShowViewModal(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>
            <div className="xp-modal-body" style={{ padding: 20 }}>
              <div dangerouslySetInnerHTML={{ __html: buildPrintHtml(selectedRecord) }} />
            </div>
            <div className="xp-modal-footer" style={{ padding: "12px 16px", borderTop: "2px solid #1e40af", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="xp-btn" style={{ border: "2px solid #1e40af", fontWeight: "bold", padding: "6px 16px", cursor: "pointer" }} onClick={() => handlePrintRecord(selectedRecord)}>🖨️ Print</button>
              <button className="xp-btn" style={{ border: "2px solid #1e40af", fontWeight: "bold", padding: "6px 16px", cursor: "pointer" }} onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #1e40af", padding: "6px 16px", flexShrink: 0, display: "flex", justifyContent: "space-between" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e40af" }}>📄 Total: {filteredRecords.length} of {records.length} records</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e40af" }}>💰 Total Amount: PKR {fmt(totalAmount)}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e40af" }}>👥 Customers: {new Set(filteredRecords.map(r => r.customerName)).size}</div>
      </div>
    </div>
  );
}