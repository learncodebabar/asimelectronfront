// pages/SalePage.jsx - COMPLETE FILE with Stock Display After Product Selection (No INV- prefix)
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/SalePage.css";
import { SHOP_INFO } from "../constants/shopInfo.js";

/* ── helpers ── */
const timeNow = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
const isoDate = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const HOLD_KEY = "asim_hold_bills_v1";

const EMPTY_ROW = {
  productId: "",
  code: "",
  name: "",
  uom: "",
  rack: "",
  pcs: 1,
  rate: 0,
  amount: 0,
  stock: 0,
};

const TYPE_COLORS = {
  credit: { bg: "#fca5a5", color: "#7f1d1d", border: "#ef4444" },
  debit: { bg: "#93c5fd", color: "#1e3a8a", border: "#3b82f6" },
  cash: { bg: "#86efac", color: "#14532d", border: "#22c55e" },
  "raw-sale": { bg: "#fde68a", color: "#78350f", border: "#f59e0b" },
  "raw-purchase": { bg: "#d8b4fe", color: "#3b0764", border: "#a855f7" },
};

const typeToPayment = (t) => {
  if (t === "credit" || t === "raw-sale" || t === "raw-purchase")
    return "Credit";
  if (t === "debit") return "Bank";
  return "Cash";
};
const typeToSource = (t) => (!t ? "cash" : t);

