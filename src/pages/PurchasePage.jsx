// pages/PurchasePage.jsx
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
const PURCHASE_HOLD_KEY = "asim_purchase_hold_v1";

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

import { SHOP_INFO, URDU_FONT, GOOGLE_FONT_LINK, getShopHeaderHTML, getShopBannerHTML, getShopTermsHTML, getShopFooterHTML } from "../constants/shopInfo.js";


/* ── localStorage helpers for Hold ── */
const loadPurchaseHolds = () => {
  try {
    return JSON.parse(localStorage.getItem(PURCHASE_HOLD_KEY) || "[]");
  } catch {
    return [];
  }
};
const savePurchaseHolds = (holds) => {
  try {
    localStorage.setItem(PURCHASE_HOLD_KEY, JSON.stringify(holds));
  } catch {}
};

// Clean invoice number function - removes PUR- prefix and leading zeros
const cleanInvoiceNo = (invNo) => {
  let cleaned = String(invNo || "0");
  cleaned = cleaned.replace(/^PUR-/i, '');
  cleaned = cleaned.replace(/^0+/, '');
  cleaned = parseInt(cleaned, 10);
  if (isNaN(cleaned)) return "1";
  return String(cleaned);
};

/* ══════════════════════════════════════════════════════════
   PRINT HTML BUILDER — Purchase Invoice
══════════════════════════════════════════════════════════ */
const buildPrintHtml = (purchase, type, overrides = {}) => {
  const buyerName = overrides.buyerName ?? purchase.supplierName;
  const buyerPhone = overrides.buyerPhone ?? "";
  const remarks = overrides.remarks || purchase.remarks || "";
  const rows = purchase.items.map((it, i) => ({ ...it, sr: i + 1 }));
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
      .banner{background:#555;color:#fff;font-size:8px;text-align:center;padding:2px 4px;margin:3px 0;font-family:${URDU_FONT};direction:rtl;line-height:1.8}
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
      .remarks-box{font-size:8px;color:#555;margin-top:3px;padding:2px;border-top:1px dashed #ccc;word-break:break-word}
      .terms{font-family:${URDU_FONT};direction:rtl;font-size:9px;color:#333;border:1px dashed #999;padding:4px;margin-top:4px;line-height:2;text-align:right}
      .devby{text-align:center;font-size:7.5px;color:#777;margin-top:4px;border-top:1px dashed #ccc;padding-top:3px}
      @media print{@page{size:80mm auto;margin:1mm}body{width:78mm}}
    </style></head><body>
      <div class="shop-urdu">${SHOP_INFO.name}</div>
      <div class="shop-addr">${SHOP_INFO.address}</div>
      <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
      <div class="banner">${SHOP_INFO.urduBanner}</div>
      <div class="meta-row">
        <span><b>Purchase Invoice</b></span>
        <span>ADMIN</span>
        <span>Shop Server</span>
      </div>
      <hr class="divider-dash">
      <div class="meta-row">
        <span class="meta-bold">${purchase.invoiceNo}</span>
        <span>${purchase.invoiceDate}</span>
      </div>
      <div class="meta-row"><span>Supplier:</span></div>
      <div style="font-size:10px;font-weight:bold;margin-bottom:1px">${buyerName}</div>
      ${buyerPhone ? `<div style="font-size:9px;color:#555">${buyerPhone}</div>` : ""}
      ${remarks ? `<div class="remarks-box"><b>Remarks:</b> ${remarks}</div>` : ""}
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
        <div class="sum-row bold sep"><span>Total Amount:</span><span>${Number(purchase.netTotal).toLocaleString()}</span></div>
        <div class="sum-row green"><span>Paid:</span><span>PKR ${Number(purchase.paidAmount).toLocaleString()}</span></div>
        <div class="sum-row bold sep green"><span>Balance Payable:</span><span>PKR 0</span></div>
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
      <div class="banner">${SHOP_INFO.urduBanner}</div>`;

    const metaHtml = pageNum === 1
      ? `<div class="meta-strip">
          <div class="meta-left">
            <div class="meta-row"><span class="meta-lbl">Supplier:</span> <span class="meta-val">${buyerName}</span></div>
            ${buyerPhone ? `<div class="meta-row"><span class="meta-val">${buyerPhone}</span></div>` : ""}
            ${remarks ? `<div class="meta-row"><span class="meta-lbl">Remarks:</span> <span class="meta-val">${remarks}</span></div>` : ""}
          </div>
          <div class="meta-mid"><span class="meta-val">${rows.length}</span></div>
          <div class="meta-right">
            <div class="meta-row"><span class="meta-lbl">Invoice #:</span> <span class="meta-val">${purchase.invoiceNo}</span></div>
            <div class="meta-row"><span class="meta-lbl">Date:</span> <span class="meta-val">${purchase.invoiceDate}</span></div>
          </div>
        </div>`
      : `<div style="display:flex;justify-content:space-between;font-size:${sz.sub}pt;color:#555;margin-bottom:4px;padding:2px 0;border-bottom:1px solid #ddd">
          <span>${buyerName}</span>
          <span>Page ${pageNum} of ${totalPages}</span>
          <span>Invoice # ${purchase.invoiceNo}</span>
        </div>`;

    const footerHtml = isLastPage
      ? `<div class="footer-wrap">
          <div class="footer-left">
            <div class="footer-stat">Total Items: <b>${rows.length}</b></div>
            <div class="terms-box">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
            <div class="sig-line">Signature</div>
          </div>
          <div class="footer-right">
            <div class="sum-row bold"><span>Total:</span><span>${Number(purchase.netTotal).toLocaleString()}</span></div>
            <div class="sum-row green"><span>Paid:</span><span>PKR ${Number(purchase.paidAmount).toLocaleString()}</span></div>
            <div class="sum-row bold sep green"><span>Balance Payable:</span><span>PKR 0</span></div>
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
    .banner{background:#555;color:#fff;font-size:${a5 ? "7.5" : "8.5"}pt;text-align:center;padding:${a5 ? "2px 6px" : "3px 8px"};margin:${a5 ? "3px 0" : "4px 0"};font-family:${URDU_FONT};direction:rtl;line-height:2}
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
    @media print{@page{size:${a5 ? "A5" : "A4"};margin:${a5 ? "4mm" : "8mm"}}body{padding:0}}
  </style></head><body>${allPagesHtml}</body></html>`;
};

// FIXED: Improved print function with better error handling
const doPrint = (purchase, type, overrides = {}) => {
  try {
    const printWindow = window.open("", "_blank", type === "Thermal" ? "width=420,height=640" : "width=900,height=700");
    
    if (!printWindow) {
      alert("Popup blocked! Please allow popups for this website to print invoices.");
      return false;
    }
    
    printWindow.document.write(buildPrintHtml(purchase, type, overrides));
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };
    
    return true;
  } catch (error) {
    console.error("Print error:", error);
    alert("Error preparing print: " + error.message);
    return false;
  }
};

/* ══════════════════════════════════════════════════════════
   CONFIRMATION MODAL - White background, black text
══════════════════════════════════════════════════════════ */
function ConfirmModal({ invoiceNo, supplierName, totalAmount, totalQty, itemsCount, onConfirm, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    modalRef.current?.focus();
    
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm(true); // Print and Save
      } else if (e.key === " " || e.key === "Space") {
        e.preventDefault();
        onConfirm(false); // Save only
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onClose]);

  return (
    <div
      className="scm-overlay"
      style={{ zIndex: 3000, background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        className="scm-window"
        style={{
          maxWidth: 480,
          textAlign: "center",
          background: "#ffffff",
          border: "2px solid #000000",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          borderRadius: "12px",
          padding: "0"
        }}
        tabIndex={-1}
      >
        <div className="scm-tb" style={{ 
          background: "#1e40af", 
          borderBottom: "2px solid #000000",
          borderRadius: "10px 10px 0 0",
          padding: "12px 20px"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ffffff"/>
          </svg>
          <span className="scm-tb-title" style={{ color: "#ffffff", fontWeight: "bold", fontSize: "16px" }}>Confirm Purchase Invoice</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff" }}>✕</button>
        </div>
        
        <div style={{ padding: "20px 24px" }}>
          <div style={{ 
            background: "#f8fafc", 
            borderRadius: "8px", 
            padding: "16px", 
            marginBottom: "20px",
            border: "1px solid #000000"
          }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Invoice Number</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#000000", fontFamily: "monospace" }}>{invoiceNo}</div>
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#666" }}>Supplier</div>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#000000" }}>{supplierName}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#666" }}>Total Amount</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#10b981" }}>PKR {fmt(totalAmount)}</div>
              </div>
            </div>
            <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#666" }}>Items</div>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#000000" }}>{itemsCount}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#666" }}>Total Qty</div>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#000000" }}>{totalQty}</div>
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <div style={{ 
              background: "#f0fdf4", 
              border: "1px solid #10b981", 
              borderRadius: "8px", 
              padding: "12px",
              marginBottom: "12px"
            }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#065f46", marginBottom: "8px" }}>
                ✅ This will SAVE the invoice to database
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              gap: "12px", 
              justifyContent: "center",
              marginTop: "8px"
            }}>
              <div style={{ 
                background: "#dbeafe", 
                border: "1px solid #1e40af", 
                borderRadius: "8px", 
                padding: "8px 12px",
                flex: 1
              }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af" }}>↵ ENTER</div>
                <div style={{ fontSize: "10px", color: "#1e40af" }}>Save & Print</div>
              </div>
              <div style={{ 
                background: "#fef3c7", 
                border: "1px solid #d97706", 
                borderRadius: "8px", 
                padding: "8px 12px",
                flex: 1
              }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#d97706" }}>␣ SPACE</div>
                <div style={{ fontSize: "10px", color: "#d97706" }}>Save Only</div>
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => onConfirm(true)}
              style={{
                background: "#1e40af",
                color: "white",
                border: "1px solid #000000",
                padding: "10px 20px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "#1e3a8a"}
              onMouseLeave={(e) => e.target.style.background = "#1e40af"}
            >
              🖨 Save & Print (Enter)
            </button>
            <button
              onClick={() => onConfirm(false)}
              style={{
                background: "#10b981",
                color: "white",
                border: "1px solid #000000",
                padding: "10px 20px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "#059669"}
              onMouseLeave={(e) => e.target.style.background = "#10b981"}
            >
              💾 Save Only (Space)
            </button>
            <button
              onClick={onClose}
              style={{
                background: "#ef4444",
                color: "white",
                border: "1px solid #000000",
                padding: "10px 20px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "#dc2626"}
              onMouseLeave={(e) => e.target.style.background = "#ef4444"}
            >
              Cancel (Esc)
            </button>
          </div>
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
  const total = bill.items.reduce((s, r) => s + Number(r.amount || 0), 0);
  return (
    <div
      className="xp-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="xp-modal" style={{ width: 560 }}>
        <div className="xp-modal-tb" style={{ background: "#10b981" }}>
          <span className="xp-modal-title">Held Purchase — {bill.invoiceNo}</span>
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
              <b>Supplier:</b> {bill.supplierName || "Cash Purchase"}
            </span>
            <span>
              <b>Items:</b> {bill.items.length}
            </span>
            <span>
              <b>Amount:</b>{" "}
              <span style={{ color: "#10b981", fontWeight: 700 }}>
                {fmt(total)}
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
                  {bill.items.map((r, i) => (
                    <tr key={i}>
                      <td className="text-muted">{i + 1}</td>
                      <td className="text-muted">{r.code}</td>
                      <td>{r.name}</td>
                      <td className="text-muted">{r.uom}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">{fmt(r.rate)}</td>
                      <td className="r" style={{ color: "#10b981", fontWeight: 700 }}>
                        {fmt(r.amount)}
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
            style={{ background: "#10b981", borderColor: "#059669" }}
            onClick={() => onResume(bill.id)}
          >
            Resume This Purchase
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUPPLIER SEARCH DROPDOWN
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
    setShowDropdown(false);
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
              background: "#fffde7",
              position: "relative",
              zIndex: 1,
              width: "100%",
              border: "1px solid #000000",
              borderRadius: "4px",
              outline: "none",
              padding: "6px 8px",
              fontSize: "13px",
              transition: "all 0.15s ease",
            }}
            value={value ? query || value : query}
            placeholder="Cash Purchase (Press ↓ to search)"
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.target.style.borderColor = "#10b981";
              e.target.style.boxShadow = "0 0 0 2px rgba(16,185,129,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#000000";
              e.target.style.boxShadow = "none";
              setTimeout(() => {
                if (!isNavigating) {
                  setShowDropdown(false);
                }
              }, 200);
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {value && value !== "Cash Purchase" && (
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
            border: "1px solid #000000",
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
                backgroundColor: idx === selectedSuggestionIndex ? "#d1fae5" : "white",
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
        <div className="xp-modal-tb" style={{ background: "#10b981" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="rgba(255,255,255,0.8)">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span className="xp-modal-title" style={{ color: "#fff", fontWeight: "bold" }}>SEARCH PRODUCTS (PURCHASE RATE)</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="cs-modal-filters" style={{ 
          padding: "8px 12px", 
          gap: "10px", 
          background: "#f8fafc",
          borderBottom: "1px solid #e5e7eb",
          flexWrap: "wrap"
        }}>
          <div className="cs-modal-filter-grp" style={{ flex: 2, minWidth: "200px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>DESCRIPTION / CODE</label>
            <input
              ref={rDesc}
              type="text"
              className="xp-input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => fk(e, rCat)}
              placeholder="Name / code…"
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>CATEGORY</label>
            <input
              ref={rCat}
              type="text"
              className="xp-input"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              onKeyDown={(e) => fk(e, rCompany)}
              placeholder="e.g. SMALL"
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>COMPANY</label>
            <input
              ref={rCompany}
              type="text"
              className="xp-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => fk(e, null)}
              placeholder="e.g. LUX"
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", paddingBottom: "2px" }}>
            <span style={{ fontSize: "11px", color: "#000000", fontWeight: "bold" }}>{rows.length} RESULT(S)</span>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px" }}>CLOSE</button>
          </div>
        </div>
        
        <div className="xp-modal-body" style={{ padding: 0 }}>
          <div className="xp-table-panel" style={{ border: "none" }}>
            <div className="xp-table-scroll" style={{ maxHeight: "60vh", overflow: "auto" }}>
              <table className="xp-table" style={{ borderCollapse: "collapse", width: "100%", border: "1px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ width: 50, padding: "8px 6px", textAlign: "center", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>SR.#</th>
                    <th style={{ width: 100, padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>BARCODE</th>
                    <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>NAME</th>
                    <th style={{ width: 70, padding: "8px 6px", textAlign: "center", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>MEAS.</th>
                    <th style={{ width: 120, padding: "8px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>PURCHASE RATE</th>
                    <th style={{ width: 70, padding: "8px 6px", textAlign: "center", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>RACK#</th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef} tabIndex={0} onKeyDown={tk}>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px" }}>
                        NO PRODUCTS FOUND
                      </td>
                    </tr>
                  )}
                  {rows.map((r, i) => (
                    <tr
                      key={`${r._id}-${r._pi}`}
                      style={{
                        background: i === hiIdx ? "#d1fae5" : "white",
                        cursor: "pointer"
                      }}
                      onClick={() => setHiIdx(i)}
                      onDoubleClick={() => onSelect(r)}
                    >
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "normal", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "6px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "normal", color: "#000000" }}>
                        <span className="xp-code">{r.code}</span>
                      </td>
                      <td style={{ padding: "6px 6px", border: "1px solid #000000", fontSize: "15px", fontWeight: "bold", color: "#000000" }}>
                        <button className="xp-link-btn" style={{ 
                          color: "#000000", 
                          textDecoration: "none", 
                          fontWeight: "bold", 
                          fontSize: "15px",
                          background: "none", 
                          border: "none", 
                          cursor: "pointer", 
                          width: "100%", 
                          textAlign: "left",
                          padding: "0"
                        }}>{r._name}</button>
                      </td>
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #000000", fontSize: "15px", fontWeight: "bold", color: "#000000" }}>{r._meas || "—"}</td>
                      <td style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "15px", fontWeight: "bold", color: "#000000" }}>
                        {Number(r._rate).toLocaleString("en-PK")}
                      </td>
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #000000", fontSize: "15px", fontWeight: "bold", color: "#000000" }}>{r.rackNo || "—"}</td>
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
          color: "#000000", 
          fontWeight: "bold",
          borderTop: "1px solid #e5e7eb", 
          background: "#f8fafc" 
        }}>
          ↑↓ NAVIGATE &nbsp;|&nbsp; ENTER / DOUBLE-CLICK = SELECT &nbsp;|&nbsp; ESC = CLOSE &nbsp;|&nbsp; TAB = FILTERS
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PURCHASE PAGE
══════════════════════════════════════════════════════════ */
export default function PurchasePage() {
  const [time, setTime] = useState(timeNow());
  const [allProducts, setAllProducts] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHoldPreview, setShowHoldPreview] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [curRow, setCurRow] = useState({ ...EMPTY_ROW });
  const [items, setItems] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState(isoDate());
  const [invoiceNo, setInvoiceNo] = useState("1");
  const amountRef = useRef(null);

  const [supplierName, setSupplierName] = useState("Cash Purchase");
  const [supplierId, setSupplierId] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [printType, setPrintType] = useState("Thermal");
  const [editId, setEditId] = useState(null);
  const [holdBills, setHoldBills] = useState(() => loadPurchaseHolds());

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const searchRef = useRef(null);
  const pcsRef = useRef(null);
  const rateRef = useRef(null);
  const addRef = useRef(null);
  const codeSearchRef = useRef(null);
  const remarksRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    savePurchaseHolds(holdBills);
  }, [holdBills]);

  const subTotal = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalQty = items.reduce((s, r) => s + (parseFloat(r.pcs) || 0), 0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, salesRes] = await Promise.all([
        api.get(EP.PRODUCTS.GET_ALL),
        api.get(EP.PURCHASES.GET_ALL),
      ]);
      
      if (pRes.data.success) setAllProducts(pRes.data.data);
      
      if (salesRes.data.success && salesRes.data.data.length > 0) {
        let maxNum = 0;
        salesRes.data.data.forEach(purchase => {
          let num = cleanInvoiceNo(purchase.invoiceNo);
          num = parseInt(num, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        });
        setInvoiceNo(String(maxNum + 1));
      } else {
        setInvoiceNo("1");
      }
      
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

  const refreshInvoiceNo = async () => {
    try {
      const salesRes = await api.get(EP.PURCHASES.GET_ALL);
      if (salesRes.data.success && salesRes.data.data.length > 0) {
        let maxNum = 0;
        salesRes.data.data.forEach(purchase => {
          let num = cleanInvoiceNo(purchase.invoiceNo);
          num = parseInt(num, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        });
        setInvoiceNo(String(maxNum + 1));
      } else {
        setInvoiceNo("1");
      }
    } catch (error) {
      console.error("Failed to refresh invoice number:", error);
      const current = parseInt(invoiceNo) || 0;
      setInvoiceNo(String(current + 1));
    }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const resetToNewInvoice = async () => {
    setItems([]);
    setCurRow({ ...EMPTY_ROW });
    setSearchText("");
    setSupplierName("Cash Purchase");
    setSupplierId("");
    setSupplierCode("");
    setRemarks("");
    setShowRemarksInput(false);
    setEditId(null);
    setMsg({ text: "", type: "" });
    if (codeSearchRef.current) codeSearchRef.current.value = "";
    await refreshInvoiceNo();
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const pickProduct = (product) => {
    if (!product._id) {
      showMsg("Product ID missing", "error");
      return;
    }
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
    setTimeout(() => pcsRef.current?.focus(), 30);
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
    setItems((p) => [...p, { ...curRow }]);
    resetCurRow();
  };

  const resetCurRow = () => {
    setCurRow({ ...EMPTY_ROW });
    setSearchText("");
    setTimeout(() => searchRef.current?.focus(), 30);
  };

  const removeRow = (index) => {
    setItems((p) => p.filter((_, i) => i !== index));
  };

  const handleSupplierSelect = (supplier) => {
    setSupplierId(supplier._id);
    setSupplierName(supplier.name);
    setSupplierCode(supplier.code || "");
    setShowRemarksInput(true);
    setTimeout(() => {
      if (remarksRef.current) {
        remarksRef.current.focus();
      }
    }, 100);
  };

  const handleSupplierClear = () => {
    setSupplierId("");
    setSupplierName("Cash Purchase");
    setSupplierCode("");
    setRemarks("");
    setShowRemarksInput(false);
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
        setShowRemarksInput(true);
        setTimeout(() => {
          if (remarksRef.current) {
            remarksRef.current.focus();
          }
        }, 100);
        showMsg(`"${name}" saved as new supplier`, "success");
      }
    } catch {
      showMsg("Supplier save failed", "error");
    }
  };

  const handleCodeSearch = async () => {
    const code = codeSearchRef.current?.value.trim();
    if (!code) return;
    
    const found = allSuppliers.find(s => s.code?.toLowerCase() === code.toLowerCase());
    if (found) {
      handleSupplierSelect(found);
      codeSearchRef.current.value = "";
      showMsg(`Supplier found: ${found.name}`, "success");
    } else {
      showMsg(`No supplier found with code: ${code}`, "error");
    }
  };

  const holdPurchase = () => {
    if (!items.length) {
      showMsg("No items to hold", "error");
      return;
    }
    setHoldBills((prev) => [
      ...prev,
      {
        id: Date.now(),
        invoiceNo,
        invoiceDate,
        supplierName,
        supplierId,
        supplierCode,
        amount: subTotal,
        items: [...items],
        remarks,
      },
    ]);
    showMsg(`Purchase held: ${invoiceNo}`, "success");
    resetToNewInvoice();
  };

  const resumeHold = (holdId) => {
    const bill = holdBills.find((b) => b.id === holdId);
    if (!bill) return;
    setItems(bill.items);
    setInvoiceNo(bill.invoiceNo);
    setInvoiceDate(bill.invoiceDate || isoDate());
    setSupplierName(bill.supplierName || "Cash Purchase");
    setSupplierId(bill.supplierId || "");
    setSupplierCode(bill.supplierCode || "");
    setRemarks(bill.remarks || "");
    setShowRemarksInput(!!(bill.supplierName && bill.supplierName !== "Cash Purchase"));
    setHoldBills((prev) => prev.filter((b) => b.id !== holdId));
    setShowHoldPreview(null);
    resetCurRow();
    showMsg(`Resumed purchase: ${bill.invoiceNo}`, "success");
  };

  const deleteHold = (holdId, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this held purchase?"))
      setHoldBills((prev) => prev.filter((b) => b.id !== holdId));
  };

  // Main function to save and optionally print
  const savePurchase = async (shouldPrint) => {
    if (isProcessing) return;
    if (items.length === 0) {
      showMsg("No items to save", "error");
      return;
    }
    
    setIsProcessing(true);
    
    const purchaseObj = {
      invoiceNo: cleanInvoiceNo(invoiceNo),
      invoiceDate,
      supplierName: supplierName,
      items: items,
      subTotal,
      extraDisc: 0,
      netTotal: subTotal,
      prevBalance: 0,
      paidAmount: subTotal,
      balance: 0,
      remarks: remarks,
    };
    
    try {
      // Prepare payload for saving
      const payload = {
        invoiceNo: cleanInvoiceNo(invoiceNo),
        invoiceDate,
        supplierId: supplierId || null,
        supplierName: supplierName,
        supplierCode: supplierCode,
        supplierPhone: "",
        remarks: remarks,
        items: items.map((r, idx) => ({
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
          srNo: idx + 1,
        })),
        subTotal,
        extraDisc: 0,
        discAmount: 0,
        netTotal: subTotal,
        prevBalance: 0,
        paidAmount: subTotal,
        balance: 0,
        printType,
        saleType: "purchase",
      };
      
      // STEP 1: SAVE to database
      let response;
      if (editId) {
        response = await api.put(EP.PURCHASES.UPDATE(editId), payload);
      } else {
        response = await api.post(EP.PURCHASES.CREATE, payload);
      }
      
      if (!response.data.success) {
        showMsg(response.data.message || "Save failed", "error");
        setIsProcessing(false);
        return;
      }
      
      // STEP 2: Show success message
      showMsg(editId ? `✓ Invoice ${invoiceNo} updated successfully` : `✓ Invoice ${invoiceNo} saved successfully`);
      
      // STEP 3: PRINT if requested
      if (shouldPrint) {
        setTimeout(() => {
          try {
            const printWindow = window.open("", "_blank", printType === "Thermal" ? "width=420,height=640" : "width=900,height=700");
            
            if (!printWindow) {
              alert("Popup blocked! Please allow popups for this website to print invoices.\nThe invoice has been saved.");
              return;
            }
            
            printWindow.document.write(buildPrintHtml(purchaseObj, printType, { buyerName: supplierName, remarks: remarks }));
            printWindow.document.close();
            
            printWindow.onload = () => {
              setTimeout(() => {
                printWindow.focus();
                printWindow.print();
              }, 300);
            };
          } catch (printError) {
            console.error("Print failed:", printError);
            showMsg("Save successful but print failed - you can print later from records", "error");
          }
        }, 300);
      }
      
      // STEP 4: Reset for next invoice
      if (!editId) await refreshInvoiceNo();
      await resetToNewInvoice();
      
    } catch (error) {
      console.error("Save failed:", error);
      showMsg("Save failed: " + (error.response?.data?.message || error.message), "error");
    } finally {
      setIsProcessing(false);
      setShowConfirmModal(false);
    }
  };

  // Open confirmation modal when pressing *
  const openConfirmModal = () => {
    if (items.length === 0) {
      showMsg("No items to save", "error");
      return;
    }
    setShowConfirmModal(true);
  };

  const loadPurchaseForEdit = (purchase) => {
    setEditId(purchase._id);
    let invNo = cleanInvoiceNo(purchase.invoiceNo);
    setInvoiceNo(invNo);
    setInvoiceDate(purchase.invoiceDate || isoDate());
    setSupplierName(purchase.supplierName || "Cash Purchase");
    setSupplierId(purchase.supplierId || "");
    setSupplierCode(purchase.supplierCode || "");
    setRemarks(purchase.remarks || "");
    setShowRemarksInput(!!(purchase.supplierName && purchase.supplierName !== "Cash Purchase"));
    
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
    
    resetCurRow();
    showMsg(`✏ Editing Purchase Invoice ${invNo}`, "success");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const navInvoice = async (dir) => {
    try {
      const { data } = await api.get(EP.PURCHASES.GET_ALL);
      if (!data.success || !data.data?.length) return;
      const allPurchases = data.data;
      const currentCleanNo = cleanInvoiceNo(invoiceNo);
      const curIdx = allPurchases.findIndex((s) => {
        return cleanInvoiceNo(s.invoiceNo) === currentCleanNo;
      });
      let nextIdx = dir === "prev" ? curIdx - 1 : curIdx + 1;
      nextIdx = Math.max(0, Math.min(nextIdx, allPurchases.length - 1));
      if (nextIdx === curIdx) return;
      loadPurchaseForEdit(allPurchases[nextIdx]);
    } catch {
      showMsg("Navigation failed", "error");
    }
  };

  // Handle star key press (*) - open confirmation modal
  useEffect(() => {
    const handler = (e) => {
      if (showProductModal || showHoldPreview || showConfirmModal) return;
      
      // Star key (*) - opens confirmation modal
      if (e.key === "*") {
        e.preventDefault();
        if (items.length > 0) {
          openConfirmModal();
        }
        return;
      }
      
      // F4 key - hold purchase
      if (e.key === "F4") {
        e.preventDefault();
        holdPurchase();
        return;
      }
      
      // Enter key on remarks input - opens confirmation modal
      if (e.key === "Enter" && document.activeElement === remarksRef.current) {
        e.preventDefault();
        if (items.length > 0) {
          openConfirmModal();
        }
        return;
      }
    };
    
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, showProductModal, showHoldPreview, showConfirmModal, remarks]);

  return (
    <>
      <div className="sl-page">
        {showProductModal && (
          <SearchModal allProducts={allProducts} onSelect={pickProduct} onClose={() => { setShowProductModal(false); setTimeout(() => searchRef.current?.focus(), 30); }} />
        )}
        {showHoldPreview && (
          <HoldPreviewModal bill={showHoldPreview} onResume={resumeHold} onClose={() => setShowHoldPreview(null)} />
        )}
        {showConfirmModal && (
          <ConfirmModal
            invoiceNo={invoiceNo}
            supplierName={supplierName}
            totalAmount={subTotal}
            totalQty={totalQty}
            itemsCount={items.length}
            onConfirm={(shouldPrint) => savePurchase(shouldPrint)}
            onClose={() => setShowConfirmModal(false)}
          />
        )}

        <div className="xp-titlebar" style={{ background: "#10b981" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM2 10h2a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2m4 0h6a1 1 0 0 1 0 2H6a1 1 0 0 1 0-2" />
          </svg>
          <span className="xp-tb-title">Purchase Invoice — * Print & Save | F4 Hold</span>
          <div className="xp-tb-actions">
            <div className="sl-shortcut-hints"><span>F2 Product</span><span>F4 Hold</span><span>* Save</span></div>
            <div className="xp-tb-divider" />
            <button className="xp-cap-btn">─</button>
            <button className="xp-cap-btn" onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }}>□</button>
            <button className="xp-cap-btn xp-cap-close">✕</button>
          </div>
        </div>

        {msg.text && <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "4px 10px 0", flexShrink: 0 }}>{msg.text}</div>}

        <div className="sl-body">
          <div className="sl-left" >
            <div className="sl-top-bar">
              <div className="sl-sale-title-box" style={{ background: "green", border: "1px solid green" }}>Purchase</div>
              
              <div className="sl-inv-field-grp">
                <label>Invoice #</label>
                <div className="sl-inv-nav-container">
                  <button
                    className="sl-inv-nav-btn sl-inv-nav-prev"
                    onClick={() => navInvoice("prev")}
                    title="Previous Invoice (↑)"
                    type="button"
                  >
                    ◀
                  </button>
                  
                  <input 
                    className="xp-input xp-input-sm sl-inv-input-large" 
                    value={invoiceNo} 
                    onChange={(e) => setInvoiceNo(cleanInvoiceNo(e.target.value))}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = cleanInvoiceNo(invoiceNo);
                        if (!val) return;
                        try {
                          const { data } = await api.get(EP.PURCHASES.GET_ALL);
                          const purchases = data.data;
                          if (!purchases || purchases.length === 0) {
                            showMsg(`Invoice "${val}" not found`, "error");
                            await refreshInvoiceNo();
                            return;
                          }
                          const exact = purchases.find((s) => {
                            return cleanInvoiceNo(s.invoiceNo) === val;
                          });
                          if (!exact) {
                            showMsg(`Invoice "${val}" not found`, "error");
                            await refreshInvoiceNo();
                            return;
                          }
                          setItems([]);
                          setEditId(null);
                          loadPurchaseForEdit(exact);
                        } catch {
                          showMsg("Search failed", "error");
                        }
                      }
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        await navInvoice(e.key === "ArrowUp" ? "prev" : "next");
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    style={{ 
                      background: editId ? "#fffbe6" : "#fffde7",
                      fontSize: "18px",
                      fontWeight: "bold",
                      width: "180px",
                      textAlign: "center",
                      paddingLeft: "32px",
                      paddingRight: "32px"
                    }}
                  />
                  
                  <button
                    className="sl-inv-nav-btn sl-inv-nav-next"
                    onClick={() => navInvoice("next")}
                    title="Next Invoice (↓)"
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
                  value={invoiceDate} 
                  readOnly 
                  style={{ 
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

            <div className="sl-entry-strip">
              <div className="sl-entry-cell sl-entry-product">
                <label>Select Product <kbd>F2</kbd></label>
                <input 
                  ref={searchRef} 
                  type="text" 
                  className="sl-product-input" 
                  style={{ background: "#fffde7" }} 
                  value={searchText} 
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { 
                      e.preventDefault(); 
                      setShowProductModal(true); 
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!searchText.trim()) { 
                        setShowProductModal(true); 
                        return; 
                      }
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
                      } else { 
                        alert(`"${searchText}" — Product not found`); 
                        searchRef.current?.select(); 
                      }
                    }
                  }} 
                  onChange={(e) => { 
                    setSearchText(e.target.value); 
                    if (curRow.name) { 
                      setCurRow({ ...EMPTY_ROW }); 
                    } 
                  }} 
                  autoFocus 
                />
              </div>
              <div className="sl-entry-cell">
                <label>Qty</label>
                <input 
                  ref={pcsRef} 
                  type="text" 
                  className="sl-num-input" 
                  style={{ width: 60, background: "#fffde7" }} 
                  value={curRow.pcs} 
                  min={1} 
                  onChange={(e) => updateCurRow("pcs", e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && rateRef.current?.focus()} 
                  onFocus={(e) => e.target.select()} 
                />
              </div>
              <div className="sl-entry-cell">
                <label>Purchase Rate</label>
                <input 
                  ref={rateRef} 
                  type="text" 
                  className="sl-num-input" 
                  style={{ width: 75, background: "#fffde7" }} 
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
                  style={{ width: 80, background: "#fffde7" }} 
                  value={curRow.amount || 0} 
                  onChange={(e) => setCurRow((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} 
                  onFocus={(e) => e.target.select()} 
                  onKeyDown={(e) => e.key === "Enter" && addRef.current?.click()} 
                />
              </div>
              <div className="sl-entry-cell sl-entry-btns-cell">
                <label>&nbsp;</label>
                <div className="sl-entry-btns">
                  <button className="xp-btn xp-btn-sm" onClick={resetCurRow}>Reset</button>
                  <button ref={addRef} className="xp-btn xp-btn-primary xp-btn-sm" style={{ background: "#10b981", borderColor: "#059669" }} onClick={addRow}>Add Item</button>
                </div>
              </div>
            </div>

            <div className="sl-table-header-bar">
              <span className="sl-table-lbl">{curRow.name ? <span className="sl-cur-name-inline">{curRow.name}</span> : "Select Product"}</span>
              <span className="sl-table-qty">Total Qty: {totalQty.toLocaleString("en-PK")}</span>
            </div>

            <div className="sl-items-wrap">
              <table className="sl-items-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>Sr.#</th>
                    <th style={{ width: 72 }}>Code</th>
                    <th>Product Name</th>
                    <th style={{ width: 65 }}>UOM</th>
                    <th style={{ width: 55 }} className="r">Qty</th>
                    <th style={{ width: 80 }} className="r">Rate</th>
                    <th style={{ width: 90 }} className="r">Amount</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="xp-empty" style={{ padding: 14 }}>Add products to create purchase invoice</td>
                    </tr>
                  )}
                  {items.map((r, i) => (
                    <tr key={i}>
                      <td className="muted" style={{ textAlign: "center" }}>{i + 1}</td>
                      <td className="muted">{r.code}</td>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td className="muted">{r.uom}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">{Number(r.rate).toLocaleString("en-PK")}</td>
                      <td className="r" style={{ color: "#10b981" }}>{Number(r.amount).toLocaleString("en-PK")}</td>
                      <td><button className="xp-btn xp-btn-sm xp-btn-danger" style={{ padding: "2px 6px" }} onClick={() => removeRow(i)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sl-summary-bar">
              <div className="sl-sum-cell"><label>Total Qty</label><input className="sl-sum-val" value={totalQty.toLocaleString("en-PK")} readOnly /></div>
              <div className="sl-sum-cell"><label>Total Amount</label><input className="sl-sum-val" value={Number(subTotal).toLocaleString("en-PK")} readOnly /></div>
              
              <div className="sl-cust-cell" style={{ width: 120 }}>
                <label>Supplier Code</label>
                <input
                  ref={codeSearchRef}
                  type="text"
                  className="sl-cust-input"
                  style={{ width: 100, background: "#fffde7" }}
                  placeholder="Enter code"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCodeSearch();
                    }
                  }}
                  autoComplete="off"
                />
              </div>
              
              <div className="sl-cust-cell" style={{ flex: 2 }}>
                <label>Supplier Name</label>
                <SupplierDropdown
                  allSuppliers={allSuppliers}
                  value={supplierName === "Cash Purchase" ? "" : supplierName}
                  displayName={supplierName}
                  onSelect={handleSupplierSelect}
                  onClear={handleSupplierClear}
                  onAddNew={handleAddNewSupplier}
                />
              </div>
              
              {supplierCode && (
                <div className="sl-cust-cell" style={{ width: 100 }}>
                  <label>Supplier Code</label>
                  <input className="sl-cust-input" value={supplierCode} readOnly style={{ background: "#f5f5f5" }} />
                </div>
              )}
              
              <div className="sl-sum-cell">
                <button 
                  className="xp-btn xp-btn-primary" 
                  onClick={openConfirmModal} 
                  disabled={isProcessing || items.length === 0}
                  style={{ padding: "6px 20px", fontSize: 14, background: "#10b981", borderColor: "#059669" }}
                >
                  {isProcessing ? "Processing..." : "💾 Save (*)"}
                </button>
              </div>
            </div>

            {/* Remarks Input Section */}
            {showRemarksInput && (
              <div className="sl-remarks-section" style={{
                marginTop: "10px",
                padding: "8px 12px",
                background: "#f0fdf4",
                borderRadius: "6px",
                border: "1px solid #10b981",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <label style={{ fontWeight: "bold", color: "#065f46", minWidth: "70px" }}>Remarks:</label>
                <input
                  ref={remarksRef}
                  type="text"
                  className="sl-remarks-input"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && items.length > 0) {
                      e.preventDefault();
                      openConfirmModal();
                    }
                  }}
                  placeholder="Enter remarks and press Enter to save..."
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #10b981",
                    borderRadius: "4px",
                    fontSize: "13px",
                    outline: "none",
                    background: "white"
                  }}
                  autoComplete="off"
                />
                <span style={{ fontSize: "11px", color: "#065f46" }}>Press Enter → Save</span>
              </div>
            )}
          </div>

          {/* Right panel - Hold Bills */}
          <div className="sl-right">
            <div className="sl-hold-panel">
              <div className="sl-hold-title" style={{ background: "#10b981" }}>
                <span>Hold Bills <kbd style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "0 3px", borderRadius: 2 }}>F4</kbd></span>
                <span className="sl-hold-cnt">{holdBills.length}</span>
              </div>
              <div className="sl-hold-table-wrap">
                <table className="sl-hold-table">
                  <thead>
                    <tr>
                      <th style={{ width: 24 }}>#</th>
                      <th>Invoice #</th>
                      <th className="r">Amount</th>
                      <th>Supplier</th>
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
                          title="Click = preview · Double-click = resume"
                          style={{ cursor: "pointer" }}
                        >
                          <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>{i + 1}</td>
                          <td style={{ fontFamily: "var(--xp-mono)", fontSize: "var(--xp-fs-xs)" }}>{b.invoiceNo}</td>
                          <td className="r" style={{ color: "#10b981" }}>{fmt(b.amount)}</td>
                          <td className="muted" style={{ fontSize: "var(--xp-fs-xs)" }}>{b.supplierName || "Cash Purchase"}</td>
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
                  style={{ width: "100%", background: "#10b981", color: "white", borderColor: "#059669" }}
                  onClick={holdPurchase}
                  disabled={!items.length}
                >
                  Hold Bill (F4)
                </button>
              </div>
              <div className="sl-hold-hint" style={{ padding: "4px 8px", fontSize: 10, color: "#666", textAlign: "center", borderTop: "1px solid #e5e7eb" }}>
                Click = preview · Double-click = resume · ✕ = delete
              </div>
            </div>
          </div>
        </div>

        <div className="sl-cmd-bar">
          <button 
            className="xp-btn xp-btn-success xp-btn-sm" 
            onClick={resetToNewInvoice}
            disabled={loading}
            style={{ background: "#10b981", borderColor: "#059669" }}
          >
            🔄 Refresh / New Invoice
          </button>
          <button className="xp-btn xp-btn-sm" onClick={fetchData} disabled={loading}>Reload Data</button>
          <button 
            className="xp-btn xp-btn-danger xp-btn-sm" 
            disabled={!editId} 
            onClick={async () => {
              if (!editId || !window.confirm("Delete this purchase invoice?")) return;
              try {
                await api.delete(EP.PURCHASES.DELETE(editId));
                showMsg("Purchase invoice deleted");
                await resetToNewInvoice();
              } catch {
                showMsg("Delete failed", "error");
              }
            }}
          >
            Delete Record
          </button>
          <div className="xp-toolbar-divider" />
          <div className="sl-print-types">
            {["Thermal", "A4", "A5"].map((pt) => (<label key={pt} className="sl-check-label"><input type="radio" name="pt" checked={printType === pt} onChange={() => setPrintType(pt)} /> {pt}</label>))}
          </div>
          <div className="xp-toolbar-divider" />
          <span className="sl-inv-info">
            {editId ? "✏ Editing purchase record" : `${invoiceNo} | Items: ${items.length} | Total Qty: ${totalQty} | Amount: ${Number(subTotal).toLocaleString("en-PK")}`}
          </span>
        </div>
      </div>

      <style>{`
        .sl-page {
          background: #ffffff;
        }
        
        input, .xp-input, .sl-product-input, .sl-num-input, .sl-sum-input, 
        .sl-cust-input, .sl-inv-input-large, .sl-date-input, .sl-sum-val {
          border-color: #000000 !important;
          border-width: 1px !important;
          border-style: solid !important;
          background: #ffffff !important;
        }
        
        .sl-items-table th,
        .sl-items-table td {
          border-color: #000000 !important;
          border-width: 1px !important;
        }
       
        .xp-btn, .sl-pay-btn, .sl-entry-btns .xp-btn {
          border-color: #000000 !important;
          border-width: 1px !important;
          border-style: solid !important;
        }
        
        .sl-items-table tbody tr.sl-empty-row {
          display: none;
        }
        
        .sl-cust-input {
          border: 1px solid #000000 !important;
          border-radius: 4px !important;
          padding: 6px 8px !important;
          font-size: 13px !important;
          transition: all 0.15s ease !important;
          background-color: #ffffff !important;
        }
        
        .sl-cust-input:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 2px rgba(16,185,129,0.1) !important;
          outline: none !important;
        }
        
        .sl-cust-input:hover {
          border-color: #000000 !important;
        }
        
        .sl-inv-input-large {
          font-size: 18px !important;
          font-weight: bold !important;
          width: 160px !important;
          text-align: center !important;
          background: #ffffff !important;
        }
        
        .sl-nav-btn {
          font-size: 14px !important;
          padding: 4px 12px !important;
          font-weight: 600 !important;
        }
        
        input, .xp-input, .sl-product-input, .sl-num-input, .sl-sum-input, .sl-cust-input {
          background-color: #ffffff !important;
        }
        
        .xp-btn-success {
          background-color: #10b981 !important;
          border-color: #10b981 !important;
          color: white !important;
        }
        
        .xp-btn-success:hover {
          background-color: #059669 !important;
          border-color: #059669 !important;
        }

        .sl-product-input {
          background-color: #fffde7 !important;
          border-color: #000000 !important;
        }

        .sl-num-input, .sl-sum-input, .sl-cust-input {
          background-color: #fffde7 !important;
        }

        .sl-sum-val, .sl-date-input[readonly] {
          background-color: #f5f5f5 !important;
        }

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
          background: #10b981;
          border-color: #059669;
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
          transition: all 0.2s ease;
        }

        .sl-inv-input-large:hover {
          border-color: #10b981 !important;
        }

        .sl-inv-input-large:focus {
          border-color: #10b981 !important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
        }

        .sl-nav-btn {
          display: none;
        }

        .sl-remarks-input:focus {
          border-color: #059669 !important;
          box-shadow: 0 0 0 2px rgba(5,150,105,0.2) !important;
        }
      `}</style>
    </>
  );
}