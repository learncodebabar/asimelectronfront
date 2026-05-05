// pages/ProductHistoryPage.jsx - Complete with Enhanced Keyboard Navigation
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/SalePage.css";

/* ── helpers ── */
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-PK", {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString("en-PK");
};

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString("en-PK");
};

// Transaction type badges
const TransactionBadge = ({ type }) => {
  const styles = {
    PURCHASE: { background: "#10b981", color: "white", label: "Purchase" },
    SALE: { background: "#3b82f6", color: "white", label: "Sale" },
    SALE_RETURN: { background: "#f59e0b", color: "white", label: "Sale Return" },
    PURCHASE_RETURN: { background: "#ef4444", color: "white", label: "Purchase Return" },
  };
  
  const style = styles[type] || { background: "#6b7280", color: "white", label: type };
  
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: "bold",
      background: style.background,
      color: style.color,
    }}>
      {style.label}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════
   PRODUCT SEARCH MODAL WITH ENHANCED KEYBOARD NAVIGATION
══════════════════════════════════════════════════════════ */
function ProductSearchModal({ allProducts, onSelect, onClose }) {
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [company, setCompany] = useState("");
  const [rows, setRows] = useState([]);
  const [hiIdx, setHiIdx] = useState(0);
  const [focusedField, setFocusedField] = useState("description");
  const rDesc = useRef(null);
  const rCat = useRef(null);
  const rCompany = useRef(null);
  const tbodyRef = useRef(null);

  const buildFlat = useCallback((products, d, c, co) => {
    const res = [];
    const ld = d.trim().toLowerCase(),
      lc = c.trim().toLowerCase(),
      lo = co.trim().toLowerCase();
    products.forEach((p) => {
      const ok =
        (!ld || p.description?.toLowerCase().includes(ld) || p.code?.toLowerCase().includes(ld)) &&
        (!lc || p.category?.toLowerCase().includes(lc)) &&
        (!lo || p.company?.toLowerCase().includes(lo));
      if (!ok) return;
      const _name = [p.category, p.description, p.company].filter(Boolean).join(" ");
      res.push({
        ...p,
        _name,
        _meas: p.packingInfo?.[0]?.measurement || "",
        _rate: p.packingInfo?.[0]?.saleRate || 0,
      });
    });
    return res;
  }, []);

  useEffect(() => {
    rDesc.current?.focus();
    setFocusedField("description");
    setRows(buildFlat(allProducts, "", "", ""));
  }, [allProducts, buildFlat]);

  useEffect(() => {
    const f = buildFlat(allProducts, desc, cat, company);
    setRows(f);
    setHiIdx(f.length > 0 ? 0 : -1);
  }, [desc, cat, company, allProducts, buildFlat]);

  useEffect(() => {
    if (tbodyRef.current && hiIdx >= 0) {
      tbodyRef.current.children[hiIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [hiIdx]);

  const handleKeyDown = (e) => {
    // Enter key to move to next input
    if (e.key === "Enter") {
      e.preventDefault();
      if (focusedField === "description") {
        rCat.current?.focus();
        setFocusedField("category");
      }
      else if (focusedField === "category") {
        rCompany.current?.focus();
        setFocusedField("company");
      }
      else if (focusedField === "company") {
        if (tbodyRef.current && rows.length > 0) {
          tbodyRef.current.focus();
          setHiIdx(0);
          setFocusedField("table");
        }
      }
      else if (focusedField === "table") {
        if (hiIdx >= 0 && rows[hiIdx]) {
          onSelect(rows[hiIdx]);
        }
      }
    }
    
    // Arrow Down key to move to next input or table
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (focusedField === "description") {
        rCat.current?.focus();
        setFocusedField("category");
      }
      else if (focusedField === "category") {
        rCompany.current?.focus();
        setFocusedField("company");
      }
      else if (focusedField === "company") {
        if (tbodyRef.current && rows.length > 0) {
          tbodyRef.current.focus();
          setHiIdx(0);
          setFocusedField("table");
        }
      }
    }
    
    // Arrow Up key from table
    if (e.key === "ArrowUp" && focusedField === "table") {
      e.preventDefault();
      setHiIdx((i) => Math.max(i - 1, 0));
    }
    
    // Escape key
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleTableKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHiIdx((i) => Math.min(i + 1, rows.length - 1));
    }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHiIdx((i) => Math.max(i - 1, 0));
    }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (hiIdx >= 0 && rows[hiIdx]) {
        onSelect(rows[hiIdx]);
      }
    }
    else if (e.key === "Escape") {
      onClose();
    }
    else if (e.key === "Tab" || e.key === "ArrowUp" && hiIdx === 0 && focusedField === "table") {
      e.preventDefault();
      rCompany.current?.focus();
      setFocusedField("company");
    }
  };

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: "90%", maxWidth: "1000px", maxHeight: "80vh", display: "flex", flexDirection: "column", border: "2px solid #000", background: "#fff" }}>
        <div className="xp-modal-tb" style={{ background: "#1a1a1a", padding: "6px 12px", borderBottom: "1px solid #000" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span className="xp-modal-title" style={{ color: "white", fontWeight: "bold" }}>Select Product</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "white" }}>✕</button>
        </div>
        
        <div style={{ padding: "6px 10px", background: "#fff", borderBottom: "1px solid #000", display: "flex", gap: "8px", flexWrap: "wrap" }} onKeyDown={handleKeyDown}>
          <input 
            ref={rDesc} 
            type="text" 
            className="xp-input" 
            placeholder="Description / Code (Enter/↓ to next)" 
            value={desc} 
            onChange={(e) => setDesc(e.target.value)} 
            onFocus={() => setFocusedField("description")}
            style={{ flex: 2, padding: "4px 8px", fontSize: "12px", border: "1px solid #000", background: focusedField === "description" ? "#fff9c4" : "white" }} 
          />
          <input 
            ref={rCat} 
            type="text" 
            className="xp-input" 
            placeholder="Category (Enter/↓ to next)" 
            value={cat} 
            onChange={(e) => setCat(e.target.value)} 
            onFocus={() => setFocusedField("category")}
            style={{ flex: 1, padding: "4px 8px", fontSize: "12px", border: "1px solid #000", background: focusedField === "category" ? "#fff9c4" : "white" }} 
          />
          <input 
            ref={rCompany} 
            type="text" 
            className="xp-input" 
            placeholder="Company (Enter/↓ to table)" 
            value={company} 
            onChange={(e) => setCompany(e.target.value)} 
            onFocus={() => setFocusedField("company")}
            style={{ flex: 1, padding: "4px 8px", fontSize: "12px", border: "1px solid #000", background: focusedField === "company" ? "#fff9c4" : "white" }} 
          />
          <span style={{ fontSize: "11px", color: "#000", alignSelf: "center" }}>{rows.length} products</span>
          <button onClick={onClose} style={{ padding: "4px 10px", background: "#f5f5f5", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>Close</button>
        </div>
        
        <div className="xp-modal-body" style={{ padding: 0, flex: 1, overflow: "auto", background: "#fff" }}>
          <table 
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }} 
            onKeyDown={handleTableKeyDown} 
            tabIndex={0}
            ref={tbodyRef}
            onFocus={() => setFocusedField("table")}
          >
            <thead style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "2px solid #000" }}>
              <tr>
                <th style={{ width: 40, padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>#</th>
                <th style={{ width: 90, padding: "4px 6px", textAlign: "left", border: "1px solid #000", color: "#000" }}>Code</th>
                <th style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #000", color: "#000" }}>Product Name</th>
                <th style={{ width: 70, padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>UOM</th>
                <th style={{ width: 90, padding: "4px 6px", textAlign: "right", border: "1px solid #000", color: "#000" }}>Sale Rate</th>
                <th style={{ width: 70, padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>Rack</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#000", border: "1px solid #000" }}>No products found</td>
                </tr>
              )}
              {rows.map((p, i) => (
                <tr 
                  key={p._id} 
                  style={{ 
                    background: i === hiIdx ? "#e5f0ff" : "white", 
                    cursor: "pointer",
                    borderBottom: "1px solid #ddd"
                  }}
                  onClick={() => {
                    setHiIdx(i);
                    onSelect(p);
                  }}
                  onDoubleClick={() => onSelect(p)}
                  onMouseEnter={() => setHiIdx(i)}
                >
                  <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>{i + 1}</td>
                  <td style={{ padding: "4px 6px", fontWeight: "500", border: "1px solid #000", color: "#000" }}>{p.code}</td>
                  <td style={{ padding: "4px 6px", border: "1px solid #000", color: "#000" }}>{p._name}</td>
                  <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>{p._meas || "—"}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #000", color: "#000" }}>{formatCurrency(p._rate)}</td>
                  <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #000", color: "#000" }}>{p.rackNo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "4px 10px", borderTop: "1px solid #000", fontSize: "10px", color: "#000", background: "#f5f5f5" }}>
          <span>Enter/↓ = Move to next field</span> &nbsp;|&nbsp;
          <span>↑↓ in table = Navigate products</span> &nbsp;|&nbsp;
          <span>Enter in table = Select</span> &nbsp;|&nbsp;
          <span>Esc = Close</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PRODUCT SEARCH INPUT WITH GHOST TEXT & AUTO-FOCUS
══════════════════════════════════════════════════════════ */
function ProductSearchInput({ allProducts, onSelect, selectedProduct, onClear, onOpenModal }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const parentRef = useRef(null);

  // Auto-focus on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const getFilteredProductsForGhost = (query) => {
    if (!query.trim()) return [];
    const searchLower = query.toLowerCase();
    return allProducts.filter(p => 
      p.description?.toLowerCase().startsWith(searchLower) ||
      p.code?.toLowerCase().startsWith(searchLower)
    ).slice(0, 15);
  };

  useEffect(() => {
    if (!originalQuery.trim()) {
      setFilteredProducts([]);
      setGhost("");
      setShowSuggestions(false);
      return;
    }
    
    const matches = getFilteredProductsForGhost(originalQuery);
    setFilteredProducts(matches);
    setShowSuggestions(matches.length > 0);
    
    if (!isNavigating && matches.length > 0 && matches[0].description) {
      const remaining = matches[0].description.slice(originalQuery.length);
      setGhost(remaining);
    } else {
      setGhost("");
    }
  }, [originalQuery, isNavigating, allProducts]);

  const selectProduct = (product) => {
    onSelect(product);
    setSearchQuery(product.description);
    setOriginalQuery(product.description);
    setFilteredProducts([]);
    setGhost("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
  };

  const handleKeyDown = (e) => {
    // If Enter is pressed and input is empty/open modal immediately
    if (e.key === "Enter" && !searchQuery.trim() && !selectedProduct) {
      e.preventDefault();
      if (onOpenModal) onOpenModal();
      return;
    }

    if (ghost && (e.key === "ArrowRight" || e.key === "Tab") && !isNavigating) {
      e.preventDefault();
      const fullName = originalQuery + ghost;
      setSearchQuery(fullName);
      setOriginalQuery(fullName);
      setGhost("");
      setIsNavigating(false);
      
      const matchedProduct = filteredProducts[0];
      if (matchedProduct) {
        selectProduct(matchedProduct);
      }
      return;
    }
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredProducts.length === 0) {
        if (onOpenModal) onOpenModal();
        return;
      }
      
      setIsNavigating(true);
      setShowSuggestions(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = 0;
      } else {
        newIndex = selectedSuggestionIndex + 1;
        if (newIndex >= filteredProducts.length) {
          newIndex = 0;
        }
      }
      
      setSelectedSuggestionIndex(newIndex);
      
      const selectedProductItem = filteredProducts[newIndex];
      if (selectedProductItem) {
        setSearchQuery(selectedProductItem.description);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredProducts.length === 0) return;
      
      setIsNavigating(true);
      setShowSuggestions(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = filteredProducts.length - 1;
      } else {
        newIndex = selectedSuggestionIndex - 1;
        if (newIndex < 0) {
          newIndex = filteredProducts.length - 1;
        }
      }
      
      setSelectedSuggestionIndex(newIndex);
      
      const selectedProductItem = filteredProducts[newIndex];
      if (selectedProductItem) {
        setSearchQuery(selectedProductItem.description);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (selectedSuggestionIndex >= 0 && filteredProducts[selectedSuggestionIndex]) {
        selectProduct(filteredProducts[selectedSuggestionIndex]);
      } else if (filteredProducts.length > 0 && filteredProducts[0]) {
        selectProduct(filteredProducts[0]);
      } else if (searchQuery.trim()) {
        const exactMatch = allProducts.find(p => 
          p.code?.toLowerCase() === searchQuery.toLowerCase() ||
          p.description?.toLowerCase() === searchQuery.toLowerCase()
        );
        if (exactMatch) {
          selectProduct(exactMatch);
        } else if (onOpenModal) {
          onOpenModal();
        }
      } else if (onOpenModal) {
        onOpenModal();
      }
      return;
    }
    
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchQuery("");
      setOriginalQuery("");
      setGhost("");
      setFilteredProducts([]);
      setSelectedSuggestionIndex(-1);
      setShowSuggestions(false);
      setIsNavigating(false);
      if (selectedProduct) onClear();
      inputRef.current?.blur();
    }
    
    if (e.key === "F2") {
      e.preventDefault();
      if (onOpenModal) onOpenModal();
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setOriginalQuery(newValue);
    if (selectedProduct && newValue !== selectedProduct.description) {
      onClear();
    }
    setSelectedSuggestionIndex(-1);
    setShowSuggestions(true);
    setIsNavigating(false);
  };

  return (
    <div style={{ position: "relative", flex: 1, width: "100%" }} ref={parentRef}>
      <div style={{ 
        position: "relative", 
        width: "100%",
        background: isFocused ? "#fffbe6" : "transparent",
        borderRadius: "4px",
        transition: "background 0.15s ease"
      }}>
        {ghost && !isNavigating && !selectedProduct && originalQuery && (
          <div
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              fontSize: "13px",
              fontFamily: "inherit",
              display: "flex",
              zIndex: 2,
              color: "#a0aec0",
              backgroundColor: "transparent"
            }}
          >
            <span style={{ visibility: "hidden" }}>{originalQuery}</span>
            <span style={{ color: "#a0aec0" }}>{ghost}</span>
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          placeholder="Type product name or code... (Press ↑↓ to navigate, → to accept, Enter/F2 to browse)"
          value={selectedProduct ? (searchQuery || selectedProduct.description) : searchQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (!selectedProduct && originalQuery) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => {
              if (!isNavigating) setShowSuggestions(false);
            }, 200);
          }}
          autoComplete="off"
          spellCheck={false}
          style={{ 
            width: "100%", 
            padding: "8px 10px", 
            border: "2px solid #000000", 
            borderRadius: "4px", 
            fontSize: "13px",
            background: selectedProduct ? "#e8f5e9" : "#fffde7",
            fontWeight: selectedProduct ? "bold" : "normal",
            color: "#000",
            position: "relative",
            zIndex: 1,
            outline: "none"
          }}
        />
      </div>

      {showSuggestions && filteredProducts.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "2px solid #000000",
            borderRadius: "6px",
            maxHeight: 350,
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            marginTop: 4,
          }}
        >
          {filteredProducts.map((product, idx) => (
            <div
              key={product._id}
              onClick={() => selectProduct(product)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white",
                borderBottom: "1px solid #e2e8f0",
                fontSize: 13,
              }}
              onMouseEnter={() => {
                setSelectedSuggestionIndex(idx);
                setIsNavigating(true);
                setSearchQuery(product.description);
                setGhost("");
              }}
              onMouseLeave={() => setIsNavigating(false)}
            >
              <div style={{ fontWeight: "bold", fontSize: 13, color: "#1e293b" }}>
                {product.code} - {product.description}
              </div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                {product.category && <span>📁 {product.category}</span>}
                {product.company && <span> | 🏭 {product.company}</span>}
                {product.rackNo && <span> | 📦 Rack: {product.rackNo}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedProduct && (
        <div style={{ fontSize: "10px", color: "#059669", marginTop: "4px", fontWeight: "bold" }}>
          ✓ Product selected: {selectedProduct.code} - {selectedProduct.description}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TRANSACTION DETAIL MODAL
══════════════════════════════════════════════════════════ */
function TransactionDetailModal({ transaction, onClose }) {
  if (!transaction) return null;

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: 450, maxWidth: "90%", border: "2px solid #000", background: "#fff" }}>
        <div className="xp-modal-tb" style={{ background: "#1a1a1a", padding: "6px 12px", borderBottom: "1px solid #000" }}>
          <span className="xp-modal-title" style={{ color: "white", fontWeight: "bold" }}>Transaction Details</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "white" }}>✕</button>
        </div>
        <div style={{ padding: "12px" }}>
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Type:</span>
              <TransactionBadge type={transaction.type} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Document #:</span>
              <span style={{ color: "#000" }}>{transaction.documentNo}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Date:</span>
              <span style={{ color: "#000" }}>{formatDateTime(transaction.date)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Party:</span>
              <span style={{ color: "#000" }}>{transaction.partyName || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Qty:</span>
              <span style={{ fontWeight: "bold", color: "#000" }}>{formatNumber(transaction.qty)} {transaction.uom}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Rate:</span>
              <span style={{ color: "#000" }}>PKR {formatCurrency(transaction.rate)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "600", color: "#000" }}>Amount:</span>
              <span style={{ fontWeight: "bold", fontSize: "16px", color: transaction.type === "PURCHASE" ? "#10b981" : "#3b82f6" }}>PKR {formatCurrency(transaction.amount)}</span>
            </div>
            {transaction.remarks && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "600", color: "#000" }}>Remarks:</span>
                <span style={{ color: "#000" }}>{transaction.remarks}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "8px 12px", borderTop: "1px solid #000", display: "flex", justifyContent: "flex-end", background: "#f5f5f5" }}>
          <button className="xp-btn" onClick={onClose} style={{ padding: "4px 12px", border: "1px solid #000", background: "#fff", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PRODUCT HISTORY PAGE
══════════════════════════════════════════════════════════ */
export default function ProductHistoryPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [showProductModal, setShowProductModal] = useState(false);
  
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  
  const searchContainerRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!transactions.length) {
      setFilteredTransactions([]);
      return;
    }
    
    let filtered = [...transactions];
    if (fromDate) filtered = filtered.filter(t => t.date >= fromDate);
    if (toDate) filtered = filtered.filter(t => t.date <= toDate);
    if (typeFilter !== "ALL") filtered = filtered.filter(t => t.type === typeFilter);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    setFilteredTransactions(filtered);
  }, [transactions, fromDate, toDate, typeFilter]);

  const fetchProducts = async () => {
    try {
      const response = await api.get(EP.PRODUCTS.GET_ALL);
      if (response.data.success) {
        setAllProducts(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
      showMsg("Failed to load products", "error");
    }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const fetchProductHistory = async (product) => {
    setSelectedProduct(product);
    setLoading(true);
    setTransactions([]);
    setFilteredTransactions([]);
    
    try {
      const [purchasesRes, salesRes] = await Promise.all([
        api.get(EP.PURCHASES.GET_ALL),
        api.get(EP.SALES.GET_ALL)
      ]);
      
      const allTransactions = [];
      
      if (purchasesRes.data.success && purchasesRes.data.data) {
        purchasesRes.data.data.forEach(purchase => {
          (purchase.items || []).forEach(item => {
            if (item.productId === product._id || item.code === product.code) {
              allTransactions.push({
                id: `${purchase._id}_${Date.now()}_${Math.random()}`,
                type: "PURCHASE",
                documentNo: purchase.invoiceNo || purchase.poNo || "PUR-XXX",
                date: purchase.invoiceDate || purchase.poDate || purchase.createdAt,
                partyName: purchase.supplierName || "Supplier",
                qty: item.pcs || item.qty || 0,
                rate: item.rate || 0,
                amount: item.amount || (item.qty * item.rate) || 0,
                uom: item.uom || item.measurement || "pcs",
                remarks: purchase.remarks || "",
              });
            }
          });
        });
      }
      
      if (salesRes.data.success && salesRes.data.data) {
        salesRes.data.data.forEach(sale => {
          (sale.items || []).forEach(item => {
            if (item.productId === product._id || item.code === product.code) {
              allTransactions.push({
                id: `${sale._id}_${Date.now()}_${Math.random()}`,
                type: "SALE",
                documentNo: sale.invoiceNo || sale.saleNo || "SAL-XXX",
                date: sale.invoiceDate || sale.saleDate || sale.createdAt,
                partyName: sale.customerName || "Customer",
                qty: item.pcs || item.qty || 0,
                rate: item.rate || 0,
                amount: item.amount || (item.qty * item.rate) || 0,
                uom: item.uom || item.measurement || "pcs",
                remarks: sale.remarks || "",
              });
            }
          });
        });
      }
      
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
      
      if (allTransactions.length === 0) {
        showMsg(`No transaction history found for ${product.code} - ${product.description}`, "info");
      } else {
        showMsg(`Found ${allTransactions.length} transaction(s) for ${product.code} - ${product.description}`, "success");
      }
    } catch (error) {
      console.error("Failed to fetch transaction history:", error);
      showMsg("Failed to load transaction history", "error");
    }
    setLoading(false);
  };

  const handleProductSelect = (product) => {
    setShowProductModal(false);
    fetchProductHistory(product);
  };

  const handleProductClear = () => {
    setSelectedProduct(null);
    setTransactions([]);
    setFilteredTransactions([]);
    setFromDate("");
    setToDate("");
    setTypeFilter("ALL");
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setTypeFilter("ALL");
  };

  const openProductModal = () => {
    setShowProductModal(true);
  };

  const getSummaryStats = () => {
    const totalPurchases = filteredTransactions.filter(t => t.type === "PURCHASE").reduce((sum, t) => sum + t.qty, 0);
    const totalSales = filteredTransactions.filter(t => t.type === "SALE").reduce((sum, t) => sum + t.qty, 0);
    const totalPurchaseAmount = filteredTransactions.filter(t => t.type === "PURCHASE").reduce((sum, t) => sum + t.amount, 0);
    const totalSaleAmount = filteredTransactions.filter(t => t.type === "SALE").reduce((sum, t) => sum + t.amount, 0);
    const currentStock = totalPurchases - totalSales;
    return { totalPurchases, totalSales, totalPurchaseAmount, totalSaleAmount, currentStock };
  };

  const stats = getSummaryStats();

  return (
    <div className="sl-page" style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1a1a1a", borderBottom: "2px solid #000" }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
        </svg>
        <span className="xp-tb-title" style={{ color: "white", fontWeight: "bold" }}>Product Transaction History — Complete Audit Trail</span>
        <div className="xp-tb-actions">
          <div className="sl-shortcut-hints" style={{ color: "white" }}>
            <span>↑↓ Navigate</span>
            <span>→ Accept</span>
            <span>Enter/F2 Browse</span>
            <span>Esc Clear</span>
          </div>
          <button className="xp-cap-btn" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>─</button>
          <button className="xp-cap-btn" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>□</button>
          <button className="xp-cap-btn xp-cap-close" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>✕</button>
        </div>
      </div>

      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : msg.type === "info" ? "xp-alert-info" : "xp-alert-error"}`} style={{ margin: "6px 10px", border: "1px solid #000" }}>
          {msg.text}
        </div>
      )}

      <div style={{ padding: "10px" }}>
        
        {/* Product Selection */}
        <div style={{ background: "white", padding: "10px", marginBottom: "10px", border: "2px solid #000" }} ref={searchContainerRef}>
          <label style={{ fontSize: "11px", fontWeight: "600", marginBottom: "4px", display: "block", color: "#000" }}>
            🔍 Search Product <span style={{ fontSize: "10px", fontWeight: "normal" }}>(Type to search, ↑↓ to navigate, → to accept, Enter/F2 to browse)</span>
          </label>
          <ProductSearchInput
            allProducts={allProducts}
            onSelect={handleProductSelect}
            selectedProduct={selectedProduct}
            onClear={handleProductClear}
            onOpenModal={openProductModal}
          />
        </div>

        {/* Statistics */}
        {selectedProduct && transactions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "10px" }}>
            <div style={{ background: "#f0fdf4", padding: "6px 8px", borderLeft: "3px solid #10b981", border: "1px solid #10b981" }}>
              <div style={{ fontSize: "10px", color: "#065f46" }}>Total Purchased</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#065f46" }}>{formatNumber(stats.totalPurchases)}</div>
            </div>
            <div style={{ background: "#eff6ff", padding: "6px 8px", borderLeft: "3px solid #3b82f6", border: "1px solid #3b82f6" }}>
              <div style={{ fontSize: "10px", color: "#1e40af" }}>Total Sold</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1e40af" }}>{formatNumber(stats.totalSales)}</div>
            </div>
            <div style={{ background: "#fffbeb", padding: "6px 8px", borderLeft: "3px solid #f59e0b", border: "1px solid #f59e0b" }}>
              <div style={{ fontSize: "10px", color: "#92400e" }}>Current Stock</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#92400e" }}>{formatNumber(stats.currentStock)}</div>
            </div>
            <div style={{ background: "#f5f3ff", padding: "6px 8px", borderLeft: "3px solid #8b5cf6", border: "1px solid #8b5cf6" }}>
              <div style={{ fontSize: "10px", color: "#5b21b6" }}>Purchase Value</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#5b21b6" }}>PKR {formatCurrency(stats.totalPurchaseAmount)}</div>
            </div>
            <div style={{ background: "#fce7f3", padding: "6px 8px", borderLeft: "3px solid #ec4898", border: "1px solid #ec4898" }}>
              <div style={{ fontSize: "10px", color: "#9d174d" }}>Sale Value</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#9d174d" }}>PKR {formatCurrency(stats.totalSaleAmount)}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {selectedProduct && transactions.length > 0 && (
          <div style={{ background: "white", padding: "8px 10px", marginBottom: "10px", border: "1px solid #000", display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "600", display: "block", marginBottom: "2px", color: "#000" }}>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: "4px 6px", border: "1px solid #000", fontSize: "11px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "600", display: "block", marginBottom: "2px", color: "#000" }}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: "4px 6px", border: "1px solid #000", fontSize: "11px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "600", display: "block", marginBottom: "2px", color: "#000" }}>Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: "4px 6px", border: "1px solid #000", fontSize: "11px", background: "white" }}>
                <option value="ALL">All</option>
                <option value="PURCHASE">Purchase</option>
                <option value="SALE">Sale</option>
              </select>
            </div>
            <button onClick={clearFilters} style={{ padding: "4px 10px", background: "#f5f5f5", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>Clear</button>
            <div style={{ fontSize: "11px", color: "#000", marginLeft: "auto" }}>
              {filteredTransactions.length} / {transactions.length}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {selectedProduct ? (
          <div style={{ background: "white", overflow: "hidden", border: "1px solid #000" }}>
            <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 380px)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "2px solid #000" }}>
                  <tr>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: 40, border: "1px solid #000", color: "#000" }}>#</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: 90, border: "1px solid #000", color: "#000" }}>Type</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: 100, border: "1px solid #000", color: "#000" }}>Doc #</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: 90, border: "1px solid #000", color: "#000" }}>Date</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", minWidth: 130, border: "1px solid #000", color: "#000" }}>Party</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 70, border: "1px solid #000", color: "#000" }}>Qty</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 80, border: "1px solid #000", color: "#000" }}>Rate</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 100, border: "1px solid #000", color: "#000" }}>Amount</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: 60, border: "1px solid #000", color: "#000" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#000", border: "1px solid #000" }}>Loading...</td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#000", border: "1px solid #000" }}>No transactions found</td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction, idx) => (
                      <tr key={transaction.id} style={{ borderBottom: "1px solid #000" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"} 
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #000", color: "#000" }}>{idx + 1}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #000" }}><TransactionBadge type={transaction.type} /></td>
                        <td style={{ padding: "6px 8px", fontWeight: "500", border: "1px solid #000", color: "#000" }}>{transaction.documentNo}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #000", color: "#000" }}>{formatDate(transaction.date)}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #000", color: "#000" }}>{transaction.partyName}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "500", border: "1px solid #000", color: "#000" }}>{formatNumber(transaction.qty)} {transaction.uom}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>{formatCurrency(transaction.rate)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", border: "1px solid #000", color: transaction.type === "PURCHASE" ? "#10b981" : "#3b82f6" }}>{formatCurrency(transaction.amount)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #000" }}>
                          <button onClick={() => setSelectedTransaction(transaction)} style={{ padding: "2px 8px", background: transaction.type === "PURCHASE" ? "#10b981" : "#3b82f6", color: "white", border: "1px solid #000", cursor: "pointer", fontSize: "10px" }}>View</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredTransactions.length > 0 && (
                  <tfoot style={{ background: "#f5f5f5", fontWeight: "bold", borderTop: "2px solid #000" }}>
                    <tr>
                      <td colSpan="5" style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>Totals:</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>{formatNumber(filteredTransactions.reduce((s, t) => s + t.qty, 0))}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>—</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #000", color: "#000" }}>PKR {formatCurrency(filteredTransactions.reduce((s, t) => s + t.amount, 0))}</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #000" }}> </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        ) : (
          <div style={{ background: "white", padding: "40px", textAlign: "center", border: "2px solid #000" }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1" style={{ marginBottom: "10px" }}>
              <path d="M20 7h-4.18A3 3 0 0 0 16 5.18V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              <path d="M16 5v4h4" />
              <path d="M12 11v6" />
              <path d="M9 14h6" />
            </svg>
            <h3 style={{ fontSize: "14px", marginBottom: "4px", color: "#000" }}>No Product Selected</h3>
            <p style={{ fontSize: "11px", color: "#000" }}>Start typing product name or code in the search box above</p>
            <p style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>
              <kbd style={{ background: "#f5f5f5", padding: "2px 5px", border: "1px solid #000" }}>↑↓</kbd> Navigate suggestions &nbsp;|&nbsp;
              <kbd style={{ background: "#f5f5f5", padding: "2px 5px", border: "1px solid #000" }}>→</kbd> Accept suggestion &nbsp;|&nbsp;
              <kbd style={{ background: "#f5f5f5", padding: "2px 5px", border: "1px solid #000" }}>Enter/F2</kbd> Open product list
            </p>
          </div>
        )}
      </div>
      
      {showProductModal && (
        <ProductSearchModal
          allProducts={allProducts}
          onSelect={handleProductSelect}
          onClose={() => setShowProductModal(false)}
        />
      )}
      
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}