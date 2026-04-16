// pages/PurchaseReturnPage.jsx
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
const PURCHASE_RETURN_HOLD_KEY = "asim_purchase_return_hold_v1";

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
    "الیکٹرانک اور چانٹا کے سپیئر پارٹس کی واپسی یا تبدیلی ہر صورت ممکن نہیں ہوگی۔\nبلی ہوئی آئٹم، پکلاہوا اکا ول واپس قابل واپسی نہیں ہے۔\nبارک کے سامان کی واپس کی صورت میں (7) دن کے اند پہلی ہوگی۔\nکل پیلی کلائی کی تمام واپسی قابل قبول نہیں ہوگی۔",
  devBy:
    "Software developed by: Creative Babar / 03098325271 or visit website www.digitalglobalschool.com",
};

/* ── localStorage ── */
const loadPurchaseReturnHolds = () => {
  try {
    return JSON.parse(localStorage.getItem(PURCHASE_RETURN_HOLD_KEY) || "[]");
  } catch {
    return [];
  }
};
const savePurchaseReturnHolds = (bills) => {
  try {
    localStorage.setItem(PURCHASE_RETURN_HOLD_KEY, JSON.stringify(bills));
  } catch {}
};

/* ══════════════════════════════════════════════════════════
   PRINT HTML BUILDER — Purchase Return
══════════════════════════════════════════════════════════ */
const buildPrintHtml = (purchaseReturn, type, overrides = {}) => {
  const supplierName = overrides.supplierName ?? purchaseReturn.supplierName;
  const rows = purchaseReturn.items.map((it, i) => ({ ...it, sr: i + 1 }));
  const totalQty = rows.reduce((s, r) => s + (r.pcs || 0), 0);

  const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
  const GOOGLE_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">`;

  if (type === "Thermal") {
    const itemRows = rows
      .map(
        (it) => `
        <tr>
          <td style="font-size:9px;vertical-align:top">${it.sr}</td>
          <td style="font-size:9.5px;vertical-align:top;word-break:break-word;max-width:100px">${it.name}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right">${it.pcs} ${it.uom || ""}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right">${Number(it.rate).toLocaleString()}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right"><b>${Number(it.amount).toLocaleString()}</b></td>
        </tr>`
      )
      .join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',Courier,monospace;font-size:10px;width:80mm;margin:0 auto;padding:2mm 3mm;color:#000}
      .urdu{font-family:${URDU_FONT};direction:rtl;text-align:center}
      .shop-urdu{font-size:16px;font-weight:bold;text-align:center;margin-bottom:2px;font-family:${URDU_FONT};direction:rtl}
      .shop-addr{font-size:9px;text-align:center;margin-bottom:1px;font-family:${URDU_FONT};direction:rtl}
      .shop-phones{font-size:8.5px;text-align:center;font-weight:bold;margin-bottom:3px}
      .banner{background:#dc2626;color:#fff;font-size:8px;text-align:center;padding:2px 4px;margin:3px 0;font-family:${URDU_FONT};direction:rtl;line-height:1.8}
      .meta-row{display:flex;justify-content:space-between;font-size:9px;margin:2px 0}
      .meta-bold{font-weight:bold;font-size:10px}
      .divider-solid{border:none;border-top:2px solid #000;margin:3px 0}
      .divider-dash{border:none;border-top:1px dashed #666;margin:3px 0}
      table{width:100%;border-collapse:collapse}
      thead tr{border-bottom:1px solid #000}
      th{font-size:8.5px;font-weight:bold;padding:2px 1px;text-align:left}
      th.r{text-align:right}
      td{padding:2px 1px;font-size:9px;vertical-align:top}
      .sum-row{display:flex;justify-content:space-between;font-size:10px;padding:1.5px 0}
      .sum-row.bold{font-weight:bold;font-size:11px}
      .sum-row.sep{border-top:1px dashed #555;margin-top:2px;padding-top:2px}
      .red{color:#b00}.green{color:#060}
      .totals-box{margin-top:4px}
      .terms{font-family:${URDU_FONT};direction:rtl;font-size:9px;color:#333;border:1px dashed #999;padding:4px;margin-top:4px;line-height:2;text-align:right}
      .devby{text-align:center;font-size:7.5px;color:#777;margin-top:4px;border-top:1px dashed #ccc;padding-top:3px}
      @media print{@page{size:80mm auto;margin:1mm}body{width:78mm}}
    </style></head><body>
      <div class="shop-urdu">${SHOP_INFO.name}</div>
      <div class="shop-addr">${SHOP_INFO.address}</div>
      <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
      <div class="banner">PURCHASE RETURN</div>
      <div class="meta-row">
        <span><b>Purchase Return</b></span>
        <span>ADMIN</span>
        <span>Shop Server</span>
      </div>
      <hr class="divider-dash">
      <div class="meta-row">
        <span class="meta-bold">${purchaseReturn.returnNo}</span>
        <span>${purchaseReturn.returnDate}</span>
      </div>
      <div class="meta-row"><span>Supplier:</span></div>
      <div style="font-size:10px;font-weight:bold;margin-bottom:1px">${supplierName}</div>
      ${purchaseReturn.purchaseInvNo ? `<div style="font-size:9px;color:#555">Ref Purchase: ${purchaseReturn.purchaseInvNo}</div>` : ""}
      <hr class="divider-solid">
      <table>
        <thead><tr><th style="width:20px">#</th><th>Product</th><th class="r">Qty.</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <hr class="divider-dash">
      <div class="totals-box">
        <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px">
          <span>T.Qty: <b>${totalQty}</b></span>
          <span>T.Items: <b>${rows.length}</b></span>
        </div>
        <div class="sum-row bold sep"><span>Return Total:</span><span>${Number(purchaseReturn.netTotal).toLocaleString()}</span></div>
        <div class="sum-row green"><span>Refund Amount:</span><span>PKR ${Number(purchaseReturn.paidAmount).toLocaleString()}</span></div>
        <div class="sum-row bold sep green"><span>Balance:</span><span>PKR ${Number(purchaseReturn.balance).toLocaleString()}</span></div>
      </div>
      <div class="terms">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
      <div class="devby">${SHOP_INFO.devBy}</div>
    </body></html>`;
  }

  // A4/A5 format
  const a5 = type === "A5";
  const LINES_PER_PAGE = a5 ? 22 : 28;
  const pages = [];
  for (let i = 0; i < rows.length; i += LINES_PER_PAGE) {
    pages.push(rows.slice(i, i + LINES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const sz = a5
    ? { title: 14, sub: 8.5, inv: 12, meta: 8, th: 8, td: 8, tot: 9, totB: 10.5 }
    : { title: 17, sub: 9.5, inv: 14, meta: 9, th: 9, td: 9, tot: 10, totB: 13 };

  const buildPageHtml = (pageRows, pageNum, totalPages, isLastPage) => {
    const itemRows = pageRows
      .map(
        (it, i) => `
        <tr style="background:${i % 2 === 0 ? "#fff" : "#f7faff"}">
          <td style="text-align:center">${it.sr}</td>
          <td>${it.name}</td>
          <td>${it.uom || "—"}</td>
          <td style="text-align:right">${it.pcs}</td>
          <td style="text-align:right">${Number(it.rate).toLocaleString()}</td>
          <td style="text-align:right"><b>${Number(it.amount).toLocaleString()}</b></td>
        </tr>`
      )
      .join("");

    const headerHtml = `
      <div class="hdr">
        <div class="hdr-center">
          <div class="shop-urdu">${SHOP_INFO.name}</div>
          <div class="shop-addr">${SHOP_INFO.address}</div>
          <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
        </div>
      </div>
      <div class="banner">PURCHASE RETURN</div>`;

    const metaHtml = pageNum === 1
      ? `<div class="meta-strip">
          <div class="meta-left">
            <div class="meta-row"><span class="meta-lbl">Supplier:</span> <span class="meta-val">${supplierName}</span></div>
          </div>
          <div class="meta-mid"><span class="meta-val">${rows.length}</span></div>
          <div class="meta-right">
            <div class="meta-row"><span class="meta-lbl">Return #:</span> <span class="meta-val">${purchaseReturn.returnNo}</span></div>
            <div class="meta-row"><span class="meta-lbl">Date:</span> <span class="meta-val">${purchaseReturn.returnDate}</span></div>
            ${purchaseReturn.purchaseInvNo ? `<div class="meta-row"><span class="meta-lbl">Ref Purchase:</span> <span class="meta-val">${purchaseReturn.purchaseInvNo}</span></div>` : ""}
          </div>
        </div>`
      : `<div style="display:flex;justify-content:space-between;font-size:${sz.sub}pt;color:#555;margin-bottom:4px;padding:2px 0;border-bottom:1px solid #ddd">
          <span>${supplierName}</span>
          <span>Page ${pageNum} of ${totalPages}</span>
          <span>Return # ${purchaseReturn.returnNo}</span>
        </div>`;

    const footerHtml = isLastPage
      ? `<div class="footer-wrap">
          <div class="footer-left">
            <div class="footer-stat">Total Items: <b>${rows.length}</b></div>
            <div class="terms-box">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
            <div class="sig-line">Signature</div>
          </div>
          <div class="footer-right">
            <div class="sum-row bold"><span>Return Total:</span><span>${Number(purchaseReturn.netTotal).toLocaleString()}</span></div>
            <div class="sum-row green"><span>Refund:</span><span>PKR ${Number(purchaseReturn.paidAmount).toLocaleString()}</span></div>
            <div class="sum-row bold sep green"><span>Balance:</span><span>PKR ${Number(purchaseReturn.balance).toLocaleString()}</span></div>
          </div>
        </div>
        <div class="devby">${SHOP_INFO.devBy}</div>`
      : `<div style="text-align:right;font-size:${sz.sub}pt;color:#888;margin-top:4px">Page ${pageNum} of ${totalPages} — Continued...</div>`;

    return `
      <div class="page"${pageNum > 1 ? ' style="page-break-before:always"' : ""}>
        ${headerHtml}
        ${metaHtml}
        <table>
          <thead><tr><th style="width:28px;text-align:center">Sr.#</th><th>Product</th><th style="width:50px">Unit</th><th style="width:42px;text-align:right">Qty</th><th style="width:70px;text-align:right">Rate</th><th style="width:80px;text-align:right">Amount</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        ${footerHtml}
      </div>`;
  };

  const allPagesHtml = pages.map((pageRows, idx) =>
    buildPageHtml(pageRows, idx + 1, pages.length, idx === pages.length - 1)
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${sz.td}pt;color:#111;background:#fff;padding:${a5 ? "5mm" : "8mm"}}
    .shop-urdu{font-size:${a5 ? "20px" : "26px"};font-weight:900;font-family:${URDU_FONT};direction:rtl;text-align:center;line-height:2}
    .shop-addr{font-size:${sz.sub}pt;color:#444;text-align:center;font-family:${URDU_FONT};direction:rtl;margin:2px 0;line-height:1.8}
    .shop-phones{font-size:${sz.sub}pt;font-weight:bold;text-align:center;margin-bottom:2px}
    .banner{background:#dc2626;color:#fff;font-size:${a5 ? "7.5" : "8.5"}pt;text-align:center;padding:${a5 ? "2px 6px" : "3px 8px"};margin:${a5 ? "3px 0" : "4px 0"};font-family:${URDU_FONT};direction:rtl;line-height:2}
    .hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:${a5 ? "5px" : "8px"};margin-bottom:4px}
    .meta-strip{display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #ccc;padding:${a5 ? "4px 8px" : "5px 10px"};margin:${a5 ? "4px 0" : "5px 0"};font-size:${sz.meta}pt}
    .meta-left{flex:2}.meta-mid{flex:0.5;text-align:center;font-size:${a5 ? "18px" : "22px"};font-weight:900;color:#555}.meta-right{flex:2;text-align:right}
    .meta-row{margin-bottom:1px}.meta-lbl{color:#555}.meta-val{font-weight:700}
    table{width:100%;border-collapse:collapse;margin:${a5 ? "4px 0" : "5px 0"}}
    thead tr{background:#333;color:#fff}
    th{padding:${a5 ? "3px 5px" : "5px 7px"};font-size:${sz.th}pt;font-weight:600;text-align:left}
    td{padding:${a5 ? "2px 5px" : "3px 7px"};font-size:${sz.td}pt;border-bottom:1px solid #e0e0e0}
    .footer-wrap{display:flex;justify-content:space-between;align-items:flex-start;margin-top:${a5 ? "6px" : "10px"};gap:10px}
    .footer-left{flex:1.5}.footer-right{flex:1;border:1px solid #ccc;padding:${a5 ? "4px 8px" : "5px 10px"}}
    .footer-stat{font-size:${sz.meta}pt;font-weight:bold;margin-bottom:4px}
    .terms-box{font-family:${URDU_FONT};direction:rtl;font-size:${a5 ? "8" : "9"}pt;color:#444;border:1px dashed #aaa;padding:${a5 ? "3px 6px" : "5px 8px"};margin:${a5 ? "4px 0" : "5px 0"};line-height:2;text-align:right}
    .sig-line{font-size:${sz.sub}pt;margin-top:${a5 ? "8px" : "14px"};border-top:1px solid #999;display:inline-block;padding-top:2px;min-width:120px}
    .sum-row{display:flex;justify-content:space-between;font-size:${sz.tot}pt;padding:${a5 ? "3px 0" : "4px 0"};border-bottom:1px solid #eee}
    .sum-row.bold{font-weight:700;font-size:${sz.totB}pt;background:#f5f5f5;padding:${a5 ? "3px 4px" : "4px 6px"}}
    .sum-row.sep{border-top:2px solid #333;margin-top:2px}
    .red{color:#c00}.green{color:#1a7a1a}
    .devby{text-align:center;font-size:${a5 ? "7" : "8"}pt;color:#888;margin-top:${a5 ? "6px" : "10px"};border-top:1px solid #ddd;padding-top:${a5 ? "4px" : "6px"}}
    @media print{@page{size:${a5 ? "A5" : "A4"};margin:${a5 ? "5mm" : "10mm"}}body{padding:0}}
  </style></head><body>${allPagesHtml}</body></html>`;
};

const doPrint = (purchaseReturn, type, overrides = {}) => {
  const w = window.open("", "_blank", type === "Thermal" ? "width=420,height=640" : "width=900,height=700");
  w.document.write(buildPrintHtml(purchaseReturn, type, overrides));
  w.document.close();
  setTimeout(() => w.print(), 400);
};

/* ══════════════════════════════════════════════════════════
   SUPPLIER DROPDOWN
══════════════════════════════════════════════════════════ */
function SupplierDropdown({ allSuppliers, value, onSelect, onClear, onAddNew }) {
  const [query, setQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef(null);

  const getSuggestions = (searchTerm) => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase();
    return allSuppliers.filter(s => 
      s.name?.toLowerCase().includes(searchLower) ||
      s.code?.toLowerCase().includes(searchLower)
    ).slice(0, 10);
  };

  useEffect(() => {
    if (!originalQuery.trim()) {
      setSuggestions([]);
      setGhost("");
      setShowDropdown(false);
      return;
    }

    const matches = getSuggestions(originalQuery);
    setSuggestions(matches);
    setShowDropdown(matches.length > 0);
    
    if (!isNavigating && matches.length > 0 && matches[0].name) {
      const remaining = matches[0].name.slice(originalQuery.length);
      setGhost(remaining);
    } else {
      setGhost("");
    }
  }, [originalQuery, allSuppliers, isNavigating]);

  const selectSupplier = (supplier) => {
    onSelect(supplier);
    setQuery("");
    setOriginalQuery("");
    setGhost("");
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setShowDropdown(false);
    setIsNavigating(false);
  };

  const handleKeyDown = (e) => {
    if (ghost && (e.key === "ArrowRight" || e.key === "Tab") && !isNavigating) {
      e.preventDefault();
      const fullName = originalQuery + ghost;
      setQuery(fullName);
      setOriginalQuery(fullName);
      setGhost("");
      setIsNavigating(false);
      
      const matchedSupplier = suggestions[0];
      if (matchedSupplier) {
        selectSupplier(matchedSupplier);
      }
      return;
    }
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length === 0) return;
      
      setIsNavigating(true);
      setShowDropdown(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = 0;
      } else {
        newIndex = selectedSuggestionIndex + 1;
        if (newIndex >= suggestions.length) newIndex = 0;
      }
      
      setSelectedSuggestionIndex(newIndex);
      const selectedSupplier = suggestions[newIndex];
      if (selectedSupplier) {
        setQuery(selectedSupplier.name);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length === 0) return;
      
      setIsNavigating(true);
      setShowDropdown(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = suggestions.length - 1;
      } else {
        newIndex = selectedSuggestionIndex - 1;
        if (newIndex < 0) newIndex = suggestions.length - 1;
      }
      
      setSelectedSuggestionIndex(newIndex);
      const selectedSupplier = suggestions[newIndex];
      if (selectedSupplier) {
        setQuery(selectedSupplier.name);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        selectSupplier(suggestions[selectedSuggestionIndex]);
      } else if (suggestions.length > 0 && suggestions[0]) {
        selectSupplier(suggestions[0]);
      } else if (originalQuery.trim()) {
        onAddNew(originalQuery.trim());
        setQuery("");
        setOriginalQuery("");
        setGhost("");
      }
      return;
    }
    
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      setOriginalQuery("");
      setGhost("");
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
      setShowDropdown(false);
      setIsNavigating(false);
      if (value) onClear();
      inputRef.current?.blur();
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setOriginalQuery(newValue);
    if (value && newValue !== value) onClear();
    setSelectedSuggestionIndex(-1);
    setShowDropdown(true);
    setIsNavigating(false);
  };

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, position: "relative" }}>
        <div style={{ position: "relative", flex: 1 }}>
          {ghost && !isNavigating && (
            <div
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                fontSize: "13px",
                fontFamily: "inherit",
                display: "flex",
                zIndex: 2,
                color: "#a0aec0",
              }}
            >
              <span style={{ visibility: "hidden" }}>{originalQuery}</span>
              <span style={{ color: "#a0aec0" }}>{ghost}</span>
            </div>
          )}
          
          <input
            ref={inputRef}
            className="sl-cust-input"
            style={{
              flex: 1,
              minWidth: 0,
              cursor: "text",
              background: "transparent",
              position: "relative",
              zIndex: 1,
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              outline: "none",
              padding: "6px 8px",
              fontSize: "13px",
              transition: "all 0.15s ease",
            }}
            value={value ? query || value : query}
            placeholder="Select supplier..."
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.target.style.borderColor = "#dc2626";
              e.target.style.boxShadow = "0 0 0 2px rgba(220,38,38,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#d1d5db";
              e.target.style.boxShadow = "none";
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {value && (
          <button
            className="xp-btn xp-btn-sm xp-btn-danger"
            style={{ height: 22, padding: "0 5px", fontSize: 10, flexShrink: 0 }}
            onMouseDown={(e) => {
              e.preventDefault();
              onClear();
              setQuery("");
              setOriginalQuery("");
              setGhost("");
              setSuggestions([]);
              setSelectedSuggestionIndex(-1);
              setShowDropdown(false);
              setIsNavigating(false);
              inputRef.current?.focus();
            }}
            title="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            marginTop: 2,
          }}
        >
          {suggestions.map((supplier, idx) => (
            <div
              key={supplier._id || idx}
              onClick={() => selectSupplier(supplier)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: idx === selectedSuggestionIndex ? "#fee2e2" : "white",
                borderBottom: "1px solid #f3f4f6",
                fontSize: 13,
              }}
              onMouseEnter={() => {
                setSelectedSuggestionIndex(idx);
                setIsNavigating(true);
                setQuery(supplier.name);
                setGhost("");
              }}
            >
              <div style={{ fontWeight: 500 }}>
                {supplier.code && <span style={{ color: "#6b7280", fontSize: 11 }}>[{supplier.code}]</span>} {supplier.name}
              </div>
              {supplier.phone && (
                <div style={{ fontSize: 10, color: "#6b7280" }}>📞 {supplier.phone}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PRODUCT SEARCH MODAL - BOLD UPPERCASE HEADERS
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
        (!ld || p.description?.toLowerCase().includes(ld) || p.code?.toLowerCase().includes(ld)) &&
        (!lc || p.category?.toLowerCase().includes(lc)) &&
        (!lo || p.company?.toLowerCase().includes(lo));
      if (!ok) return;
      const _name = [p.category, p.description, p.company].filter(Boolean).join(" ");
      if (p.packingInfo?.length > 0) {
        p.packingInfo.forEach((pk, i) =>
          res.push({
            ...p,
            _pi: i,
            _meas: pk.measurement,
            _rate: pk.purchaseRate || pk.costRate || 0,
            _pack: pk.packing,
            _stock: pk.openingQty || 0,
            _name,
          })
        );
      } else {
        res.push({ ...p, _pi: 0, _meas: "", _rate: 0, _pack: 1, _stock: 0, _name });
      }
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
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      nr ? nr.current?.focus() : (tbodyRef.current?.focus(), setHiIdx((h) => Math.max(0, h)));
    }
  };
  const tk = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx((i) => Math.min(i + 1, rows.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHiIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (hiIdx >= 0 && rows[hiIdx]) onSelect(rows[hiIdx]); }
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") { e.preventDefault(); rDesc.current?.focus(); }
  };

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="xp-modal xp-modal-lg" style={{ width: "95%", maxWidth: "1200px" }}>
        <div className="xp-modal-tb" style={{ background: "#dc2626" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="rgba(255,255,255,0.8)">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span className="xp-modal-title" style={{ color: "#fff", fontWeight: "bold" }}>SEARCH PRODUCTS (PURCHASE RETURN)</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="cs-modal-filters" style={{ 
          padding: "8px 12px", 
          gap: "10px", 
          background: "#f8fafc",
          borderBottom: "1px solid #dc2626",
          flexWrap: "wrap"
        }}>
          <div className="cs-modal-filter-grp" style={{ flex: 2, minWidth: "200px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>DESCRIPTION / CODE</label>
            <input ref={rDesc} type="text" className="xp-input" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => fk(e, rCat)} placeholder="Name / code…" autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #dc2626", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>CATEGORY</label>
            <input ref={rCat} type="text" className="xp-input" value={cat} onChange={(e) => setCat(e.target.value)} onKeyDown={(e) => fk(e, rCompany)} placeholder="e.g. SMALL" autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #dc2626", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>COMPANY</label>
            <input ref={rCompany} type="text" className="xp-input" value={company} onChange={(e) => setCompany(e.target.value)} onKeyDown={(e) => fk(e, null)} placeholder="e.g. LUX" autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #dc2626", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", paddingBottom: "2px" }}>
            <span style={{ fontSize: "11px", color: "#000000", fontWeight: "bold" }}>{rows.length} RESULT(S)</span>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px" }}>CLOSE</button>
          </div>
        </div>
        
        <div className="xp-modal-body" style={{ padding: 0 }}>
          <div className="xp-table-panel" style={{ border: "none" }}>
            <div className="xp-table-scroll" style={{ maxHeight: "60vh", overflow: "auto" }}>
              <table className="xp-table" style={{ borderCollapse: "collapse", width: "100%", border: "1px solid #dc2626" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ width: 50, padding: "8px 6px", textAlign: "center", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>SR.#</th>
                    <th style={{ width: 100, padding: "8px 6px", textAlign: "left", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>BARCODE</th>
                    <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>NAME</th>
                    <th style={{ width: 70, padding: "8px 6px", textAlign: "center", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>MEAS.</th>
                    <th style={{ width: 120, padding: "8px 6px", textAlign: "right", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>PURCHASE RATE</th>
                    <th style={{ width: 70, padding: "8px 6px", textAlign: "center", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>RACK#</th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef} tabIndex={0} onKeyDown={tk}>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px" }}>NO PRODUCTS FOUND</td>
                    </tr>
                  )}
                  {rows.map((r, i) => (
                    <tr key={`${r._id}-${r._pi}`} style={{ background: i === hiIdx ? "#fee2e2" : "white", cursor: "pointer" }} onClick={() => setHiIdx(i)} onDoubleClick={() => onSelect(r)}>
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "normal", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "6px 6px", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "normal", color: "#000000" }}><span className="xp-code">{r.code}</span></td>
                      <td style={{ padding: "6px 6px", border: "1px solid #dc2626", fontSize: "15px", fontWeight: "bold", color: "#000000" }}>
                        <button className="xp-link-btn" style={{ color: "#000000", textDecoration: "none", fontWeight: "bold", fontSize: "15px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: "0" }}>{r._name}</button>
                      </td>
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #dc2626", fontSize: "15px", fontWeight: "bold", color: "#000000" }}>{r._meas || "—"}</td>
                      <td style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #dc2626", fontSize: "15px", fontWeight: "bold", color: "#000000" }}>{Number(r._rate).toLocaleString("en-PK")}</td>
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #dc2626", fontSize: "15px", fontWeight: "bold", color: "#000000" }}>{r.rackNo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="cs-modal-hint" style={{ padding: "6px 12px", fontSize: "10px", color: "#000000", fontWeight: "bold", borderTop: "1px solid #dc2626", background: "#f8fafc" }}>
          ↑↓ NAVIGATE &nbsp;|&nbsp; ENTER / DOUBLE-CLICK = SELECT &nbsp;|&nbsp; ESC = CLOSE &nbsp;|&nbsp; TAB = FILTERS
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PURCHASE INVOICE SEARCH MODAL - BOLD UPPERCASE HEADERS
══════════════════════════════════════════════════════════ */
function SearchPurchaseModal({ onSelect, onClose }) {
  const [searchId, setSearchId] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiIdx, setHiIdx] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  
  const searchIdRef = useRef(null);
  const searchPhoneRef = useRef(null);
  const listRef = useRef(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.PURCHASES.GET_ALL);
      if (response.data.success) {
        let purchases = response.data.data;
        if (Array.isArray(purchases)) {
          if (searchId) {
            const searchIdLower = searchId.toLowerCase();
            purchases = purchases.filter(purchase => purchase.invoiceNo?.toLowerCase().includes(searchIdLower));
          }
          if (searchPhone) {
            const searchPhoneClean = searchPhone.replace(/\D/g, '');
            purchases = purchases.filter(purchase => {
              const supplierPhone = purchase.supplierPhone || "";
              const phoneClean = supplierPhone.replace(/\D/g, '');
              return phoneClean.includes(searchPhoneClean);
            });
          }
        }
        setInvoices(purchases);
        setTotalInvoices(purchases.length);
        setHiIdx(purchases.length > 0 ? 0 : -1);
      }
    } catch (error) {
      console.error("Failed to fetch purchase invoices:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [searchId, searchPhone]);

  useEffect(() => {
    setTimeout(() => searchIdRef.current?.focus(), 50);
  }, []);

  const handleFieldKeyDown = (e, fieldType) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (fieldType === "id") {
        searchPhoneRef.current?.focus();
      } else if (fieldType === "phone") {
        fetchInvoices();
        setTimeout(() => {
          listRef.current?.focus();
          setHiIdx(0);
        }, 100);
      }
    }
  };

  const handleListKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHiIdx((prev) => {
        const newIdx = Math.min(prev + 1, invoices.length - 1);
        setTimeout(() => { const selectedRow = listRef.current?.children[newIdx]; selectedRow?.scrollIntoView({ block: "nearest" }); }, 50);
        return newIdx;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHiIdx((prev) => {
        const newIdx = Math.max(prev - 1, 0);
        setTimeout(() => { const selectedRow = listRef.current?.children[newIdx]; selectedRow?.scrollIntoView({ block: "nearest" }); }, 50);
        return newIdx;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (invoices[hiIdx]) { onSelect(invoices[hiIdx]); }
      return;
    }
  };

  const clearFilters = () => {
    setSearchId("");
    setSearchPhone("");
    setTimeout(() => searchIdRef.current?.focus(), 50);
  };

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: "95%", maxWidth: "1200px", height: "85vh", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: "12px", background: "#ffffff", border: "2px solid #dc2626" }}>
        <div className="xp-modal-tb" style={{ background: "#dc2626", padding: "10px 16px", borderRadius: "10px 10px 0 0" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff", textTransform: "uppercase" }}>SEARCH PURCHASE INVOICE</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        <div className="cs-modal-filters" style={{ padding: "12px 16px", gap: "12px", background: "#f8fafc", borderBottom: "1px solid #dc2626", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, width: "100%", marginBottom: 12 }}>
            <div className="cs-modal-filter-grp" style={{ flex: 1 }}>
              <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block", textTransform: "uppercase" }}>INVOICE #</label>
              <input ref={searchIdRef} type="text" className="xp-input" value={searchId} onChange={(e) => setSearchId(e.target.value)} onKeyDown={(e) => handleFieldKeyDown(e, "id")} placeholder="Invoice number..." autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #dc2626", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
            </div>
            <div className="cs-modal-filter-grp" style={{ flex: 1 }}>
              <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block", textTransform: "uppercase" }}>SUPPLIER PHONE</label>
              <input ref={searchPhoneRef} type="tel" className="xp-input" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} onKeyDown={(e) => handleFieldKeyDown(e, "phone")} placeholder="Phone number..." autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #dc2626", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="xp-btn xp-btn-sm" onClick={clearFilters} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #dc2626", borderRadius: "4px", fontWeight: "bold" }}>CLEAR FILTERS</button>
              <button className="xp-btn xp-btn-sm" onClick={fetchInvoices} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #dc2626", borderRadius: "4px", fontWeight: "bold", background: "#dc2626", color: "#fff" }}>SEARCH</button>
              <span style={{ fontSize: "11px", color: "#000000", fontWeight: "bold", alignSelf: "center" }}>{totalInvoices} INVOICE(S) FOUND</span>
            </div>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #dc2626", borderRadius: "4px", fontWeight: "bold" }}>CLOSE</button>
          </div>
        </div>
        <div className="xp-modal-body" style={{ padding: 0, flex: 1, overflow: "hidden" }}>
          <div className="xp-table-panel" style={{ border: "none", height: "100%" }}>
            <div className="xp-table-scroll" style={{ height: "100%", overflow: "auto", maxHeight: "calc(85vh - 150px)" }}>
              <table className="xp-table" style={{ fontSize: "12px", borderCollapse: "collapse", width: "100%", border: "1px solid #dc2626" }}>
                <thead><tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ width: 40, padding: "8px 4px", textAlign: "center", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>#</th>
                  <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>INVOICE #</th>
                  <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>DATE</th>
                  <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>SUPPLIER NAME</th>
                  <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>PHONE</th>
                  <th style={{ width: 100, padding: "8px 4px", textAlign: "right", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>TOTAL AMOUNT</th>
                  <th style={{ width: 60, padding: "8px 4px", textAlign: "center", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>ITEMS</th>
                </tr></thead>
                <tbody ref={listRef} tabIndex={0} onKeyDown={handleListKeyDown}>
                  {loading && <tr><td colSpan={7} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>LOADING...</td></tr>}
                  {!loading && invoices.length === 0 && <tr><td colSpan={7} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>NO PURCHASE INVOICES FOUND.</td></tr>}
                  {invoices.map((inv, i) => (
                    <tr key={inv._id} style={{ background: i === hiIdx ? "#fee2e2" : "white", cursor: "pointer" }} onClick={() => setHiIdx(i)} onDoubleClick={() => onSelect(inv)}>
                      <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#000000", fontFamily: "monospace" }}>{inv.invoiceNo || "N/A"}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #dc2626", fontSize: "11px", color: "#000000" }}>{inv.invoiceDate?.split("T")[0] || "-"}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#000000" }}>{inv.supplierName || "N/A"}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #dc2626", fontSize: "11px", color: "#000000" }}>{inv.supplierPhone || "-"}</td>
                      <td style={{ padding: "6px 4px", textAlign: "right", border: "1px solid #dc2626", fontSize: "12px", fontWeight: "bold", color: "#dc2626" }}>{Number(inv.netTotal || inv.total || 0).toLocaleString("en-PK")}</td>
                      <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #dc2626", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{inv.items?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: "1px solid #dc2626", background: "#f8fafc", borderRadius: "0 0 10px 10px" }}>
          <div className="cs-modal-hint" style={{ margin: 0, fontSize: "10px", fontWeight: "bold", color: "#000000" }}>⬆⬇ = NAVIGATE RESULTS &nbsp;|&nbsp; ENTER = SELECT INVOICE &nbsp;|&nbsp; TAB BETWEEN FIELDS &nbsp;|&nbsp; ESC = CLOSE</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HOLD PREVIEW MODAL
══════════════════════════════════════════════════════════ */
function HoldPreviewModal({ bill, onResume, onClose }) {
  if (!bill) return null;
  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="xp-modal" style={{ width: 560 }}>
        <div className="xp-modal-tb" style={{ background: "#dc2626" }}>
          <span className="xp-modal-title">HOLD RETURN — {bill.returnNo}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button>
        </div>
        <div className="xp-modal-body" style={{ padding: 8 }}>
          <div style={{ marginBottom: 6, display: "flex", gap: 16, fontSize: "var(--xp-fs-xs)" }}>
            <span><b>SUPPLIER:</b> {bill.supplierName}</span>
            <span><b>ITEMS:</b> {bill.items.length}</span>
            <span><b>AMOUNT:</b> <span style={{ color: "#dc2626", fontWeight: 700 }}>{Number(bill.amount).toLocaleString("en-PK")}</span></span>
          </div>
          <div className="xp-table-panel" style={{ border: "none" }}>
            <div className="xp-table-scroll" style={{ maxHeight: 300 }}>
              <table className="xp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>CODE</th>
                    <th>NAME</th>
                    <th>UOM</th>
                    <th className="r">PCS</th>
                    <th className="r">RATE</th>
                    <th className="r">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((r, i) => (
                    <tr key={i}>
                      <td className="text-muted">{i + 1}</td>
                      <td className="text-muted">{r.code}</td>
                      <td>{r.name}</td>
                      <td className="text-muted">{r.uom}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">{fmt(r.rate)}</td>
                      <td className="r" style={{ color: "#dc2626", fontWeight: 700 }}>{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderTop: "1px solid var(--xp-silver-5)", justifyContent: "flex-end" }}>
          <button className="xp-btn xp-btn-sm" onClick={onClose}>CANCEL</button>
          <button className="xp-btn xp-btn-primary xp-btn-sm" style={{ background: "#dc2626", borderColor: "#991b1b" }} onClick={() => onResume(bill.id)}>RESUME THIS RETURN</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PURCHASE RETURN PAGE
══════════════════════════════════════════════════════════ */
export default function PurchaseReturnPage() {
  const [time, setTime] = useState(timeNow());
  const [allProducts, setAllProducts] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [allPurchaseInvoices, setAllPurchaseInvoices] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPurchaseSearchModal, setShowPurchaseSearchModal] = useState(false);
  const [showHoldPreview, setShowHoldPreview] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [curRow, setCurRow] = useState({ ...EMPTY_ROW });
  const [items, setItems] = useState([]);
  const [returnDate, setReturnDate] = useState(isoDate());
  const [returnNo, setReturnNo] = useState("1");
  const [purchaseInvNo, setPurchaseInvNo] = useState("");
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(-1);
  const amountRef = useRef(null);

  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [printType, setPrintType] = useState("Thermal");
  const [editId, setEditId] = useState(null);
  const [remarks, setRemarks] = useState("");

  const [holdBills, setHoldBills] = useState(() => loadPurchaseReturnHolds());
  const [selItemIdx, setSelItemIdx] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [packingOptions, setPackingOptions] = useState([]);

  const searchRef = useRef(null);
  const pcsRef = useRef(null);
  const rateRef = useRef(null);
  const addRef = useRef(null);
  const saveRef = useRef(null);
  const purchaseInvRef = useRef(null);
  const packingRef = useRef(null);
  const refundRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchData();
    fetchAllPurchaseInvoices();
  }, []);

  // Focus on Purchase Invoice # input on page load
  useEffect(() => {
    setTimeout(() => {
      purchaseInvRef.current?.focus();
    }, 200);
  }, []);

  useEffect(() => {
    savePurchaseReturnHolds(holdBills);
  }, [holdBills]);

  const subTotal = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalQty = items.reduce((s, r) => s + (parseFloat(r.pcs) || 0), 0);
  const balance = subTotal - (parseFloat(refundAmount) || 0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes] = await Promise.all([
        api.get(EP.PRODUCTS.GET_ALL),
      ]);
      
      if (pRes.data.success) setAllProducts(pRes.data.data);
      
      try {
        const sRes = await api.get("/customers/suppliers/all");
        if (sRes.data && sRes.data.success) {
          setAllSuppliers(sRes.data.data);
        } else {
          const allRes = await api.get(EP.CUSTOMERS.GET_ALL);
          if (allRes.data && allRes.data.success) {
            const suppliers = allRes.data.data.filter(c => 
              c.type === "supplier" || c.customerType === "supplier"
            );
            setAllSuppliers(suppliers);
          }
        }
      } catch (err) {
        setAllSuppliers([]);
      }
      
    } catch (error) {
      console.error("Failed to load data", error);
      showMsg("Failed to load data", "error");
    }
    setLoading(false);
  };

  const fetchAllPurchaseInvoices = async () => {
    try {
      const response = await api.get(EP.PURCHASES.GET_ALL);
      if (response.data.success && response.data.data) {
        setAllPurchaseInvoices(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch purchase invoices:", error);
    }
  };

  // Generate next return number (simple sequential)
  const generateNextReturnNo = async () => {
    try {
      const response = await api.get(EP.PURCHASES.GET_ALL);
      if (response.data.success && response.data.data) {
        // Filter only purchase returns (where type is purchase_return)
        const returns = response.data.data.filter(inv => inv.type === "purchase_return" || inv.returnNo);
        const maxNum = returns.reduce((max, inv) => {
          const num = parseInt(inv.returnNo || inv.invoiceNo) || 0;
          return Math.max(max, num);
        }, 0);
        setReturnNo(String(maxNum + 1));
      } else {
        setReturnNo("1");
      }
    } catch {
      setReturnNo("1");
    }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3500);
  };

  const loadPurchaseByInv = async (purchaseData = null) => {
    if (purchaseData) {
      try {
        setSupplierId(purchaseData.supplierId || "");
        setSupplierName(purchaseData.supplierName || "");
        setSupplierCode(purchaseData.supplierCode || "");
        
        const loadedItems = (purchaseData.items || []).map((it) => ({
          productId: it.productId || it.product || "",
          code: it.code || "",
          name: it.name || it.description || "",
          uom: it.uom || it.measurement || "",
          rack: it.rack || "",
          pcs: it.pcs || it.qty || 1,
          rate: it.rate || 0,
          amount: it.amount || 0,
        }));
        setItems(loadedItems);
        setPurchaseInvNo(purchaseData.invoiceNo || "");
        setRefundAmount(loadedItems.reduce((s, r) => s + (r.amount || 0), 0));
        
        if (purchaseData.invoiceDate) {
          setReturnDate(purchaseData.invoiceDate.split("T")[0]);
        }
        
        // Generate next return number
        await generateNextReturnNo();
        
        const index = allPurchaseInvoices.findIndex(inv => inv.invoiceNo === purchaseData.invoiceNo);
        setCurrentInvoiceIndex(index);
        
        showMsg(`Loaded ${loadedItems.length} items from ${purchaseData.invoiceNo}`, "success");
        setShowPurchaseSearchModal(false);
        setTimeout(() => searchRef.current?.focus(), 50);
      } catch (error) {
        showMsg("Failed to load purchase invoice", "error");
      }
      return;
    }
    
    if (!purchaseInvNo.trim()) {
      setShowPurchaseSearchModal(true);
      return;
    }
    
    try {
      const r = await api.get(EP.PURCHASES.GET_ALL);
      if (r.data.success && r.data.data) {
        const purchase = r.data.data.find(s => s.invoiceNo === purchaseInvNo.trim());
        if (!purchase) { showMsg("Invoice not found", "error"); return; }
        
        setSupplierId(purchase.supplierId || "");
        setSupplierName(purchase.supplierName || "");
        setSupplierCode(purchase.supplierCode || "");
        
        const loadedItems = (purchase.items || []).map((it) => ({
          productId: it.productId || it.product || "",
          code: it.code || "",
          name: it.name || it.description || "",
          uom: it.uom || it.measurement || "",
          rack: it.rack || "",
          pcs: it.pcs || it.qty || 1,
          rate: it.rate || 0,
          amount: it.amount || 0,
        }));
        setItems(loadedItems);
        setRefundAmount(loadedItems.reduce((s, r) => s + (r.amount || 0), 0));
        
        if (purchase.invoiceDate) {
          setReturnDate(purchase.invoiceDate.split("T")[0]);
        }
        
        // Generate next return number
        await generateNextReturnNo();
        
        showMsg(`Loaded ${loadedItems.length} items from ${purchaseInvNo}`, "success");
        const index = allPurchaseInvoices.findIndex(inv => inv.invoiceNo === purchaseInvNo.trim());
        setCurrentInvoiceIndex(index);
        setTimeout(() => searchRef.current?.focus(), 50);
      } else { showMsg("Invoice not found", "error"); }
    } catch { showMsg("Could not load purchase invoice", "error"); }
  };

  const loadNextInvoice = () => {
    if (currentInvoiceIndex < allPurchaseInvoices.length - 1) {
      const nextInvoice = allPurchaseInvoices[currentInvoiceIndex + 1];
      loadPurchaseByInv(nextInvoice);
    } else { showMsg("No more invoices", "info"); }
  };

  const loadPrevInvoice = () => {
    if (currentInvoiceIndex > 0) {
      const prevInvoice = allPurchaseInvoices[currentInvoiceIndex - 1];
      loadPurchaseByInv(prevInvoice);
    } else { showMsg("No previous invoices", "info"); }
  };

  const handleSupplierSelect = (supplier) => {
    setSupplierId(supplier._id);
    setSupplierName(supplier.name);
    setSupplierCode(supplier.code || "");
  };

  const handleSupplierClear = () => {
    setSupplierId("");
    setSupplierName("");
    setSupplierCode("");
  };

  const handleAddNewSupplier = async (name) => {
    try {
      const { data } = await api.post(EP.CUSTOMERS.CREATE, {
        name: name.trim(),
        type: "supplier",
        phone: "",
      });
      if (data.success) {
        await fetchData();
        setSupplierId(data.data._id);
        setSupplierName(data.data.name);
        setSupplierCode(data.data.code || "");
        showMsg(`"${name}" saved as new supplier`, "success");
      }
    } catch {
      showMsg("Supplier save failed", "error");
    }
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
    setTimeout(() => packingRef.current?.focus(), 30);
  };

  const updateCurRow = (field, val) => {
    setCurRow((prev) => {
      const u = { ...prev, [field]: val };
      u.amount = (parseFloat(field === "pcs" ? val : u.pcs) || 0) * (parseFloat(field === "rate" ? val : u.rate) || 0);
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
    // Update refund amount
    setRefundAmount(items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) + (curRow.amount || 0));
  };

  const resetCurRow = () => {
    setCurRow({ ...EMPTY_ROW });
    setSearchText("");
    setPackingOptions([]);
    setSelItemIdx(null);
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
    setTimeout(() => packingRef.current?.focus(), 30);
  };

  const removeRow = (index) => {
    setItems((p) => p.filter((_, i) => i !== index));
    if (selItemIdx === index) resetCurRow();
    // Update refund amount
    const newTotal = items.reduce((s, r, i) => s + (i !== index ? (parseFloat(r.amount) || 0) : 0), 0);
    setRefundAmount(newTotal);
  };

  const holdBill = () => {
    if (!items.length) return;
    setHoldBills((p) => [...p, {
      id: Date.now(),
      returnNo,
      amount: subTotal,
      items: [...items],
      supplierId,
      supplierName,
      supplierCode,
      purchaseInvNo,
      remarks,
    }]);
    fullReset();
    generateNextReturnNo();
  };

  const resumeHold = (holdId) => {
    const bill = holdBills.find((b) => b.id === holdId);
    if (!bill) return;
    setItems(bill.items);
    setSupplierId(bill.supplierId || "");
    setSupplierName(bill.supplierName || "");
    setSupplierCode(bill.supplierCode || "");
    setPurchaseInvNo(bill.purchaseInvNo || "");
    setRemarks(bill.remarks || "");
    setRefundAmount(bill.items.reduce((s, r) => s + (r.amount || 0), 0));
    setHoldBills((p) => p.filter((b) => b.id !== holdId));
    setShowHoldPreview(null);
    resetCurRow();
  };

  const deleteHold = (holdId, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this held return?"))
      setHoldBills((p) => p.filter((b) => b.id !== holdId));
  };

  const fullReset = () => {
    setItems([]);
    setCurRow({ ...EMPTY_ROW });
    setSearchText("");
    setPackingOptions([]);
    setSupplierId("");
    setSupplierName("");
    setSupplierCode("");
    setRefundAmount(0);
    setPurchaseInvNo("");
    setEditId(null);
    setSelItemIdx(null);
    setMsg({ text: "", type: "" });
    setRemarks("");
    setReturnDate(isoDate());
    generateNextReturnNo();
    setTimeout(() => purchaseInvRef.current?.focus(), 50);
  };

  const saveAndPrintDirect = async () => {
    if (!items.length) { alert("Add at least one item"); return; }
    if (!supplierName) { alert("Please select a supplier"); return; }
    
    setLoading(true);
    try {
      const payload = {
        returnNo,
        returnDate,
        purchaseInvNo: purchaseInvNo || "",
        supplierId: supplierId || undefined,
        supplierName: supplierName,
        supplierCode: supplierCode,
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
        paidAmount: parseFloat(refundAmount) || 0,
        balance,
        printType,
        remarks: remarks || "",
        type: "purchase_return",
      };
      
      let response;
      if (editId) {
        response = await api.put(EP.PURCHASES.UPDATE(editId), payload);
      } else {
        response = await api.post(EP.PURCHASES.CREATE, payload);
      }
      
      if (response.data.success) {
        showMsg(editId ? "Return updated!" : `Saved: ${response.data.data.returnNo || response.data.data.invoiceNo}`);
        
        const retObj = {
          returnNo: response.data.data.returnNo || response.data.data.invoiceNo || returnNo,
          returnDate,
          purchaseInvNo,
          supplierName,
          items,
          subTotal,
          netTotal: subTotal,
          paidAmount: refundAmount,
          balance,
        };
        doPrint(retObj, printType, { supplierName });
        
        fullReset();
        generateNextReturnNo();
        setTimeout(() => purchaseInvRef.current?.focus(), 100);
      } else { showMsg(response.data.message, "error"); }
    } catch (e) {
      console.error("Save error:", e);
      showMsg(e.response?.data?.message || "Save failed", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if (showProductModal || showHoldPreview || showPurchaseSearchModal) return;
      if (e.key === "*") {
        e.preventDefault();
        if (items.length === 0) { showMsg("Add at least one item first", "error"); return; }
        if (!supplierName) { showMsg("Please select a supplier", "error"); return; }
        saveAndPrintDirect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, showProductModal, showHoldPreview, showPurchaseSearchModal, supplierName]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "F2") { e.preventDefault(); setShowProductModal(true); }
      if (e.key === "F4") { e.preventDefault(); holdBill(); }
      if (e.key === "F10" || (e.ctrlKey && e.key === "s")) { e.preventDefault(); saveAndPrintDirect(); }
      if (e.key === "Escape" && !showProductModal && !showHoldPreview) resetCurRow();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, showProductModal, showHoldPreview]);

  return (
    <>
      <div className="sl-page purchase-return-page">
        {showProductModal && (
          <SearchModal allProducts={allProducts} onSelect={pickProduct} onClose={() => { setShowProductModal(false); setTimeout(() => searchRef.current?.focus(), 30); }} />
        )}
        {showPurchaseSearchModal && (
          <SearchPurchaseModal onSelect={(purchase) => loadPurchaseByInv(purchase)} onClose={() => setShowPurchaseSearchModal(false)} />
        )}
        {showHoldPreview && (
          <HoldPreviewModal bill={showHoldPreview} onResume={resumeHold} onClose={() => setShowHoldPreview(null)} />
        )}

        <div className="xp-titlebar" style={{ background: "#dc2626" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM2 10h2a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2m4 0h6a1 1 0 0 1 0 2H6a1 1 0 0 1 0-2" />
          </svg>
          <span className="xp-tb-title">PURCHASE RETURN — ASIM ELECTRIC &amp; ELECTRONIC STORE</span>
          <div className="xp-tb-actions">
            <div className="sl-shortcut-hints"><span>F2 PRODUCT</span><span>F4 HOLD</span><span>* SAVE</span></div>
            <div className="xp-tb-divider" />
            <button className="xp-cap-btn">─</button>
            <button className="xp-cap-btn" onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }}>□</button>
            <button className="xp-cap-btn xp-cap-close">✕</button>
          </div>
        </div>

        {msg.text && <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "4px 10px 0", flexShrink: 0 }}>{msg.text}</div>}

        <div className="sl-body">
          <div className="sl-left" style={{ width: "100%" }}>
            <div className="sl-top-bar">
              <div className="sl-sale-title-box" style={{ background: "#dc2626", border: "1px solid #991b1b" }}>PURCHASE RETURN</div>
              
              <div className="sl-inv-field-grp">
                <label>PURCHASE INVOICE #</label>
                <div className="sl-inv-nav-container">
                  <button className="sl-inv-nav-btn sl-inv-nav-prev" onClick={loadPrevInvoice} disabled={currentInvoiceIndex <= 0} type="button">◀</button>
                  <input 
                    ref={purchaseInvRef}
                    className="xp-input xp-input-sm sl-inv-input-large" 
                    value={purchaseInvNo} 
                    onChange={(e) => setPurchaseInvNo(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (purchaseInvNo.trim()) { loadPurchaseByInv(); } 
                        else { setShowPurchaseSearchModal(true); }
                      }
                      if (e.key === "ArrowLeft") { e.preventDefault(); loadPrevInvoice(); }
                      if (e.key === "ArrowRight") { e.preventDefault(); loadNextInvoice(); }
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="ENTER PURCHASE INVOICE #"
                  />
                  <button className="sl-inv-nav-btn sl-inv-nav-next" onClick={loadNextInvoice} disabled={currentInvoiceIndex >= allPurchaseInvoices.length - 1} type="button">▶</button>
                </div>
              </div>
              
              <div className="sl-inv-field-grp">
                <label>RETURN #</label>
                <input className="xp-input xp-input-sm sl-inv-input-large" value={editId ? "EDIT MODE" : returnNo} readOnly style={{ background: "#f5f5f5" }} />
              </div>
              
              <div className="sl-inv-field-grp">
                <label>DATE</label>
                <input type="date" className="xp-input xp-input-sm sl-date-input" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} style={{ borderColor: "#dc2626" }} />
              </div>
              
              <div className="sl-inv-field-grp">
                <label>TIME</label>
                <div className="sl-time-box">{time}</div>
              </div>
            </div>

            <div className="sl-entry-strip">
              <div className="sl-entry-cell sl-entry-product">
                <label>SELECT PRODUCT <kbd>F2</kbd></label>
                <div style={{ position: "relative", flex: 1 }}>
                  <input 
                    ref={searchRef} 
                    type="text" 
                    className="sl-product-input" 
                    style={{ width: "100%", background: "#fffde7", borderColor: "#dc2626" }} 
                    value={searchText} 
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") { e.preventDefault(); setShowProductModal(true); }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!searchText.trim()) { setShowProductModal(true); return; }
                        const q = searchText.trim().toLowerCase();
                        const found = allProducts.find((p) => p.code?.toLowerCase() === q || p.description?.toLowerCase().includes(q));
                        if (found) {
                          const pk = found.packingInfo?.[0];
                          pickProduct({ 
                            ...found, 
                            _pi: 0, 
                            _meas: pk?.measurement || "", 
                            _rate: pk?.purchaseRate || pk?.costRate || 0, 
                            _pack: pk?.packing || 1, 
                            _stock: pk?.openingQty || 0, 
                            _name: [found.category, found.description, found.company].filter(Boolean).join(" ") 
                          });
                        } else { alert(`"${searchText}" — PRODUCT NOT FOUND`); searchRef.current?.select(); }
                      }
                    }} 
                    onChange={(e) => { setSearchText(e.target.value); if (curRow.name) { setCurRow({ ...EMPTY_ROW }); } }} 
                  />
                </div>
              </div>
              <div className="sl-entry-cell">
                <label>PACKING</label>
                <input ref={packingRef} type="text" className="sl-num-input" style={{ width: 70, background: "#fffde7", borderColor: "#dc2626" }} value={curRow.uom} onChange={(e) => setCurRow((p) => ({ ...p, uom: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); pcsRef.current?.focus(); } }} />
              </div>
              <div className="sl-entry-cell">
                <label>QTY</label>
                <input ref={pcsRef} type="text" className="sl-num-input" style={{ width: 60, background: "#fffde7", borderColor: "#dc2626" }} value={curRow.pcs} min={1} onChange={(e) => updateCurRow("pcs", e.target.value)} onKeyDown={(e) => e.key === "Enter" && rateRef.current?.focus()} onFocus={(e) => e.target.select()} />
              </div>
              <div className="sl-entry-cell">
                <label>PURCHASE RATE</label>
                <input ref={rateRef} type="text" className="sl-num-input" style={{ width: 75, background: "#fffde7", borderColor: "#dc2626" }} value={curRow.rate} min={0} onChange={(e) => updateCurRow("rate", e.target.value)} onKeyDown={(e) => e.key === "Enter" && amountRef.current?.focus()} onFocus={(e) => e.target.select()} />
              </div>
              <div className="sl-entry-cell">
                <label>AMOUNT</label>
                <input ref={amountRef} type="text" className="sl-num-input" style={{ width: 80, background: "#fffde7", borderColor: "#dc2626" }} value={curRow.amount || 0} onChange={(e) => setCurRow((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === "Enter" && addRef.current?.click()} />
              </div>
              <div className="sl-entry-cell sl-entry-btns-cell">
                <label>&nbsp;</label>
                <div className="sl-entry-btns">
                  <button className="xp-btn xp-btn-sm" onClick={resetCurRow}>RESET</button>
                  <button ref={addRef} className="xp-btn xp-btn-primary xp-btn-sm" style={{ background: "#dc2626", borderColor: "#991b1b" }} onClick={addRow}>{selItemIdx !== null ? "UPDATE" : "ADD"}</button>
                  <button className="xp-btn xp-btn-sm" disabled={selItemIdx === null} onClick={() => selItemIdx !== null && loadRowForEdit(selItemIdx)}>EDIT</button>
                  <button className="xp-btn xp-btn-danger xp-btn-sm" disabled={selItemIdx === null} onClick={() => removeRow(selItemIdx)}>REMOVE</button>
                </div>
              </div>
            </div>

            <div className="sl-table-header-bar">
              <span className="sl-table-lbl">{curRow.name ? <span className="sl-cur-name-inline">{curRow.name}</span> : "SELECT PRODUCT"}</span>
              <span className="sl-table-qty">TOTAL QTY: {totalQty.toLocaleString("en-PK")}</span>
            </div>

            <div className="sl-items-wrap">
              <table className="sl-items-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>SR.#</th>
                    <th style={{ width: 72 }}>CODE</th>
                    <th>PRODUCT NAME</th>
                    <th style={{ width: 65 }}>UOM</th>
                    <th style={{ width: 55 }} className="r">QTY</th>
                    <th style={{ width: 80 }} className="r">RATE</th>
                    <th style={{ width: 90 }} className="r">AMOUNT</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="xp-empty" style={{ padding: 14 }}>ADD PRODUCTS TO CREATE PURCHASE RETURN</td>
                    </tr>
                  )}
                  {items.map((r, i) => (
                    <tr key={i} className={selItemIdx === i ? "sl-sel-row" : ""} onClick={() => setSelItemIdx(i === selItemIdx ? null : i)} onDoubleClick={() => loadRowForEdit(i)}>
                      <td className="muted" style={{ textAlign: "center" }}>{i + 1}</td>
                      <td className="muted">{r.code}</td>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td className="muted">{r.uom}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">{Number(r.rate).toLocaleString("en-PK")}</td>
                      <td className="r" style={{ color: "#dc2626", fontWeight: "bold" }}>{Number(r.amount).toLocaleString("en-PK")}</td>
                      <td><button className="xp-btn xp-btn-sm xp-btn-danger" style={{ padding: "2px 6px" }} onClick={() => removeRow(i)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sl-summary-bar">
              <div className="sl-sum-cell"><label>TOTAL QTY</label><input className="sl-sum-val" value={totalQty.toLocaleString("en-PK")} readOnly /></div>
              <div className="sl-sum-cell"><label>RETURN AMOUNT</label><input className="sl-sum-val" style={{ color: "#dc2626", fontWeight: "bold" }} value={Number(subTotal).toLocaleString("en-PK")} readOnly /></div>
              
              <div className="sl-cust-cell" style={{ width: 120 }}>
                <label>SUPPLIER CODE</label>
                <input type="text" className="sl-cust-input" style={{ width: 100, background: "#fffde7", borderColor: "#dc2626" }} value={supplierCode} readOnly placeholder="CODE" />
              </div>
              
              <div className="sl-cust-cell" style={{ flex: 2 }}>
                <label>SUPPLIER NAME</label>
                <SupplierDropdown
                  allSuppliers={allSuppliers}
                  value={supplierName}
                  displayName={supplierName}
                  onSelect={handleSupplierSelect}
                  onClear={handleSupplierClear}
                  onAddNew={handleAddNewSupplier}
                />
              </div>
              
              <div className="sl-sum-cell">
                <label>REFUND AMOUNT</label>
                <input ref={refundRef} type="number" className="sl-sum-input" style={{ background: "#fffde7", borderColor: "#dc2626", color: "#059669", fontWeight: "bold" }} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveAndPrintDirect()} onFocus={(e) => e.target.select()} />
              </div>
              
              <div className="sl-sum-cell">
                <label>BALANCE</label>
                <input className="sl-sum-val" style={{ color: balance > 0 ? "#dc2626" : "#059669", fontWeight: "bold" }} value={Number(balance).toLocaleString("en-PK")} readOnly />
              </div>
            </div>

            <div className="sl-customer-bar">
              <div className="sl-cust-cell" style={{ flex: 1 }}>
                <label>REMARKS (OPTIONAL)</label>
                <input className="sl-cust-input" style={{ width: "100%", background: "#fffde7", borderColor: "#dc2626" }} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="RETURN REASON..." />
              </div>
            </div>
          </div>
           {/* Right panel - Hold Bills */}
        <div className="sl-right">
          <div className="sl-hold-panel">
            <div className="sl-hold-title" style={{ background: "#dc2626" }}>
              <span>HOLD BILLS <kbd style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "0 3px", borderRadius: 2 }}>F4</kbd></span>
              <span className="sl-hold-cnt">{holdBills.length}</span>
            </div>
            <div className="sl-hold-table-wrap">
              <table className="sl-hold-table">
                <thead>
                  <tr>
                    <th style={{ width: 24 }}>#</th>
                    <th>RETURN #</th>
                    <th className="r">AMOUNT</th>
                    <th>SUPPLIER</th>
                    <th style={{ width: 22 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {holdBills.length === 0 ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} style={{ height: 22 }} />
                      </tr>
                    ))
                  ) : (
                    holdBills.map((b, i) => (
                      <tr
                        key={b.id}
                        onClick={() => setShowHoldPreview(b)}
                        onDoubleClick={() => resumeHold(b.id)}
                        title="CLICK = PREVIEW · DOUBLE-CLICK = RESUME"
                        style={{ cursor: "pointer" }}
                      >
                        <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>{i + 1}</td>
                        <td style={{ fontFamily: "var(--xp-mono)", fontSize: "var(--xp-fs-xs)" }}>{b.returnNo}</td>
                        <td className="r" style={{ color: "#dc2626" }}>{fmt(b.amount)}</td>
                        <td className="muted" style={{ fontSize: "var(--xp-fs-xs)" }}>{b.supplierName || "N/A"}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="xp-btn xp-btn-sm xp-btn-ico"
                            style={{ width: 18, height: 18, fontSize: 9, color: "var(--xp-red)" }}
                            onClick={(e) => deleteHold(b.id, e)}
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
                style={{ width: "100%", background: "#dc2626", color: "white", borderColor: "#991b1b" }}
                onClick={holdBill}
                disabled={!items.length}
              >
                HOLD BILL (F4)
              </button>
            </div>
            <div className="sl-hold-hint" style={{ padding: "4px 8px", fontSize: 10, color: "#666", textAlign: "center", borderTop: "1px solid #e5e7eb" }}>
              CLICK = PREVIEW · DOUBLE-CLICK = RESUME · ✕ = DELETE
            </div>
          </div>
        </div>
        </div>

       

        <div className="sl-cmd-bar">
          <button className="xp-btn xp-btn-sm" onClick={fullReset} disabled={loading}>🆕 NEW RETURN</button>
          <button ref={saveRef} className="xp-btn xp-btn-primary xp-btn-lg" style={{ background: "#dc2626", borderColor: "#991b1b" }} onClick={saveAndPrintDirect} disabled={loading || items.length === 0 || !supplierName}>{loading ? "SAVING…" : "💾 SAVE RETURN  *"}</button>
          <button className="xp-btn xp-btn-sm" onClick={holdBill} disabled={!items.length}>📌 HOLD (F4)</button>
          <div className="xp-toolbar-divider" />
          <div className="sl-print-types">
            {["Thermal", "A4", "A5"].map((pt) => (<label key={pt} className="sl-check-label"><input type="radio" name="pt" checked={printType === pt} onChange={() => setPrintType(pt)} /> {pt}</label>))}
          </div>
          <div className="xp-toolbar-divider" />
          <span className="sl-inv-info">{returnNo} | ITEMS: {items.length} | TOTAL: {Number(subTotal).toLocaleString("en-PK")}</span>
          <button className="xp-btn xp-btn-sm" style={{ marginLeft: "auto" }} onClick={fullReset}>CLOSE</button>
        </div>
      </div>

      <style>{`
        .purchase-return-page {
          background: #ffffff;
        }
        
        .purchase-return-page input, 
        .purchase-return-page .xp-input, 
        .purchase-return-page .sl-product-input, 
        .purchase-return-page .sl-num-input, 
        .purchase-return-page .sl-sum-input, 
        .purchase-return-page .sl-cust-input,
        .purchase-return-page .sl-inv-input-large,
        .purchase-return-page .sl-date-input,
        .purchase-return-page .sl-sum-val {
          border-color: #dc2626 !important;
          border-width: 1px !important;
          border-style: solid !important;
        }
        
        .purchase-return-page .sl-items-table th,
        .purchase-return-page .sl-items-table td {
          border-color: #dc2626 !important;
          border-width: 1px !important;
        }
        
        .purchase-return-page .sl-items-table thead th {
          background: #dc2626 !important;
          color: white !important;
        }
        
        .purchase-return-page tr.sl-sel-row td {
          background-color: #fee2e2 !important;
        }
        
        .purchase-return-page .sl-summary-bar {
          border-top: 1px solid #dc2626;
          margin-top: 4px;
        }

        .purchase-return-page .sl-inv-nav-container {
          position: relative;
          display: inline-block;
        }

        .purchase-return-page .sl-inv-nav-btn {
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

        .purchase-return-page .sl-inv-nav-btn:hover {
          background: #dc2626;
          border-color: #991b1b;
          color: white;
        }

        .purchase-return-page .sl-inv-nav-prev {
          left: 4px;
        }

        .purchase-return-page .sl-inv-nav-next {
          right: 4px;
        }

        .purchase-return-page .sl-inv-input-large {
          width: 180px !important;
          text-align: center !important;
          padding: 6px 32px !important;
          font-size: 18px !important;
          font-weight: bold !important;
          background: #ffffff !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
        }

        .purchase-return-page .sl-product-input {
          background-color: #fffde7 !important;
        }

        .purchase-return-page .sl-num-input, 
        .purchase-return-page .sl-sum-input, 
        .purchase-return-page .sl-cust-input {
          background-color: #fffde7 !important;
        }

        .purchase-return-page .sl-sum-val, 
        .purchase-return-page .sl-date-input[readonly] {
          background-color: #f5f5f5 !important;
        }

        .purchase-return-page .sl-right {
          width: 280px;
          flex-shrink: 0;
        }
      `}</style>
    </>
  );
}