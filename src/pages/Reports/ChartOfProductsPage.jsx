// pages/ChartOfProductsPage.jsx - Black Text & Black Borders
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/globalTheme.css";
import "../../styles/ChartOfProductsPage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");

export default function ChartOfProductsPage() {
  const navigate = useNavigate();
  
  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Three search inputs
  const [descSearch, setDescSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "productId", direction: "asc" });
  const [summary, setSummary] = useState({ total: 0, stockValue: 0, avgSaleRate: 0 });
  
  // Refs
  const descInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const companyInputRef = useRef(null);
  
  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);
  
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.PRODUCTS.GET_ALL);
      if (data.success) {
        setProducts(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
    setLoading(false);
  };
  
  // Filter products based on all three search criteria
  useEffect(() => {
    if (!products.length) {
      setFilteredProducts([]);
      setSummary({ total: 0, stockValue: 0, avgSaleRate: 0 });
      return;
    }
    
    let filtered = [...products];
    
    // Filter by Description
    if (descSearch.trim()) {
      const term = descSearch.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.description?.toLowerCase().includes(term) ||
        p.orderName?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.urduDesc?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Category
    if (categorySearch.trim()) {
      const term = categorySearch.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.category?.toLowerCase().includes(term) ||
        p.webCategory?.toLowerCase().includes(term)
      );
    }
    
    // Filter by Company
    if (companySearch.trim()) {
      const term = companySearch.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.company?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === "saleRate") {
        aVal = a.packingInfo?.[0]?.saleRate || 0;
        bVal = b.packingInfo?.[0]?.saleRate || 0;
      } else if (sortConfig.key === "purchaseRate") {
        aVal = a.packingInfo?.[0]?.purchaseRate || 0;
        bVal = b.packingInfo?.[0]?.purchaseRate || 0;
      } else if (sortConfig.key === "productId") {
        aVal = parseInt(a.productId) || 0;
        bVal = parseInt(b.productId) || 0;
      }
      
      if (typeof aVal === "string") {
        aVal = aVal?.toLowerCase() || "";
        bVal = bVal?.toLowerCase() || "";
      } else {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }
      
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    
    setFilteredProducts(filtered);
    
    // Calculate summary
    const totalStockValue = filtered.reduce((sum, p) => {
      const pk = p.packingInfo?.[0];
      if (pk?.stockEnabled && pk.openingQty && pk.purchaseRate) {
        return sum + (parseFloat(pk.openingQty) * parseFloat(pk.purchaseRate));
      }
      return sum;
    }, 0);
    
    const avgSaleRate = filtered.reduce((sum, p) => {
      const pk = p.packingInfo?.[0];
      return sum + (parseFloat(pk?.saleRate) || 0);
    }, 0) / (filtered.length || 1);
    
    setSummary({
      total: filtered.length,
      stockValue: totalStockValue,
      avgSaleRate: avgSaleRate
    });
  }, [products, descSearch, categorySearch, companySearch, sortConfig]);
  
  const clearFilters = () => {
    setDescSearch("");
    setCategorySearch("");
    setCompanySearch("");
    setSelectedProduct(null);
    descInputRef.current?.focus();
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
  
  const formatCurrency = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString();
  };
  
  const getFirstPacking = (product) => product.packingInfo?.[0] || null;
  const getAllPacking = (product) => product.packingInfo || [];
  
  const calculateStockValue = (packing) => {
    if (!packing || !packing.stockEnabled) return 0;
    const qty = parseFloat(packing.openingQty) || 0;
    const rate = parseFloat(packing.purchaseRate) || 0;
    return qty * rate;
  };
  
  const handleProductClick = (product) => {
    setSelectedProduct(selectedProduct?._id === product._id ? null : product);
  };
  
  const exportToCSV = () => {
    const headers = ["Product ID", "Code", "Company", "Category", "Description", "Measurement", "Purchase Rate", "Sale Rate"];
    const rows = filteredProducts.map(p => {
      const pk = getFirstPacking(p);
      return [p.productId, p.code || "", p.company || "", p.category || "", p.description || "", pk?.measurement || "", pk?.purchaseRate || "", pk?.saleRate || ""];
    });
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `price_list_${new Date().toISOString().split("T")[0]}.csv`;
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
    const rows = filteredProducts.map((p, i) => {
      const pk = getFirstPacking(p);
      return `<tr><td style="padding:6px;border:1px solid #000">${i + 1}</td><td style="padding:6px;border:1px solid #000">${p.productId}</td><td style="padding:6px;border:1px solid #000">${p.company || "—"}</td><td style="padding:6px;border:1px solid #000">${p.category || "—"}</td><td style="padding:6px;border:1px solid #000">${p.description || "—"}</td><td style="padding:6px;border:1px solid #000">${pk?.measurement || "—"}</td><td style="padding:6px;border:1px solid #000;text-align:right">${pk?.purchaseRate || "0"}</td><td style="padding:6px;border:1px solid #000;text-align:right">${pk?.saleRate || "0"}</td></tr>`;
    }).join("");
    
    return `<!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Price List</title>
    <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:8px;text-align:left}th{background:#000;color:#fff}.text-right{text-align:right}</style>
    </head><body><h2>Price List - Asim Electric Store</h2><p>Generated: ${new Date().toLocaleString()} | Total: ${filteredProducts.length} products</p>
    <table><thead><tr><th>#</th><th>ID</th><th>Company</th><th>Category</th><th>Description</th><th>Unit</th><th class="text-right">Purchase</th><th class="text-right">Sale</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
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
    <div className="cop-page">
      {/* Titlebar */}
      <div className="cop-titlebar">
        <div className="cop-titlebar-left">
          <button className="cop-back-btn" onClick={() => navigate("/")}>←</button>
          <span className="cop-title">Chart of Products</span>
        </div>
        <div className="cop-titlebar-right">
          <button className="cop-icon-btn" onClick={fetchProducts} title="Refresh">⟳</button>
          <button className="cop-icon-btn" onClick={handlePrint} title="Print">🖨️</button>
          <button className="cop-icon-btn" onClick={exportToCSV} title="Export">📥</button>
          <button className="cop-close-btn" onClick={() => navigate("/")}>✕</button>
        </div>
      </div>
      
      {/* 3 Search Inputs in One Row */}
      <div className="cop-search-row">
        <div className="cop-search-field">
          <label className="cop-search-label">🔍 Description / Code</label>
          <input
            ref={descInputRef}
            type="text"
            className="cop-search-input"
            placeholder="Search by description, code..."
            value={descSearch}
            onChange={(e) => setDescSearch(e.target.value)}
            onKeyDown={handleDescKeyDown}
            autoFocus
          />
        </div>
        <div className="cop-search-field">
          <label className="cop-search-label">📁 Category</label>
          <input
            ref={categoryInputRef}
            type="text"
            className="cop-search-input"
            placeholder="Search by category..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
          />
        </div>
        <div className="cop-search-field">
          <label className="cop-search-label">🏢 Company</label>
          <input
            ref={companyInputRef}
            type="text"
            className="cop-search-input"
            placeholder="Search by company..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            onKeyDown={handleCompanyKeyDown}
          />
        </div>
        <div className="cop-search-actions">
          {hasActiveFilters && (
            <button className="cop-clear-btn" onClick={clearFilters} title="Clear all filters">
              ✕ Clear
            </button>
          )}
        </div>
      </div>
      
      {/* Active Filters Tags */}
      {hasActiveFilters && (
        <div className="cop-active-filters">
          <span className="cop-filter-label">Active:</span>
          {descSearch && (
            <span className="cop-filter-tag">
              Description: {descSearch}
              <button onClick={() => setDescSearch("")}>✕</button>
            </span>
          )}
          {categorySearch && (
            <span className="cop-filter-tag">
              Category: {categorySearch}
              <button onClick={() => setCategorySearch("")}>✕</button>
            </span>
          )}
          {companySearch && (
            <span className="cop-filter-tag">
              Company: {companySearch}
              <button onClick={() => setCompanySearch("")}>✕</button>
            </span>
          )}
        </div>
      )}
      
      {/* Stats */}
      <div className="cop-stats">
        <div className="cop-stat-card">
          <div className="cop-stat-value">{filteredProducts.length.toLocaleString()}</div>
          <div className="cop-stat-label">Products</div>
        </div>
        <div className="cop-stat-card">
          <div className="cop-stat-value">PKR {formatCurrency(summary.stockValue)}</div>
          <div className="cop-stat-label">Stock Value</div>
        </div>
        <div className="cop-stat-card">
          <div className="cop-stat-value">PKR {formatCurrency(summary.avgSaleRate)}</div>
          <div className="cop-stat-label">Avg Sale Rate</div>
        </div>
      </div>
      
      {/* Products Table */}
      <div className="cop-table-wrapper">
        {loading ? (
          <div className="cop-loading">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="cop-empty">{hasActiveFilters ? "No products match your filters" : "No products available"}</div>
        ) : (
          <table className="cop-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("productId")} style={{ width: 60 }}>ID {getSortIndicator("productId")}</th>
                <th onClick={() => handleSort("code")} style={{ width: 70 }}>Code {getSortIndicator("code")}</th>
                <th onClick={() => handleSort("company")}>Company {getSortIndicator("company")}</th>
                <th onClick={() => handleSort("category")}>Category {getSortIndicator("category")}</th>
                <th onClick={() => handleSort("description")}>Description {getSortIndicator("description")}</th>
                <th style={{ width: 80 }}>Unit</th>
                <th onClick={() => handleSort("purchaseRate")} className="r">Purchase {getSortIndicator("purchaseRate")}</th>
                <th className="r">Disc%</th>
                <th onClick={() => handleSort("saleRate")} className="r">Sale Rate {getSortIndicator("saleRate")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, idx) => {
                const pk = getFirstPacking(product);
                const allPacking = getAllPacking(product);
                const isExpanded = selectedProduct?._id === product._id;
                
                return (
                  <React.Fragment key={product._id}>
                    <tr className="cop-table-row" onClick={() => handleProductClick(product)}>
                      <td className="cop-id">{product.productId}</td>
                      <td className="cop-code">{product.code || "—"}</td>
                      <td>{product.company || "—"}</td>
                      <td>{product.category || "—"}</td>
                      <td className="cop-desc-cell" title={product.description}>{product.description || "—"}</td>
                      <td>{pk?.measurement || "—"}</td>
                      <td className="r">{pk?.purchaseRate ? `PKR ${formatCurrency(pk.purchaseRate)}` : "—"}</td>
                      <td className="r">{pk?.pDisc ? `${pk.pDisc}%` : "—"}</td>
                      <td className="r cop-sale-rate">{pk?.saleRate ? `PKR ${formatCurrency(pk.saleRate)}` : "—"}</td>
                    </tr>
                    
                    {/* Expandable Packing Details */}
                    {isExpanded && allPacking.length > 1 && (
                      <tr className="cop-packing-row">
                        <td colSpan="9">
                          <div className="cop-packing-box">
                            <div className="cop-packing-title">📦 Packing Variations</div>
                            <table className="cop-packing-table">
                              <thead>
                                <tr>
                                  <th>Measurement</th>
                                  <th className="r">Purchase Rate</th>
                                  <th className="r">Disc%</th>
                                  <th className="r">Sale Rate</th>
                                  <th className="r">Packing</th>
                                  <th className="r">Min Qty</th>
                                  <th className="r">Stock</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allPacking.map((p, i) => (
                                  <tr key={i}>
                                    <td><strong>{p.measurement || "—"}</strong></td>
                                    <td className="r">{p.purchaseRate ? `PKR ${formatCurrency(p.purchaseRate)}` : "—"}</td>
                                    <td className="r">{p.pDisc ? `${p.pDisc}%` : "—"}</td>
                                    <td className="r">{p.saleRate ? `PKR ${formatCurrency(p.saleRate)}` : "—"}</td>
                                    <td className="r">{p.packing || "—"}</td>
                                    <td className="r">{p.minQty || "—"}</td>
                                    <td className="r">{p.openingQty || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
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
      <div className="cop-footer">
        <span>📊 {filteredProducts.length} of {products.length} products</span>
        {hasActiveFilters && (
          <span>🔍 Filtered by: {descSearch && "Description"} {categorySearch && "Category"} {companySearch && "Company"}</span>
        )}
        <span>🕐 {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}