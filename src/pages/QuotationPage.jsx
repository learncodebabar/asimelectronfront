// pages/QuotationPage.jsx - Updated with Next/Prev navigation and sequential numbers
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/SalePage.css";

/* ── helpers ── */
const timeNow = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
const isoDate = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const QUOTATION_HOLD_KEY = "asim_quotation_holds_v1";
const QUOTATIONS_STORAGE_KEY = "asim_quotations_v1";

const EMPTY_ROW = {
  productId: "",
  code: "",
  name: "",
  uom: "",
  rack: "",
  pcs: 1,
  rate: 0,
  amount: 0,
};

const SHOP_INFO = {
  name: "عاصم الیکٹرک اینڈ الیکٹرونکس سٹور",
  nameEn: "Asim Electric & Electronic Store",
  address: "مین بازار نہاری ٹاؤن نزد بجلی گھر سٹاپ گوجرانوالہ روڈ فیصل آباد",
  phone1: "Faqir Hussain 0300 7262129",
  phone2: "PTCL 041 8711575",
  phone3: "Shop 0315 7262129",
  urduBanner:
    "یہاں پر چانک فراڈ کی وارپس، جانچ فلک، وارنگ سیلز اور ریکارڈ کے تمام اخیری ہول سیل ریٹ پر دستیاب ہے۔",
  urduTerms:
    "یہ کوٹیشن 7 دن کے لیے موثر ہے۔\nقیمتوں میں تبدیلی ہو سکتی ہے۔\nآرڈر کی تصدیق کے لیے پیشگی ادائیگی درکار ہوگی۔",
  devBy:
    "Software developed by: Creative Babar / 03098325271 or visit website www.digitalglobalschool.com",
};

// Helper function to extract just the number from Quotation ID
const extractQuoteNumber = (quoteNo) => {
  if (!quoteNo) return "";
  // Remove "QTN-" prefix if present
  if (quoteNo.includes('QTN-')) {
    return quoteNo.split('QTN-')[1];
  }
  // Remove leading zeros
  const num = parseInt(quoteNo);
  return isNaN(num) ? quoteNo : String(num);
};

// Helper function to build full Quotation ID from number (without leading zeros)
const buildFullQuoteId = (number) => {
  if (!number || number === "") return "QTN-1";
  // Remove any leading zeros from the number
  const cleanNumber = String(parseInt(number));
  return `QTN-${cleanNumber}`;
};

// Function to get next available quotation number from records
const getNextAvailableNumber = (records) => {
  if (!records || records.length === 0) return 1;
  
  const numbers = records.map(r => {
    const numStr = r.quoteNo?.toString() || "";
    if (numStr.includes('QTN-')) {
      return parseInt(numStr.split('QTN-')[1]) || 0;
    }
    return parseInt(numStr) || 0;
  }).filter(n => n > 0);
  
  if (numbers.length === 0) return 1;
  
  const maxNum = Math.max(...numbers);
  let nextNum = maxNum + 1;
  
  // Ensure we don't reuse any existing number
  while (numbers.includes(nextNum)) {
    nextNum++;
  }
  
  return nextNum;
};