/* ── localStorage helpers ── */
const loadHolds = () => {
  try {
    return JSON.parse(localStorage.getItem(HOLD_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveHolds = (bills) => {
  try {
    localStorage.setItem(HOLD_KEY, JSON.stringify(bills));
  } catch {}
};

/* ══════════════════════════════════════════════════════════
   INVOICE NUMBER GENERATOR - Monthly Reset (Pure YYMMXXXX - NO INV-)
══════════════════════════════════════════════════════════ */

const getCurrentYearMonthCode = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}${month}`;
};

const generateInvoiceNumber = async (apiInstance, endpoints, setInvoiceNo) => {
  try {
    // Try to get from server first
    const response = await apiInstance.get(endpoints.SALES.NEXT_INVOICE);
    if (response.data.success && response.data.data?.invoiceNo) {
      let newInvoiceNo = response.data.data.invoiceNo;
      // Remove any INV- prefix if present (for backward compatibility)
      newInvoiceNo = newInvoiceNo.replace(/^INV-/i, '');
      setInvoiceNo(newInvoiceNo);
      localStorage.setItem('lastInvoiceNumber', newInvoiceNo);
      localStorage.setItem('lastInvoiceYearMonth', getCurrentYearMonthCode());
      return newInvoiceNo;
    }
    throw new Error("No invoice number from server");
  } catch (error) {
    console.error("Failed to generate invoice number from server, using fallback:", error);
    
    // Fallback: Generate locally
    const currentYearMonth = getCurrentYearMonthCode();
    let maxSeqForMonth = 0;
    
    try {
      const salesRes = await apiInstance.get(endpoints.SALES.GET_ALL);
      
      if (salesRes.data.success && salesRes.data.data && salesRes.data.data.length > 0) {
        salesRes.data.data.forEach(sale => {
          let saleInvoiceNo = sale.invoiceNo;
          if (saleInvoiceNo && typeof saleInvoiceNo === 'string') {
            // Remove any INV- prefix if present
            saleInvoiceNo = saleInvoiceNo.replace(/^INV-/i, '');
            if (saleInvoiceNo.length === 8 && /^\d+$/.test(saleInvoiceNo)) {
              const yearMonth = saleInvoiceNo.substring(0, 4);
              if (yearMonth === currentYearMonth) {
                const seqNum = parseInt(saleInvoiceNo.slice(-4), 10);
                if (!isNaN(seqNum) && seqNum > maxSeqForMonth) {
                  maxSeqForMonth = seqNum;
                }
              }
            }
          }
        });
      }
    } catch (salesError) {
      console.error("Failed to fetch sales for invoice generation:", salesError);
    }
    
    const nextSeq = maxSeqForMonth + 1;
    const formattedSeq = nextSeq.toString().padStart(4, '0');
    const newInvoiceNo = `${currentYearMonth}${formattedSeq}`;
    
    setInvoiceNo(newInvoiceNo);
    localStorage.setItem('lastInvoiceNumber', newInvoiceNo);
    localStorage.setItem('lastInvoiceYearMonth', currentYearMonth);
    
    return newInvoiceNo;
  }
};

/* ══════════════════════════════════════════════════════════
   STOCK CHECK HELPER
══════════════════════════════════════════════════════════ */
const checkStockAvailability = (productId, requestedQty, currentUom, allProducts) => {
  const product = allProducts.find(p => p._id === productId);
  if (!product) return { available: false, message: "Product not found", availableStock: 0 };
  
  const packingInfo = product.packingInfo?.find(pk => pk.measurement === currentUom);
  if (!packingInfo) return { available: false, message: "Packing info not found", availableStock: 0 };
  
  const availableStock = packingInfo.openingQty || 0;
  const isAvailable = availableStock >= requestedQty;
  
  return {
    available: isAvailable,
    message: isAvailable ? "In stock" : `Only ${availableStock} ${currentUom} available`,
    availableStock
  };
};

const getProductStock = (product, uom = null) => {
  if (!product || !product.packingInfo || product.packingInfo.length === 0) {
    return { stock: 0, uom: "", message: "No stock info" };
  }
  if (uom) {
    const packing = product.packingInfo.find(pk => pk.measurement === uom);
    if (packing) return { stock: packing.openingQty || 0, uom: packing.measurement, message: "" };
  }
  const firstPacking = product.packingInfo[0];
  return { stock: firstPacking?.openingQty || 0, uom: firstPacking?.measurement || "", message: "" };
};

const getStockStatus = (stock) => {
  if (stock === 0) return { color: "#dc2626", text: "OUT OF STOCK", icon: "❌", bg: "#fee2e2" };
  if (stock < 5) return { color: "#ef4444", text: "VERY LOW", icon: "⚠️", bg: "#fee2e2" };
  if (stock < 10) return { color: "#f59e0b", text: "LOW STOCK", icon: "⚠️", bg: "#fef3c7" };
  if (stock < 20) return { color: "#eab308", text: "LIMITED", icon: "📦", bg: "#fef9c3" };
  return { color: "#10b981", text: "IN STOCK", icon: "✓", bg: "#d1fae5" };
};

/* ══════════════════════════════════════════════════════════
   PRINT HTML BUILDER
══════════════════════════════════════════════════════════ */
const buildPrintHtml = (sale, type, overrides = {}) => {
  const customerName = overrides.customerName ?? sale.customerName;
  const customerPhone = overrides.customerPhone ?? "";
  const hidePrices = overrides.hidePrices || false;
  const username = overrides.username || sale.username || 'ADMIN';
  const rows = sale.items.map((it, i) => ({ ...it, sr: i + 1 }));
  const totalQty = rows.reduce((s, r) => s + (r.pcs || 0), 0);
  
  const urduFont = `'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Alvi Nastaleeq', 'Mehr Nastaliq', 'Gulzar', serif`;
  const englishFont = `'Courier New', 'Segoe UI', monospace`;
  
  const fontLinks = `
    <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Gulzar:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @font-face {
        font-family: 'Jameel Noori Nastaleeq';
        src: local('Jameel Noori Nastaleeq'), local('Jameel Noori Nastaleeq Regular');
      }
      .urdu { font-family: ${urduFont}; font-weight: 500; line-height: 1.4; letter-spacing: 0.3px; }
      .urdu-bold { font-family: ${urduFont}; font-weight: 700; line-height: 1.4; letter-spacing: 0.3px; }
      body { font-family: ${englishFont}; font-size: 10px; width: 72mm; margin: 0 auto; padding: 2mm 2mm 3mm 2mm; background: #fff; color: #000; }
      .shop-name-line { font-family: ${urduFont}; font-size: 16px; font-weight: 700; text-align: center; direction: rtl; margin-bottom: 2px; }
      .sub-header { font-family: ${urduFont}; font-size: 11px; text-align: center; direction: rtl; margin-bottom: 2px; }
      .contact-line { font-size: 9px; text-align: center; font-weight: bold; margin-bottom: 4px; }
      .banner-text { font-family: ${urduFont}; font-size: 10px; text-align: center; direction: rtl; margin: 4px 0; padding: 3px; border-top: 1px solid #000; border-bottom: 1px solid #000; }
      .inv-header { display: flex; justify-content: space-between; font-size: 9px; margin: 3px 0; font-weight: bold; }
      .cust-row { font-size: 9px; margin: 2px 0; }
      .divider-dash { border: none; border-top: 1px dashed #000; margin: 3px 0; }
      .divider-solid { border: none; border-top: 1px solid #000; margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; margin: 4px 0; }
      thead tr { border-bottom: 1px solid #000; }
      th { font-size: 9px; font-weight: bold; padding: 3px 1px; text-align: left; }
      th.r { text-align: right; }
      td { padding: 2px 1px; font-size: 9px; border-bottom: 0.5px solid #ccc; }
      td.r { text-align: right; }
      .summary-row { display: flex; justify-content: space-between; font-size: 9px; margin: 2px 0; }
      .summary-row.bold { font-weight: bold; margin-top: 3px; padding-top: 2px; border-top: 1px dashed #000; }
      .terms { font-family: ${urduFont}; font-size: 9px; text-align: right; direction: rtl; margin-top: 5px; padding-top: 3px; border-top: 1px solid #000; line-height: 1.4; }
      .devby { text-align: center; font-size: 7px; margin-top: 5px; padding-top: 2px; border-top: 0.5px dotted #999; }
      .duplicate-badge { text-align: center; font-size: 10px; font-weight: bold; letter-spacing: 2px; margin: 2px 0; color: #c00; }
      @media print { @page { size: 72mm auto; margin: 0; } body { margin: 0; padding: 2mm; } }
    </style>
  `;

  if (type === "Gatepass") {
    const itemRows = rows.map((it) => `
      <tr>
        <td style="padding:2px">${it.sr}</td>
        <td style="padding:2px">${it.code}</td>
        <td class="urdu" style="padding:2px;font-size:10px">${it.name}</td>
        <td style="padding:2px;text-align:center">${it.pcs}</td>
      </tr>
    `).join("");
    
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${fontLinks}</head><body>
      <div class="shop-name-line">${SHOP_INFO.name}</div>
      <div class="sub-header">${SHOP_INFO.address}</div>
      <div class="contact-line">${SHOP_INFO.phone1} | ${SHOP_INFO.phone2}</div>
      <div class="banner-text urdu">${SHOP_INFO.urduBanner}</div>
      <div class="inv-header"><span><b>Invoice:</b> ${sale.invoiceNo}</span><span><b>Date:</b> ${sale.invoiceDate}</span></div>
      <div class="cust-row"><b>Customer:</b> <span class="urdu">${customerName}</span></div>
      <hr class="divider-dash">
      <table><thead><tr><th style="width:20px">#</th><th style="width:50px">Code</th><th>Product</th><th style="width:45px;text-align:center">Qty</th></tr></thead><tbody>${itemRows}</tbody></table>
      <hr class="divider-solid">
      <div class="summary-row"><span><b>Total Items:</b> ${rows.length}</span><span><b>Total Qty:</b> ${totalQty}</span></div>
      <div class="terms urdu">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
      <div class="devby">${SHOP_INFO.devBy}</div>
    </body></html>`;
  }

  if (type === "Thermal") {
    const itemRows = rows.map((it) => `
      <tr>
        <td style="padding:2px 1px">${it.sr}</td>
        <td class="urdu" style="padding:2px 1px;font-size:10px">${it.name.substring(0, 30)}</td>
        <td class="r" style="padding:2px 1px">${it.pcs}</td>
        <td class="r" style="padding:2px 1px">${Number(it.rate).toLocaleString()}</td>
        <td class="r" style="padding:2px 1px;font-weight:bold">${Number(it.amount).toLocaleString()}</td>
      </tr>
    `).join("");
    
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${fontLinks}</head><body>
      <div class="shop-name-line">${SHOP_INFO.name}</div>
      <div class="sub-header">${SHOP_INFO.address}</div>
      <div class="contact-line"><b>${SHOP_INFO.phone1}</b> | ${SHOP_INFO.phone2} | ${SHOP_INFO.phone3}</div>
      <div class="banner-text urdu">${SHOP_INFO.urduBanner}</div>
      <div class="inv-header"><span><b>Sales Invoice</b></span><span><b>${username}</b></span><span>${new Date().toLocaleTimeString()}</span></div>
      <hr class="divider-dash">
      <div class="inv-header"><span><b>${sale.invoiceNo}</b></span><span>${sale.invoiceDate}</span></div>
      <div class="cust-row"><b>Customer:</b> <span class="urdu" style="font-size:11px;font-weight:bold">${customerName}</span></div>
      ${customerPhone ? `<div class="cust-row" style="font-size:8px;color:#555">${customerPhone}</div>` : ""}
      <hr class="divider-solid">
      </table><thead><tr><th style="width:22px">#</th><th>Product</th><th class="r" style="width:35px">Qty</th><th class="r" style="width:45px">Rate</th><th class="r" style="width:50px">Amount</th></tr></thead><tbody>${itemRows}</tbody></tr>
      <hr class="divider-dash">
      <div class="summary-row"><span>T.Qty: <b>${totalQty}</b></span><span>T.Items: <b>${rows.length}</b></span></div>
      ${sale.extraDisc > 0 ? `<div class="summary-row" style="color:#c00"><span>Discount:</span><span>-${Number(sale.extraDisc).toLocaleString()}</span></div>` : ""}
      <div class="summary-row bold"><span>Sub Total:</span><span>${Number(sale.netTotal).toLocaleString()}</span></div>
      ${sale.prevBalance > 0 ? `<div class="summary-row" style="color:#c00"><span>Prev. Bal:</span><span>${Number(sale.prevBalance).toLocaleString()}</span></div>` : ""}
      <div class="summary-row" style="color:#060"><span>Received:</span><span>PKR ${Number(sale.paidAmount).toLocaleString()}</span></div>
      <div class="summary-row bold"><span>Balance:</span><span>PKR ${Number(sale.balance).toLocaleString()}</span></div>
      <div class="terms urdu">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
      <div class="devby">${SHOP_INFO.devBy}</div>
    </body></html>`;
  }

  // A4 format
  const itemRows = rows.map((it) => `
    <tr>
      <td style="text-align:center;padding:3px">${it.sr}</td>
      <td class="urdu" style="padding:3px">${it.name}</td>
      <td style="text-align:center;padding:3px">${it.uom || "—"}</td>
      <td style="text-align:right;padding:3px">${it.pcs}</td>
      ${!hidePrices ? `
      <td style="text-align:right;padding:3px">${Number(it.rate).toLocaleString()}</td>
      <td style="text-align:right;padding:3px;font-weight:bold">${Number(it.amount).toLocaleString()}</td>
      ` : '<td colspan="2" style="text-align:center;padding:3px">[HIDDEN]</td>'}
    </tr>
  `).join("");
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${fontLinks}<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:${englishFont};font-size:11px;background:#fff;padding:4mm 3mm 3mm 3mm;color:#000}
    .shop-name-line{font-family:${urduFont};font-size:22px;font-weight:700;direction:rtl;text-align:center;margin-bottom:4px}
    .sub-header{font-family:${urduFont};font-size:11px;font-weight:500;text-align:center;direction:rtl;margin-bottom:2px}
    .contact-line{font-size:10px;font-weight:bold;text-align:center;margin-bottom:3px}
    .banner-text{background:#fff;color:#000;font-family:${urduFont};font-size:11px;font-weight:700;text-align:center;padding:4px;margin:4px 0;border:1px solid #000}
    .meta-box{border:1px solid #000;padding:5px;margin:6px 0}
    table{width:100%;border-collapse:collapse;margin:6px 0}
    thead tr{border-bottom:1px solid #000}
    th{font-size:10px;font-weight:bold;padding:4px 2px;text-align:left}
    td{padding:3px 2px;font-size:10px;border-bottom:0.5px solid #ddd}
    .terms{font-family:${urduFont};font-size:10px;font-weight:500;border:0.5px dashed #999;padding:4px;margin:6px 0;text-align:right;direction:rtl}
    .devby{text-align:center;font-size:8px;margin-top:6px;padding-top:3px;border-top:0.5px solid #ccc}
    @media print{@page{size:A4;margin:5mm}body{padding:4mm 3mm 3mm 3mm}}
  </style></head><body>
    <div class="shop-name-line">${SHOP_INFO.name}</div>
    <div class="sub-header">${SHOP_INFO.address}</div>
    <div class="contact-line">${SHOP_INFO.phone1} | ${SHOP_INFO.phone2} | ${SHOP_INFO.phone3}</div>
    <div class="banner-text urdu-bold">${SHOP_INFO.urduBanner}</div>
    <div class="meta-box">
      <div><b>Customer:</b> <span class="urdu-bold" style="font-size:12px">${customerName}</span></div>
      ${customerPhone ? `<div><b>Phone:</b> ${customerPhone}</div>` : ""}
      <div><b>Salesman:</b> ${username}</div>
      <div><b>Invoice:</b> ${sale.invoiceNo}</div>
      <div><b>Date:</b> ${sale.invoiceDate}</div>
      <div><b>Items:</b> ${rows.length}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:25px;padding:4px">#</th>
          <th style="padding:4px">Product</th>
          <th style="width:45px;padding:4px">Unit</th>
          <th style="width:40px;padding:4px">Qty</th>
          ${!hidePrices ? '<th style="width:55px;padding:4px">Rate</th><th style="width:65px;padding:4px">Amount</th>' : '<th colspan="2" style="padding:4px">Gate Pass</th>'}
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="display:flex;gap:10px;margin-top:8px">
      <div style="flex:1.2">
        <div><b>Total Items:</b> ${rows.length}</div>
        <div><b>Total Qty:</b> ${totalQty}</div>
        <div class="terms urdu">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
        <div style="margin-top:12px;border-top:1px solid #000;display:inline-block;padding-top:3px;min-width:100px">Signature</div>
      </div>
      <div style="flex:0.8;border:1px solid #000;padding:6px">
        ${sale.extraDisc > 0 ? `<div style="display:flex;justify-content:space-between;margin:2px 0"><span>Discount:</span><span>-${Number(sale.extraDisc).toLocaleString()}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;margin:2px 0;font-weight:bold"><span>Sub Total:</span><span>${Number(sale.netTotal).toLocaleString()}</span></div>
        ${sale.prevBalance > 0 ? `<div style="display:flex;justify-content:space-between;margin:2px 0;color:#c00"><span>Prev Bal:</span><span>${Number(sale.prevBalance).toLocaleString()}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;margin:2px 0;color:#060"><span>Received:</span><span>PKR ${Number(sale.paidAmount).toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;margin:2px 0;font-weight:bold"><span>Balance:</span><span>PKR ${Number(sale.balance).toLocaleString()}</span></div>
      </div>
    </div>
    <div class="devby">${SHOP_INFO.devBy}</div>
  </body></html>`;
};

const shareViaWhatsApp = async (sale, overrides = {}) => {
  try {
    if (!sale.items || sale.items.length === 0) { alert("No items to share"); return; }
    const htmlContent = buildPrintHtml(sale, "A4", overrides);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => { setTimeout(() => { printWindow.print(); URL.revokeObjectURL(url); alert("Please save the PDF and share on WhatsApp"); }, 500); };
    } else { alert("Please allow popups to generate PDF"); }
  } catch (error) { console.error("Failed to generate PDF:", error); alert("Failed to generate PDF. Please try again."); }
};

const doPrint = (sale, type, overrides = {}) => {
  const printData = { ...sale, customerName: overrides.customerName || sale.customerName || "COUNTER SALE", username: overrides.username || sale.username || 'ADMIN' };
  const w = window.open("", "_blank", type === "Thermal" || type === "Gatepass" ? "width=420,height=640" : "width=900,height=700");
  if (w) { w.document.write(buildPrintHtml(printData, type, overrides)); w.document.close(); w.onload = () => { setTimeout(() => { w.print(); }, 300); }; setTimeout(() => { if (w && !w.closed) w.print(); }, 500); } 
  else { alert("Please allow popups for this site to print invoices."); }
};

/* ══════════════════════════════════════════════════════════
   PRINT OPTIONS MODAL
══════════════════════════════════════════════════════════ */
function PrintOptionsModal({ sale, allCustomers, defaultPrintType, onPrint, onClose }) {
  const [selPrintType, setSelPrintType] = useState(defaultPrintType || "Thermal");
  const [custPhone, setCustPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [saving, setSaving] = useState(false);
  const phoneRef = useRef(null);
  const nameRef = useRef(null);

  const getLoggedInUsername = () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        return user.username || user.name || 'ADMIN';
      }
    } catch (e) { console.error('Failed to get username:', e); }
    return 'ADMIN';
  };

  const cashCustomers = allCustomers.filter((c) => {
    const t = (c.customerType || c.type || "").toLowerCase();
    return ["cash", "walkin", "wholesale", ""].includes(t) && c.name?.toUpperCase().trim() !== "COUNTER SALE";
  });

  useEffect(() => {
    setTimeout(() => { if (phoneRef.current) { phoneRef.current.focus(); phoneRef.current.select(); } }, 150);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key === "Enter") {
        e.preventDefault(); e.stopPropagation();
        if (document.activeElement === phoneRef.current) {
          if (nameRef.current) { nameRef.current.focus(); nameRef.current.select(); }
          return;
        }
        if (document.activeElement === nameRef.current || !phoneRef.current) { handlePrint(); return; }
        handlePrint();
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const formats = ["Thermal", "A5", "A4", "Gatepass"];
        const currentIndex = formats.indexOf(selPrintType);
        let newIndex = e.key === "ArrowRight" ? (currentIndex + 1) % formats.length : (currentIndex - 1 + formats.length) % formats.length;
        setSelPrintType(formats[newIndex]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [custPhone, custName, selPrintType, saving]);

  const handlePhoneChange = (val) => {
    setCustPhone(val);
    if (val.trim().length >= 7) {
      const clean = val.replace(/\D/g, "");
      const found = cashCustomers.find(c => c.phone?.replace(/\D/g, "").includes(clean) || c.cell?.replace(/\D/g, "").includes(clean) || c.otherPhone?.replace(/\D/g, "").includes(clean));
      if (found) setCustName(found.name);
      else setCustName("");
    } else setCustName("");
  };

  const handlePrint = async () => {
    if (saving) return;
    setSaving(true);
    let finalName = custName.trim() || "COUNTER SALE";
    let finalPhone = custPhone.trim();
    const username = getLoggedInUsername();
    if (finalPhone) {
      const clean = finalPhone.replace(/\D/g, "");
      const existing = cashCustomers.find(c => c.phone?.replace(/\D/g, "").includes(clean) || c.cell?.replace(/\D/g, "").includes(clean));
      if (!existing && finalName !== "COUNTER SALE") {
        try { const { data } = await api.post(EP.CUSTOMERS.CREATE, { name: finalName, type: "walkin", phone: finalPhone }); if (data.success) finalName = data.data.name; } catch (error) { console.error("Failed to create customer:", error); }
      } else if (existing) finalName = existing.name;
    }
    setSaving(false);
    onPrint(selPrintType, { customerName: finalName, customerPhone: finalPhone, hidePrices: selPrintType === "Gatepass", username: username });
  };

  return (
    <div className="scm-overlay">
      <div className="scm-window" style={{ maxWidth: 450 }}>
        <div className="scm-tb"><svg width="13" height="13" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m4-3h7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z"/></svg><span className="scm-tb-title">Print Options — {sale.invoiceNo}</span><button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button></div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="xp-label" style={{ fontWeight: 600 }}>📞 Phone Number</label>
            <input ref={phoneRef} className="xp-input" type="text" placeholder="Enter customer phone number" value={custPhone} onChange={(e) => handlePhoneChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); nameRef.current?.focus(); nameRef.current?.select(); } }} autoComplete="off" style={{ fontSize: "14px", padding: "8px 10px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="xp-label" style={{ fontWeight: 600 }}>👤 Customer Name{custName && custPhone && <span style={{ marginLeft: 8, fontSize: 11, color: "#15803d", fontWeight: 600 }}>✓ Already saved</span>}{custPhone.trim().length >= 7 && !custName && <span style={{ marginLeft: 8, fontSize: 11, color: "#b45309", fontWeight: 600 }}>New — will be saved</span>}</label>
            <input ref={nameRef} className="xp-input" type="text" placeholder="Enter customer name" value={custName} onChange={(e) => setCustName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handlePrint(); } }} style={{ fontSize: "14px", padding: "8px 10px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="xp-label" style={{ fontWeight: 600 }}>🖨 Print Format <span style={{ fontSize: "11px", color: "#666", fontWeight: "normal" }}>(← → arrows to change)</span></label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Thermal", "A5", "A4", "Gatepass"].map((pt) => (<label key={pt} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", border: `2px solid ${selPrintType === pt ? "#1e40af" : "#d1d5db"}`, borderRadius: 6, background: selPrintType === pt ? "#dbeafe" : "#f9fafb", cursor: "pointer", fontWeight: selPrintType === pt ? 600 : 400, color: selPrintType === pt ? "#1e40af" : "#444", fontSize: 13 }}><input type="radio" name="po-pt" checked={selPrintType === pt} onChange={() => setSelPrintType(pt)} style={{ display: "none" }} />{pt === "Thermal" ? "🖨" : pt === "A5" ? "📄" : pt === "A4" ? "📋" : "🎫"} {pt}</label>))}
            </div>
          </div>
        </div>
        <div className="scm-sep" />
        <div className="scm-actions"><button className="xp-btn xp-btn-primary" style={{ minWidth: 140, fontSize: "14px", padding: "10px 20px" }} onClick={handlePrint} disabled={saving}>{saving ? "⏳ Processing..." : "🖨 Print Now"}</button><button className="xp-btn" style={{ minWidth: 120, fontSize: "14px", padding: "10px 20px" }} onClick={onClose}>↩ Cancel</button></div>
        <div className="scm-hint" style={{ padding: "10px 16px", fontSize: "12px", color: "#4b5563", borderTop: "1px solid #e5e7eb", background: "#f9fafb", textAlign: "center", borderRadius: "0 0 8px 8px" }}>⏎ Enter: Phone → Name → Print | ← → Arrows: Change Format | ⎋ Esc: Cancel</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SAVE CONFIRM MODAL
══════════════════════════════════════════════════════════ */
function SaveConfirmModal({ salePayload, printType: defaultPrintType, onConfirm, onClose }) {
  const [paidAmount, setPaidAmount] = useState(0);
  const [selPrintType, setSelPrintType] = useState(defaultPrintType);
  const [saving, setSaving] = useState(false);
  const paidRef = useRef(null);
  
  useEffect(() => { setTimeout(() => { paidRef.current?.focus(); paidRef.current?.select(); }, 80); }, []);
  useEffect(() => { 
    const h = (e) => { 
      if (e.key === "Escape") { e.preventDefault(); onClose(); } 
      if (e.key === "Enter" && document.activeElement === paidRef.current) { e.preventDefault(); handleConfirm(true); } 
    }; 
    window.addEventListener("keydown", h); 
    return () => window.removeEventListener("keydown", h); 
  }, [paidAmount, selPrintType]);
  
  const netTotal = salePayload.netTotal, prevBalance = salePayload.prevBalance || 0, paid = Number(paidAmount) || 0, billTotal = netTotal + prevBalance, change = paid - billTotal;
  
  const handleConfirm = async (withPrint) => { 
    if (saving) return; 
    setSaving(true); 
    await onConfirm({ extraDisc: salePayload.extraDisc || 0, netTotal, paidAmount: paid, balance: billTotal - paid, printType: selPrintType, withPrint }); 
    setSaving(false); 
  };
  
  return (
    <div className="scm-overlay">
      <div className="scm-window">
        <div className="scm-tb">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/></svg>
          <span className="scm-tb-title">Sale Confirm — {salePayload.invoiceNo}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button>
        </div>
        <div className="scm-meta">
          <span><b>Invoice:</b> {salePayload.invoiceNo}</span>
          <span><b>Date:</b> {salePayload.invoiceDate}</span>
          <span><b>Customer:</b> {salePayload.customerName}</span>
          <span><b>Payment:</b> {salePayload.paymentMode}</span>
          <span><b>Items:</b> {salePayload.items.length}</span>
        </div>
        <div className="scm-amounts">
          <div className="scm-box">
            <div className="scm-box-label">Bill Amount</div>
            <div className="scm-box-val">{Number(billTotal).toLocaleString("en-PK")}</div>
          </div>
          <div className="scm-box" style={{ borderLeft: "none" }}>
            <div className="scm-box-label">Received</div>
            <input ref={paidRef} type="text" className="scm-recv-input" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} onFocus={(e) => e.target.select()} />
          </div>
          <div className={`scm-box ${change >= 0 ? "scm-box-change" : "scm-box-due"}`} style={{ borderLeft: "none" }}>
            <div className="scm-box-label">{change >= 0 ? "Change" : "Balance Due"}</div>
            <div className="scm-box-val">{change < 0 && <span style={{ fontSize: 22, marginRight: 2 }}>−</span>}{Math.abs(change).toLocaleString("en-PK")}</div>
          </div>
        </div>
        <div className="scm-print-row">
          <span>Print:</span>
          {["Thermal", "A4", "Gatepass"].map((pt) => (
            <label key={pt}><input type="radio" name="scm-pt" checked={selPrintType === pt} onChange={() => setSelPrintType(pt)} />{pt}</label>
          ))}
        </div>
        <div className="scm-sep" />
        <div className="scm-actions">
          <button className="xp-btn xp-btn-primary" onClick={() => handleConfirm(true)} disabled={saving}>🖨 Save and Print</button>
          <button className="xp-btn xp-btn-success" onClick={() => handleConfirm(false)} disabled={saving}>💾 Save only</button>
          <button className="xp-btn" onClick={onClose}>↩ Return to Invoice</button>
        </div>
        <div className="scm-hint">↵ Enter = Save & Print | Esc = Return to Invoice</div>
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "F2") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const buildFlat = useCallback((products, d, c, co) => {
    const res = [];
    const ld = d.trim().toLowerCase(), lc = c.trim().toLowerCase(), lo = co.trim().toLowerCase();
    products.forEach((p) => {
      const ok = (!ld || p.description?.toLowerCase().includes(ld) || p.code?.toLowerCase().includes(ld)) && (!lc || p.category?.toLowerCase().includes(lc)) && (!lo || p.company?.toLowerCase().includes(lo));
      if (!ok) return;
      const _name = [p.category, p.description, p.company].filter(Boolean).join(" ");
      if (p.packingInfo?.length > 0) {
        p.packingInfo.forEach((pk, i) => res.push({ ...p, _pi: i, _meas: pk.measurement, _rate: pk.saleRate, _pack: pk.packing, _stock: pk.openingQty || 0, _name }));
      } else {
        res.push({ ...p, _pi: 0, _meas: "", _rate: 0, _pack: 1, _stock: 0, _name });
      }
    });
    return res;
  }, []);

  useEffect(() => { rDesc.current?.focus(); setRows(buildFlat(allProducts, "", "", "")); }, [allProducts, buildFlat]);
  useEffect(() => { const f = buildFlat(allProducts, desc, cat, company); setRows(f); setHiIdx(f.length > 0 ? 0 : -1); }, [desc, cat, company, allProducts, buildFlat]);
  useEffect(() => { if (tbodyRef.current && hiIdx >= 0) tbodyRef.current.children[hiIdx]?.scrollIntoView({ block: "nearest" }); }, [hiIdx]);

  const fk = (e, nr) => { if (e.key === "Escape") { onClose(); return; } if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); nr ? nr.current?.focus() : (tbodyRef.current?.focus(), setHiIdx((h) => Math.max(0, h))); } };
  const tk = (e) => { if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx((i) => Math.min(i + 1, rows.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setHiIdx((i) => Math.max(i - 1, 0)); } if (e.key === "Enter") { e.preventDefault(); if (hiIdx >= 0 && rows[hiIdx]) onSelect(rows[hiIdx]); } if (e.key === "Escape") onClose(); if (e.key === "F2") { e.preventDefault(); onClose(); } if (e.key === "Tab") { e.preventDefault(); rDesc.current?.focus(); } };

  const getStockStatusForModal = (stock) => {
    if (stock === 0) return { color: "#dc2626", text: "OUT OF STOCK", icon: "❌", bg: "#fee2e2" };
    if (stock < 5) return { color: "#ef4444", text: "VERY LOW", icon: "⚠️", bg: "#fee2e2" };
    if (stock < 10) return { color: "#f59e0b", text: "LOW STOCK", icon: "⚠️", bg: "#fef3c7" };
    if (stock < 20) return { color: "#eab308", text: "LIMITED", icon: "📦", bg: "#fef9c3" };
    return { color: "#10b981", text: "IN STOCK", icon: "✓", bg: "#d1fae5" };
  };

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: "95%", maxWidth: "1400px", height: "85vh", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: "12px", background: "#ffffff", border: "2px solid #000000" }}>
        <div className="xp-modal-tb" style={{ background: "#1e40af", padding: "10px 16px", borderRadius: "10px 10px 0 0" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>Search Products (Press F2 or ESC to close)</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        <div className="cs-modal-filters" style={{ padding: "8px 12px", gap: "10px", background: "#f8fafc", borderBottom: "1px solid #000000", flexWrap: "wrap" }}>
          <div className="cs-modal-filter-grp" style={{ flex: 2, minWidth: "200px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Description / Code</label>
            <input ref={rDesc} type="text" className="xp-input" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => fk(e, rCat)} autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }}/>
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Category</label>
            <input ref={rCat} type="text" className="xp-input" value={cat} onChange={(e) => setCat(e.target.value)} onKeyDown={(e) => fk(e, rCompany)} autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }}/>
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Company</label>
            <input ref={rCompany} type="text" className="xp-input" value={company} onChange={(e) => setCompany(e.target.value)} onKeyDown={(e) => fk(e, null)} autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }}/>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", paddingBottom: "2px" }}>
            <span style={{ fontSize: "11px", color: "#000000", fontWeight: "bold" }}>{rows.length} result(s)</span>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold" }}>Close</button>
          </div>
        </div>
        <div className="xp-modal-body" style={{ padding: 0, flex: 1, overflow: "hidden" }}>
          <div className="xp-table-panel" style={{ border: "none", height: "100%" }}>
            <div className="xp-table-scroll" style={{ height: "100%", overflow: "auto", maxHeight: "calc(85vh - 110px)" }}>
              <table className="xp-table" style={{ fontSize: "12px", borderCollapse: "collapse", width: "100%", border: "1px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ width: 40, padding: "8px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold" }}>#</th>
                    <th style={{ width: 90, padding: "8px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold" }}>Code</th>
                    <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold" }}>Product Name</th>
                    <th style={{ width: 60, padding: "8px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold" }}>Unit</th>
                    <th style={{ width: 85, padding: "8px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold" }}>Rate</th>
                    <th style={{ width: 110, padding: "8px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold" }}>Stock</th>
                    <th style={{ width: 55, padding: "8px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold" }}>Pack</th>
                    <th style={{ width: 65, padding: "8px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold" }}>Rack</th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef} tabIndex={0} onKeyDown={tk}>
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="xp-empty" style={{ padding: "30px", textAlign: "center" }}>No products found</td></tr>
                  )}
                  {rows.map((r, i) => {
                    const stockStatus = getStockStatusForModal(r._stock);
                    return (
                      <tr key={`${r._id}-${r._pi}`} style={{ background: i === hiIdx ? "#0a4aa4" : "white", color: i === hiIdx ? "white" : "black", cursor: "pointer" }} onClick={() => setHiIdx(i)} onDoubleClick={() => onSelect(r)}>
                        <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000" }}>{i + 1}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #000000" }}>{r.code}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #000000" }}>
                          <button className="xp-link-btn" style={{ textDecoration: "none", fontWeight: "bold", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: "0", color: i === hiIdx ? "white" : "black" }}>{r._name}</button>
                        </td>
                        <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000" }}>{r._meas}</td>
                        <td style={{ padding: "6px 4px", textAlign: "right", border: "1px solid #000000" }}>{Number(r._rate).toLocaleString("en-PK")}</td>
                        <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", backgroundColor: i === hiIdx ? (stockStatus.color + "40") : stockStatus.bg, color: stockStatus.color }}>
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", whiteSpace: "nowrap" }}>
                            <span>{stockStatus.icon}</span>
                            <span>{r._stock}</span>
                            <span style={{ fontSize: "10px" }}>{r._meas}</span>
                          </span>
                        </td>
                        <td style={{ padding: "6px 4px", textAlign: "right", border: "1px solid #000000" }}>{r._pack}</td>
                        <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000" }}>{r.rackNo || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="cs-modal-hint" style={{ padding: "6px 12px", fontSize: "10px", color: "#000000", fontWeight: "bold", borderTop: "1px solid #000000", background: "#f8fafc", borderRadius: "0 0 10px 10px" }}>
          ↑↓ navigate | Enter/Double-click = select | F2/Esc = close | Tab = filters
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
        <div className="xp-modal-tb">
          <span className="xp-modal-title">Hold Bill — {bill.invoiceNo}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button>
        </div>
        <div className="xp-modal-body" style={{ padding: 8 }}>
          <div style={{ marginBottom: 6, display: "flex", gap: 16 }}>
            <span><b>Customer:</b> {bill.buyerName}</span>
            <span><b>Items:</b> {bill.items.length}</span>
            <span><b>Amount:</b> <span style={{ color: "var(--xp-blue-dark)", fontWeight: 700 }}>{Number(bill.amount).toLocaleString("en-PK")}</span></span>
          </div>
          <div className="xp-table-panel" style={{ border: "none" }}>
            <div className="xp-table-scroll" style={{ maxHeight: 300 }}>
              <table className="xp-table">
                <thead>
                  <tr><th>#</th><th>Code</th><th>Name</th><th>UOM</th><th className="r">Pcs</th><th className="r">Rate</th><th className="r">Amount</th></tr>
                </thead>
                <tbody>
                  {bill.items.map((r, i) => (
                    <tr key={i}>
                      <td className="text-muted">{i + 1}</td>
                      <td className="text-muted">{r.code}</td>
                      <td>{r.name}</td>
                      <td className="text-muted">{r.uom}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">{Number(r.rate).toLocaleString("en-PK")}</td>
                      <td className="r" style={{ fontWeight: 700 }}>{Number(r.amount).toLocaleString("en-PK")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderTop: "1px solid var(--xp-silver-5)", justifyContent: "flex-end" }}>
          <button className="xp-btn xp-btn-sm" onClick={onClose}>Cancel</button>
          <button className="xp-btn xp-btn-primary xp-btn-sm" onClick={() => onResume(bill.id)}>Resume This Bill</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CUSTOMER DROPDOWN
══════════════════════════════════════════════════════════ */
function CustomerDropdown({ allCustomers, value, displayName, customerType, onSelect, onClear, allowedTypes }) {
  const [query, setQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  
  const creditCustomers = allCustomers.filter((c) => { 
    const t = (c.customerType || c.type || "").toLowerCase(); 
    const allowed = allowedTypes || ["credit"]; 
    return allowed.includes(t) && c.name?.toUpperCase().trim() !== "COUNTER SALE"; 
  });
  
  const getSuggestions = (searchTerm) => { 
    if (!searchTerm.trim()) return []; 
    const searchLower = searchTerm.toLowerCase(); 
    return creditCustomers.filter(c => c.name?.toLowerCase().startsWith(searchLower)); 
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
    if (!isNavigating && matches.length > 0 && matches[0].name) 
      setGhost(matches[0].name.slice(originalQuery.length)); 
    else setGhost(""); 
  }, [originalQuery, isNavigating]);
  
  const selectCustomer = (customer) => { 
    onSelect(customer); 
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
      const matchedCustomer = suggestions[0]; 
      if (matchedCustomer) selectCustomer(matchedCustomer); 
      return; 
    } 
    if (e.key === "ArrowDown") { 
      e.preventDefault(); 
      if (suggestions.length === 0) return; 
      setIsNavigating(true); 
      setShowDropdown(true); 
      let newIndex = selectedSuggestionIndex === -1 ? 0 : (selectedSuggestionIndex + 1) % suggestions.length; 
      setSelectedSuggestionIndex(newIndex); 
      const selectedCustomer = suggestions[newIndex]; 
      if (selectedCustomer) { 
        setQuery(selectedCustomer.name); 
        setGhost(""); 
      } 
      return; 
    } 
    if (e.key === "ArrowUp") { 
      e.preventDefault(); 
      if (suggestions.length === 0) return; 
      setIsNavigating(true); 
      setShowDropdown(true); 
      let newIndex = selectedSuggestionIndex === -1 ? suggestions.length - 1 : (selectedSuggestionIndex - 1 + suggestions.length) % suggestions.length; 
      setSelectedSuggestionIndex(newIndex); 
      const selectedCustomer = suggestions[newIndex]; 
      if (selectedCustomer) { 
        setQuery(selectedCustomer.name); 
        setGhost(""); 
      } 
      return; 
    } 
    if (e.key === "Enter") { 
      e.preventDefault(); 
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) 
        selectCustomer(suggestions[selectedSuggestionIndex]); 
      else if (suggestions.length > 0 && suggestions[0]) 
        selectCustomer(suggestions[0]); 
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
    if (value && newValue !== displayName) onClear(); 
    setSelectedSuggestionIndex(-1); 
    setShowDropdown(true); 
    setIsNavigating(false); 
  };
  
  const typeStyle = customerType && TYPE_COLORS[customerType] ? { background: TYPE_COLORS[customerType].bg, color: TYPE_COLORS[customerType].color, border: `1px solid ${TYPE_COLORS[customerType].border}` } : null;
  
  return (
    <div style={{ position: "relative", flex: 1, border: "1px solid #ccc", borderRadius: "4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, position: "relative" }}>
        {typeStyle && <span className="cdd-type-badge" style={typeStyle}>{customerType}</span>}
        <div style={{ position: "relative", flex: 1, background: isFocused ? "#fffbe6" : "transparent", borderRadius: "4px" }}>
          {ghost && !isNavigating && (
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", whiteSpace: "nowrap", fontSize: "13px", display: "flex", zIndex: 2, color: "#a0aec0", paddingLeft: "4px" }}>
              <span style={{ visibility: "hidden" }}>{originalQuery}</span><span>{ghost}</span>
            </div>
          )}
          <input ref={inputRef} className="sl-cust-input" style={{ flex: 1, minWidth: 0, background: "transparent", position: "relative", zIndex: 1, width: "100%", border: "none", outline: "none", padding: "4px" }} value={value ? query || displayName : query} onChange={handleChange} onKeyDown={handleKeyDown} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} autoComplete="off" />
        </div>
        {value && <button className="xp-btn xp-btn-sm xp-btn-danger" style={{ height: 22, padding: "0 5px", fontSize: 10, flexShrink: 0 }} onMouseDown={(e) => { e.preventDefault(); onClear(); setQuery(""); setOriginalQuery(""); setGhost(""); setSuggestions([]); setSelectedSuggestionIndex(-1); setShowDropdown(false); setIsNavigating(false); inputRef.current?.focus(); }}>✕</button>}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 4, maxHeight: 200, overflowY: "auto", zIndex: 1000, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginTop: 2 }}>
          {suggestions.map((customer, idx) => (
            <div key={customer._id} onClick={() => selectCustomer(customer)} style={{ padding: "8px 12px", cursor: "pointer", backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white", borderBottom: "1px solid #f3f4f6", fontSize: 13 }} onMouseEnter={() => { setSelectedSuggestionIndex(idx); setIsNavigating(true); setQuery(customer.name); setGhost(""); }}>
              <div style={{ fontWeight: 500 }}>{customer.name}</div>
              {customer.phone && <div style={{ fontSize: 10, color: "#6b7280" }}>📞 {customer.phone}</div>}
              {customer.currentBalance > 0 && <div style={{ fontSize: 10, color: "#ef4444" }}>Balance: PKR {customer.currentBalance.toLocaleString("en-PK")}</div>}
            </div>
          ))}
        </div>
      )}
      {originalQuery && suggestions.length === 0 && <div style={{ position: "absolute", top: "100%", left: 0, fontSize: 10, color: "#9ca3af", marginTop: 2, padding: "4px 8px" }}>No customer found matching "{originalQuery}"</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STOCK UPDATE HELPER
══════════════════════════════════════════════════════════ */
const updateProductStock = async (productId, uom, qtySold, allProducts, setAllProducts, isRestore = false) => {
  try {
    const productRes = await api.get(EP.PRODUCTS.GET_ONE(productId));
    if (productRes.data.success && productRes.data.data) {
      const product = productRes.data.data;
      if (product.packingInfo && product.packingInfo.length > 0) {
        const packingIndex = product.packingInfo.findIndex(pk => pk.measurement === uom);
        if (packingIndex !== -1) {
          const currentStock = product.packingInfo[packingIndex].openingQty || 0;
          const newStock = isRestore ? currentStock + qtySold : Math.max(0, currentStock - qtySold);
          product.packingInfo[packingIndex].openingQty = newStock;
          await api.put(EP.PRODUCTS.UPDATE(productId), { packingInfo: product.packingInfo });
          setAllProducts(prev => prev.map(p => p._id === productId ? { ...p, packingInfo: product.packingInfo } : p));
          return newStock;
        }
      }
    }
  } catch (error) { 
    console.error("Failed to update stock:", error); 
  }
  return null;
};

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function SalePage() {
  const { user } = useAuth();
  const [time, setTime] = useState(timeNow());
  const [allProducts, setAllProducts] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHoldPreview, setShowHoldPreview] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [curRow, setCurRow] = useState({ ...EMPTY_ROW });
  const [items, setItems] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState(isoDate());
  const [invoiceNo, setInvoiceNo] = useState("");
  const amountRef = useRef(null);
  const [customerId, setCustomerId] = useState("");
  const [buyerName, setBuyerName] = useState("COUNTER SALE");
  const [codeSearch, setCodeSearch] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [prevBalance, setPrevBalance] = useState(0);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [received, setReceived] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [saleSource, setSaleSource] = useState("cash");
  const [holdBills, setHoldBills] = useState(() => loadHolds());
  const [editId, setEditId] = useState(null);
  const [selItemIdx, setSelItemIdx] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [printType, setPrintType] = useState("Thermal");
  const [sendSms, setSendSms] = useState(false);
  const [packingOptions, setPackingOptions] = useState([]);
  const packingRef = useRef(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [selectedProductSuggestionIdx, setSelectedProductSuggestionIdx] = useState(-1);
  const [creditWarning, setCreditWarning] = useState(false);
  const [creditStatement, setCreditStatement] = useState("");
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pendingPrintSale, setPendingPrintSale] = useState(null);
  const searchRef = useRef(null);
  const pcsRef = useRef(null);
  const rateRef = useRef(null);
  const addRef = useRef(null);
  const saveRef = useRef(null);
  const statementRef = useRef(null);
  const [gatepassPrint, setGatepassPrint] = useState(false);
  const [counterId, setCounterId] = useState(() => localStorage.getItem('selectedCounterId') || 'default');
  const [counterName, setCounterName] = useState(() => localStorage.getItem('selectedCounterName') || 'Main Counter');
  const [availableCounters, setAvailableCounters] = useState([]);
  const currentUsername = user?.username || user?.name || 'ADMIN';

  const fetchCounters = async () => { 
    try { 
      const response = await api.get('/api/counters'); 
      if (response.data && response.data.length > 0) setAvailableCounters(response.data); 
      else setAvailableCounters([{ counterId: 'default', counterName: 'Main Counter' }]); 
    } catch (error) { 
      console.error('Failed to fetch counters:', error); 
      setAvailableCounters([{ counterId: 'default', counterName: 'Main Counter' }]); 
    } 
  };
  
  useEffect(() => { fetchCounters(); }, []);
  useEffect(() => { const t = setInterval(() => setTime(timeNow()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { generateInvoiceNumber(api, EP, setInvoiceNo); fetchData(); }, []);
  useEffect(() => { saveHolds(holdBills); }, [holdBills]);

  const fetchData = async () => { 
    setLoading(true); 
    try { 
      const [pRes, cRes] = await Promise.all([api.get(EP.PRODUCTS.GET_ALL), api.get(EP.CUSTOMERS.GET_ALL)]); 
      if (pRes.data.success) setAllProducts(pRes.data.data); 
      if (cRes.data.success) setAllCustomers(cRes.data.data); 
    } catch (error) { 
      console.error("Failed to load data:", error); 
      showMsg("Failed to load data", "error"); 
    } 
    setLoading(false); 
  };
  
  const showMsg = (text, type = "success") => { 
    setMsg({ text, type }); 
    setTimeout(() => setMsg({ text: "", type: "" }), 3500); 
  };
  
  const fullReset = () => { 
    setItems([]); 
    setCurRow({ ...EMPTY_ROW }); 
    setSearchText(""); 
    setPackingOptions([]); 
    setCustomerId(""); 
    setBuyerName("COUNTER SALE"); 
    setCodeSearch(""); 
    setCustomerType(""); 
    setPrevBalance(0); 
    setExtraDiscount(0); 
    setReceived(0); 
    setPaymentMode("Cash"); 
    setSaleSource("cash"); 
    setEditId(null); 
    setSelItemIdx(null); 
    setMsg({ text: "", type: "" }); 
    setCreditWarning(false); 
    setCreditStatement(""); 
    setShowCustomerPanel(false); 
    setShowProductSuggestions(false); 
    generateInvoiceNumber(api, EP, setInvoiceNo); 
    setTimeout(() => searchRef.current?.focus(), 50); 
  };
  
  const resetCurRow = () => { 
    setCurRow({ ...EMPTY_ROW }); 
    setSearchText(""); 
    setPackingOptions([]); 
    setSelItemIdx(null); 
    setShowProductSuggestions(false); 
    setTimeout(() => searchRef.current?.focus(), 30); 
  };
  
  const handlePaymentMode = (mode) => { 
    setPaymentMode(mode); 
    if (mode === "Credit") setReceived(0); 
    else setReceived(billAmount + (parseFloat(prevBalance) || 0)); 
  };

  const handleCustomerSelect = async (c) => {
    if (!c || !c._id) { showMsg("Invalid customer selected", "error"); return; }
    try {
      const type = c.customerType || c.type || "";
      setCustomerId(c._id); 
      setBuyerName(c.name); 
      setCustomerType(type); 
      setPrevBalance(c.currentBalance || 0); 
      setCodeSearch("");
      const pm = typeToPayment(type); 
      const ss = typeToSource(type);
      setPaymentMode(pm); 
      setSaleSource(ss);
      if (pm === "Credit") setReceived(0); 
      else setReceived(billAmount + (c.currentBalance || 0));
      const limit = c.creditLimit || 0; 
      const custBal = c.currentBalance || 0;
      setCreditWarning(type === "credit" && limit > 0 && custBal >= limit);
      setCreditStatement(""); 
      setShowCustomerPanel(true);
      if (type === "credit") setTimeout(() => statementRef.current?.focus(), 80); 
      else setTimeout(() => searchRef.current?.focus(), 30);
    } catch (error) { 
      console.error("Failed to process customer selection:", error); 
      showMsg("Failed to load customer data", "error"); 
    }
  };

  const handleCustomerClear = () => { 
    setCustomerId(""); 
    setBuyerName("COUNTER SALE"); 
    setCustomerType(""); 
    setPrevBalance(0); 
    setPaymentMode("Cash"); 
    setSaleSource("cash"); 
    setReceived(billAmount); 
    setCreditWarning(false); 
    setCreditStatement(""); 
    setShowCustomerPanel(false); 
  };

  const pickProduct = (product) => {
    if (!product._id) { showMsg("Product ID missing", "error"); return; }
    const selectedUom = product._meas || product.packingInfo?.[0]?.measurement || "";
    const currentStock = product._stock || product.packingInfo?.[0]?.openingQty || 0;
    if (currentStock === 0 && !window.confirm(`⚠️ "${product.description || product.name}" is OUT OF STOCK! Still want to add?`)) return;
    setPackingOptions(product.packingInfo?.map((pk) => pk.measurement) || []);
    setCurRow({
      productId: product._id,
      code: product.code || "",
      name: product._name || product.description || "",
      uom: selectedUom,
      rack: product.rack || "",
      pcs: product._pack || 1,
      rate: product._rate || 0,
      amount: (product._pack || 1) * (product._rate || 0),
      stock: currentStock
    });
    setSearchText(product.code || ""); 
    setShowProductModal(false); 
    setShowProductSuggestions(false);
    const stockStatus = getStockStatus(currentStock);
    if (currentStock === 0) showMsg(`⚠️ ${product.description || product.name} is OUT OF STOCK!`, "error");
    else if (currentStock < 10) showMsg(`⚠️ Low stock! Only ${currentStock} ${selectedUom} remaining ${stockStatus.icon}`, "warning");
    else showMsg(`✓ ${product.description || product.name} - Stock: ${currentStock} ${selectedUom} ${stockStatus.icon}`, "success");
    setTimeout(() => searchRef.current?.focus(), 30);
  };

  const updateCurRow = (field, val) => { 
    setCurRow((prev) => { 
      const u = { ...prev, [field]: val }; 
      u.amount = (parseFloat(field === "pcs" ? val : u.pcs) || 0) * (parseFloat(field === "rate" ? val : u.rate) || 0); 
      return u; 
    }); 
    if (field === "pcs" && curRow.productId && curRow.uom) { 
      const qty = parseFloat(val); 
      if (!isNaN(qty) && qty > 0) { 
        const stockCheck = checkStockAvailability(curRow.productId, qty, curRow.uom, allProducts); 
        if (!stockCheck.available) showMsg(`⚠️ ${stockCheck.message}`, "warning"); 
        else if (stockCheck.availableStock - qty < 5 && stockCheck.availableStock > 0) 
          showMsg(`⚠️ Low stock! Only ${stockCheck.availableStock} ${curRow.uom} remaining`, "warning"); 
      } 
    } 
  };

  const addRow = () => {
    if (!curRow.name) { setShowProductModal(true); return; }
    if (!curRow.productId) { showMsg("Please select a valid product", "error"); return; }
    if (parseFloat(curRow.pcs) <= 0) { showMsg("Qty must be > 0", "error"); return; }
    const stockCheck = checkStockAvailability(curRow.productId, parseFloat(curRow.pcs), curRow.uom, allProducts);
    if (!stockCheck.available) { 
      showMsg(`❌ Insufficient stock! ${stockCheck.message}`, "error"); 
      pcsRef.current?.focus(); 
      pcsRef.current?.select(); 
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

  const loadRowForEdit = (idx) => { 
    setSelItemIdx(idx); 
    const r = items[idx]; 
    setCurRow({ ...r }); 
    setSearchText(r.name); 
    const stockCheck = checkStockAvailability(r.productId, parseFloat(r.pcs), r.uom, allProducts); 
    if (!stockCheck.available) showMsg(`⚠️ Warning: ${stockCheck.message}`, "warning"); 
    const product = allProducts.find((p) => p._id === r.productId); 
    if (product?.packingInfo?.length > 0) setPackingOptions(product.packingInfo.map((pk) => pk.measurement)); 
    else setPackingOptions([]); 
  };
  
  const removeRow = () => { 
    if (selItemIdx === null) return; 
    setItems((p) => p.filter((_, i) => i !== selItemIdx)); 
    resetCurRow(); 
  };
  
  const holdBill = () => { 
    if (!items.length) return; 
    setHoldBills((p) => [...p, { id: Date.now(), invoiceNo, amount: billAmount, items: [...items], customerId, buyerName, customerType, prevBalance, extraDiscount, paymentMode, saleSource }]); 
    fullReset(); 
    generateInvoiceNumber(api, EP, setInvoiceNo); 
  };
  
  const resumeHold = (holdId) => { 
    const bill = holdBills.find((b) => b.id === holdId); 
    if (!bill) return; 
    setItems(bill.items); 
    setCustomerId(bill.customerId || ""); 
    setBuyerName(bill.buyerName || "COUNTER SALE"); 
    setCustomerType(bill.customerType || ""); 
    setPrevBalance(bill.prevBalance || 0); 
    setExtraDiscount(bill.extraDiscount || 0); 
    setPaymentMode(bill.paymentMode || "Cash"); 
    setSaleSource(bill.saleSource || "cash"); 
    setHoldBills((p) => p.filter((b) => b.id !== holdId)); 
    setShowHoldPreview(null); 
    resetCurRow(); 
  };
  
  const deleteHold = (holdId, e) => { 
    e.stopPropagation(); 
    if (window.confirm("Delete this held bill?")) setHoldBills((p) => p.filter((b) => b.id !== holdId)); 
  };

  const loadSaleForEdit = (sale) => { 
    setEditId(sale._id); 
    // Direct assignment - NO CONCATENATION, and remove any INV- prefix
    let cleanInvoiceNo = sale.invoiceNo;
    if (cleanInvoiceNo && cleanInvoiceNo.startsWith('INV-')) {
      cleanInvoiceNo = cleanInvoiceNo.replace(/^INV-/i, '');
    }
    setInvoiceNo(cleanInvoiceNo); 
    setInvoiceDate(sale.invoiceDate || isoDate()); 
    const cust = allCustomers.find((c) => c._id === sale.customerId); 
    if (cust) { 
      setCustomerId(cust._id); 
      setBuyerName(cust.name); 
      setCustomerType(cust.customerType || cust.type || ""); 
      setPrevBalance(sale.prevBalance || 0); 
      setPaymentMode(sale.paymentMode || "Cash"); 
      setSaleSource(sale.saleSource || "cash"); 
    } else { 
      setCustomerId(""); 
      setBuyerName(sale.customerName || "COUNTER SALE"); 
      setCustomerType(""); 
      setPrevBalance(sale.prevBalance || 0); 
      setPaymentMode(sale.paymentMode || "Cash"); 
      setSaleSource(sale.saleSource || "cash"); 
    } 
    const loadedItems = (sale.items || []).map((it) => ({ 
      productId: it.productId || it.product || "", 
      code: it.code || "", 
      name: it.name || it.description || "", 
      uom: it.uom || it.measurement || "", 
      rack: it.rack || "", 
      pcs: it.pcs || it.qty || 1, 
      rate: it.rate || 0, 
      amount: it.amount || 0 
    })); 
    setItems(loadedItems); 
    setExtraDiscount(sale.extraDisc || 0); 
    setReceived(sale.paidAmount || 0); 
    resetCurRow(); 
    showMsg(`✏ Editing Invoice ${cleanInvoiceNo}`, "success"); 
    setTimeout(() => searchRef.current?.focus(), 50); 
  };

  const navInvoice = async (dir) => { 
    try { 
      const { data } = await api.get(EP.SALES.GET_ALL); 
      if (!data.success || !data.data?.length) return; 
      const allSales = data.data; 
      const currentCleanNo = invoiceNo; 
      const curIdx = allSales.findIndex((s) => {
        let saleNo = s.invoiceNo;
        if (saleNo && saleNo.startsWith('INV-')) {
          saleNo = saleNo.replace(/^INV-/i, '');
        }
        return saleNo === currentCleanNo;
      }); 
      let nextIdx = dir === "prev" ? curIdx - 1 : curIdx + 1; 
      nextIdx = Math.max(0, Math.min(nextIdx, allSales.length - 1)); 
      if (nextIdx === curIdx) return; 
      loadSaleForEdit(allSales[nextIdx]); 
    } catch { 
      showMsg("Navigation failed", "error"); 
    } 
  };

  const subTotal = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const billAmount = subTotal - (parseFloat(extraDiscount) || 0);
  const balance = billAmount + (parseFloat(prevBalance) || 0) - (parseFloat(received) || 0);
  const totalQty = items.reduce((s, r) => s + (parseFloat(r.pcs) || 0), 0);

  const buildPayload = () => ({ 
    invoiceNo: invoiceNo, 
    invoiceDate, 
    customerId: customerId || undefined, 
    customerName: buyerName || "COUNTER SALE", 
    customerPhone: "", 
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
      amount: parseFloat(r.amount) || 0 
    })), 
    subTotal, 
    extraDisc: parseFloat(extraDiscount) || 0, 
    discAmount: 0, 
    netTotal: billAmount, 
    prevBalance: parseFloat(prevBalance) || 0, 
    paidAmount: parseFloat(received) || 0, 
    balance, 
    paymentMode, 
    saleSource, 
    sendSms, 
    printType, 
    remarks: creditStatement || "", 
    saleType: "sale", 
    userId: user?.id || user?._id, 
    username: currentUsername, 
    counterId, 
    counterName 
  });

  const openSaleConfirm = () => { 
    if (!items.length) { alert("Add at least one item"); return; } 
    if (customerId && customerType === "credit") { 
      if (!creditStatement.trim()) { 
        statementRef.current?.focus(); 
        showMsg("Note likhna zaroori hai credit sale ke liye", "error"); 
        return; 
      } 
      const payload = buildPayload(); 
      setPendingPayload(payload); 
      confirmSaveWithPayload(payload, { extraDisc: payload.extraDisc, netTotal: payload.netTotal, paidAmount: 0, balance: payload.netTotal + (parseFloat(prevBalance) || 0), printType, withPrint: true }); 
      return; 
    } 
    const payload = buildPayload(); 
    setPendingPayload(payload); 
    setShowSaveModal(true); 
  };

  const confirmSaveWithPayload = async (payload, overrides) => { 
    if (!payload) return; 
    setLoading(true); 
    try { 
      const finalPayload = { ...payload, extraDisc: overrides.extraDisc, netTotal: overrides.netTotal, paidAmount: overrides.paidAmount, balance: overrides.balance, printType: overrides.printType }; 
      
      // For EDIT: Restore original stock first
      if (editId) {
        try {
          const originalSaleRes = await api.get(EP.SALES.GET_ONE(editId));
          if (originalSaleRes.data.success && originalSaleRes.data.data) {
            const originalSale = originalSaleRes.data.data;
            if (originalSale.items && originalSale.items.length > 0) {
              for (const item of originalSale.items) {
                await updateProductStock(item.productId, item.uom, item.pcs, allProducts, setAllProducts, true);
              }
            }
          }
        } catch (restoreErr) {
          console.error("Failed to restore original stock:", restoreErr);
        }
      }
      
      const { data } = editId 
        ? await api.put(EP.SALES.UPDATE(editId), finalPayload) 
        : await api.post(EP.SALES.CREATE, finalPayload); 
        
      if (data.success) { 
        // Deduct new stock quantities
        for (const item of payload.items) { 
          await updateProductStock(item.productId, item.uom, item.pcs, allProducts, setAllProducts, false); 
        } 
        
        const productsRes = await api.get(EP.PRODUCTS.GET_ALL); 
        if (productsRes.data.success) setAllProducts(productsRes.data.data); 
        showMsg(editId ? "Sale updated!" : `Saved: ${data.data.invoiceNo}`); 
        
        if (customerId) { 
          try { 
            const customerResponse = await api.get(`${EP.CUSTOMERS.GET_ONE(customerId)}`); 
            if (customerResponse.data && customerResponse.data.success && customerResponse.data.data) 
              setPrevBalance(customerResponse.data.data.currentBalance || 0); 
          } catch (err) { 
            console.error("Failed to refresh customer balance:", err); 
          } 
        } 
        
        const saleObj = { 
          invoiceNo: data.data.invoiceNo, 
          invoiceDate: finalPayload.invoiceDate, 
          customerName: finalPayload.customerName, 
          saleSource: finalPayload.saleSource, 
          paymentMode: finalPayload.paymentMode, 
          username: currentUsername, 
          items: payload.items, 
          subTotal: finalPayload.subTotal, 
          extraDisc: overrides.extraDisc, 
          netTotal: overrides.netTotal, 
          prevBalance: finalPayload.prevBalance, 
          paidAmount: overrides.paidAmount, 
          balance: overrides.balance 
        }; 
        
        if (gatepassPrint) { 
          doPrint(saleObj, "Gatepass", { customerName: finalPayload.customerName, hidePrices: true, username: currentUsername }); 
          setGatepassPrint(false); 
        } 
        
        if (overrides.withPrint) { 
          setPendingPrintSale(saleObj); 
          setShowPrintModal(true); 
        } 
        
        setShowSaveModal(false); 
        setPendingPayload(null); 
        fullReset(); 
        generateInvoiceNumber(api, EP, setInvoiceNo); 
      } else { 
        showMsg(data.message, "error"); 
      } 
    } catch (e) { 
      console.error("Save failed:", e);
      showMsg(e.response?.data?.message || "Save failed", "error"); 
    } 
    setLoading(false); 
  };
  
  const confirmSave = async (overrides) => { 
    confirmSaveWithPayload(pendingPayload, overrides); 
  };

  const handleDeleteSale = async () => { 
    if (!editId || !window.confirm("Delete this sale? Stock will be restored.")) return; 
    setLoading(true);
    try {
      const saleRes = await api.get(EP.SALES.GET_ONE(editId));
      if (saleRes.data.success && saleRes.data.data) {
        const sale = saleRes.data.data;
        if (sale.items && sale.items.length > 0) {
          for (const item of sale.items) {
            await updateProductStock(item.productId, item.uom, item.pcs, allProducts, setAllProducts, true);
          }
        }
        await api.delete(EP.SALES.DELETE(editId));
        showMsg("Sale deleted and stock restored", "success");
        fullReset();
        generateInvoiceNumber(api, EP, setInvoiceNo);
      } else {
        showMsg("Failed to fetch sale details", "error");
      }
    } catch (error) { 
      console.error("Delete failed:", error);
      showMsg("Delete failed", "error"); 
    }
    setLoading(false);
  };

  useEffect(() => { 
    if (paymentMode !== "Credit") setReceived(billAmount + (parseFloat(prevBalance) || 0)); 
  }, [billAmount, prevBalance, paymentMode]);

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

  useEffect(() => { 
    const handler = (e) => { 
      if (showProductModal || showHoldPreview || showSaveModal || showPrintModal) return; 
      if (e.key === "F2") { 
        e.preventDefault(); 
        setShowProductModal(true); 
      } 
      if (e.key === "F4") { 
        e.preventDefault(); 
        holdBill(); 
      } 
      if (e.key === "*" || (e.ctrlKey && e.key === "s")) { 
        e.preventDefault(); 
        saveRef.current?.click(); 
      } 
      if (e.key === "Escape") resetCurRow(); 
    }; 
    window.addEventListener("keydown", handler); 
    return () => window.removeEventListener("keydown", handler); 
  }, [showProductModal, showHoldPreview, showSaveModal, showPrintModal]);

  const handleProductSelect = () => {
    if (selectedProductSuggestionIdx >= 0 && productSuggestions[selectedProductSuggestionIdx]) {
      const found = productSuggestions[selectedProductSuggestionIdx];
      const pk = found.packingInfo?.[0];
      pickProduct({ ...found, _pi: 0, _meas: pk?.measurement || "", _rate: pk?.saleRate || 0, _pack: pk?.packing || 1, _stock: pk?.openingQty || 0, _name: [found.category, found.description, found.company].filter(Boolean).join(" ") });
      setShowProductSuggestions(false);
      setTimeout(() => packingRef.current?.focus(), 50);
    } else if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      let found = allProducts.find(p => p.code?.toLowerCase() === q);
      if (!found) found = allProducts.find(p => p.description?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q));
      if (found) { 
        const pk = found.packingInfo?.[0]; 
        pickProduct({ ...found, _pi: 0, _meas: pk?.measurement || "", _rate: pk?.saleRate || 0, _pack: pk?.packing || 1, _stock: pk?.openingQty || 0, _name: [found.category, found.description, found.company].filter(Boolean).join(" ") }); 
        setTimeout(() => packingRef.current?.focus(), 50);
      } else { 
        setShowProductModal(true); 
      }
    } else { 
      setShowProductModal(true); 
    }
  };

  const currentProductStock = () => {
    if (!curRow.productId) return null;
    const product = allProducts.find(p => p._id === curRow.productId);
    if (!product) return null;
    return getProductStock(product, curRow.uom);
  };

  const currentStockInfo = currentProductStock();
  const currentStockStatus = currentStockInfo ? getStockStatus(currentStockInfo.stock) : null;

  return (
    <>
      <div className={`sl-page${creditWarning ? " sl-credit-mode" : ""}`}>
        {showProductModal && <SearchModal allProducts={allProducts} onSelect={pickProduct} onClose={() => { setShowProductModal(false); setTimeout(() => searchRef.current?.focus(), 30); }} />}
        {showHoldPreview && <HoldPreviewModal bill={showHoldPreview} onResume={resumeHold} onClose={() => setShowHoldPreview(null)} />}
        {showSaveModal && pendingPayload && <SaveConfirmModal salePayload={pendingPayload} printType={printType} onConfirm={confirmSave} onClose={() => { setShowSaveModal(false); setPendingPayload(null); }} />}
        {showPrintModal && pendingPrintSale && <PrintOptionsModal sale={pendingPrintSale} allCustomers={allCustomers} defaultPrintType={printType} onPrint={(type, overrides) => { doPrint(pendingPrintSale, type, overrides); setShowPrintModal(false); setPendingPrintSale(null); }} onClose={() => { setShowPrintModal(false); setPendingPrintSale(null); }} />}

        {msg.text && (<div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "4px 10px 0", flexShrink: 0 }}>{msg.text}</div>)}

        <div className="sl-body">
          <div className="sl-left">
            <div className="sl-top-bar">
              <div className="sl-sale-title-box">Sale</div>
              <div className="sl-inv-field-grp">
                <label>Invoice #</label>
                <div className="sl-inv-nav-container">
                  <button className="sl-inv-nav-btn sl-inv-nav-prev" onClick={() => navInvoice("prev")} title="Previous Invoice (↑)">◀</button>
                  <input className="xp-input xp-input-sm sl-inv-input-large" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} onKeyDown={async (e) => { 
                    if (e.key === "Enter") { 
                      e.preventDefault(); 
                      const val = invoiceNo.trim(); 
                      if (!val) return; 
                      try { 
                        const { data } = await api.get(EP.SALES.GET_ALL); 
                        const sales = data.data; 
                        if (!sales || sales.length === 0) { 
                          showMsg(`Invoice "${val}" not found`, "error"); 
                          await generateInvoiceNumber(api, EP, setInvoiceNo); 
                          return; 
                        } 
                        const exact = sales.find((s) => {
                          let saleNo = s.invoiceNo;
                          if (saleNo && saleNo.startsWith('INV-')) {
                            saleNo = saleNo.replace(/^INV-/i, '');
                          }
                          return saleNo === val;
                        }); 
                        if (!exact) { 
                          showMsg(`Invoice "${val}" not found`, "error"); 
                          await generateInvoiceNumber(api, EP, setInvoiceNo); 
                          return; 
                        } 
                        setItems([]); 
                        setEditId(null); 
                        loadSaleForEdit(exact); 
                      } catch { 
                        showMsg("Search failed", "error"); 
                      } 
                    } 
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") { 
                      e.preventDefault(); 
                      await navInvoice(e.key === "ArrowUp" ? "prev" : "next"); 
                    } 
                  }} onFocus={(e) => e.target.select()} placeholder="e.g., 26050001" />
                  <button className="sl-inv-nav-btn sl-inv-nav-next" onClick={() => navInvoice("next")} title="Next Invoice (↓)">▶</button>
                </div>
              </div>
              <div className="sl-inv-field-grp">
                <label>Date</label>
                <input type="date" className="xp-input xp-input-sm sl-date-input" value={invoiceDate} readOnly style={{ background: "#f5f5f5", cursor: "not-allowed", color: "#888" }} />
              </div>
              <div className="sl-inv-field-grp">
                <label>Time</label>
                <div className="sl-time-box">{time}</div>
              </div>
            </div>

            <div className="sl-entry-strip">
              <div className="sl-entry-cell sl-entry-product">
                <label>Select Product <kbd>F2</kbd></label>
                <div style={{ position: "relative", flex: 1 }}>
                  <input ref={searchRef} type="text" className="sl-product-input" style={{ width: "100%", background: "#fffde7" }} value={searchText} onChange={(e) => { setSearchText(e.target.value); if (curRow.name) { setCurRow({ ...EMPTY_ROW }); setPackingOptions([]); } }} onKeyDown={(e) => { 
                    if (e.key === "ArrowDown") { e.preventDefault(); if (productSuggestions.length > 0) { setSelectedProductSuggestionIdx(prev => prev < productSuggestions.length - 1 ? prev + 1 : prev); setShowProductSuggestions(true); } else { setShowProductModal(true); } } 
                    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedProductSuggestionIdx(prev => prev > 0 ? prev - 1 : -1); } 
                    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleProductSelect(); } 
                    if (e.key === "Escape") { setShowProductSuggestions(false); } 
                  }} autoFocus />
                  {showProductSuggestions && productSuggestions.length > 0 && (
                    <div className="sl-product-suggestions">
                      {productSuggestions.map((p, idx) => {
                        const stock = p.packingInfo?.[0]?.openingQty || 0;
                        const stockStatus = getStockStatus(stock);
                        return (
                          <div key={p._id} className={`sl-suggestion-item ${idx === selectedProductSuggestionIdx ? 'selected' : ''}`} onClick={() => { 
                            if (stock === 0 && !window.confirm(`⚠️ "${p.description}" is OUT OF STOCK! Still want to add?`)) return;
                            pickProduct({ ...p, _pi: 0, _meas: p.packingInfo?.[0]?.measurement || "", _rate: p.packingInfo?.[0]?.saleRate || 0, _pack: p.packingInfo?.[0]?.packing || 1, _stock: stock, _name: [p.category, p.description, p.company].filter(Boolean).join(" ") }); 
                            setShowProductSuggestions(false); 
                            setTimeout(() => packingRef.current?.focus(), 50);
                          }}>
                            <span className="sl-suggestion-code">{p.code}</span>
                            <span className="sl-suggestion-name">{p.description}</span>
                            <span className="sl-suggestion-stock" style={{ fontSize: '10px', color: stockStatus.color, marginLeft: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{stockStatus.icon}</span>
                              <span>Stock: {stock} {p.packingInfo?.[0]?.measurement || ''}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="sl-entry-cell">
                <label>Packing</label>
                <input ref={packingRef} type="text" className="xp-input sl-num-input" style={{ width: 65, background: "#fffde7" }} value={curRow.uom} onChange={(e) => setCurRow((p) => ({ ...p, uom: e.target.value }))} onKeyDown={(e) => { 
                  if (e.key === "Enter") { e.preventDefault(); pcsRef.current?.focus(); } 
                  if (packingOptions.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) { 
                    e.preventDefault(); 
                    const idx = packingOptions.indexOf(curRow.uom); 
                    const next = e.key === "ArrowDown" ? (idx + 1) % packingOptions.length : (idx - 1 + packingOptions.length) % packingOptions.length; 
                    const newUom = packingOptions[next]; 
                    const product = allProducts.find(p => p._id === curRow.productId); 
                    if (product?.packingInfo) { 
                      const pk = product.packingInfo.find(pk => pk.measurement === newUom); 
                      if (pk) { 
                        setCurRow((p) => ({ ...p, uom: newUom, rate: pk.saleRate || 0, pcs: pk.packing || 1, amount: (pk.packing || 1) * (pk.saleRate || 0) })); 
                        return; 
                      } 
                    } 
                    setCurRow((p) => ({ ...p, uom: newUom })); 
                  } 
                }} autoComplete="off" />
              </div>
              <div className="sl-entry-cell">
                <label>Pcs</label>
                <input ref={pcsRef} type="text" className="sl-num-input" style={{ width: 60, background: "#fffde7" }} value={curRow.pcs} min={1} onChange={(e) => updateCurRow("pcs", e.target.value)} onKeyDown={(e) => e.key === "Enter" && rateRef.current?.focus()} onFocus={(e) => e.target.select()} />
              </div>
              <div className="sl-entry-cell">
                <label>Rate</label>
                <input ref={rateRef} type="text" className="sl-num-input" style={{ width: 75, background: "#fffde7" }} value={curRow.rate} min={0} onChange={(e) => updateCurRow("rate", e.target.value)} onBlur={(e) => { 
                  const product = allProducts.find(p => p._id === curRow.productId); 
                  if (product?.packingInfo) { 
                    const pk = product.packingInfo.find(p => p.measurement === curRow.uom); 
                    if (pk) { 
                      const purchaseRate = pk.purchaseRate || pk.costRate || 0; 
                      if (purchaseRate > 0 && parseFloat(e.target.value) < purchaseRate) { 
                        showMsg(`Rate cannot be less than purchase rate (${purchaseRate})`, "error"); 
                        updateCurRow("rate", purchaseRate); 
                      } 
                    } 
                  } 
                }} onKeyDown={(e) => e.key === "Enter" && amountRef.current?.focus()} onFocus={(e) => e.target.select()} />
              </div>
              <div className="sl-entry-cell">
                <label>Amount</label>
                <input ref={amountRef} type="text" className="sl-num-input" style={{ width: 80, background: "#fffde7" }} value={curRow.amount || 0} onChange={(e) => setCurRow((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === "Enter" && addRef.current?.click()} />
              </div>
              <div className="sl-entry-cell sl-entry-btns-cell">
                <label>&nbsp;</label>
                <div className="sl-entry-btns">
                  <button className="xp-btn xp-btn-sm" onClick={resetCurRow}>Reset</button>
                  <button ref={addRef} className="xp-btn xp-btn-primary xp-btn-sm" onClick={addRow}>{selItemIdx !== null ? "Update" : "Add"}</button>
                  <button className="xp-btn xp-btn-sm" disabled={selItemIdx === null} onClick={() => selItemIdx !== null && loadRowForEdit(selItemIdx)}>Edit</button>
                  <button className="xp-btn xp-btn-danger xp-btn-sm" disabled={selItemIdx === null} onClick={removeRow}>Remove</button>
                </div>
              </div>
            </div>

            <div className="sl-table-header-bar">
              <span className="sl-table-lbl">
                {curRow.name ? (
                  <span className="sl-cur-name-inline">
                    <span className="sl-product-name">{curRow.name}</span>
                    {currentStockInfo && currentStockStatus && (
                      <span className="sl-product-stock" style={{ 
                        marginLeft: "12px", 
                        padding: "2px 8px", 
                        borderRadius: "4px", 
                        fontSize: "11px", 
                        fontWeight: "bold", 
                        backgroundColor: currentStockStatus.bg,
                        color: "#111",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <span>{currentStockStatus.icon}</span>
                        <span>Stock: {currentStockInfo.stock} {currentStockInfo.uom}</span>
                        <span style={{ fontSize: "10px" }}>({currentStockStatus.text})</span>
                      </span>
                    )}
                  </span>
                ) : "Select Product"}
              </span>
              <span className="sl-table-qty">Total Qty: {totalQty.toLocaleString("en-PK")}</span>
            </div>

            <div className="sl-items-wrap">
              <table className="sl-items-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th style={{ width: 72 }}>Code</th>
                    <th>Name</th>
                    <th style={{ width: 65 }}>UOM</th>
                    <th className="r" style={{ width: 55 }}>Pcs</th>
                    <th className="r" style={{ width: 80 }}>Rate</th>
                    <th className="r" style={{ width: 90 }}>Amount</th>
                    <th style={{ width: 50 }}>Rack</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr className="sl-empty-row">
                      <td colSpan={8} className="xp-empty" style={{ padding: 14 }}>Search and add products to start the bill</td>
                    </tr>
                  )}
                  {items.map((r, i) => {
                    const product = allProducts.find(p => p._id === r.productId);
                    const stockInfo = getProductStock(product, r.uom);
                    const stockStatus = getStockStatus(stockInfo.stock);
                    return (
                      <tr key={i} className={selItemIdx === i ? "sl-sel-row" : ""} onClick={() => setSelItemIdx(i === selItemIdx ? null : i)} onDoubleClick={() => loadRowForEdit(i)}>
                        <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>{i + 1}</td>
                        <td className="muted">{r.code}</td>
                        <td style={{ fontWeight: 500 }}>
                          {r.name}
                          {stockInfo.stock < 10 && stockInfo.stock > 0 && (
                            <span style={{ marginLeft: "8px", fontSize: "10px", color: "#f59e0b", fontWeight: "normal", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                              ⚠️ Stock: {stockInfo.stock}
                            </span>
                          )}
                          {stockInfo.stock === 0 && (
                            <span style={{ marginLeft: "8px", fontSize: "10px", color: "#dc2626", fontWeight: "normal", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                              ❌ Out of Stock!
                            </span>
                          )}
                        </td>
                        <td className="muted">{r.uom}</td>
                        <td className="r">{r.pcs}</td>
                        <td className="r">{Number(r.rate).toLocaleString("en-PK")}</td>
                        <td className="r" style={{ color: "var(--xp-blue-dark)" }}>{Number(r.amount).toLocaleString("en-PK")}</td>
                        <td className="muted">{r.rack}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sl-summary-bar" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", flexShrink: 0, background: "#f8fafc", borderTop: "1px solid #000", borderBottom: "1px solid #000", flexWrap: "wrap", minHeight: "44px" }}>
              <div className="sl-cust-cell" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: "600", color: "#64748b" }}>Code</label>
                <input className="sl-cust-input" style={{ width: "60px", height: "26px", padding: "0 4px", fontSize: "10px", background: "#fffde7", border: "1px solid #000", borderRadius: "4px" }} value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const q = codeSearch.trim(); if (!q) return; const found = allCustomers.find(c => String(c.code).toLowerCase() === q.toLowerCase() && (c.customerType || c.type || "").toLowerCase() === "credit"); if (found) { handleCustomerSelect(found); setCodeSearch(""); } else { showMsg(`Code "${q}" — credit customer nahi mila`, "error"); } } }} autoComplete="off" />
              </div>
              <div className="sl-cust-cell sl-cust-buyer" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "2", minWidth: "130px" }}>
                <label style={{ fontSize: "9px", fontWeight: "600", color: "#64748b" }}>Buyer</label>
                <CustomerDropdown allCustomers={allCustomers} value={customerId} displayName={buyerName} customerType={customerType} onSelect={handleCustomerSelect} onClear={handleCustomerClear} allowedTypes={["credit"]} />
              </div>
              <div className="sl-cust-cell" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: "600", color: "#64748b" }}>Prev</label>
                <input type="text" className="sl-cust-input" style={{ width: "60px", height: "26px", padding: "0 4px", fontSize: "10px", background: "#fffde7", border: "1px solid #000", borderRadius: "4px" }} value={prevBalance} onChange={(e) => setPrevBalance(e.target.value)} onFocus={(e) => e.target.select()} />
              </div>
              <div className="sl-cust-cell" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: "600", color: "#64748b" }}>Net</label>
                <input className="sl-cust-input sl-net-recv" style={{ color: balance > 0 ? "#dc2626" : "#10b981", fontWeight: 700, width: "60px", height: "26px", padding: "0 4px", fontSize: "10px", background: "#f1f5f9", border: "1px solid #000", borderRadius: "4px" }} value={Number(balance).toLocaleString("en-PK")} readOnly />
              </div>
              <div className="sl-cust-cell" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: "600", color: "#64748b" }}>Pay</label>
                <select className="sl-pay-select" value={paymentMode} onChange={(e) => handlePaymentMode(e.target.value)} style={{ height: "26px", padding: "0 6px", fontSize: "10px", fontWeight: "600", border: "1px solid #000", borderRadius: "4px", background: paymentMode === "Cash" ? "#10b981" : paymentMode === "Credit" ? "#ef4444" : paymentMode === "Bank" ? "#3b82f6" : "#f59e0b", color: "white", cursor: "pointer" }}>
                  <option value="Cash">💰 Cash</option>
                  <option value="Credit">📝 Credit</option>
                  <option value="Bank">🏦 Bank</option>
                  <option value="Cheque">📄 Cheque</option>
                </select>
              </div>
              <div className="sl-sum-cell" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: "600", textTransform: "uppercase" }}>Qty</label>
                <input className="sl-sum-val" style={{ fontSize: "11px", fontWeight: "700", textAlign: "right", width: "50px", height: "26px", padding: "0 4px", background: "#f1f5f9", border: "1px solid #000", borderRadius: "4px" }} value={totalQty.toLocaleString("en-PK")} readOnly />
              </div>
              <div className="sl-sum-cell" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: "600", textTransform: "uppercase" }}>Bill</label>
                <input className="sl-sum-val" style={{ fontSize: "11px", fontWeight: "700", textAlign: "right", width: "70px", height: "26px", padding: "0 4px", background: "#f1f5f9", border: "1px solid #000", borderRadius: "4px" }} value={Number(billAmount).toLocaleString("en-PK")} readOnly />
              </div>
              <div className="sl-sum-cell" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: "600", textTransform: "uppercase" }}>Bal</label>
                <input className={`sl-sum-val sl-bal${balance > 0 ? " danger" : balance < 0 ? " success" : ""}`} style={{ fontSize: "11px", fontWeight: "700", textAlign: "right", width: "70px", height: "26px", padding: "0 4px", background: "#f1f5f9", border: "1px solid #000", borderRadius: "4px" }} value={Number(balance).toLocaleString("en-PK")} readOnly />
              </div>
            </div>

            <input type="hidden" ref={statementRef} />
            
            {showCustomerPanel && customerId && (
              <div className={`sl-credit-warning-bar${creditWarning ? "" : " sl-credit-normal"}`} style={{ padding: "4px 6px", marginTop: "2px" }}>
                <div className="sl-credit-warning-left">
                  {(() => {
                    const cust = allCustomers.find((c) => c._id === customerId);
                    return cust?.imageFront ? (
                      <img src={cust.imageFront} alt={cust.name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", border: "2px solid #fff", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>👤</div>
                    );
                  })()}
                  <div></div>
                </div>
                <input type="text" className="sl-credit-statement-input" style={{ fontSize: "10px", height: "28px", padding: "2px 6px", flex: 1 }} placeholder={creditWarning ? "Enter reason / authorization statement to allow sale…" : "Notes (optional)…"} value={creditStatement} onChange={(e) => setCreditStatement(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); openSaleConfirm(); } }} />
              </div>
            )}
          </div>

          <div className="sl-right">
            <div className="sl-hold-panel">
              <div className="sl-hold-title">
                <span>Hold Bills <kbd style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "0 3px", borderRadius: 2 }}>F4</kbd></span>
                <span className="sl-hold-cnt">{holdBills.length}</span>
              </div>
              <div className="sl-hold-table-wrap">
                <table className="sl-hold-table">
                  <thead>
                    <tr>
                      <th style={{ width: 24 }}>#</th>
                      <th>Bill #</th>
                      <th className="r">Amount</th>
                      <th>Customer</th>
                      <th style={{ width: 22 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdBills.length === 0 ? (
                      Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={5} style={{ height: 22 }} /></tr>)
                    ) : (
                      holdBills.map((b, i) => (
                        <tr key={b.id} onClick={() => setShowHoldPreview(b)} onDoubleClick={() => resumeHold(b.id)}>
                          <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>{i + 1}</td>
                          <td style={{ fontFamily: "var(--xp-mono)", fontSize: "var(--xp-fs-xs)" }}>{b.invoiceNo}</td>
                          <td className="r" style={{ color: "var(--xp-blue-dark)" }}>{Number(b.amount).toLocaleString("en-PK")}</td>
                          <td className="muted" style={{ fontSize: "var(--xp-fs-xs)" }}>{b.buyerName}</td>
                          <td style={{ textAlign: "center" }}>
                            <button className="xp-btn xp-btn-sm xp-btn-ico" style={{ width: 18, height: 18, fontSize: 9, color: "var(--xp-red)" }} onClick={(e) => deleteHold(b.id, e)}>✕</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="sl-hold-scroll-btns">
                <button className="xp-btn xp-btn-sm xp-btn-ico">◀</button>
                <button className="xp-btn xp-btn-sm xp-btn-ico">▶</button>
              </div>
              <div style={{ padding: "4px 8px", flexShrink: 0 }}>
                <button className="xp-btn xp-btn-sm" style={{ width: "100%" }} onClick={holdBill} disabled={!items.length}>Hold Bill (F4)</button>
              </div>
            </div>
            {customerId && (() => {
              const cust = allCustomers.find((c) => c._id === customerId);
              return cust ? (
                <div style={{ width: "100%", height: 100, marginTop: 6, borderRadius: 6, overflow: "hidden", border: "2px solid var(--xp-silver-4)", flexShrink: 0, order: 2 }}>
                  {cust.imageFront ? (
                    <img src={cust.imageFront} alt={cust.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "var(--xp-silver-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>👤</div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        </div>

        <div className="sl-cmd-bar">
          <button className="xp-btn xp-btn-sm" onClick={fullReset} disabled={loading}>Refresh</button>
          <button ref={saveRef} className="xp-btn xp-btn-primary xp-btn-lg" onClick={openSaleConfirm} disabled={loading}>{loading ? "Saving…" : "Save *"}</button>
          <button className="xp-btn xp-btn-sm" onClick={() => {}}>Edit Record</button>
          <button className="xp-btn xp-btn-danger xp-btn-sm" disabled={!editId} onClick={handleDeleteSale}>Delete Record</button>
          <div className="xp-toolbar-divider" />
          <div className="sl-cmd-checks">
            <label className="sl-check-label"><input type="checkbox" /> Print P.Bal</label>
            <label className="sl-check-label sl-gatepass-check"><input type="checkbox" checked={gatepassPrint} onChange={(e) => setGatepassPrint(e.target.checked)} /> 🎫 Gatepass</label>
            <button className="xp-btn xp-btn-sm xp-btn-whatsapp" onClick={() => { if (items.length === 0) { alert("No items to share"); return; } const saleObj = { invoiceNo, invoiceDate, customerName: buyerName, username: currentUsername, items: items, subTotal, extraDisc: extraDiscount, netTotal: billAmount, prevBalance, paidAmount: received, balance }; shareViaWhatsApp(saleObj, { customerName: buyerName, customerPhone: "", hidePrices: gatepassPrint, username: currentUsername }); }}>📱 WhatsApp</button>
          </div>
          <div className="xp-toolbar-divider" />
          <div className="sl-print-types">
            {["Thermal", "A4", "A5"].map((pt) => (<label key={pt} className="sl-check-label"><input type="radio" name="pt" checked={printType === pt} onChange={() => setPrintType(pt)} /> {pt}</label>))}
          </div>
          <div className="xp-toolbar-divider" />
          <button className="xp-btn xp-btn-sm" style={{ marginLeft: "auto" }} onClick={fullReset}>Close</button>
        </div>
      </div>
    </>
  );
}