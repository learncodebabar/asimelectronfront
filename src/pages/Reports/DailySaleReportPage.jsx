// pages/DailySaleReportPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/globalTheme.css";
import "../../styles/DailySaleReportPage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function DailySaleReportPage() {
  const navigate = useNavigate();
  
  // State
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Three search inputs
  const [descSearch, setDescSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [dateRange, setDateRange] = useState({ from: isoD(), to: isoD() });
  const [summary, setSummary] = useState({ 
    totalSales: 0, 
    totalAmount: 0, 
    totalItems: 0,
    totalQty: 0 
  });
  
  // Refs
  const descInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const companyInputRef = useRef(null);
  
  // Fetch sales on mount
  useEffect(() => {
    fetchSales();
  }, []);
  
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
  
  // Filter sales based on all three search criteria and date range
  useEffect(() => {
    if (!sales.length) {
      setFilteredSales([]);
      setSummary({ totalSales: 0, totalAmount: 0, totalItems: 0, totalQty: 0 });
      return;
    }
    
    let filtered = [...sales];
    
    // Filter by date range
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(s => 
        s.invoiceDate >= dateRange.from && s.invoiceDate <= dateRange.to
      );
    }
    
    // Filter by Description (product name, description, code)
    if (descSearch.trim()) {
      const term = descSearch.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.items?.some(item => 
          item.name?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.code?.toLowerCase().includes(term)
        ) ||
        s.customerName?.toLowerCase().includes(term) ||
        s.invoiceNo?.toString().includes(term)
      );
    }
    
    // Filter by Category
    if (categorySearch.trim()) {
      const term = categorySearch.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.items?.some(item => 
          item.category?.toLowerCase().includes(term)
        )
      );
    }
    
    // Filter by Company
    if (companySearch.trim()) {
      const term = companySearch.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.items?.some(item => 
          item.company?.toLowerCase().includes(term)
        )
      );
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
    
    setFilteredSales(filtered);
    
    // Calculate summary
    const totalAmount = filtered.reduce((sum, s) => sum + (s.netTotal || 0), 0);
    const totalItems = filtered.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const totalQty = filtered.reduce((sum, s) => {
      const itemsQty = (s.items || []).reduce((itemSum, item) => itemSum + (item.pcs || item.qty || 0), 0);
      return sum + itemsQty;
    }, 0);
    
    setSummary({
      totalSales: filtered.length,
      totalAmount: totalAmount,
      totalItems: totalItems,
      totalQty: totalQty
    });
  }, [sales, descSearch, categorySearch, companySearch, dateRange]);
  
  const clearFilters = () => {
    setDescSearch("");
    setCategorySearch("");
    setCompanySearch("");
    setSelectedSale(null);
    descInputRef.current?.focus();
  };
  
  const handleViewDetails = (sale) => {
    setSelectedSale(selectedSale?._id === sale._id ? null : sale);
  };
  
  const formatCurrency = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString();
  };
  
  const exportToCSV = () => {
    const headers = ["Invoice #", "Date", "Customer", "Items", "Qty", "Total Amount", "Paid", "Balance"];
    const rows = filteredSales.map(s => {
      const totalQty = (s.items || []).reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
      return [
        s.invoiceNo,
        s.invoiceDate,
        s.customerName || "COUNTER SALE",
        s.items?.length || 0,
        totalQty,
        s.netTotal || 0,
        s.paidAmount || 0,
        s.balance || 0
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily_sales_report_${new Date().toISOString().split("T")[0]}.csv`;
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
    const rows = filteredSales.map((s, i) => {
      const totalQty = (s.items || []).reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
      return `
        <tr>
          <td style="padding:8px;border:1px solid #000;text-align:center">${i + 1}</td>
          <td style="padding:8px;border:1px solid #000">${s.invoiceNo}</td>
          <td style="padding:8px;border:1px solid #000">${s.invoiceDate}</td>
          <td style="padding:8px;border:1px solid #000">${s.customerName || "COUNTER SALE"}</td>
          <td style="padding:8px;border:1px solid #000;text-align:center">${s.items?.length || 0}</td>
          <td style="padding:8px;border:1px solid #000;text-align:center">${totalQty}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${formatCurrency(s.netTotal)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${formatCurrency(s.paidAmount)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${formatCurrency(s.balance)}</td>
        </tr>
      `;
    }).join("");
    
    return `<!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Daily Sales Report</title>
    <style>
      body{font-family:Arial;padding:20px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #000;padding:8px;text-align:left}
      th{background:#000;color:#fff}
      .text-right{text-align:right}
      .text-center{text-align:center}
      .header{text-align:center;margin-bottom:20px}
      .summary{margin-top:20px;padding:10px;border:1px solid #000}
    </style>
    </head><body>
      <div class="header">
        <h2>Daily Sales Report</h2>
        <p>Period: ${dateRange.from} to ${dateRange.to}</p>
        <p>Generated: ${new Date().toLocaleString()} | Total: ${filteredSales.length} invoices</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Qty</th>
            <th class="text-right">Total</th>
            <th class="text-right">Paid</th>
            <th class="text-right">Balance</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary">
        <p><strong>Summary:</strong></p>
        <p>Total Invoices: ${filteredSales.length}</p>
        <p>Total Items: ${summary.totalItems}</p>
        <p>Total Quantity: ${summary.totalQty}</p>
        <p>Total Amount: PKR ${formatCurrency(summary.totalAmount)}</p>
        <p>Total Received: PKR ${formatCurrency(filteredSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0))}</p>
        <p>Total Balance: PKR ${formatCurrency(filteredSales.reduce((sum, s) => sum + (s.balance || 0), 0))}</p>
      </div>
    </body></html>`;
  };
  
  const handleDescKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      categoryInputRef.current?.focus();
    }
  };
  
  const handleCategoryKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      companyInputRef.current?.focus();
    }
  };
  
  const handleCompanyKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };
  
  const hasActiveFilters = descSearch || categorySearch || companySearch;
  
  return (
    <div className="dsr-page">
      {/* Titlebar */}
      <div className="dsr-titlebar">
        <div className="dsr-titlebar-left">
          <button className="dsr-back-btn" onClick={() => navigate("/")}>←</button>
          <span className="dsr-title">Daily Sales Report</span>
        </div>
        <div className="dsr-titlebar-right">
          <button className="dsr-icon-btn" onClick={fetchSales} title="Refresh">⟳</button>
          <button className="dsr-icon-btn" onClick={handlePrint} title="Print">🖨️</button>
          <button className="dsr-icon-btn" onClick={exportToCSV} title="Export">📥</button>
          <button className="dsr-close-btn" onClick={() => navigate("/")}>✕</button>
        </div>
      </div>
      
      {/* Date Range Row */}
      <div className="dsr-date-row">
        <div className="dsr-date-field">
          <label className="dsr-date-label">From Date</label>
          <input
            type="date"
            className="dsr-date-input"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          />
        </div>
        <div className="dsr-date-field">
          <label className="dsr-date-label">To Date</label>
          <input
            type="date"
            className="dsr-date-input"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          />
        </div>
      </div>
      
      {/* 3 Search Inputs in One Row */}
      <div className="dsr-search-row">
        <div className="dsr-search-field">
          <label className="dsr-search-label">🔍 Description / Code</label>
          <input
            ref={descInputRef}
            type="text"
            className="dsr-search-input"
            placeholder="Search by product, customer, invoice..."
            value={descSearch}
            onChange={(e) => setDescSearch(e.target.value)}
            onKeyDown={handleDescKeyDown}
            autoFocus
          />
        </div>
        <div className="dsr-search-field">
          <label className="dsr-search-label">📁 Category</label>
          <input
            ref={categoryInputRef}
            type="text"
            className="dsr-search-input"
            placeholder="Search by category..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
          />
        </div>
        <div className="dsr-search-field">
          <label className="dsr-search-label">🏢 Company</label>
          <input
            ref={companyInputRef}
            type="text"
            className="dsr-search-input"
            placeholder="Search by company..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            onKeyDown={handleCompanyKeyDown}
          />
        </div>
        <div className="dsr-search-actions">
          {hasActiveFilters && (
            <button className="dsr-clear-btn" onClick={clearFilters} title="Clear all filters">
              ✕ Clear
            </button>
          )}
        </div>
      </div>
      
      {/* Active Filters Tags */}
      {hasActiveFilters && (
        <div className="dsr-active-filters">
          <span className="dsr-filter-label">Active:</span>
          {descSearch && (
            <span className="dsr-filter-tag">
              Description: {descSearch}
              <button onClick={() => setDescSearch("")}>✕</button>
            </span>
          )}
          {categorySearch && (
            <span className="dsr-filter-tag">
              Category: {categorySearch}
              <button onClick={() => setCategorySearch("")}>✕</button>
            </span>
          )}
          {companySearch && (
            <span className="dsr-filter-tag">
              Company: {companySearch}
              <button onClick={() => setCompanySearch("")}>✕</button>
            </span>
          )}
        </div>
      )}
      
      {/* Stats */}
      <div className="dsr-stats">
        <div className="dsr-stat-card">
          <div className="dsr-stat-value">{filteredSales.length.toLocaleString()}</div>
          <div className="dsr-stat-label">Invoices</div>
        </div>
        <div className="dsr-stat-card">
          <div className="dsr-stat-value">{summary.totalItems.toLocaleString()}</div>
          <div className="dsr-stat-label">Items Sold</div>
        </div>
        <div className="dsr-stat-card">
          <div className="dsr-stat-value">{summary.totalQty.toLocaleString()}</div>
          <div className="dsr-stat-label">Total Qty</div>
        </div>
        <div className="dsr-stat-card">
          <div className="dsr-stat-value">PKR {formatCurrency(summary.totalAmount)}</div>
          <div className="dsr-stat-label">Total Amount</div>
        </div>
      </div>
      
      {/* Sales Table */}
      <div className="dsr-table-wrapper">
        {loading ? (
          <div className="dsr-loading">Loading sales...</div>
        ) : filteredSales.length === 0 ? (
          <div className="dsr-empty">{hasActiveFilters ? "No sales match your filters" : "No sales found"}</div>
        ) : (
          <table className="dsr-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th style={{ width: 100 }}>Invoice #</th>
                <th style={{ width: 100 }}>Date</th>
                <th>Customer</th>
                <th style={{ width: 60 }}>Items</th>
                <th style={{ width: 60 }}>Qty</th>
                <th className="r" style={{ width: 120 }}>Total</th>
                <th className="r" style={{ width: 120 }}>Paid</th>
                <th className="r" style={{ width: 120 }}>Balance</th>
                <th style={{ width: 60 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale, idx) => {
                const totalQty = (sale.items || []).reduce((sum, item) => sum + (item.pcs || item.qty || 0), 0);
                const isExpanded = selectedSale?._id === sale._id;
                
                return (
                  <React.Fragment key={sale._id}>
                    <tr className="dsr-table-row" onClick={() => handleViewDetails(sale)}>
                      <td className="dsr-idx">{idx + 1}</td>
                      <td className="dsr-invoice">{sale.invoiceNo}</td>
                      <td>{sale.invoiceDate}</td>
                      <td className="dsr-customer">{sale.customerName || "COUNTER SALE"}</td>
                      <td className="r">{sale.items?.length || 0}</td>
                      <td className="r">{totalQty}</td>
                      <td className="r dsr-amount">PKR {formatCurrency(sale.netTotal)}</td>
                      <td className="r dsr-paid">PKR {formatCurrency(sale.paidAmount)}</td>
                      <td className="r dsr-balance">PKR {formatCurrency(sale.balance)}</td>
                      <td className="r">
                        <button className="dsr-details-btn">
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable Items Details */}
                    {isExpanded && sale.items && sale.items.length > 0 && (
                      <tr className="dsr-items-row">
                        <td colSpan="10">
                          <div className="dsr-items-box">
                            <div className="dsr-items-title">📋 Items Details</div>
                            <table className="dsr-items-table">
                              <thead>
                                <tr>
                                  <th style={{ width: 40 }}>#</th>
                                  <th>Code</th>
                                  <th>Product Name</th>
                                  <th style={{ width: 80 }}>UOM</th>
                                  <th className="r" style={{ width: 60 }}>Qty</th>
                                  <th className="r" style={{ width: 100 }}>Rate</th>
                                  <th className="r" style={{ width: 100 }}>Amount</th>
                                  <th style={{ width: 60 }}>Rack</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.items.map((item, i) => (
                                  <tr key={i}>
                                    <td className="r">{i + 1}</td>
                                    <td className="dsr-item-code">{item.code || "—"}</td>
                                    <td>{item.name || item.description || "—"}</td>
                                    <td>{item.uom || item.measurement || "—"}</td>
                                    <td className="r">{item.pcs || item.qty || 0}</td>
                                    <td className="r">PKR {formatCurrency(item.rate)}</td>
                                    <td className="r dsr-item-amount">PKR {formatCurrency(item.amount)}</td>
                                    <td className="r">{item.rack || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan="6" className="r"><strong>Total:</strong></td>
                                  <td className="r"><strong>PKR {formatCurrency(sale.netTotal)}</strong></td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                         </td>
                       </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Footer */}
      <div className="dsr-footer">
        <span>📊 {filteredSales.length} of {sales.length} invoices</span>
        {hasActiveFilters && (
          <span>🔍 Filtered by: {descSearch && "Description"} {categorySearch && "Category"} {companySearch && "Company"}</span>
        )}
        <span>🕐 {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}