// pages/StockReportPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");

export default function StockReportPage() {
  const navigate = useNavigate();
  
  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search inputs
  const [codeSearch, setCodeSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  
  // Suggestions
  const [codeSuggestions, setCodeSuggestions] = useState([]);
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "productId", direction: "asc" });
  
  // Refs
  const codeInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const companyInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  useEffect(() => {
    fetchProducts();
  }, []);
  
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.PRODUCTS.GET_ALL);
      if (data.success) {
        // Process products to calculate stock quantities
        const processedProducts = data.data.map(product => {
          let totalStock = 0;
          let packingInfo = [];
          
          if (product.packingInfo && product.packingInfo.length > 0) {
            packingInfo = product.packingInfo.map(pk => ({
              measurement: pk.measurement || "—",
              packing: pk.packing || 1,
              openingQty: pk.openingQty || 0,
              purchaseRate: pk.purchaseRate || 0,
              saleRate: pk.saleRate || 0,
              stockEnabled: pk.stockEnabled || false,
              stockValue: (pk.stockEnabled ? (parseFloat(pk.openingQty) || 0) : 0)
            }));
            
            // Calculate total stock quantity
            totalStock = packingInfo.reduce((sum, pk) => {
              if (pk.stockEnabled) {
                return sum + (parseFloat(pk.openingQty) || 0);
              }
              return sum;
            }, 0);
          }
          
          return {
            ...product,
            totalStock,
            packingInfo,
            stockValue: packingInfo.reduce((sum, pk) => sum + (pk.stockValue * (pk.purchaseRate || 0)), 0)
          };
        });
        
        setProducts(processedProducts);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
    setLoading(false);
  };
  
  // Get unique codes for suggestions
  const getUniqueCodes = () => {
    const codes = new Set();
    products.forEach(p => {
      if (p.code) codes.add(p.code);
    });
    return Array.from(codes).sort();
  };
  
  // Handle code search with suggestions
  useEffect(() => {
    if (codeSearch.length >= 1) {
      const allCodes = getUniqueCodes();
      const filtered = allCodes.filter(code => 
        code.toLowerCase().includes(codeSearch.toLowerCase())
      ).slice(0, 10);
      setCodeSuggestions(filtered);
      setShowCodeSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setCodeSuggestions([]);
      setShowCodeSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [codeSearch, products]);
  
  // Filter products based on all search criteria
  useEffect(() => {
    if (!products.length) {
      setFilteredProducts([]);
      return;
    }
    
    let filtered = [...products];
    
    // Filter by Code
    if (codeSearch.trim()) {
      const term = codeSearch.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.code?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Name/Description
    if (nameSearch.trim()) {
      const term = nameSearch.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.description?.toLowerCase().includes(term) ||
        p.orderName?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Company
    if (companySearch.trim()) {
      const term = companySearch.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.company?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Category
    if (categorySearch.trim()) {
      const term = categorySearch.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.category?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Low Stock (stock <= 10)
    if (lowStockOnly) {
      filtered = filtered.filter(p => p.totalStock <= 10 && p.totalStock > 0);
    }
    
    // Filter by Out of Stock (stock = 0)
    if (outOfStockOnly) {
      filtered = filtered.filter(p => p.totalStock === 0);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === "totalStock") {
        aVal = a.totalStock || 0;
        bVal = b.totalStock || 0;
      } else if (sortConfig.key === "stockValue") {
        aVal = a.stockValue || 0;
        bVal = b.stockValue || 0;
      } else if (sortConfig.key === "productId") {
        aVal = parseInt(a.productId) || 0;
        bVal = parseInt(b.productId) || 0;
      } else if (sortConfig.key === "code") {
        aVal = a.code || "";
        bVal = b.code || "";
      } else if (sortConfig.key === "description") {
        aVal = a.description || "";
        bVal = b.description || "";
      } else if (sortConfig.key === "company") {
        aVal = a.company || "";
        bVal = b.company || "";
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
    
    setFilteredProducts(filtered);
  }, [products, codeSearch, nameSearch, companySearch, categorySearch, lowStockOnly, outOfStockOnly, sortConfig]);
  
  const handleSelectCodeSuggestion = (code) => {
    setCodeSearch(code);
    setShowCodeSuggestions(false);
    setCodeSuggestions([]);
    nameInputRef.current?.focus();
  };
  
  const handleCodeKeyDown = (e) => {
    if (showCodeSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < codeSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSelectCodeSuggestion(codeSuggestions[selectedSuggestionIndex]);
      } else if (e.key === "Escape") {
        setShowCodeSuggestions(false);
      }
    }
    
    if (e.key === "Enter" && !showCodeSuggestions) {
      e.preventDefault();
      nameInputRef.current?.focus();
    }
  };
  
  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      companyInputRef.current?.focus();
    }
  };
  
  const handleCompanyKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      categoryInputRef.current?.focus();
    }
  };
  
  const handleCategoryKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };
  
  const clearFilters = () => {
    setCodeSearch("");
    setNameSearch("");
    setCompanySearch("");
    setCategorySearch("");
    setLowStockOnly(false);
    setOutOfStockOnly(false);
    setCodeSuggestions([]);
    setShowCodeSuggestions(false);
    setSelectedSuggestionIndex(-1);
    codeInputRef.current?.focus();
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
  
  const getStockStatus = (stock) => {
    if (stock === 0) return { text: "OUT OF STOCK", bg: "#fee2e2", color: "#dc2626" };
    if (stock <= 10) return { text: "LOW STOCK", bg: "#fef3c7", color: "#d97706" };
    return { text: "IN STOCK", bg: "#dcfce7", color: "#16a34a" };
  };
  
  const totalStock = filteredProducts.reduce((sum, p) => sum + (p.totalStock || 0), 0);
  const totalStockValue = filteredProducts.reduce((sum, p) => sum + (p.stockValue || 0), 0);
  const hasActiveFilters = codeSearch || nameSearch || companySearch || categorySearch || lowStockOnly || outOfStockOnly;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px", flexShrink: 0 }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px", background: "none", border: "none", cursor: "pointer" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Stock Report — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-primary xp-btn-sm" onClick={fetchProducts} style={{ background: "#ffffff", color: "#1e40af", border: "1px solid #1e40af", fontWeight: "bold", padding: "6px 12px" }}>⟳ Refresh</button>
          <button className="xp-btn xp-btn-sm" onClick={() => {
            const printWindow = window.open("", "_blank");
            printWindow.document.write(buildPrintHtml(filteredProducts, totalStock, totalStockValue));
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
          }} style={{ border: "1px solid #1e40af", fontWeight: "bold", padding: "6px 12px", marginLeft: "8px" }}>🖨️ Print</button>
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
        <div style={{ flex: 1, minWidth: "130px", position: "relative" }}>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>🔢 Code</label>
          <input
            ref={codeInputRef}
            type="text"
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #1e40af", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            placeholder="Search by code..."
            value={codeSearch}
            onChange={(e) => setCodeSearch(e.target.value)}
            onKeyDown={handleCodeKeyDown}
            autoFocus
          />
          
          {/* Code Suggestions Dropdown */}
          {showCodeSuggestions && codeSuggestions.length > 0 && (
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
                maxHeight: "200px",
                overflowY: "auto",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                marginTop: "4px"
              }}
            >
              {codeSuggestions.map((code, idx) => (
                <div
                  key={code}
                  onClick={() => handleSelectCodeSuggestion(code)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    backgroundColor: idx === selectedSuggestionIndex ? "#dbeafe" : "white",
                    borderBottom: "1px solid #e2e8f0",
                    fontFamily: "monospace",
                    fontSize: "12px"
                  }}
                  onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                >
                  {code}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ flex: 2, minWidth: "200px" }}>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>📦 Product Name</label>
          <input
            ref={nameInputRef}
            type="text"
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #1e40af", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            placeholder="Search by product name..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            onKeyDown={handleNameKeyDown}
          />
        </div>
        
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>🏢 Company</label>
          <input
            ref={companyInputRef}
            type="text"
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #1e40af", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            placeholder="Search by company..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            onKeyDown={handleCompanyKeyDown}
          />
        </div>
        
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "4px", display: "block" }}>📁 Category</label>
          <input
            ref={categoryInputRef}
            type="text"
            style={{ 
              width: "100%", 
              padding: "8px 12px", 
              border: "1px solid #1e40af", 
              borderRadius: "6px", 
              fontSize: "13px",
              outline: "none"
            }}
            placeholder="Search by category..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
          />
        </div>
        
        <div style={{ flexShrink: 0, display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); if (e.target.checked) setOutOfStockOnly(false); }} />
            <span style={{ color: "#d97706" }}>⚠️ Low Stock (≤10)</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
            <input type="checkbox" checked={outOfStockOnly} onChange={(e) => { setOutOfStockOnly(e.target.checked); if (e.target.checked) setLowStockOnly(false); }} />
            <span style={{ color: "#dc2626" }}>❌ Out of Stock</span>
          </label>
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
          {codeSearch && (
            <span style={{ background: "#e0e0e0", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              🔢 {codeSearch}
              <button onClick={() => setCodeSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {nameSearch && (
            <span style={{ background: "#e0e0e0", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              📦 {nameSearch}
              <button onClick={() => setNameSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {companySearch && (
            <span style={{ background: "#e0e0e0", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              🏢 {companySearch}
              <button onClick={() => setCompanySearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {categorySearch && (
            <span style={{ background: "#e0e0e0", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              📁 {categorySearch}
              <button onClick={() => setCategorySearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {lowStockOnly && (
            <span style={{ background: "#fef3c7", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", color: "#d97706" }}>
              ⚠️ Low Stock
              <button onClick={() => setLowStockOnly(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
          {outOfStockOnly && (
            <span style={{ background: "#fee2e2", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", color: "#dc2626" }}>
              ❌ Out of Stock
              <button onClick={() => setOutOfStockOnly(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </span>
          )}
        </div>
      )}
      
      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", padding: "16px", flexShrink: 0 }}>
        <div style={{ background: "#ffffff", border: "2px solid #1e40af", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", marginBottom: "6px" }}>Total Products</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", color: "#1e40af" }}>{filteredProducts.length}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #1e40af", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", marginBottom: "6px" }}>Total Stock (Qty)</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#1e40af" }}>{fmt(totalStock)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #1e40af", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", marginBottom: "6px" }}>Stock Value</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#1e40af" }}>PKR {fmt(totalStockValue)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #1e40af", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", marginBottom: "6px" }}>Low/Out Stock</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#d97706" }}>
            {products.filter(p => p.totalStock <= 10 && p.totalStock > 0).length} / {products.filter(p => p.totalStock === 0).length}
          </div>
        </div>
      </div>
      
      {/* Stock Table */}
      <div style={{ padding: "0 16px 16px 16px", flex: 1, overflow: "auto" }}>
        <div className="xp-table-panel" style={{ border: "2px solid #1e40af", borderRadius: "8px", overflow: "hidden" }}>
          {loading && <div className="xp-loading" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold" }}>Loading products...</div>}
          
          {!loading && filteredProducts.length === 0 && (
            <div className="xp-empty" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold", color: "#1e40af" }}>
              📭 No products found.
            </div>
          )}
          
          {!loading && filteredProducts.length > 0 && (
            <div className="xp-table-scroll" style={{ overflowX: "auto" }}>
              <table className="xp-table" style={{ fontSize: "13px", width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1e40af", color: "#ffffff" }}>
                    <th style={{ width: 50, padding: "12px 8px", textAlign: "center", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("productId")}>
                      ID {getSortIndicator("productId")}
                    </th>
                    <th style={{ width: 80, padding: "12px 8px", textAlign: "left", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("code")}>
                      Code {getSortIndicator("code")}
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("description")}>
                      Product Name {getSortIndicator("description")}
                    </th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "left", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("company")}>
                      Company {getSortIndicator("company")}
                    </th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "left", border: "1px solid #3b82f6", fontWeight: "bold" }}>Category</th>
                    <th style={{ width: 80, padding: "12px 8px", textAlign: "center", border: "1px solid #3b82f6", fontWeight: "bold" }}>UOM</th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "right", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("totalStock")}>
                      Stock (Qty) {getSortIndicator("totalStock")}
                    </th>
                    <th style={{ width: 120, padding: "12px 8px", textAlign: "right", border: "1px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }} onClick={() => handleSort("stockValue")}>
                      Stock Value {getSortIndicator("stockValue")}
                    </th>
                    <th style={{ width: 80, padding: "12px 8px", textAlign: "center", border: "1px solid #3b82f6", fontWeight: "bold" }}>Status</th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "right", border: "1px solid #3b82f6", fontWeight: "bold" }}>Sale Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, idx) => {
                    const status = getStockStatus(product.totalStock);
                    const firstPacking = product.packingInfo?.[0];
                    return (
                      <tr key={product._id} style={{ borderBottom: "1px solid #1e40af", background: product.totalStock === 0 ? "#fff5f5" : product.totalStock <= 10 ? "#fffbeb" : "#ffffff" }}>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #1e40af", fontWeight: "bold", fontFamily: "monospace" }}>{product.productId || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #1e40af", fontFamily: "monospace", fontWeight: "bold", background: "#f5f5f5" }}>{product.code || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #1e40af", fontWeight: "bold" }}>{product.description || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #1e40af" }}>{product.company || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #1e40af" }}>{product.category || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #1e40af" }}>{firstPacking?.measurement || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #1e40af", fontWeight: "bold", color: product.totalStock === 0 ? "#dc2626" : product.totalStock <= 10 ? "#d97706" : "#16a34a" }}>
                          {fmt(product.totalStock)}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #1e40af", fontWeight: "bold" }}>PKR {fmt(product.stockValue)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #1e40af" }}>
                          <span style={{ background: status.bg, color: status.color, padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                            {status.text}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #1e40af", fontWeight: "bold", color: "#1e40af" }}>
                          PKR {fmt(firstPacking?.saleRate || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #1e40af" }}>
                  <tr>
                    <td colSpan="6" style={{ padding: "8px", textAlign: "right", border: "1px solid #1e40af" }}>GRAND TOTAL:</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#1e40af", fontSize: "14px", border: "1px solid #1e40af" }}>{fmt(totalStock)}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#1e40af", fontSize: "14px", border: "1px solid #1e40af" }}>PKR {fmt(totalStockValue)}</td>
                    <td colSpan="2" style={{ padding: "8px", border: "1px solid #1e40af" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #1e40af", padding: "6px 16px", flexShrink: 0, display: "flex", justifyContent: "space-between" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e40af" }}>📦 Total: {filteredProducts.length} of {products.length} products</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e40af" }}>📊 Total Stock: {fmt(totalStock)} units</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e40af" }}>💰 Stock Value: PKR {fmt(totalStockValue)}</div>
      </div>
    </div>
  );
}

// Print HTML builder
const buildPrintHtml = (products, totalStock, totalStockValue) => {
  const rows = products.map((p, i) => {
    const firstPacking = p.packingInfo?.[0];
    return `<tr>
      <td style="padding:6px;border:1px solid #000;text-align:center">${i + 1}</td>
      <td style="padding:6px;border:1px solid #000">${p.code || "—"}</td>
      <td style="padding:6px;border:1px solid #000">${p.description || "—"}</td>
      <td style="padding:6px;border:1px solid #000">${p.company || "—"}</td>
      <td style="padding:6px;border:1px solid #000">${p.category || "—"}</td>
      <td style="padding:6px;border:1px solid #000;text-align:center">${firstPacking?.measurement || "—"}</td>
      <td style="padding:6px;border:1px solid #000;text-align:right">${p.totalStock || 0}</td>
      <td style="padding:6px;border:1px solid #000;text-align:right">PKR ${fmt(p.stockValue)}</td>
      <td style="padding:6px;border:1px solid #000;text-align:right">PKR ${fmt(firstPacking?.saleRate || 0)}</td>
    </tr>`;
  }).join("");
  
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Stock Report</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
      .header{text-align:center;margin-bottom:20px}
      .title{font-size:18px;font-weight:bold}
      .meta-row{display:flex;justify-content:space-between;margin:10px 0}
      table{width:100%;border-collapse:collapse;margin:15px 0}
      th,td{border:1px solid #000;padding:8px;text-align:left}
      th{background:#1e40af;color:#fff}
      .text-right{text-align:right}
      .text-center{text-align:center}
      .totals{margin-top:15px;text-align:right}
      .footer{text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #ccc;font-size:10px}
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">STOCK REPORT</div>
      <div>Asim Electric & Electronic Store</div>
    </div>
    <div class="meta-row">
      <span>Generated: ${new Date().toLocaleString()}</span>
      <span>Total Products: ${products.length}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Code</th>
          <th>Product Name</th>
          <th>Company</th>
          <th>Category</th>
          <th style="width:60px;text-align:center">UOM</th>
          <th style="width:80px;text-align:right">Stock</th>
          <th style="width:100px;text-align:right">Stock Value</th>
          <th style="width:100px;text-align:right">Sale Rate</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="6" style="text-align:right;font-weight:bold">TOTALS:</td>
          <td style="text-align:right;font-weight:bold">${totalStock.toLocaleString()}汝
          <td style="text-align:right;font-weight:bold">PKR ${fmt(totalStockValue)}汝
          <td style="text-align:right">汝
        </tr>
      </tfoot>
    </table>
    <div class="footer">Developed by: Creative Babar / 03098325271</div>
  </body>
  </html>`;
};