// pages/QuotationListPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const QUOTATIONS_STORAGE_KEY = "asim_quotations_v1";

// Helper function to extract just the number from Quotation ID
const extractQuoteNumber = (quoteNo) => {
  if (!quoteNo) return "";
  if (quoteNo.includes('QTN-')) {
    return quoteNo.split('QTN-')[1];
  }
  const num = parseInt(quoteNo);
  return isNaN(num) ? quoteNo : String(num);
};

// Load saved quotations from localStorage
const loadSavedQuotations = () => {
  try {
    return JSON.parse(localStorage.getItem(QUOTATIONS_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

// Build Quotation Print HTML
const buildQuotationPrintHtml = (quotation, overrides = {}) => {
  const customerName = overrides.customerName || quotation.customerName || "GUEST CUSTOMER";
  const customerPhone = overrides.customerPhone || quotation.customerPhone || "";
  const rows = quotation.items.map((it, i) => ({ ...it, sr: i + 1 }));
  const totalQty = rows.reduce((s, r) => s + (r.pcs || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);

  const itemRows = rows
    .map(
      (it) => `
      <tr>
        <td style="padding:6px 3px; text-align:center; border-bottom:1px solid #ddd">${it.sr}</td>
        <td style="padding:6px 3px; border-bottom:1px solid #ddd">${it.code}</td>
        <td style="padding:6px 3px; border-bottom:1px solid #ddd">${it.name}</td>
        <td style="padding:6px 3px; text-align:center; border-bottom:1px solid #ddd">${it.uom || ""}</td>
        <td style="padding:6px 3px; text-align:center; border-bottom:1px solid #ddd">${it.pcs}</td>
        <td style="padding:6px 3px; text-align:right; border-bottom:1px solid #ddd">${Number(it.rate).toLocaleString("en-PK")}</td>
        <td style="padding:6px 3px; text-align:right; border-bottom:1px solid #ddd"><b>${Number(it.amount).toLocaleString("en-PK")}</b></td>
      </tr>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Quotation ${extractQuoteNumber(quotation.quoteNo)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; width: 80mm; margin: 0 auto; padding: 3mm; }
      .header { text-align: center; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #000; }
      .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
      .meta-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 10px; }
      .divider { border-top: 1px dashed #999; margin: 5px 0; }
      table { width: 100%; border-collapse: collapse; margin: 5px 0; }
      th { background: #f5f5f5; padding: 5px 3px; text-align: left; font-size: 10px; border-bottom: 1px solid #000; }
      .totals { margin-top: 10px; padding-top: 5px; border-top: 1px solid #000; text-align: right; }
      .totals-row { margin: 3px 0; }
      .totals-row.bold { font-weight: bold; font-size: 12px; margin-top: 5px; }
      .footer { text-align: center; font-size: 8px; color: #999; margin-top: 15px; padding-top: 5px; border-top: 1px dashed #ccc; }
      @media print { @page { size: 80mm auto; margin: 2mm; } body { width: 76mm; } }
    </style>
  </head>
  <body>
    <div class="header"><div class="title">QUOTATION</div></div>
    <div class="meta-row"><span><b>Quote No:</b> ${extractQuoteNumber(quotation.quoteNo)}</span><span><b>Date:</b> ${quotation.quoteDate}</span></div>
    <div class="meta-row"><span><b>Customer:</b> ${customerName}</span>${customerPhone ? `<span><b>Phone:</b> ${customerPhone}</span>` : ""}</div>
    <div class="divider"></div>
    <table><thead><tr><th style="width:25px;text-align:center">#</th><th style="width:60px">Code</th><th>Description</th><th style="width:35px;text-align:center">UOM</th><th style="width:40px;text-align:center">Qty</th><th style="width:55px;text-align:right">Rate</th><th style="width:65px;text-align:right">Amount</th></tr></thead><tbody>${itemRows}</tbody></table>
    <div class="totals"><div class="totals-row">Total Items: ${rows.length} | Total Quantity: ${totalQty}</div><div class="totals-row bold">GRAND TOTAL: PKR ${totalAmount.toLocaleString("en-PK")}</div></div>
    <div class="footer">Thank you for your business</div>
  </body>
  </html>`;
};

const doPrint = (quotation, overrides = {}) => {
  const w = window.open("", "_blank", "width=650,height=800");
  w.document.write(buildQuotationPrintHtml(quotation, overrides));
  w.document.close();
  setTimeout(() => w.print(), 400);
};

export default function QuotationListPage() {
  const navigate = useNavigate();
  
  // State
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Three search inputs
  const [customerSearch, setCustomerSearch] = useState("");
  const [quoteSearch, setQuoteSearch] = useState("");
  const [dateSearch, setDateSearch] = useState("");
  
  // Customer suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const [filteredQuotations, setFilteredQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "quoteNo", direction: "desc" });
  
  // Refs
  const customerInputRef = useRef(null);
  const quoteInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  useEffect(() => {
    loadQuotations();
  }, []);
  
  const loadQuotations = () => {
    setLoading(true);
    try {
      const saved = loadSavedQuotations();
      setQuotations(saved);
    } catch (error) {
      console.error("Failed to load quotations:", error);
    }
    setLoading(false);
  };
  
  // Get unique customer names from quotations
  const getUniqueCustomerNames = () => {
    const names = new Set();
    quotations.forEach(q => {
      if (q.customerName && q.customerName !== "GUEST CUSTOMER") {
        names.add(q.customerName);
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
  }, [customerSearch, quotations]);
  
  // Filter quotations based on all three search criteria
  useEffect(() => {
    if (!quotations.length) {
      setFilteredQuotations([]);
      return;
    }
    
    let filtered = [...quotations];
    
    // Filter by Customer Name
    if (customerSearch.trim()) {
      const term = customerSearch.toLowerCase().trim();
      filtered = filtered.filter(q => 
        q.customerName?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Quote #
    if (quoteSearch.trim()) {
      const term = quoteSearch.toLowerCase().trim();
      filtered = filtered.filter(q => 
        extractQuoteNumber(q.quoteNo).includes(term) ||
        q.quoteNo?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Date
    if (dateSearch.trim()) {
      filtered = filtered.filter(q => q.quoteDate === dateSearch);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === "quoteNo") {
        aVal = parseInt(extractQuoteNumber(a.quoteNo)) || 0;
        bVal = parseInt(extractQuoteNumber(b.quoteNo)) || 0;
      } else if (sortConfig.key === "netTotal") {
        aVal = a.netTotal || 0;
        bVal = b.netTotal || 0;
      } else if (sortConfig.key === "quoteDate") {
        aVal = a.quoteDate || "";
        bVal = b.quoteDate || "";
      } else if (sortConfig.key === "customerName") {
        aVal = a.customerName || "";
        bVal = b.customerName || "";
      } else if (sortConfig.key === "itemsCount") {
        aVal = a.items?.length || 0;
        bVal = b.items?.length || 0;
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
    
    setFilteredQuotations(filtered);
  }, [quotations, customerSearch, quoteSearch, dateSearch, sortConfig]);
  
  const handleSelectCustomerSuggestion = (customerName) => {
    setCustomerSearch(customerName);
    setShowCustomerSuggestions(false);
    setCustomerSuggestions([]);
    quoteInputRef.current?.focus();
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
      quoteInputRef.current?.focus();
    }
  };
  
  const handleQuoteKeyDown = (e) => {
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
    setQuoteSearch("");
    setDateSearch("");
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
  
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PK", { year: 'numeric', month: '2-digit', day: '2-digit' });
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-PK", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  
  const handleViewQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
  };
  
  const handlePrintQuotation = (quotation) => {
    doPrint(quotation, { customerName: quotation.customerName, customerPhone: quotation.customerPhone });
  };
  
  const handleEditQuotation = (quotation) => {
    navigate("/quotation-page", { state: { editQuotation: quotation } });
  };
  
  const handleDeleteQuotation = (quotation, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete quotation ${extractQuoteNumber(quotation.quoteNo)} for ${quotation.customerName}?`)) {
      try {
        const saved = loadSavedQuotations();
        const filtered = saved.filter(q => q.quoteNo !== quotation.quoteNo);
        localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(filtered));
        loadQuotations();
        alert(`Quotation ${extractQuoteNumber(quotation.quoteNo)} deleted`);
      } catch (error) {
        alert("Failed to delete quotation");
      }
    }
  };
  
  const totalAmount = filteredQuotations.reduce((sum, q) => sum + (q.netTotal || 0), 0);
  const hasActiveFilters = customerSearch || quoteSearch || dateSearch;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#2c5f2d", padding: "8px 16px", flexShrink: 0 }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px", background: "none", border: "none", cursor: "pointer" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Quotation List — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-primary xp-btn-sm" onClick={() => navigate("/quotation-page")} style={{ background: "#ffffff", color: "#2c5f2d", border: "1px solid #2c5f2d", fontWeight: "bold", padding: "6px 12px" }}>+ New Quotation</button>
        </div>
      </div>
      
      {/* 3 Search Inputs in One Row */}
      <div style={{ 
        display: "flex", 
        gap: "12px", 
        padding: "16px", 
        background: "#f8fafc", 
        borderBottom: "2px solid #2c5f2d",
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
              border: "1px solid #2c5f2d", 
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
                border: "1px solid #2c5f2d",
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
                    backgroundColor: idx === selectedSuggestionIndex ? "#e8f5e9" : "white",
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
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>🔢 Quote #</label>
          <input
            ref={quoteInputRef}
            type="text"
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #2c5f2d", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            placeholder="Search by quote number..."
            value={quoteSearch}
            onChange={(e) => setQuoteSearch(e.target.value)}
            onKeyDown={handleQuoteKeyDown}
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
              border: "1px solid #2c5f2d", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            value={dateSearch}
            onChange={(e) => setDateSearch(e.target.value)}
            onKeyDown={handleDateKeyDown}
          />
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
          borderBottom: "1px solid #2c5f2d",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Active filters:</span>
          {customerSearch && (
            <span style={{ 
              background: "#e0e0e0", 
              padding: "4px 10px", 
              borderRadius: "20px", 
              fontSize: "11px", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px" 
            }}>
              👤 {customerSearch}
              <button onClick={() => setCustomerSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {quoteSearch && (
            <span style={{ 
              background: "#e0e0e0", 
              padding: "4px 10px", 
              borderRadius: "20px", 
              fontSize: "11px", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px" 
            }}>
              🔢 {quoteSearch}
              <button onClick={() => setQuoteSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {dateSearch && (
            <span style={{ 
              background: "#e0e0e0", 
              padding: "4px 10px", 
              borderRadius: "20px", 
              fontSize: "11px", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px" 
            }}>
              📅 {dateSearch}
              <button onClick={() => setDateSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
        </div>
      )}
      
      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", padding: "16px", flexShrink: 0 }}>
        <div style={{ background: "#ffffff", border: "2px solid #2c5f2d", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#2c5f2d", textTransform: "uppercase", marginBottom: "6px" }}>Total Quotations</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", color: "#2c5f2d" }}>{filteredQuotations.length}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #2c5f2d", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#2c5f2d", textTransform: "uppercase", marginBottom: "6px" }}>Total Amount</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#2c5f2d" }}>PKR {fmt(totalAmount)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #2c5f2d", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#2c5f2d", textTransform: "uppercase", marginBottom: "6px" }}>Avg Amount</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#2c5f2d" }}>PKR {fmt(filteredQuotations.length ? totalAmount / filteredQuotations.length : 0)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #2c5f2d", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#2c5f2d", textTransform: "uppercase", marginBottom: "6px" }}>Customers</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", color: "#2c5f2d" }}>
            {new Set(filteredQuotations.map(q => q.customerName)).size}
          </div>
        </div>
      </div>
      
      {/* Quotations Table */}
      <div style={{ padding: "0 16px 16px 16px", flex: 1, overflow: "auto" }}>
        <div className="xp-table-panel" style={{ border: "2px solid #2c5f2d", borderRadius: "8px", overflow: "hidden" }}>
          {loading && <div className="xp-loading" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold" }}>Loading quotations...</div>}
          
          {!loading && filteredQuotations.length === 0 && (
            <div className="xp-empty" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold", color: "#2c5f2d" }}>
              📭 No quotations found. Click "New Quotation" to create one.
            </div>
          )}
          
          {!loading && filteredQuotations.length > 0 && (
            <div className="xp-table-scroll" style={{ overflowX: "auto" }}>
              <table className="xp-table" style={{ fontSize: "13px", width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#2c5f2d", color: "#ffffff" }}>
                    <th style={{ width: 70, padding: "12px 8px", textAlign: "center", border: "1px solid #1e4620", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("quoteNo")}>
                      Quote # {getSortIndicator("quoteNo")}
                    </th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "left", border: "1px solid #1e4620", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("quoteDate")}>
                      Date {getSortIndicator("quoteDate")}
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #1e4620", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("customerName")}>
                      Customer Name {getSortIndicator("customerName")}
                    </th>
                    <th style={{ width: 120, padding: "12px 8px", textAlign: "left", border: "1px solid #1e4620", fontWeight: "bold" }}>Phone</th>
                    <th style={{ width: 70, padding: "12px 8px", textAlign: "right", border: "1px solid #1e4620", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("itemsCount")}>
                      Items {getSortIndicator("itemsCount")}
                    </th>
                    <th style={{ width: 120, padding: "12px 8px", textAlign: "right", border: "1px solid #1e4620", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("netTotal")}>
                      Amount {getSortIndicator("netTotal")}
                    </th>
                    <th style={{ width: 140, padding: "12px 8px", textAlign: "left", border: "1px solid #1e4620", fontWeight: "bold" }}>Saved At</th>
                    <th style={{ width: 180, padding: "12px 8px", textAlign: "center", border: "1px solid #1e4620", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((q, i) => (
                    <tr key={q.quoteNo} style={{ borderBottom: "1px solid #2c5f2d", cursor: "pointer" }} onClick={() => handleViewQuotation(q)}>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #2c5f2d", fontFamily: "monospace", fontSize: "14px", fontWeight: "bold", color: "#2c5f2d" }}>
                        {extractQuoteNumber(q.quoteNo)}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #2c5f2d" }}>{formatDate(q.quoteDate)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #2c5f2d", fontWeight: "bold" }}>{q.customerName || "GUEST CUSTOMER"}</td>
                      <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #2c5f2d", color: "#666" }}>{q.customerPhone || "—"}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #2c5f2d" }}>{q.items?.length || 0}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #2c5f2d", fontWeight: "bold", color: "#2c5f2d" }}>PKR {fmt(q.netTotal || 0)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #2c5f2d", fontSize: "11px" }}>{formatDateTime(q.savedAt)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #2c5f2d" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button className="xp-btn xp-btn-sm" onClick={(e) => { e.stopPropagation(); handleViewQuotation(q); }} style={{ border: "1px solid #2c5f2d", fontWeight: "bold", padding: "4px 10px", cursor: "pointer" }} title="View Details">👁️</button>
                          <button className="xp-btn xp-btn-sm" onClick={(e) => { e.stopPropagation(); handlePrintQuotation(q); }} style={{ border: "1px solid #2c5f2d", fontWeight: "bold", padding: "4px 10px", cursor: "pointer" }} title="Print">🖨️</button>
                          <button className="xp-btn xp-btn-sm" onClick={(e) => { e.stopPropagation(); handleEditQuotation(q); }} style={{ border: "1px solid #2c5f2d", fontWeight: "bold", padding: "4px 10px", cursor: "pointer" }} title="Edit">✏️</button>
                          <button className="xp-btn xp-btn-sm" onClick={(e) => handleDeleteQuotation(q, e)} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px", cursor: "pointer" }} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #2c5f2d" }}>
                  <tr>
                    <td colSpan="5" style={{ padding: "8px", textAlign: "right", border: "1px solid #2c5f2d" }}>GRAND TOTAL:</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#2c5f2d", fontSize: "14px", border: "1px solid #2c5f2d" }}>PKR {fmt(totalAmount)}</td>
                    <td colSpan="2" style={{ padding: "8px", border: "1px solid #2c5f2d" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* View Quotation Modal */}
      {showViewModal && selectedQuotation && (
        <div className="xp-overlay" onClick={() => setShowViewModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div className="xp-modal" style={{ maxWidth: 900, width: "90%", maxHeight: "85vh", overflow: "auto", background: "#ffffff", border: "2px solid #2c5f2d", borderRadius: "8px" }}>
            <div className="xp-modal-tb" style={{ background: "#2c5f2d", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="xp-modal-title" style={{ fontSize: "16px", fontWeight: "bold", color: "#ffffff" }}>
                Quotation {extractQuoteNumber(selectedQuotation.quoteNo)} - {selectedQuotation.customerName || "GUEST CUSTOMER"}
              </span>
              <button className="xp-cap-btn xp-cap-close" onClick={() => setShowViewModal(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>
            <div className="xp-modal-body" style={{ padding: 20 }}>
              <div dangerouslySetInnerHTML={{ __html: buildQuotationPrintHtml(selectedQuotation, { customerName: selectedQuotation.customerName, customerPhone: selectedQuotation.customerPhone }) }} />
            </div>
            <div className="xp-modal-footer" style={{ padding: "12px 16px", borderTop: "2px solid #2c5f2d", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="xp-btn" style={{ border: "2px solid #2c5f2d", fontWeight: "bold", padding: "6px 16px", cursor: "pointer" }} onClick={() => handlePrintQuotation(selectedQuotation)}>🖨️ Print</button>
              <button className="xp-btn" style={{ background: "#25D366", color: "#ffffff", border: "2px solid #2c5f2d", fontWeight: "bold", padding: "6px 16px", cursor: "pointer" }} onClick={() => {
                const phone = selectedQuotation.customerPhone?.replace(/\D/g, "");
                if (phone) {
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Quotation ${extractQuoteNumber(selectedQuotation.quoteNo)} - ${selectedQuotation.customerName}`)}`, "_blank");
                } else {
                  alert("No phone number available");
                }
              }}>📱 Share on WhatsApp</button>
              <button className="xp-btn" style={{ border: "2px solid #2c5f2d", fontWeight: "bold", padding: "6px 16px", cursor: "pointer" }} onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #2c5f2d", padding: "6px 16px", flexShrink: 0, display: "flex", justifyContent: "space-between" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#2c5f2d" }}>📄 Total: {filteredQuotations.length} of {quotations.length} quotations</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#2c5f2d" }}>💰 Total Amount: PKR {fmt(totalAmount)}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#2c5f2d" }}>👥 Customers: {new Set(filteredQuotations.map(q => q.customerName)).size}</div>
      </div>
    </div>
  );
}