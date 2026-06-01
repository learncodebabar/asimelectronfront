// BarcodePrint.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import JsBarcode from 'jsbarcode';
import html2pdf from 'html2pdf.js';

// ============================================================
// PRODUCT SEARCH MODAL - EXACT COPY FROM ProductHistoryPage
// ============================================================
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
    
    if (e.key === "ArrowUp" && focusedField === "table") {
      e.preventDefault();
      setHiIdx((i) => Math.max(i - 1, 0));
    }
    
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
    else if (e.key === "Tab" || (e.key === "ArrowUp" && hiIdx === 0 && focusedField === "table")) {
      e.preventDefault();
      rCompany.current?.focus();
      setFocusedField("company");
    }
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-PK");
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

// ============================================================
// BARCODE PRINT PREVIEW WITH ADJUSTABLE FONT SIZE
// ============================================================
const BarcodePrint = ({ product, quantity, showPrice, showTitle, fontSize, onClose }) => {
  const printRef = useRef(null);

  const getSaleRate = () => {
    return product.packingInfo?.[0]?.saleRate || product.saleRate || 0;
  };

  const generatePDF = useCallback(async () => {
    if (!printRef.current) return;
    const element = printRef.current;
    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2],
      filename: `barcodes_${product.code}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    await html2pdf().set(opt).from(element).save();
    onClose();
  }, [product, onClose]);

  useEffect(() => {
    const canvasElements = printRef.current?.querySelectorAll('.barcode-canvas');
    canvasElements?.forEach(canvas => {
      const code = canvas.getAttribute('data-code');
      if (code) {
        try {
          JsBarcode(canvas, code, {
            format: 'CODE128',
            width: 1.5,
            height: 35,
            displayValue: false,
            margin: 0
          });
        } catch (err) {
          console.error('Barcode error:', err);
        }
      }
    });
  }, [product, quantity]);

  const barcodeValue = product.code || String(product.productId).padStart(5, '0');
  const barcodes = Array(quantity).fill(barcodeValue);
  const saleRate = getSaleRate();

  // Calculate font sizes based on slider value (range 6-14px)
  const nameFontSize = Math.max(6, Math.min(14, fontSize - 2));
  const priceFontSize = Math.max(7, Math.min(16, fontSize));
  const codeFontSize = Math.max(5, Math.min(10, fontSize - 3));
  const titleFontSize = Math.max(6, Math.min(12, fontSize - 2));

  return (
    <div className="xp-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: "85%", maxWidth: "750px", maxHeight: "85vh", display: "flex", flexDirection: "column", border: "2px solid #000", background: "#fff" }}>
        <div className="xp-modal-tb" style={{ background: "#1a1a1a", padding: "6px 12px", borderBottom: "1px solid #000" }}>
          <span className="xp-modal-title" style={{ color: "white", fontWeight: "bold" }}>Barcode Preview — {product.code} ({quantity} labels)</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "white" }}>✕</button>
        </div>
        
        <div className="barcode-preview-scroll" style={{ padding: "16px", background: "#f5f5f5", flex: 1, overflow: "auto" }}>
          <div ref={printRef} className="barcode-print-area" style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-start", background: "white", padding: "12px" }}>
            {barcodes.map((code, idx) => (
              <div key={idx} className="barcode-card" style={{ width: "160px", background: "white", border: "1px solid #ddd", padding: "6px", borderRadius: "4px", pageBreakInside: "avoid" }}>
                {showTitle && <div className="barcode-title" style={{ fontSize: `${titleFontSize}px`, fontWeight: "bold", textAlign: "center", marginBottom: "4px", color: "#1a1a2e" }}>DGS</div>}
                
                <div className="barcode-content" style={{ display: "flex", alignItems: "stretch", gap: "4px" }}>
                  <div className="barcode-left" style={{ flex: 1 }}>
                    <div className="barcode-product-name" style={{ fontSize: `${nameFontSize}px`, fontWeight: 600, color: "#333", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.description || product.code}</div>
                    <canvas className="barcode-canvas" data-code={code} style={{ margin: 0, display: "block", width: "100%", height: "auto" }}></canvas>
                    <div className="barcode-code" style={{ fontSize: `${codeFontSize}px`, fontFamily: "monospace", color: "#888", textAlign: "center", marginTop: "2px" }}>{code}</div>
                  </div>
                  {showPrice && (
                    <div className="barcode-price-vertical" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", background: "#fafafa", borderLeft: "1px solid #eee" }}>
                      <span className="price-rotated" style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", fontSize: `${priceFontSize}px`, fontWeight: "bold", color: "#e65100", whiteSpace: "nowrap" }}>₨{saleRate}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="modal-footer" style={{ padding: "8px 12px", borderTop: "1px solid #000", display: "flex", justifyContent: "flex-end", gap: "12px", background: "#f5f5f5" }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "4px 16px", background: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
          <button onClick={generatePDF} className="btn-primary" style={{ padding: "4px 16px", background: "#1a1a2e", color: "white", border: "1px solid #000", cursor: "pointer", fontSize: "12px" }}>Download PDF</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN BARCODE PRINT PAGE
// ============================================================
export default function BarcodePrintPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPriceOnBarcode, setShowPriceOnBarcode] = useState(true);
  const [showTitleOnBarcode, setShowTitleOnBarcode] = useState(false);
  const [barcodeFontSize, setBarcodeFontSize] = useState(9);
  
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!loading && allProducts.length > 0) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    }
  }, [loading, allProducts]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.PRODUCTS.GET_ALL);
      if (data.success) {
        setAllProducts(data.data || []);
        if ((data.data || []).length === 0) {
          showMessage('No products found', 'error');
        }
      } else {
        showMessage(data.message || 'Failed to load products', 'error');
      }
    } catch (error) {
      showMessage(`Error: ${error.response?.data?.message || error.message || 'Network error'}`, 'error');
    }
    setLoading(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(false);
    setQuantity(1);
    showMessage(`Selected: ${product.code} - ${product.description}`, 'success');
  };

  const handlePrintBarcodes = () => {
    if (!selectedProduct) {
      showMessage('Please select a product first', 'error');
      return;
    }
    if (quantity < 1 || quantity > 500) {
      showMessage('Quantity must be between 1 and 500', 'error');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleQuantityChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 1;
    val = Math.min(500, Math.max(1, val));
    setQuantity(val);
  };

  const clearSelection = () => {
    setSelectedProduct(null);
    setQuantity(1);
    showMessage('Selection cleared', 'info');
    searchInputRef.current?.focus();
  };

  const openProductModal = () => {
    setShowProductModal(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openProductModal();
    }
  };

  const getSaleRateDisplay = () => {
    if (!selectedProduct) return '—';
    return selectedProduct.packingInfo?.[0]?.saleRate || selectedProduct.saleRate || 0;
  };

  const getMeasurement = () => {
    if (!selectedProduct) return '—';
    return selectedProduct.packingInfo?.[0]?.measurement || 'PC';
  };

  // Loading state
  if (loading) {
    return (
      <div className="sl-page" style={{ background: "#fff", minHeight: "100vh" }}>
        <div className="xp-titlebar" style={{ background: "#1a1a1a", borderBottom: "2px solid #000" }}>
          <span className="xp-tb-title" style={{ color: "white", fontWeight: "bold" }}>Barcode Print System — DGS Store</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666" }}>Loading products...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sl-page" style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1a1a1a", borderBottom: "2px solid #000" }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4" />
        </svg>
        <span className="xp-tb-title" style={{ color: "white", fontWeight: "bold" }}>Barcode Print System — DGS Store</span>
        <div className="xp-tb-actions">
          <div className="sl-shortcut-hints" style={{ color: "white" }}>
            <span>Enter/F2 Browse</span>
            <span>Esc Clear</span>
          </div>
          <button className="xp-cap-btn" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>─</button>
          <button className="xp-cap-btn" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>□</button>
          <button className="xp-cap-btn xp-cap-close" style={{ color: "white", background: "transparent", border: "1px solid #fff" }}>✕</button>
        </div>
      </div>

      {message && (
        <div className={`xp-alert ${message.type === "success" ? "xp-alert-success" : message.type === "info" ? "xp-alert-info" : "xp-alert-error"}`} style={{ margin: "6px 10px", border: "1px solid #000" }}>
          {message.text}
        </div>
      )}

      <div style={{ padding: "20px", maxWidth: "650px", margin: "0 auto" }}>
        
        {/* Product Selection - Full Input */}
        <div style={{ background: "white", padding: "16px", marginBottom: "16px", border: "2px solid #000" }}>
          <label style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", display: "block", color: "#000" }}>
            🔍 Select Product <span style={{ fontSize: "10px", fontWeight: "normal" }}>(Press Enter to browse)</span>
          </label>
          
          <input
            ref={searchInputRef}
            type="text"
            className="xp-input"
            placeholder="Press Enter to search product"
            value={selectedProduct ? `${selectedProduct.code} - ${selectedProduct.description}` : ""}
            onKeyDown={handleKeyDown}
            readOnly
            style={{ 
              width: "100%", 
              padding: "12px 14px", 
              border: "2px solid #000", 
              fontSize: "13px",
              background: selectedProduct ? "#e8f5e9" : "#fff",
              cursor: "pointer",
              borderRadius: "4px"
            }}
          />
          
          <div style={{ fontSize: "11px", color: "#666", marginTop: "8px" }}>
            Press <kbd style={{ background: "#f5f5f5", padding: "2px 6px", border: "1px solid #000", borderRadius: "3px", fontWeight: "bold" }}>Enter</kbd> to open product browser
          </div>
        </div>

        {/* Selected Product Info */}
        {selectedProduct && (
          <div style={{ background: "white", padding: "14px 16px", marginBottom: "16px", border: "1px solid #000", borderLeft: "4px solid #10b981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ background: "#f0f0f0", padding: "3px 10px", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold" }}>{selectedProduct.code}</span>
              <button onClick={clearSelection} style={{ background: "none", border: "1px solid #ddd", padding: "3px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>Change</button>
            </div>
            <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "10px" }}>{selectedProduct.description}</div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "11px", color: "#666" }}>
              <span>🏭 {selectedProduct.company || '—'}</span>
              <span>📁 {selectedProduct.category || '—'}</span>
              <span>📦 Rack: {selectedProduct.rackNo || '—'}</span>
              <span style={{ color: "#e65100", fontWeight: "bold" }}>💰 ₨{getSaleRateDisplay()}/{getMeasurement()}</span>
            </div>
          </div>
        )}

        {/* Barcode Options */}
        <div style={{ background: "white", padding: "14px 16px", marginBottom: "16px", border: "1px solid #000" }}>
          <label style={{ fontSize: "12px", fontWeight: "600", marginBottom: "10px", display: "block", color: "#000" }}>⚙️ Barcode Options</label>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
              <input type="checkbox" checked={showPriceOnBarcode} onChange={(e) => setShowPriceOnBarcode(e.target.checked)} />
              <span>Show Price on Label</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
              <input type="checkbox" checked={showTitleOnBarcode} onChange={(e) => setShowTitleOnBarcode(e.target.checked)} />
              <span>Show Store Title (DGS)</span>
            </label>
          </div>
          
          {/* Font Size Slider */}
          <div style={{ borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", display: "block", color: "#555" }}>
              🔤 Barcode Text Size: <span style={{ color: "#e65100" }}>{barcodeFontSize}px</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "10px", color: "#888" }}>A-</span>
              <input
                type="range"
                min="6"
                max="14"
                step="0.5"
                value={barcodeFontSize}
                onChange={(e) => setBarcodeFontSize(parseFloat(e.target.value))}
                disabled={!selectedProduct}
                style={{ flex: 1, height: "4px", borderRadius: "2px" }}
              />
              <span style={{ fontSize: "12px", color: "#888" }}>A+</span>
              <button 
                onClick={() => setBarcodeFontSize(9)} 
                disabled={!selectedProduct}
                style={{ background: "#f0f0f0", border: "1px solid #ddd", padding: "2px 8px", borderRadius: "3px", cursor: "pointer", fontSize: "10px" }}
              >
                Reset
              </button>
            </div>
            <div style={{ fontSize: "9px", color: "#999", marginTop: "6px" }}>
              Preview: <span style={{ fontSize: `${barcodeFontSize}px`, fontWeight: "bold", color: "#e65100" }}>₨{getSaleRateDisplay()}</span>
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div style={{ background: "white", padding: "14px 16px", marginBottom: "16px", border: "1px solid #000" }}>
          <label style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block", color: "#000" }}>🔢 Number of Barcode Prints</label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 10))} disabled={!selectedProduct} style={{ width: "38px", height: "36px", background: "#f5f5f5", border: "1px solid #ddd", cursor: "pointer", borderRadius: "4px", fontSize: "12px" }}>-10</button>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={!selectedProduct} style={{ width: "38px", height: "36px", background: "#f5f5f5", border: "1px solid #ddd", cursor: "pointer", borderRadius: "4px", fontSize: "14px" }}>-</button>
            <input type="number" min="1" max="500" value={quantity} onChange={handleQuantityChange} disabled={!selectedProduct} style={{ width: "85px", height: "36px", textAlign: "center", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }} />
            <button onClick={() => setQuantity(Math.min(500, quantity + 1))} disabled={!selectedProduct} style={{ width: "38px", height: "36px", background: "#f5f5f5", border: "1px solid #ddd", cursor: "pointer", borderRadius: "4px", fontSize: "14px" }}>+</button>
            <button onClick={() => setQuantity(Math.min(500, quantity + 10))} disabled={!selectedProduct} style={{ width: "38px", height: "36px", background: "#f5f5f5", border: "1px solid #ddd", cursor: "pointer", borderRadius: "4px", fontSize: "12px" }}>+10</button>
            <span style={{ fontSize: "10px", color: "#666" }}>(1-500 labels)</span>
          </div>
        </div>

        {/* Print Button */}
        <button 
          onClick={handlePrintBarcodes} 
          disabled={!selectedProduct}
          style={{ 
            width: "100%", 
            background: "#1a1a2e", 
            color: "white", 
            border: "1px solid #000", 
            padding: "14px", 
            fontSize: "14px", 
            fontWeight: "bold", 
            borderRadius: "4px", 
            cursor: "pointer",
            opacity: !selectedProduct ? 0.5 : 1,
            marginBottom: "16px",
            transition: "0.2s"
          }}
        >
          🖨️ Generate & Print Barcodes ({quantity} labels)
        </button>

        {/* Info Panel */}
        <div style={{ background: "#f8f9fa", padding: "12px 16px", borderRadius: "4px", border: "1px solid #ddd" }}>
          <div style={{ fontSize: "11px", color: "#666", display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginBottom: "8px" }}>
            <span>⏎ <kbd style={{ background: "#fff", padding: "2px 6px", border: "1px solid #ddd", borderRadius: "3px", fontWeight: "bold" }}>Enter</kbd> - Select product</span>
            <span>⎋ <kbd style={{ background: "#fff", padding: "2px 6px", border: "1px solid #ddd", borderRadius: "3px", fontWeight: "bold" }}>Esc</kbd> - Clear selection</span>
            <span>↑↓ - Navigate in modal</span>
          </div>
          <div style={{ fontSize: "10px", color: "#999", textAlign: "center" }}>
            Barcode format: Product code (CODE128) • Adjust text size with slider • PDF ready for printing
          </div>
        </div>
      </div>

      {/* Product Search Modal */}
      {showProductModal && (
        <ProductSearchModal
          allProducts={allProducts}
          onSelect={handleSelectProduct}
          onClose={() => setShowProductModal(false)}
        />
      )}

      {/* Barcode Print Preview */}
      {showPrintPreview && selectedProduct && (
        <BarcodePrint
          product={selectedProduct}
          quantity={quantity}
          showPrice={showPriceOnBarcode}
          showTitle={showTitleOnBarcode}
          fontSize={barcodeFontSize}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}