/* ── localStorage helpers for saved quotations ── */
const loadSavedQuotations = () => {
  try {
    return JSON.parse(localStorage.getItem(QUOTATIONS_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveQuotationToStorage = (quotation) => {
  try {
    const existing = loadSavedQuotations();
    existing.push({ ...quotation, savedAt: new Date().toISOString() });
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
};

const loadQuotationHolds = () => {
  try {
    return JSON.parse(localStorage.getItem(QUOTATION_HOLD_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveQuotationHolds = (quotes) => {
  try {
    localStorage.setItem(QUOTATION_HOLD_KEY, JSON.stringify(quotes));
  } catch {}
};

/* ══════════════════════════════════════════════════════════
   PRINT HTML BUILDER — Quotation with Quantity and Price
══════════════════════════════════════════════════════════ */

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
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        width: 80mm;
        margin: 0 auto;
        padding: 3mm;
      }
      .header {
        text-align: center;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid #000;
      }
      .title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        margin: 5px 0;
        font-size: 10px;
      }
      .divider {
        border-top: 1px dashed #999;
        margin: 5px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 5px 0;
      }
      th {
        background: #f5f5f5;
        padding: 5px 3px;
        text-align: left;
        font-size: 10px;
        border-bottom: 1px solid #000;
      }
      th.r {
        text-align: right;
      }
      th.c {
        text-align: center;
      }
      .totals {
        margin-top: 10px;
        padding-top: 5px;
        border-top: 1px solid #000;
        text-align: right;
      }
      .totals-row {
        margin: 3px 0;
      }
      .totals-row.bold {
        font-weight: bold;
        font-size: 12px;
        margin-top: 5px;
      }
      .footer {
        text-align: center;
        font-size: 8px;
        color: #999;
        margin-top: 15px;
        padding-top: 5px;
        border-top: 1px dashed #ccc;
      }
      @media print {
        @page {
          size: 80mm auto;
          margin: 2mm;
        }
        body {
          width: 76mm;
        }
      }
    </style>
  </head>
  <body>

    <div class="header">
      <div class="title">QUOTATION</div>
    </div>

    <div class="meta-row">
      <span><b>Quote No:</b> ${extractQuoteNumber(quotation.quoteNo)}</span>
      <span><b>Date:</b> ${quotation.quoteDate}</span>
    </div>
    <div class="meta-row">
      <span><b>Customer:</b> ${customerName}</span>
      ${customerPhone ? `<span><b>Phone:</b> ${customerPhone}</span>` : ""}
    </div>
    
    <div class="divider"></div>

    <table>
      <thead>
        <tr>
          <th style="width:25px;text-align:center">#</th>
          <th style="width:60px">Code</th>
          <th>Description</th>
          <th style="width:35px;text-align:center">UOM</th>
          <th style="width:40px;text-align:center">Qty</th>
          <th style="width:55px;text-align:right">Rate</th>
          <th style="width:65px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Total Items: ${rows.length} | Total Quantity: ${totalQty}</span>
      </div>
      <div class="totals-row bold">
        <span>GRAND TOTAL: PKR ${totalAmount.toLocaleString("en-PK")}</span>
      </div>
    </div>

    <div class="footer">
      Thank you for your business
    </div>

  </body>
  </html>`;
};

const doPrint = (quotation, overrides = {}) => {
  const w = window.open("", "_blank", "width=650,height=800");
  w.document.write(buildQuotationPrintHtml(quotation, overrides));
  w.document.close();
  setTimeout(() => w.print(), 400);
};

/* ══════════════════════════════════════════════════════════
   CUSTOMER INFO MODAL - Focus flow: Name → Phone → Save
══════════════════════════════════════════════════════════ */
function CustomerInfoModal({
  onConfirm,
  onClose,
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [validDays, setValidDays] = useState(7);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      phoneRef.current?.focus();
    }
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  const handleConfirm = () => {
    const finalName = customerName.trim() || "GUEST CUSTOMER";
    onConfirm({
      customerName: finalName,
      customerPhone: customerPhone.trim(),
      validDays,
    });
  };

  return (
    <div className="scm-overlay">
      <div className="scm-window" style={{ maxWidth: 450 }}>
        <div className="scm-tb" style={{ background: "#2c5f2d" }}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="rgba(255,255,255,0.85)"
          >
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
          </svg>
          <span className="scm-tb-title">Customer Information</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="xp-label" style={{ fontWeight: 600, fontSize: 13 }}>
              Customer Name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              className="xp-input"
              style={{ fontSize: 15, padding: "10px 14px", borderRadius: 6 }}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              onKeyDown={handleNameKeyDown}
              autoFocus
            />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Press Enter to go to phone number
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="xp-label" style={{ fontWeight: 600, fontSize: 13 }}>
              Phone Number <span style={{ color: "#9ca3af", fontSize: 11 }}>(Optional)</span>
            </label>
            <input
              ref={phoneRef}
              type="text"
              className="xp-input"
              style={{ fontSize: 15, padding: "10px 14px", borderRadius: 6 }}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Enter phone number (optional)"
              onKeyDown={handlePhoneKeyDown}
            />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Press Enter to save and print quotation
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="xp-label" style={{ fontWeight: 600, fontSize: 13 }}>
              Quotation Valid For
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="number"
                className="xp-input"
                style={{ width: 90, fontSize: 15, padding: "10px 14px", textAlign: "center", borderRadius: 6 }}
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 7)}
                min={1}
                max={90}
              />
              <span style={{ fontSize: 14 }}>days</span>
            </div>
          </div>
        </div>

        <div className="scm-sep" />

        <div className="scm-actions">
          <button
            className="xp-btn"
            style={{ minWidth: 120, padding: "8px 16px" }}
            onClick={onClose}
          >
            Cancel (Esc)
          </button>
          <button
            className="xp-btn xp-btn-primary"
            style={{ 
              minWidth: 160, 
              background: "#2c5f2d", 
              borderColor: "#1e4620",
              padding: "8px 16px"
            }}
            onClick={handleConfirm}
          >
            Save & Print Quotation
          </button>
        </div>
        <div className="scm-hint">
          ⏎ Enter to navigate • Esc to cancel
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PRODUCT SEARCH MODAL
══════════════════════════════════════════════════════════ */
function SearchModal({ allProducts, onSelect, onClose }) {
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [company, setCompany] = useState("");
  const [rows, setRows] = useState([]);
  const [hiIdx, setHiIdx] = useState(0);
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
        (!ld ||
          p.description?.toLowerCase().includes(ld) ||
          p.code?.toLowerCase().includes(ld)) &&
        (!lc || p.category?.toLowerCase().includes(lc)) &&
        (!lo || p.company?.toLowerCase().includes(lo));
      if (!ok) return;
      const _name = [p.category, p.description, p.company]
        .filter(Boolean)
        .join(" ");
      if (p.packingInfo?.length > 0)
        p.packingInfo.forEach((pk, i) =>
          res.push({
            ...p,
            _pi: i,
            _meas: pk.measurement,
            _rate: pk.saleRate,
            _pack: pk.packing,
            _stock: pk.openingQty || 0,
            _name,
          }),
        );
      else
        res.push({
          ...p,
          _pi: 0,
          _meas: "",
          _rate: 0,
          _pack: 1,
          _stock: 0,
          _name,
        });
    });
    return res;
  }, []);

  useEffect(() => {
    rDesc.current?.focus();
    setRows(buildFlat(allProducts, "", "", ""));
  }, [allProducts, buildFlat]);

  useEffect(() => {
    const f = buildFlat(allProducts, desc, cat, company);
    setRows(f);
    setHiIdx(f.length > 0 ? 0 : -1);
  }, [desc, cat, company, allProducts, buildFlat]);

  useEffect(() => {
    if (tbodyRef.current && hiIdx >= 0)
      tbodyRef.current.children[hiIdx]?.scrollIntoView({ block: "nearest" });
  }, [hiIdx]);

  const fk = (e, nr) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      nr
        ? nr.current?.focus()
        : (tbodyRef.current?.focus(), setHiIdx((h) => Math.max(0, h)));
    }
  };
  const tk = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHiIdx((i) => Math.min(i + 1, rows.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHiIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (hiIdx >= 0 && rows[hiIdx]) onSelect(rows[hiIdx]);
    }
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") {
      e.preventDefault();
      rDesc.current?.focus();
    }
  };

  return (
    <div
      className="xp-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 2000 }}
    >
      <div className="xp-modal" style={{ 
        width: "95%", 
        maxWidth: "1400px", 
        height: "85vh",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px",
        background: "#ffffff",
        border: "2px solid #2c5f2d"
      }}>
        <div className="xp-modal-tb" style={{ 
          background: "#2c5f2d", 
          padding: "10px 16px",
          borderRadius: "10px 10px 0 0"
        }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="rgba(255,255,255,0.9)"
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>Search Products</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        
        <div className="cs-modal-filters" style={{ 
          padding: "8px 12px", 
          gap: "10px", 
          background: "#f8fafc",
          borderBottom: "1px solid #2c5f2d",
          flexWrap: "wrap"
        }}>
          <div className="cs-modal-filter-grp" style={{ flex: 2, minWidth: "200px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Description / Code</label>
            <input
              ref={rDesc}
              type="text"
              className="xp-input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => fk(e, rCat)}
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #2c5f2d", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Category</label>
            <input
              ref={rCat}
              type="text"
              className="xp-input"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              onKeyDown={(e) => fk(e, rCompany)}
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #2c5f2d", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Company</label>
            <input
              ref={rCompany}
              type="text"
              className="xp-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => fk(e, null)}
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #2c5f2d", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", paddingBottom: "2px" }}>
            <span style={{ fontSize: "11px", color: "#2c5f2d", fontWeight: "bold" }}>{rows.length} result(s)</span>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #2c5f2d", borderRadius: "4px", fontWeight: "bold" }}>Close</button>
          </div>
        </div>
        
        <div className="xp-modal-body" style={{ padding: 0, flex: 1, overflow: "hidden" }}>
          <div className="xp-table-panel" style={{ border: "none", height: "100%" }}>
            <div className="xp-table-scroll" style={{ 
              height: "100%", 
              overflow: "auto",
              maxHeight: "calc(85vh - 110px)"
            }}>
              <table className="xp-table" style={{ 
                fontSize: "12px", 
                borderCollapse: "collapse", 
                width: "100%",
                border: "1px solid #2c5f2d"
              }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ width: 40, padding: "5px 4px", textAlign: "center", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>#</th>
                    <th style={{ width: 90, padding: "5px 4px", textAlign: "left", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Barcode</th>
                    <th style={{ padding: "5px 4px", textAlign: "left", border: "1px solid #2c5f2d", fontSize: "13px", fontWeight: "bold", color: "#000000" }}>Product Name</th>
                    <th style={{ width: 60, padding: "5px 4px", textAlign: "center", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Meas.</th>
                    <th style={{ width: 85, padding: "5px 4px", textAlign: "right", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Rate</th>
                    <th style={{ width: 65, padding: "5px 4px", textAlign: "right", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Stock</th>
                    <th style={{ width: 55, padding: "5px 4px", textAlign: "right", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Pack</th>
                    <th style={{ width: 65, padding: "5px 4px", textAlign: "center", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Rack#</th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef} tabIndex={0} onKeyDown={tk}>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#2c5f2d", fontSize: "12px", fontWeight: "bold" }}>
                        No products found
                      </td>
                    </tr>
                  )}
                  {rows.map((r, i) => (
                    <tr
                      key={`${r._id}-${r._pi}`}
                      style={{
                        background: i === hiIdx ? "#e8f5e9" : "white",
                        cursor: "pointer"
                      }}
                      onClick={() => setHiIdx(i)}
                      onDoubleClick={() => onSelect(r)}
                    >
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>
                        {r.code}
                      </td>
                      <td style={{ padding: "4px 4px", border: "1px solid #2c5f2d", fontSize: "13px", fontWeight: "bold", color: "#000000" }}>
                        <button className="xp-link-btn" style={{ 
                          color: "#000000", 
                          textDecoration: "none", 
                          fontWeight: "bold", 
                          fontSize: "13px",
                          background: "none", 
                          border: "none", 
                          cursor: "pointer", 
                          width: "100%", 
                          textAlign: "left",
                          padding: "0"
                        }}>{r._name}</button>
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r._meas}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>
                        {Number(r._rate).toLocaleString("en-PK")}
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r._stock}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r._pack}</td>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #2c5f2d", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.rackNo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="cs-modal-hint" style={{ 
          padding: "6px 12px", 
          fontSize: "10px", 
          color: "#2c5f2d", 
          fontWeight: "bold",
          borderTop: "1px solid #2c5f2d", 
          background: "#f8fafc",
          borderRadius: "0 0 10px 10px"
        }}>
          <span>↑↓ navigate</span> &nbsp;|&nbsp; <span>Enter / Double-click = select</span> &nbsp;|&nbsp; <span>Esc = close</span> &nbsp;|&nbsp; <span>Tab = filters</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   QUOTATION HOLD PREVIEW MODAL
══════════════════════════════════════════════════════════ */
function QuotationHoldPreviewModal({ quote, onResume, onClose }) {
  if (!quote) return null;
  return (
    <div
      className="xp-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="xp-modal" style={{ width: 560 }}>
        <div className="xp-modal-tb" style={{ background: "#2c5f2d" }}>
          <span className="xp-modal-title">Held Quotation — {extractQuoteNumber(quote.quoteNo)}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="xp-modal-body" style={{ padding: 8 }}>
          <div
            style={{
              marginBottom: 6,
              display: "flex",
              gap: 16,
              fontSize: "var(--xp-fs-xs)",
            }}
          >
            <span>
              <b>Customer:</b> {quote.customerName}
            </span>
            <span>
              <b>Items:</b> {quote.items.length}
            </span>
            <span>
              <b>Amount:</b>{" "}
              <span style={{ color: "#2c5f2d", fontWeight: 700 }}>
                {Number(quote.amount).toLocaleString("en-PK")}
              </span>
            </span>
          </div>
          <div className="xp-table-panel" style={{ border: "none" }}>
            <div className="xp-table-scroll" style={{ maxHeight: 300 }}>
              <table className="xp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>UOM</th>
                    <th className="r">Pcs</th>
                    <th className="r">Rate</th>
                    <th className="r">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((r, i) => (
                    <tr key={i}>
                      <td className="text-muted">{i + 1}</td>
                      <td className="text-muted">{r.code}</td>
                      <td>{r.name}</td>
                      <td className="text-muted">{r.uom}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">
                        {Number(r.rate).toLocaleString("en-PK")}
                      </td>
                      <td
                        className="r"
                        style={{
                          color: "#2c5f2d",
                          fontWeight: 700,
                        }}
                      >
                        {Number(r.amount).toLocaleString("en-PK")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "6px 10px",
            borderTop: "1px solid var(--xp-silver-5)",
            justifyContent: "flex-end",
          }}
        >
          <button className="xp-btn xp-btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="xp-btn xp-btn-primary xp-btn-sm"
            style={{ background: "#2c5f2d", borderColor: "#1e4620" }}
            onClick={() => onResume(quote.id)}
          >
            Resume This Quotation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN QUOTATION PAGE with Navigation
══════════════════════════════════════════════════════════ */
export default function QuotationPage() {

  const [time, setTime] = useState(timeNow());
  const [allProducts, setAllProducts] = useState([]);
  const [allQuotations, setAllQuotations] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHoldPreview, setShowHoldPreview] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [curRow, setCurRow] = useState({ ...EMPTY_ROW });
  const [items, setItems] = useState([]);
  const [quoteDate, setQuoteDate] = useState(isoDate());
  const [quoteNo, setQuoteNo] = useState("QTN-1");
  const amountRef = useRef(null);

  const [holdQuotes, setHoldQuotes] = useState(() => loadQuotationHolds());
  const [selItemIdx, setSelItemIdx] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [packingOptions, setPackingOptions] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);
  const [editId, setEditId] = useState(null);

  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [selectedProductSuggestionIdx, setSelectedProductSuggestionIdx] = useState(-1);

  const searchRef = useRef(null);
  const pcsRef = useRef(null);
  const rateRef = useRef(null);
  const addRef = useRef(null);
  const saveRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);
  
  useEffect(() => {
    fetchData();
    loadAllQuotations();
  }, []);
  
  useEffect(() => {
    saveQuotationHolds(holdQuotes);
  }, [holdQuotes]);

  useEffect(() => {
    if (!searchText.trim()) {
      setProductSuggestions([]);
      setShowProductSuggestions(false);
      return;
    }
    
    const q = searchText.trim().toLowerCase();
    const matches = allProducts.filter(p => 
      p.code?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.company?.toLowerCase().includes(q)
    ).slice(0, 10);
    
    setProductSuggestions(matches);
    setShowProductSuggestions(matches.length > 0 && !curRow.name);
    setSelectedProductSuggestionIdx(-1);
  }, [searchText, allProducts, curRow.name]);

  const subTotal = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalQty = items.reduce((s, r) => s + (parseFloat(r.pcs) || 0), 0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes] = await Promise.all([
        api.get(EP.PRODUCTS.GET_ALL),
      ]);
      if (pRes.data.success) setAllProducts(pRes.data.data);
      
      // Load quotations from localStorage and set next number
      const savedQuotes = loadSavedQuotations();
      setAllQuotations(savedQuotes);
      
      const nextNumber = getNextAvailableNumber(savedQuotes);
      setQuoteNo(buildFullQuoteId(nextNumber));
    } catch {
      showMsg("Failed to load data", "error");
    }
    setLoading(false);
  };

  const loadAllQuotations = () => {
    const saved = loadSavedQuotations();
    setAllQuotations(saved);
  };

  const refreshQuoteNo = async () => {
    const savedQuotes = loadSavedQuotations();
    const nextNumber = getNextAvailableNumber(savedQuotes);
    setQuoteNo(buildFullQuoteId(nextNumber));
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3500);
  };
  
  const pickProduct = (product) => {
    if (!product._id) {
      showMsg("Product ID missing", "error");
      return;
    }
    setPackingOptions(product.packingInfo?.map((pk) => pk.measurement) || []);
    setCurRow({
      productId: product._id,
      code: product.code || "",
      name: product._name || product.description || "",
      uom: product._meas || "",
      rack: product.rack || "",
      pcs: product._pack || 1,
      rate: product._rate || 0,
      amount: (product._pack || 1) * (product._rate || 0),
    });
    setSearchText(product.code || "");
    setShowProductModal(false);
    setShowProductSuggestions(false);
    setTimeout(() => pcsRef.current?.focus(), 30);
  };

  const updateCurRow = (field, val) => {
    setCurRow((prev) => {
      const u = { ...prev, [field]: val };
      u.amount =
        (parseFloat(field === "pcs" ? val : u.pcs) || 0) *
        (parseFloat(field === "rate" ? val : u.rate) || 0);
      return u;
    });
  };

  const addRow = () => {
    if (!curRow.name) {
      setShowProductModal(true);
      return;
    }
    if (!curRow.productId) {
      showMsg("Please select a valid product", "error");
      return;
    }
    if (parseFloat(curRow.pcs) <= 0) {
      showMsg("Qty must be > 0", "error");
      return;
    }
    if (selItemIdx !== null) {
      setItems((p) => {
        const u = [...p];
        u[selItemIdx] = { ...curRow };
        return u;
      });
      setSelItemIdx(null);
    } else setItems((p) => [...p, { ...curRow }]);
    resetCurRow();
  };

  const resetCurRow = () => {
    setCurRow({ ...EMPTY_ROW });
    setSearchText("");
    setPackingOptions([]);
    setSelItemIdx(null);
    setShowProductSuggestions(false);
    setTimeout(() => searchRef.current?.focus(), 30);
  };

  const loadRowForEdit = (idx) => {
    setSelItemIdx(idx);
    const r = items[idx];
    setCurRow({ ...r });
    setSearchText(r.name);

    const product = allProducts.find((p) => p._id === r.productId);
    if (product?.packingInfo?.length > 0) {
      setPackingOptions(product.packingInfo.map((pk) => pk.measurement));
    } else {
      setPackingOptions([]);
    }

    setTimeout(() => pcsRef.current?.focus(), 30);
  };

  const removeRow = () => {
    if (selItemIdx === null) return;
    setItems((p) => p.filter((_, i) => i !== selItemIdx));
    resetCurRow();
  };

  const holdQuotation = () => {
    if (!items.length) {
      showMsg("No items to hold", "error");
      return;
    }
    setHoldQuotes((p) => [
      ...p,
      {
        id: Date.now(),
        quoteNo,
        amount: subTotal,
        items: [...items],
        customerName: "Held Quotation",
        date: quoteDate,
      },
    ]);
    fullReset();
    refreshQuoteNo();
    showMsg(`Quotation held: ${extractQuoteNumber(quoteNo)}`, "success");
  };

  const resumeQuotation = (holdId) => {
    const quote = holdQuotes.find((q) => q.id === holdId);
    if (!quote) return;
    setItems(quote.items);
    setQuoteNo(quote.quoteNo);
    setQuoteDate(quote.date || isoDate());
    setHoldQuotes((p) => p.filter((q) => q.id !== holdId));
    setShowHoldPreview(null);
    resetCurRow();
    showMsg(`Resumed quotation: ${extractQuoteNumber(quote.quoteNo)}`, "success");
  };

  const deleteHold = (holdId, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this held quotation?"))
      setHoldQuotes((p) => p.filter((q) => q.id !== holdId));
  };

  const fullReset = () => {
    setItems([]);
    setCurRow({ ...EMPTY_ROW });
    setSearchText("");
    setPackingOptions([]);
    setSelItemIdx(null);
    setMsg({ text: "", type: "" });
    setShowProductSuggestions(false);
    setEditId(null);
    refreshQuoteNo();
    setQuoteDate(isoDate());
    setTimeout(() => searchRef.current?.focus(), 50);
  };
  
  const buildPayload = () => ({
    quoteNo,
    quoteDate,
    items: items.map((r) => ({
      productId: r.productId || undefined,
      code: r.code,
      name: r.name,
      description: r.name,
      uom: r.uom,
      measurement: r.uom,
      rack: r.rack,
      pcs: parseFloat(r.pcs) || 1,
      qty: parseFloat(r.pcs) || 1,
      rate: parseFloat(r.rate) || 0,
      disc: 0,
      amount: parseFloat(r.amount) || 0,
    })),
    subTotal,
    netTotal: subTotal,
  });
  
  const openSaveQuotation = () => {
    if (!items.length) {
      alert("Please add at least one item to save quotation");
      return;
    }
    const payload = buildPayload();
    setPendingSaveData(payload);
    setShowCustomerModal(true);
  };
  
  const saveQuotationWithCustomer = async (customerInfo) => {
    if (!pendingSaveData) return;
    setLoading(true);
    
    try {
      const finalQuotation = {
        ...pendingSaveData,
        customerName: customerInfo.customerName,
        customerPhone: customerInfo.customerPhone,
        savedAt: new Date().toISOString(),
        validDays: customerInfo.validDays,
      };
      
      const saved = saveQuotationToStorage(finalQuotation);
      
      if (saved) {
        showMsg(`Quotation saved: ${extractQuoteNumber(pendingSaveData.quoteNo)} for ${customerInfo.customerName}`, "success");
        loadAllQuotations();
        
        doPrint(finalQuotation, { 
          customerName: customerInfo.customerName,
          customerPhone: customerInfo.customerPhone,
          validUntil: `${customerInfo.validDays} days from issue date`
        });
        
        fullReset();
        await refreshQuoteNo();
      } else {
        showMsg("Failed to save quotation", "error");
      }
    } catch (e) {
      showMsg("Save failed", "error");
    }
    
    setLoading(false);
    setShowCustomerModal(false);
    setPendingSaveData(null);
  };

  const loadQuotationForEdit = (quotation) => {
    setEditId(quotation.quoteNo);
    setQuoteNo(quotation.quoteNo);
    setQuoteDate(quotation.quoteDate);
    
    const loadedItems = (quotation.items || []).map((it) => ({
      productId: it.productId || "",
      code: it.code || "",
      name: it.name || it.description || "",
      uom: it.uom || it.measurement || "",
      rack: it.rack || "",
      pcs: it.pcs || it.qty || 1,
      rate: it.rate || 0,
      amount: it.amount || 0,
    }));
    setItems(loadedItems);
    
    resetCurRow();
    showMsg(`✏ Editing Quotation ${extractQuoteNumber(quotation.quoteNo)}`, "success");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const navQuotation = async (dir) => {
    if (allQuotations.length === 0) {
      loadAllQuotations();
      return;
    }
    
    const sortedQuotes = [...allQuotations].sort((a, b) => {
      const getNum = (str) => {
        let numStr = str.toString();
        if (numStr.includes('QTN-')) {
          return parseInt(numStr.split('QTN-')[1]) || 0;
        }
        return parseInt(numStr) || 0;
      };
      return getNum(a.quoteNo) - getNum(b.quoteNo);
    });
    
    const curIdx = sortedQuotes.findIndex((q) => q.quoteNo === quoteNo);
    let nextIdx = dir === "prev" ? curIdx - 1 : curIdx + 1;
    nextIdx = Math.max(0, Math.min(nextIdx, sortedQuotes.length - 1));
    
    if (nextIdx === curIdx) return;
    if (nextIdx >= 0 && nextIdx < sortedQuotes.length) {
      loadQuotationForEdit(sortedQuotes[nextIdx]);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (showProductModal || showHoldPreview || showCustomerModal) return;

      if (e.key === "F2") {
        e.preventDefault();
        setShowProductModal(true);
      }
      if (e.key === "F4") {
        e.preventDefault();
        holdQuotation();
      }
      if (e.key === "*" || (e.ctrlKey && e.key === "s")) {
        e.preventDefault();
        if (items.length > 0) {
          saveRef.current?.click();
        }
      }
      if (e.key === "ArrowUp" && !editId) {
        e.preventDefault();
        navQuotation("prev");
      }
      if (e.key === "ArrowDown" && !editId) {
        e.preventDefault();
        navQuotation("next");
      }
      if (e.key === "Escape") resetCurRow();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, showProductModal, showHoldPreview, showCustomerModal, allQuotations, quoteNo, editId]);

  return (
    <>
      <div className="sl-page quotation-page">
        {showProductModal && (
          <SearchModal
            allProducts={allProducts}
            onSelect={pickProduct}
            onClose={() => {
              setShowProductModal(false);
              setTimeout(() => searchRef.current?.focus(), 30);
            }}
          />
        )}
        {showHoldPreview && (
          <QuotationHoldPreviewModal
            quote={showHoldPreview}
            onResume={resumeQuotation}
            onClose={() => setShowHoldPreview(null)}
          />
        )}
        {showCustomerModal && (
          <CustomerInfoModal
            onConfirm={saveQuotationWithCustomer}
            onClose={() => {
              setShowCustomerModal(false);
              setPendingSaveData(null);
            }}
          />
        )}
        
        <div className="xp-titlebar" style={{ background: "#2c5f2d" }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="rgba(255,255,255,0.85)"
          >
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM2 10h2a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2m4 0h6a1 1 0 0 1 0 2H6a1 1 0 0 1 0-2" />
          </svg>
          <span className="xp-tb-title">
            Quotation — Asim Electric &amp; Electronic Store
          </span>
          <div className="xp-tb-actions">
            <div className="xp-tb-divider" />
            <div className="sl-shortcut-hints">
              <span>F2 Product</span>
              <span>F4 Hold</span>
              <span>↑/↓ Navigate</span>
              <span>* Save</span>
            </div>
            <div className="xp-tb-divider" />
            <button className="xp-cap-btn">─</button>
            <button
              className="xp-cap-btn"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen();
                } else {
                  document.exitFullscreen();
                }
              }}
            >
              □
            </button>
            <button className="xp-cap-btn xp-cap-close">✕</button>
          </div>
        </div>

        {msg.text && (
          <div
            className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`}
            style={{ margin: "4px 10px 0", flexShrink: 0 }}
          >
            {msg.text}
          </div>
        )}

        <div className="sl-body">
          <div className="sl-left">
            {/* Header with Navigation */}
            <div className="sl-top-bar">
              <div className="sl-sale-title-box" style={{ background: "#2c5f2d" }}>Quotation</div>
              
              <div className="sl-inv-field-grp">
                <label>Quote #</label>
                <div className="sl-inv-nav-container">
                  <button
                    className="sl-inv-nav-btn sl-inv-nav-prev"
                    onClick={() => navQuotation("prev")}
                    title="Previous Quotation (↑)"
                    type="button"
                  >
                    ◀
                  </button>
                  
                  <input
                    className="xp-input xp-input-sm sl-inv-input-large"
                    style={{ borderColor: "#2c5f2d" }}
                    value={extractQuoteNumber(quoteNo)}
                    onChange={(e) => {
                      const newNumber = e.target.value;
                      if (newNumber === "") {
                        setQuoteNo("QTN-1");
                      } else {
                        setQuoteNo(buildFullQuoteId(newNumber));
                      }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = quoteNo.trim();
                        if (!val) return;
                        const found = allQuotations.find((q) => q.quoteNo === val);
                        if (found) {
                          loadQuotationForEdit(found);
                        } else {
                          showMsg(`Quotation "${extractQuoteNumber(val)}" not found`, "error");
                        }
                      }
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        navQuotation(e.key === "ArrowUp" ? "prev" : "next");
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                  
                  <button
                    className="sl-inv-nav-btn sl-inv-nav-next"
                    onClick={() => navQuotation("next")}
                    title="Next Quotation (↓)"
                    type="button"
                  >
                    ▶
                  </button>
                </div>
              </div>
              
              <div className="sl-inv-field-grp">
                <label>Date</label>
                <input
                  type="date"
                  className="xp-input xp-input-sm sl-date-input"
                  value={quoteDate}
                  readOnly
                  style={{ 
                    borderColor: "#2c5f2d",
                    background: "#f5f5f5",
                    cursor: "not-allowed",
                    color: "#888"
                  }}
                />
              </div>
              <div className="sl-inv-field-grp">
                <label>Time</label>
                <div className="sl-time-box">{time}</div>
              </div>
            </div>

            {/* Entry strip */}
            <div className="sl-entry-strip">
              <div className="sl-entry-cell sl-entry-product">
                <label>
                  Select Product <kbd>F2</kbd>
                </label>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    ref={searchRef}
                    type="text"
                    className="sl-product-input"
                    style={{ width: "100%", background: "#fffde7", borderColor: "#2c5f2d" }}
                    placeholder="Search by code, name, category..."
                    value={searchText}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        if (productSuggestions.length > 0) {
                          setSelectedProductSuggestionIdx(prev => 
                            prev < productSuggestions.length - 1 ? prev + 1 : prev
                          );
                          setShowProductSuggestions(true);
                        } else {
                          setShowProductModal(true);
                        }
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSelectedProductSuggestionIdx(prev => prev > 0 ? prev - 1 : -1);
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (selectedProductSuggestionIdx >= 0 && productSuggestions[selectedProductSuggestionIdx]) {
                          const found = productSuggestions[selectedProductSuggestionIdx];
                          const pk = found.packingInfo?.[0];
                          pickProduct({
                            ...found,
                            _pi: 0,
                            _meas: pk?.measurement || "",
                            _rate: pk?.saleRate || 0,
                            _pack: pk?.packing || 1,
                            _stock: pk?.openingQty || 0,
                            _name: [found.category, found.description, found.company].filter(Boolean).join(" "),
                          });
                          setProductSuggestions([]);
                          setShowProductSuggestions(false);
                        } else if (searchText.trim()) {
                          const q = searchText.trim().toLowerCase();
                          let found = allProducts.find(p => p.code?.toLowerCase() === q);
                          if (!found) {
                            found = allProducts.find(p => 
                              p.description?.toLowerCase().includes(q) ||
                              p.name?.toLowerCase().includes(q)
                            );
                          }
                          if (found) {
                            const pk = found.packingInfo?.[0];
                            pickProduct({
                              ...found,
                              _pi: 0,
                              _meas: pk?.measurement || "",
                              _rate: pk?.saleRate || 0,
                              _pack: pk?.packing || 1,
                              _stock: pk?.openingQty || 0,
                              _name: [found.category, found.description, found.company].filter(Boolean).join(" "),
                            });
                          } else {
                            setShowProductModal(true);
                          }
                        } else {
                          setShowProductModal(true);
                        }
                      }
                      if (e.key === "Escape") {
                        setShowProductSuggestions(false);
                      }
                    }}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      if (curRow.name) {
                        setCurRow({ ...EMPTY_ROW });
                        setPackingOptions([]);
                      }
                    }}
                    autoFocus
                  />
                  {showProductSuggestions && productSuggestions.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid #2c5f2d",
                      borderRadius: 4,
                      maxHeight: 200,
                      overflowY: "auto",
                      zIndex: 100,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}>
                      {productSuggestions.map((p, idx) => (
                        <div
                          key={p._id}
                          style={{
                            padding: "6px 10px",
                            cursor: "pointer",
                            background: idx === selectedProductSuggestionIdx ? "#e8f5e9" : "white",
                            borderBottom: "1px solid #eee"
                          }}
                          onClick={() => {
                            const pk = p.packingInfo?.[0];
                            pickProduct({
                              ...p,
                              _pi: 0,
                              _meas: pk?.measurement || "",
                              _rate: pk?.saleRate || 0,
                              _pack: pk?.packing || 1,
                              _stock: pk?.openingQty || 0,
                              _name: [p.category, p.description, p.company].filter(Boolean).join(" "),
                            });
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{p.code} - {p.description}</div>
                          <div style={{ fontSize: 10, color: "#666" }}>{p.category} | {p.company}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="sl-entry-cell">
                <label>Pcs</label>
                <input
                  ref={pcsRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 60, background: "#fffde7", borderColor: "#2c5f2d" }}
                  value={curRow.pcs}
                  min={1}
                  onChange={(e) => updateCurRow("pcs", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && rateRef.current?.focus()}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="sl-entry-cell">
                <label>Rate</label>
                <input
                  ref={rateRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 75, background: "#fffde7", borderColor: "#2c5f2d" }}
                  value={curRow.rate}
                  min={0}
                  onChange={(e) => updateCurRow("rate", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && amountRef.current?.focus()}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="sl-entry-cell">
                <label>Amount</label>
                <input
                  ref={amountRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 80, background: "#fffde7", borderColor: "#2c5f2d" }}
                  value={curRow.amount || 0}
                  onChange={(e) =>
                    setCurRow((p) => ({
                      ...p,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => e.key === "Enter" && addRef.current?.click()}
                />
              </div>
              <div className="sl-entry-cell sl-entry-btns-cell">
                <label>&nbsp;</label>
                <div className="sl-entry-btns">
                  <button className="xp-btn xp-btn-sm" onClick={resetCurRow}>
                    Reset
                  </button>
                  <button
                    ref={addRef}
                    className="xp-btn xp-btn-primary xp-btn-sm"
                    style={{ background: "#2c5f2d", borderColor: "#1e4620" }}
                    onClick={addRow}
                  >
                    {selItemIdx !== null ? "Update" : "Add"}
                  </button>
                  <button
                    className="xp-btn xp-btn-sm"
                    disabled={selItemIdx === null}
                    onClick={() =>
                      selItemIdx !== null && loadRowForEdit(selItemIdx)
                    }
                  >
                    Edit
                  </button>
                  <button
                    className="xp-btn xp-btn-danger xp-btn-sm"
                    disabled={selItemIdx === null}
                    onClick={removeRow}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Table header */}
            <div className="sl-table-header-bar">
              <span className="sl-table-lbl">
                {curRow.name ? (
                  <span className="sl-cur-name-inline">{curRow.name}</span>
                ) : (
                  "Select Product"
                )}
              </span>
              <span className="sl-table-qty">
                Total Qty: {totalQty.toLocaleString("en-PK")}
              </span>
            </div>

            {/* Items table */}
            <div className="sl-items-wrap">
              <table className="sl-items-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>Sr.#</th>
                    <th style={{ width: 72 }}>Code</th>
                    <th>Name</th>
                    <th style={{ width: 65 }}>UOM</th>
                    <th style={{ width: 55 }} className="r">
                      Pcs
                    </th>
                    <th style={{ width: 80 }} className="r">
                      Rate
                    </th>
                    <th style={{ width: 90 }} className="r">
                      Amount
                    </th>
                    <th style={{ width: 50 }}>Rack</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="xp-empty"
                        style={{ padding: 14 }}
                      >
                        🔍 Search and add products to create quotation
                       </td>
                    </tr>
                  )}
                  {items.map((r, i) => (
                    <tr
                      key={i}
                      className={selItemIdx === i ? "sl-sel-row" : ""}
                      onClick={() => setSelItemIdx(i === selItemIdx ? null : i)}
                      onDoubleClick={() => loadRowForEdit(i)}
                    >
                      <td
                        className="muted"
                        style={{
                          textAlign: "center",
                          fontSize: "var(--xp-fs-xs)",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td className="muted">{r.code}</td>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td className="muted">{r.uom}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">
                        {Number(r.rate).toLocaleString("en-PK")}
                      </td>
                      <td
                        className="r"
                        style={{ color: "#2c5f2d", fontWeight: 600 }}
                      >
                        {Number(r.amount).toLocaleString("en-PK")}
                       </td>
                      <td className="muted">{r.rack} </td>
                    </tr>
                  ))}
                </tbody>
               </table>
            </div>

            {/* Summary bar */}
            <div className="sl-summary-bar">
              <div className="sl-sum-cell">
                <label>Total Qty</label>
                <input
                  className="sl-sum-val"
                  value={totalQty.toLocaleString("en-PK")}
                  readOnly
                />
              </div>
              <div className="sl-sum-cell">
                <label>Total Amount</label>
                <input
                  className="sl-sum-val"
                  style={{ color: "#2c5f2d", fontWeight: "bold", fontSize: "16px" }}
                  value={Number(subTotal).toLocaleString("en-PK")}
                  readOnly
                />
              </div>
              <div className="sl-sum-cell" style={{ flex: 2 }}>
                <label style={{ color: "#666" }}>Press * or Ctrl+S to save</label>
              </div>
            </div>
          </div>

          {/* Right panel - Hold Quotations */}
          <div className="sl-right">
            <div className="sl-hold-panel">
              <div className="sl-hold-title" style={{ background: "#2c5f2d" }}>
                <span>
                  📋 Quotation Hold{" "}
                  <kbd
                    style={{
                      fontSize: 9,
                      background: "rgba(255,255,255,0.2)",
                      padding: "0 3px",
                      borderRadius: 2,
                    }}
                  >
                    F4
                  </kbd>
                </span>
                <span className="sl-hold-cnt">{holdQuotes.length}</span>
              </div>
              <div className="sl-hold-table-wrap">
                <table className="sl-hold-table">
                  <thead>
                    <tr>
                      <th style={{ width: 24 }}>#</th>
                      <th>Quote #</th>
                      <th className="r">Amount</th>
                      <th>Date</th>
                      <th style={{ width: 22 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdQuotes.length === 0 ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5} style={{ height: 22 }} />
                        </tr>
                      ))
                    ) : (
                      holdQuotes.map((q, i) => (
                        <tr
                          key={q.id}
                          onClick={() => setShowHoldPreview(q)}
                          onDoubleClick={() => resumeQuotation(q.id)}
                          title="Click = preview · Double-click = resume"
                          style={{ cursor: "pointer" }}
                        >
                          <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>{i + 1}</td>
                          <td style={{ fontFamily: "var(--xp-mono)", fontSize: "var(--xp-fs-xs)" }}>{extractQuoteNumber(q.quoteNo)}</td>
                          <td className="r" style={{ color: "#2c5f2d", fontWeight: 600 }}>{Number(q.amount).toLocaleString("en-PK")}</td>
                          <td className="muted" style={{ fontSize: "var(--xp-fs-xs)" }}>{q.date}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="xp-btn xp-btn-sm xp-btn-ico"
                              style={{ width: 18, height: 18, fontSize: 9, color: "var(--xp-red)" }}
                              onClick={(e) => deleteHold(q.id, e)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "4px 8px", flexShrink: 0 }}>
                <button
                  className="xp-btn xp-btn-sm"
                  style={{ width: "100%", background: "#2c5f2d", color: "white", borderColor: "#1e4620" }}
                  onClick={holdQuotation}
                  disabled={!items.length}
                >
                  📌 Hold Quotation (F4)
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: 8, padding: "8px", background: "#e8f5e9", borderRadius: 6, textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#2c5f2d" }}>
                💡 Tip: Press <kbd style={{ background: "#fff", padding: "2px 6px", borderRadius: 3 }}>*</kbd> or <kbd style={{ background: "#fff", padding: "2px 6px", borderRadius: 3 }}>Ctrl+S</kbd> to save quotation
              </span>
            </div>
          </div>
        </div>

        {/* Commands bar */}
        <div className="sl-cmd-bar">
          <button
            className="xp-btn xp-btn-sm"
            onClick={fullReset}
            disabled={loading}
          >
            🆕 New Quotation
          </button>
          <button
            ref={saveRef}
            className="xp-btn xp-btn-primary xp-btn-lg"
            style={{ background: "#2c5f2d", borderColor: "#1e4620" }}
            onClick={openSaveQuotation}
            disabled={loading || items.length === 0}
          >
            {loading ? "Saving…" : "💾 Save Quotation  *"}
          </button>
          <div className="xp-toolbar-divider" />
          <span className={`sl-inv-info`}>
            📄 {extractQuoteNumber(quoteNo)} | Items: {items.length} | Total: PKR {Number(subTotal).toLocaleString("en-PK")}
          </span>
          <button
            className="xp-btn xp-btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={fullReset}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
      .quotation-page {
        background: #ffffff;
      }
      
      .quotation-page input, 
      .quotation-page .xp-input, 
      .quotation-page .sl-product-input, 
      .quotation-page .sl-num-input, 
      .quotation-page .sl-sum-input, 
      .quotation-page .sl-cust-input,
      .quotation-page .sl-inv-input-large,
      .quotation-page .sl-date-input {
        border-color: #2c5f2d !important;
        border-width: 1px !important;
        border-style: solid !important;
      }
      
      .quotation-page .sl-items-table th,
      .quotation-page .sl-items-table td,
      .quotation-page .sl-hold-table th,
      .quotation-page .sl-hold-table td {
        border-color: #2c5f2d !important;
        border-width: 1px !important;
      }
      
      .quotation-page .sl-items-table thead th {
        background: #2c5f2d !important;
        color: white !important;
      }
      
      .quotation-page tr.sl-sel-row td {
        background-color: #e8f5e9 !important;
      }
      
      .quotation-page .sl-hold-title {
        background: #2c5f2d !important;
        color: white !important;
      }
      
      .quotation-page .sl-summary-bar {
        border-top: 1px solid #2c5f2d;
        margin-top: 4px;
      }

      /* Navigation buttons inside input */
      .sl-inv-nav-container {
        position: relative;
        display: inline-block;
      }

      .sl-inv-nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        width: 26px;
        height: 26px;
        border-radius: 4px;
        color: #4b5563;
        font-size: 12px;
        font-weight: bold;
        transition: all 0.2s ease;
        z-index: 2;
      }

      .sl-inv-nav-btn:hover {
        background: #2c5f2d;
        border-color: #1e4620;
        color: white;
        transform: translateY(-50%) scale(1.05);
      }

      .sl-inv-nav-btn:active {
        transform: translateY(-50%) scale(0.95);
      }

      .sl-inv-nav-prev {
        left: 4px;
      }

      .sl-inv-nav-next {
        right: 4px;
      }

      .sl-inv-input-large {
        width: 180px !important;
        text-align: center !important;
        padding: 6px 32px !important;
        font-size: 18px !important;
        font-weight: bold !important;
        background: #ffffff !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
      }

      .sl-inv-input-large:focus {
        border-color: #2c5f2d !important;
        outline: none;
        box-shadow: 0 0 0 3px rgba(44, 95, 45, 0.1);
      }
      `}</style>
    </>
  );
}