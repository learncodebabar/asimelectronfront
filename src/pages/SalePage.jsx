// pages/SalePage.jsx
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
    "Software developed by: AppHill / 03222292922 or visit website www.apphill.pk",
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
   PRINT HTML BUILDER — Professional
══════════════════════════════════════════════════════════ */

const buildPrintHtml = (sale, type, overrides = {}) => {
  const customerName = overrides.customerName ?? sale.customerName;
  const customerPhone = overrides.customerPhone ?? "";
  const hidePrices = overrides.hidePrices || false;
  const rows = sale.items.map((it, i) => ({ ...it, sr: i + 1 }));
  const totalQty = rows.reduce((s, r) => s + (r.pcs || 0), 0);

  const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
  const GOOGLE_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">`;

  /* ── GATEPASS ── */
  if (type === "Gatepass") {
    const itemRows = rows
      .map(
        (it) => `
        <tr>
          <td style="font-size:10px;vertical-align:top;padding:6px 4px">${it.sr}</td>
          <td style="font-size:10px;vertical-align:top;padding:6px 4px;word-break:break-word">${it.code}</td>
          <td style="font-size:10px;vertical-align:top;padding:6px 4px;word-break:break-word">${it.name}</td>
          <td style="font-size:10px;vertical-align:top;padding:6px 4px;text-align:center">${it.pcs} ${it.uom || ""}</td>
        </tr>
      `,
      )
      .join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;font-size:10px;width:80mm;margin:0 auto;padding:3mm;color:#000}
      .urdu{font-family:${URDU_FONT};direction:rtl;text-align:center}
      .shop-urdu{font-size:16px;font-weight:bold;text-align:center;margin-bottom:3px;font-family:${URDU_FONT};direction:rtl}
      .shop-addr{font-size:8.5px;text-align:center;margin-bottom:2px;font-family:${URDU_FONT};direction:rtl}
      .shop-phones{font-size:8px;text-align:center;font-weight:bold;margin-bottom:4px}
      .banner{background:#555;color:#fff;font-size:7.5px;text-align:center;padding:3px;margin:3px 0;font-family:${URDU_FONT};direction:rtl}
      .header{text-align:center;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:8px}
      .gatepass-title{font-size:18px;font-weight:bold;margin:5px 0;letter-spacing:2px}
      .meta-row{display:flex;justify-content:space-between;margin:4px 0;font-size:9px}
      .divider-dash{border:none;border-top:1px dashed #666;margin:4px 0}
      .divider-solid{border:none;border-top:1px solid #000;margin:4px 0}
      table{width:100%;border-collapse:collapse}
      thead tr{border-bottom:1px solid #000}
      th{font-size:9px;font-weight:bold;padding:5px 4px;text-align:left}
      th.r{text-align:right}
      td{padding:4px;font-size:9.5px;vertical-align:top;border-bottom:1px solid #ddd}
      .footer{text-align:center;font-size:8px;color:#777;margin-top:10px;border-top:1px dashed #ccc;padding-top:5px}
      .signature{display:flex;justify-content:space-between;margin-top:12px;padding-top:8px}
      .sign-line{text-align:center;font-size:8px}
      .sign-line span{display:inline-block;border-top:1px solid #000;min-width:100px;margin-top:20px;padding-top:3px}
      @media print{@page{size:80mm auto;margin:2mm}body{width:76mm}}
    </style></head><body>

      <div class="header">
        <div class="shop-urdu">${SHOP_INFO.name}</div>
        <div class="shop-addr">${SHOP_INFO.address}</div>
        <div class="shop-phones">${SHOP_INFO.phone1} | ${SHOP_INFO.phone2}</div>
        <div class="gatepass-title">📋 GATE PASS</div>
        <div class="banner">${SHOP_INFO.urduBanner}</div>
      </div>

      <div class="meta-row">
        <span><b>Invoice No:</b> ${sale.invoiceNo}</span>
        <span><b>Date:</b> ${sale.invoiceDate}</span>
      </div>
      <div class="meta-row">
        <span><b>Customer:</b> ${customerName}</span>
        ${customerPhone ? `<span><b>Phone:</b> ${customerPhone}</span>` : ""}
      </div>
      <hr class="divider-dash">

      <table>
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th style="width:80px">Code</th>
            <th>Product Description</th>
            <th style="width:70px;text-align:center">Qty</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <hr class="divider-solid">
      
      <div class="meta-row">
        <span><b>Total Items:</b> ${rows.length}</span>
        <span><b>Total Quantity:</b> ${totalQty}</span>
      </div>

      <div class="signature">
        <div class="sign-line">Issued By<span></span></div>
        <div class="sign-line">Received By<span></span></div>
      </div>

      <div class="footer">
        ${SHOP_INFO.devBy}
      </div>

    </body></html>`;
  }

  /* ── THERMAL ── */
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
        </tr>
      `,
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
      .terms{font-family:${URDU_FONT};direction:rtl;font-size:9px;color:#333;border:1px dashed #999;padding:4px;margin-top:4px;line-height:2;text-align:right}
      .devby{text-align:center;font-size:7.5px;color:#777;margin-top:4px;border-top:1px dashed #ccc;padding-top:3px}
      @media print{@page{size:80mm auto;margin:1mm}body{width:78mm}}
    </style></head><body>

      <div class="shop-urdu">${SHOP_INFO.name}</div>
      <div class="shop-addr">${SHOP_INFO.address}</div>
      <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
      <div class="banner">${SHOP_INFO.urduBanner}</div>

      <div class="meta-row">
        <span><b>Sales Invoice</b></span>
        <span>ADMIN</span>
        <span>Shop Server</span>
      </div>
      <hr class="divider-dash">
      <div class="meta-row">
        <span class="meta-bold">${sale.invoiceNo}</span>
        <span>${sale.invoiceDate}</span>
      </div>
      <div class="meta-row">
        <span>Customer:</span>
      </div>
      <div style="font-size:10px;font-weight:bold;margin-bottom:1px">${customerName}</div>
      ${customerPhone ? `<div style="font-size:9px;color:#555">${customerPhone}</div>` : ""}
      <div class="meta-row"><span style="font-size:9px;color:#555">Items: ${rows.length}</span></div>
      <hr class="divider-solid">

      <table>
        <thead>
          <tr>
            <th style="width:20px">#</th>
            <th>Product</th>
            <th class="r">Qty.</th>
            <th class="r">Rate</th>
            <th class="r">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <hr class="divider-dash">

      <div class="totals-box">
        <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px">
          <span>T.Qty: <b>${totalQty}</b></span>
          <span>T.Items: <b>${rows.length}</b></span>
        </div>
        ${sale.extraDisc > 0 ? `<div class="sum-row red"><span>(−) Discount</span><span>${Number(sale.extraDisc).toLocaleString()}</span></div>` : ""}
        <div class="sum-row bold sep"><span>Sub Total:</span><span>${Number(sale.netTotal).toLocaleString()}</span></div>
        ${sale.prevBalance > 0 ? `<div class="sum-row red"><span>(+) Prev. Bal.</span><span>${Number(sale.prevBalance).toLocaleString()}</span></div>` : ""}
        <div class="sum-row green"><span>Received:</span><span>PKR ${Number(sale.paidAmount).toLocaleString()}</span></div>
        <div class="sum-row bold sep ${sale.balance > 0 ? "red" : "green"}"><span>Balance:</span><span>PKR ${Number(sale.balance).toLocaleString()}</span></div>
      </div>

      <div class="terms">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
      <div class="devby">${SHOP_INFO.devBy}</div>

    </body></html>`;
  }

  /* ── A4 / A5 ── */
  const a5 = type === "A5";
  const LINES_PER_PAGE = a5 ? 22 : 28;

  const pages = [];
  for (let i = 0; i < rows.length; i += LINES_PER_PAGE) {
    pages.push(rows.slice(i, i + LINES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const sz = a5
    ? {
        title: 14,
        sub: 8.5,
        inv: 12,
        meta: 8,
        th: 8,
        td: 8,
        tot: 9,
        totB: 10.5,
      }
    : {
        title: 17,
        sub: 9.5,
        inv: 14,
        meta: 9,
        th: 9,
        td: 9,
        tot: 10,
        totB: 13,
      };

  const buildPageHtml = (pageRows, pageNum, totalPages, isLastPage) => {
    const itemRows = pageRows
      .map(
        (it, i) =>
          `<tr style="background:${i % 2 === 0 ? "#fff" : "#f7faff"}">
        <td style="text-align:center">${it.sr}</td>
        <td>${it.name}</td>
        <td>${it.uom || "—"}</td>
        <td style="text-align:right">${it.pcs}</td>
        ${!hidePrices ? `<td style="text-align:right">${Number(it.rate).toLocaleString()}</td>
        <td style="text-align:right"><b>${Number(it.amount).toLocaleString()}</b></td>` : '<td colspan="2" style="text-align:center;color:#888">[Price Hidden]</td>'}
      </tr>`,
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

    const metaHtml =
      pageNum === 1
        ? `<div class="meta-strip">
          <div class="meta-left">
            <div class="meta-row"><span class="meta-lbl">Name:</span> <span class="meta-val">${customerName}</span></div>
            ${customerPhone ? `<div class="meta-row"><span class="meta-val">${customerPhone}</span></div>` : ""}
          </div>
          <div class="meta-mid"><span class="meta-val">${rows.length}</span></div>
          <div class="meta-right">
            <div class="meta-row"><span class="meta-lbl">Invoice #:</span> <span class="meta-val">${sale.invoiceNo}</span></div>
            <div class="meta-row"><span class="meta-lbl">Date &amp; Time:</span> <span class="meta-val">${sale.invoiceDate}</span></div>
          </div>
        </div>`
        : `<div style="display:flex;justify-content:space-between;font-size:${sz.sub}pt;color:#555;margin-bottom:4px;padding:2px 0;border-bottom:1px solid #ddd">
          <span>${customerName}</span>
          <span>Page ${pageNum} of ${totalPages}</span>
          <span>Invoice # ${sale.invoiceNo}</span>
        </div>`;

    const footerHtml = isLastPage && !hidePrices
      ? `<div class="footer-wrap">
          <div class="footer-left">
            <div class="footer-stat">Total No. of Items: <b>${rows.length}</b></div>
            <div class="terms-box">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
            <div class="sig-line">Signature</div>
          </div>
          <div class="footer-right">
            ${sale.extraDisc > 0 ? `<div class="sum-row red"><span>(−) Discount</span><span>${Number(sale.extraDisc).toLocaleString()}</span></div>` : ""}
            <div class="sum-row bold"><span>Sub Total:</span><span>${Number(sale.netTotal).toLocaleString()}</span></div>
            ${sale.prevBalance > 0 ? `<div class="sum-row red"><span>(+) Prev. Balance</span><span>PKR ${Number(sale.prevBalance).toLocaleString()}</span></div>` : ""}
            <div class="sum-row green"><span>Received:</span><span>PKR ${Number(sale.paidAmount).toLocaleString()}</span></div>
            <div class="sum-row bold ${sale.balance > 0 ? "red" : "green"} sep"><span>Balance Due:</span><span>PKR ${Number(sale.balance).toLocaleString()}</span></div>
          </div>
        </div>
        <div class="devby">${SHOP_INFO.devBy}</div>`
      : isLastPage && hidePrices
      ? `<div class="footer-wrap">
          <div class="footer-left">
            <div class="footer-stat">Total No. of Items: <b>${rows.length}</b></div>
            <div class="footer-stat">Total Quantity: <b>${totalQty}</b></div>
            <div class="terms-box">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
            <div class="sig-line">Signature</div>
          </div>
          <div class="footer-right" style="text-align:center">
            <div class="sum-row" style="justify-content:center;color:#888">GATE PASS - Prices Hidden</div>
          </div>
        </div>
        <div class="devby">${SHOP_INFO.devBy}</div>`
      : `<div style="text-align:right;font-size:${sz.sub}pt;color:#888;margin-top:4px">Page ${pageNum} of ${totalPages} — Continued...</div>`;

    return `
      <div class="page"${pageNum > 1 ? ' style="page-break-before:always"' : ""}>
        ${headerHtml}
        ${metaHtml}
        <table>
          <thead>
            <tr>
              <th style="width:28px;text-align:center">Sr.#</th>
              <th>Product</th>
              <th style="width:50px">Unit</th>
              <th style="width:42px;text-align:right">Qty</th>
              ${!hidePrices ? '<th style="width:70px;text-align:right">Rate</th><th style="width:80px;text-align:right">Amount</th>' : '<th colspan="2" style="text-align:center">Gate Pass Copy</th>'}
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        ${footerHtml}
      </div>`;
  };

  const allPagesHtml = pages
    .map((pageRows, idx) =>
      buildPageHtml(pageRows, idx + 1, pages.length, idx === pages.length - 1),
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${sz.td}pt;color:#111;background:#fff;padding:${a5 ? "5mm" : "8mm"}}
    .shop-urdu{font-size:${a5 ? "20px" : "26px"};font-weight:900;font-family:${URDU_FONT};direction:rtl;text-align:center;line-height:2}
    .shop-addr{font-size:${sz.sub}pt;color:#444;text-align:center;font-family:${URDU_FONT};direction:rtl;margin:2px 0;line-height:1.8}
    .shop-phones{font-size:${sz.sub}pt;font-weight:bold;text-align:center;margin-bottom:2px}
    .banner{background:#555;color:#fff;font-size:${a5 ? "7.5" : "8.5"}pt;text-align:center;padding:${a5 ? "2px 6px" : "3px 8px"};margin:${a5 ? "3px 0" : "4px 0"};font-family:${URDU_FONT};direction:rtl;line-height:2}
    .hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:${a5 ? "5px" : "8px"};margin-bottom:4px}
    .meta-strip{display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #ccc;padding:${a5 ? "4px 8px" : "5px 10px"};margin:${a5 ? "4px 0" : "5px 0"};font-size:${sz.meta}pt}
    .meta-left{flex:2}
    .meta-mid{flex:0.5;text-align:center;font-size:${a5 ? "18px" : "22px"};font-weight:900;color:#555}
    .meta-right{flex:2;text-align:right}
    .meta-row{margin-bottom:1px}
    .meta-lbl{color:#555}
    .meta-val{font-weight:700}
    table{width:100%;border-collapse:collapse;margin:${a5 ? "4px 0" : "5px 0"}}
    thead tr{background:#333;color:#fff}
    th{padding:${a5 ? "3px 5px" : "5px 7px"};font-size:${sz.th}pt;font-weight:600;text-align:left}
    td{padding:${a5 ? "2px 5px" : "3px 7px"};font-size:${sz.td}pt;border-bottom:1px solid #e0e0e0}
    tbody tr:last-child td{border-bottom:2px solid #999}
    .footer-wrap{display:flex;justify-content:space-between;align-items:flex-start;margin-top:${a5 ? "6px" : "10px"};gap:10px}
    .footer-left{flex:1.5}
    .footer-right{flex:1;border:1px solid #ccc;padding:${a5 ? "4px 8px" : "5px 10px"}}
    .footer-stat{font-size:${sz.meta}pt;font-weight:bold;margin-bottom:4px}
    .terms-box{font-family:${URDU_FONT};direction:rtl;font-size:${a5 ? "8" : "9"}pt;color:#444;border:1px dashed #aaa;padding:${a5 ? "3px 6px" : "5px 8px"};margin:${a5 ? "4px 0" : "5px 0"};line-height:2;text-align:right}
    .sig-line{font-size:${sz.sub}pt;margin-top:${a5 ? "8px" : "14px"};border-top:1px solid #999;display:inline-block;padding-top:2px;min-width:120px}
    .sum-row{display:flex;justify-content:space-between;font-size:${sz.tot}pt;padding:${a5 ? "3px 0" : "4px 0"};border-bottom:1px solid #eee}
    .sum-row.bold{font-weight:700;font-size:${sz.totB}pt;background:#f5f5f5;padding:${a5 ? "3px 4px" : "4px 6px"}}
    .sum-row.sep{border-top:2px solid #333;margin-top:2px}
    .red{color:#c00}.green{color:#1a7a1a}
    .devby{text-align:center;font-size:${a5 ? "7" : "8"}pt;color:#888;margin-top:${a5 ? "6px" : "10px"};border-top:1px solid #ddd;padding-top:${a5 ? "4px" : "6px"}}
    .page{margin-bottom:0}
    @media print{
      @page{size:${a5 ? "A5" : "A4"};margin:${a5 ? "4mm" : "8mm"}}
      body{padding:0}
    }
  </style></head><body>${allPagesHtml}</body></html>`;
};

// Share via WhatsApp - A4 PDF only, no database save
const shareViaWhatsApp = async (sale, overrides = {}) => {
  try {
    if (!sale.items || sale.items.length === 0) {
      alert("No items to share");
      return;
    }
    
    // Generate the HTML for A4 size
    const htmlContent = buildPrintHtml(sale, "A4", overrides);
    
    // Create a blob from the HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window and print to PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(url);
          alert("Please save the PDF and share on WhatsApp");
        }, 500);
      };
    } else {
      alert("Please allow popups to generate PDF");
    }
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  }
};

function PrintOptionsModal({
  sale,
  allCustomers,
  defaultPrintType,
  onPrint,
  onClose,
  hideCustomerFields,
}) {
  const [selPrintType, setSelPrintType] = useState(
    defaultPrintType || "Thermal",
  );
  const [custPhone, setCustPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [saving, setSaving] = useState(false);
  const phoneRef = useRef(null);
  const nameRef = useRef(null);

  const cashCustomers = allCustomers.filter((c) => {
    const t = (c.customerType || c.type || "").toLowerCase();
    return (
      ["cash", "walkin", "wholesale", ""].includes(t) &&
      c.name?.toUpperCase().trim() !== "COUNTER SALE"
    );
  });

  useEffect(() => {
    setTimeout(() => phoneRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [custPhone, custName, selPrintType, saving]);

  const handlePhoneChange = (val) => {
    setCustPhone(val);
    if (val.trim().length >= 7) {
      const clean = val.replace(/\D/g, "");
      const found = cashCustomers.find(
        (c) =>
          c.phone?.replace(/\D/g, "").includes(clean) ||
          c.cell?.replace(/\D/g, "").includes(clean) ||
          c.otherPhone?.replace(/\D/g, "").includes(clean),
      );
      if (found) setCustName(found.name);
      else setCustName("");
    } else {
      setCustName("");
    }
  };

  const handlePrint = async () => {
    if (saving) return;
    setSaving(true);

    let finalName = custName.trim() || "COUNTER SALE";
    let finalPhone = custPhone.trim();

    if (finalPhone) {
      const clean = finalPhone.replace(/\D/g, "");
      const existing = cashCustomers.find(
        (c) =>
          c.phone?.replace(/\D/g, "").includes(clean) ||
          c.cell?.replace(/\D/g, "").includes(clean),
      );

      if (!existing && finalName !== "COUNTER SALE") {
        try {
          const { data } = await api.post(EP.CUSTOMERS.CREATE, {
            name: finalName,
            type: "walkin",
            phone: finalPhone,
          });
          if (data.success) {
            finalName = data.data.name;
          }
        } catch {
        }
      } else if (existing) {
        finalName = existing.name;
      }
    }

    setSaving(false);
    onPrint(selPrintType, {
      customerName: finalName,
      customerPhone: finalPhone,
      hidePrices: selPrintType === "Gatepass",
    });
  };

  return (
    <div className="scm-overlay">
      <div className="scm-window" style={{ maxWidth: 420 }}>
        <div className="scm-tb">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="rgba(255,255,255,0.85)"
          >
            <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m4-3h7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z" />
          </svg>
          <span className="scm-tb-title">Print Options — {sale.invoiceNo}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {!hideCustomerFields && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="xp-label">Phone Number</label>
              <input
                ref={phoneRef}
                className="xp-input"
                value={custPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    nameRef.current?.focus();
                  }
                }}
                autoComplete="off"
              />
            </div>
          )}

          {!hideCustomerFields && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="xp-label">
                Customer Name
                {custName && custPhone && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: "#15803d",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Already saved
                  </span>
                )}
                {custPhone.trim().length >= 7 && !custName && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: "#b45309",
                      fontWeight: 600,
                    }}
                  >
                    New — will be saved
                  </span>
                )}
              </label>
              <input
                ref={nameRef}
                className="xp-input"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePrint();
                  }
                }}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="xp-label">Print Format</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Thermal", "A5", "A4", "Gatepass"].map((pt) => (
                <label
                  key={pt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 14px",
                    border: `2px solid ${selPrintType === pt ? "var(--xp-blue-mid)" : "var(--xp-silver-2)"}`,
                    borderRadius: 4,
                    background:
                      selPrintType === pt ? "#e8f0fb" : "var(--xp-silver-3)",
                    cursor: "pointer",
                    fontWeight: selPrintType === pt ? 700 : 400,
                    color: selPrintType === pt ? "var(--xp-blue-dark)" : "#444",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="radio"
                    name="po-pt"
                    checked={selPrintType === pt}
                    onChange={() => setSelPrintType(pt)}
                    style={{ display: "none" }}
                  />
                  {pt === "Thermal" ? "🖨" : pt === "A5" ? "📄" : pt === "A4" ? "📋" : "🎫"} {pt}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="scm-sep" />

        <div className="scm-actions">
          <button
            className="xp-btn xp-btn-primary"
            style={{ minWidth: 130 }}
            onClick={handlePrint}
            disabled={saving}
          >
            {saving ? "Saving…" : "🖨 Print"}
          </button>
          <button
            className="xp-btn"
            style={{ minWidth: 110 }}
            onClick={onClose}
          >
            ↩ Cancel
          </button>
        </div>
        <div className="scm-hint">
          Enter = Print &nbsp;|&nbsp; Esc = Cancel
        </div>
      </div>
    </div>
  );
}

const doPrint = (sale, type, overrides = {}) => {
  const w = window.open(
    "",
    "_blank",
    type === "Thermal" || type === "Gatepass" ? "width=420,height=640" : "width=900,height=700",
  );
  w.document.write(buildPrintHtml(sale, type, overrides));
  w.document.close();
  setTimeout(() => w.print(), 400);
};

/* ══════════════════════════════════════════════════════════
   SAVE CONFIRM MODAL — XP Theme
══════════════════════════════════════════════════════════ */
function SaveConfirmModal({
  salePayload,
  printType: defaultPrintType,
  onConfirm,
  onClose,
}) {
  const [paidAmount, setPaidAmount] = useState(0);
  const [selPrintType, setSelPrintType] = useState(defaultPrintType);
  const [saving, setSaving] = useState(false);
  const [gatepassChecked, setGatepassChecked] = useState(false);
  const paidRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      paidRef.current?.focus();
      paidRef.current?.select();
    }, 80);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter" && document.activeElement === paidRef.current) {
        e.preventDefault();
        handleConfirm(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [paidAmount, selPrintType]);

  const netTotal = salePayload.netTotal;
  const prevBalance = salePayload.prevBalance || 0;
  const paid = Number(paidAmount) || 0;
  const billTotal = netTotal + prevBalance;
  const change = paid - billTotal;

  const handleConfirm = async (withPrint) => {
    if (saving) return;
    setSaving(true);
    await onConfirm({
      extraDisc: salePayload.extraDisc || 0,
      netTotal,
      paidAmount: paid,
      balance: billTotal - paid,
      printType: selPrintType,
      withPrint,
      gatepass: gatepassChecked,
    });
    setSaving(false);
  };

  return (
    <div className="scm-overlay">
      <div className="scm-window">
        <div className="scm-tb">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="rgba(255,255,255,0.85)"
          >
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0" />
          </svg>
          <span className="scm-tb-title">
            Sale Confirm — {salePayload.invoiceNo} &nbsp;|&nbsp;{" "}
            {salePayload.customerName}
          </span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="scm-meta">
          <span>
            <b>Invoice:</b> {salePayload.invoiceNo}
          </span>
          <span>
            <b>Date:</b> {salePayload.invoiceDate}
          </span>
          <span>
            <b>Customer:</b> {salePayload.customerName}
          </span>
          <span>
            <b>Payment:</b> {salePayload.paymentMode}
          </span>
          <span>
            <b>Items:</b> {salePayload.items.length}
          </span>
        </div>

        <div className="scm-amounts">
          <div className="scm-box">
            <div className="scm-box-label">Bill Amount</div>
            <div className="scm-box-val">
              {Number(billTotal).toLocaleString("en-PK")}
            </div>
          </div>

          <div className="scm-box" style={{ borderLeft: "none" }}>
            <div className="scm-box-label">Received</div>
            <input
              ref={paidRef}
              type="text"
              className="scm-recv-input"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div
            className={`scm-box ${change >= 0 ? "scm-box-change" : "scm-box-due"}`}
            style={{ borderLeft: "none" }}
          >
            <div className="scm-box-label">
              {change >= 0 ? "Change" : "Balance Due"}
            </div>
            <div className="scm-box-val">
              {change < 0 && (
                <span style={{ fontSize: 22, marginRight: 2 }}>−</span>
              )}
              {Math.abs(change).toLocaleString("en-PK")}
            </div>
          </div>
        </div>

        <div className="scm-print-row">
          <span style={{ color: "#555", marginRight: 4, fontWeight: 700 }}>
            Print:
          </span>
          {["Thermal", "A5", "A4", "Gatepass"].map((pt) => (
            <label key={pt}>
              <input
                type="radio"
                name="scm-pt"
                checked={selPrintType === pt}
                onChange={() => setSelPrintType(pt)}
              />
              {pt}
            </label>
          ))}
        </div>

        <div className="scm-sep" />

        <div className="scm-actions">
          <button
            className="xp-btn xp-btn-primary"
            style={{ minWidth: 140 }}
            onClick={() => handleConfirm(true)}
            disabled={saving}
          >
            🖨 Save and Print
          </button>
          <button
            className="xp-btn xp-btn-success"
            style={{ minWidth: 110 }}
            onClick={() => handleConfirm(false)}
            disabled={saving}
          >
            💾 Save only
          </button>
          <button
            className="xp-btn"
            style={{ minWidth: 130 }}
            onClick={onClose}
          >
            ↩ Return to Invoice
          </button>
        </div>

        <div className="scm-hint">
          ↵ Enter = Save &amp; Print &nbsp;|&nbsp; Esc = Return to Invoice
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
    >
      <div className="xp-modal xp-modal-lg">
        <div className="xp-modal-tb">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="rgba(255,255,255,0.8)"
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span className="xp-modal-title">Search Products</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="cs-modal-filters">
          <div className="cs-modal-filter-grp">
            <label className="xp-label">Description / Code</label>
            <input
              ref={rDesc}
              type="text"
              className="xp-input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => fk(e, rCat)}
              autoComplete="off"
            />
          </div>
          <div className="cs-modal-filter-grp">
            <label className="xp-label">Category</label>
            <input
              ref={rCat}
              type="text"
              className="xp-input"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              onKeyDown={(e) => fk(e, rCompany)}
              autoComplete="off"
            />
          </div>
          <div className="cs-modal-filter-grp">
            <label className="xp-label">Company</label>
            <input
              ref={rCompany}
              type="text"
              className="xp-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => fk(e, null)}
              autoComplete="off"
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            <span style={{ fontSize: "var(--xp-fs-xs)", color: "#555" }}>
              {rows.length} result(s)
            </span>
            <button className="xp-btn xp-btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="xp-modal-body" style={{ padding: 0 }}>
          <div className="xp-table-panel" style={{ border: "none" }}>
            <div className="xp-table-scroll">
              <table className="xp-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>Sr.#</th>
                    <th>Barcode</th>
                    <th>Name</th>
                    <th>Meas.</th>
                    <th className="r">Rate</th>
                    <th className="r">Stock</th>
                    <th className="r">Pack</th>
                    <th>Rack#</th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef} tabIndex={0} onKeyDown={tk}>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="xp-empty">
                        No products found
                      </td>
                    </tr>
                  )}
                  {rows.map((r, i) => (
                    <tr
                      key={`${r._id}-${r._pi}`}
                      style={{
                        background: i === hiIdx ? "#c3d9f5" : undefined,
                      }}
                      onClick={() => setHiIdx(i)}
                      onDoubleClick={() => onSelect(r)}
                    >
                      <td className="text-muted">{i + 1}</td>
                      <td>
                        <span className="xp-code">{r.code}</span>
                      </td>
                      <td>
                        <button className="xp-link-btn">{r._name}</button>
                      </td>
                      <td className="text-muted">{r._meas}</td>
                      <td className="r xp-amt">
                        {Number(r._rate).toLocaleString("en-PK")}
                      </td>
                      <td className="r">{r._stock}</td>
                      <td className="r">{r._pack}</td>
                      <td className="text-muted">{r.rackNo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="cs-modal-hint">
          ↑↓ navigate &nbsp;|&nbsp; Enter / Double-click = select &nbsp;|&nbsp;
          Esc = close &nbsp;|&nbsp; Tab = filters
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
    <div
      className="xp-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="xp-modal" style={{ width: 560 }}>
        <div className="xp-modal-tb">
          <span className="xp-modal-title">Hold Bill — {bill.invoiceNo}</span>
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
              <b>Customer:</b> {bill.buyerName}
            </span>
            <span>
              <b>Items:</b> {bill.items.length}
            </span>
            <span>
              <b>Amount:</b>{" "}
              <span style={{ color: "var(--xp-blue-dark)", fontWeight: 700 }}>
                {Number(bill.amount).toLocaleString("en-PK")}
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
                      <td className="r">
                        {Number(r.rate).toLocaleString("en-PK")}
                      </td>
                      <td
                        className="r"
                        style={{
                          color: "var(--xp-blue-dark)",
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
            onClick={() => onResume(bill.id)}
          >
            Resume This Bill
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CUSTOMER DROPDOWN
══════════════════════════════════════════════════════════ */
function CustomerDropdown({
  allCustomers,
  value,
  displayName,
  customerType,
  onSelect,
  onClear,
  allowedTypes,
}) {
  const [query, setQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const parentRef = useRef(null);

  const creditCustomers = allCustomers.filter((c) => {
    const t = (c.customerType || c.type || "").toLowerCase();
    const allowed = allowedTypes || ["credit"];
    return (
      allowed.includes(t) && c.name?.toUpperCase().trim() !== "COUNTER SALE"
    );
  });

  const getSuggestions = (searchTerm) => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase();
    return creditCustomers.filter(c => 
      c.name?.toLowerCase().startsWith(searchLower)
    );
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
      if (matchedCustomer) {
        selectCustomer(matchedCustomer);
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
        if (newIndex >= suggestions.length) {
          newIndex = 0;
        }
      }
      
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
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = suggestions.length - 1;
      } else {
        newIndex = selectedSuggestionIndex - 1;
        if (newIndex < 0) {
          newIndex = suggestions.length - 1;
        }
      }
      
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
      
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        selectCustomer(suggestions[selectedSuggestionIndex]);
      } else if (suggestions.length > 0 && suggestions[0]) {
        selectCustomer(suggestions[0]);
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
    if (value && newValue !== displayName) onClear();
    setSelectedSuggestionIndex(-1);
    setShowDropdown(true);
    setIsNavigating(false);
  };

  const typeStyle = customerType && TYPE_COLORS[customerType]
    ? {
        background: TYPE_COLORS[customerType].bg,
        color: TYPE_COLORS[customerType].color,
        border: `1px solid ${TYPE_COLORS[customerType].border}`,
      }
    : null;

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          position: "relative",
        }}
      >
        {typeStyle && (
          <span className="cdd-type-badge" style={typeStyle}>
            {customerType}
          </span>
        )}

        <div 
          ref={parentRef}
          style={{ 
            position: "relative", 
            flex: 1,
            background: isFocused ? "#fffbe6" : "transparent",
            borderRadius: "4px",
            transition: "background 0.15s ease",
          }}
        >
          {ghost && !isNavigating && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                fontSize: "13px",
                fontFamily: "inherit",
                display: "flex",
                zIndex: 2,
                color: "#a0aec0",
                opacity: 1,
                backgroundColor: "transparent",
                paddingLeft: "4px",
              }}
            >
              <span style={{ visibility: "hidden", opacity: 1 }}>{originalQuery}</span>
              <span style={{ opacity: 1, color: "#a0aec0" }}>{ghost}</span>
            </div>
          )}
          
          <input
            ref={inputRef}
            className="sl-cust-input cdd-input"
            style={{
              flex: 1,
              minWidth: 0,
              cursor: "text",
              background: "transparent",
              position: "relative",
              zIndex: 1,
              width: "100%",
              border: "none",
              outline: "none",
              padding: "4px",
            }}
            value={value ? query || displayName : query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {value && (
          <button
            className="xp-btn xp-btn-sm xp-btn-danger"
            style={{
              height: 22,
              padding: "0 5px",
              fontSize: 10,
              flexShrink: 0,
            }}
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
          {suggestions.map((customer, idx) => (
            <div
              key={customer._id}
              onClick={() => selectCustomer(customer)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white",
                borderBottom: "1px solid #f3f4f6",
                fontSize: 13,
              }}
              onMouseEnter={() => {
                setSelectedSuggestionIndex(idx);
                setIsNavigating(true);
                setQuery(customer.name);
                setGhost("");
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 2 }}>
                {customer.name}
              </div>
              {customer.phone && (
                <div style={{ fontSize: 10, color: "#6b7280" }}>
                  📞 {customer.phone}
                </div>
              )}
              {customer.currentBalance > 0 && (
                <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>
                  Balance: PKR {customer.currentBalance.toLocaleString("en-PK")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {originalQuery && suggestions.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            fontSize: 10,
            color: "#9ca3af",
            marginTop: 2,
            padding: "4px 8px",
          }}
        >
          No customer found matching "{originalQuery}"
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function SalePage() {

  const [time, setTime] = useState(timeNow());
  const [allProducts, setAllProducts] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHoldPreview, setShowHoldPreview] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [curRow, setCurRow] = useState({ ...EMPTY_ROW });
  const [items, setItems] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState(isoDate());
  const [invoiceNo, setInvoiceNo] = useState("INV-00001");
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
  const [packingOpen, setPackingOpen] = useState(false);
  const [packingHiIdx, setPackingHiIdx] = useState(0);
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
  const receivedRef = useRef(null);
  const discRef = useRef(null);
  const saveRef = useRef(null);
  const statementRef = useRef(null);
  const [gatepassPrint, setGatepassPrint] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);
  
  useEffect(() => {
        fetchData();
  }, []);
  
  useEffect(() => {
    saveHolds(holdBills);
  }, [holdBills]);

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
  const billAmount = subTotal - (parseFloat(extraDiscount) || 0);
  const balance =
    billAmount + (parseFloat(prevBalance) || 0) - (parseFloat(received) || 0);

  useEffect(() => {
    if (paymentMode !== "Credit")
      setReceived(billAmount + (parseFloat(prevBalance) || 0));
  }, [billAmount, prevBalance, paymentMode]);

  const handlePaymentMode = (mode) => {
    setPaymentMode(mode);
    if (mode === "Credit") setReceived(0);
    else setReceived(billAmount + (parseFloat(prevBalance) || 0));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, invRes] = await Promise.all([
        api.get(EP.PRODUCTS.GET_ALL),
        api.get(EP.CUSTOMERS.GET_ALL),
        api.get(EP.SALES.NEXT_INVOICE),
      ]);
      if (pRes.data.success) setAllProducts(pRes.data.data);
      if (cRes.data.success) setAllCustomers(cRes.data.data);
      if (invRes.data.success) setInvoiceNo(invRes.data.data.invoiceNo);
    } catch {
      showMsg("Failed to load data", "error");
    }
    setLoading(false);
  };

  const refreshInvoiceNo = async () => {
    try {
      const r = await api.get(EP.SALES.NEXT_INVOICE);
      if (r.data.success) setInvoiceNo(r.data.data.invoiceNo);
    } catch {}
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3500);
  };
  
  const handleCustomerSelect = async (c) => {
    if (!c || !c._id) {
      showMsg("Invalid customer selected", "error");
      return;
    }
    
    try {
      const freshCustomer = await api.get(EP.CUSTOMERS.GET_ONE(c._id));
      if (freshCustomer.data.success) {
        const customer = freshCustomer.data.data;
        const type = customer.customerType || customer.type || "";
        setCustomerId(customer._id);
        setBuyerName(customer.name);
        setCustomerType(type);
        setPrevBalance(customer.currentBalance || 0);
        setCodeSearch("");
        const pm = typeToPayment(type);
        const ss = typeToSource(type);
        setPaymentMode(pm);
        setSaleSource(ss);
        if (pm === "Credit") setReceived(0);
        else setReceived(billAmount + (customer.currentBalance || 0));

        const limit = customer.creditLimit || 0;
        const custBal = customer.currentBalance || 0;
        if (type === "credit" && limit > 0 && custBal >= limit) {
          setCreditWarning(true);
        } else {
          setCreditWarning(false);
        }
        setCreditStatement("");
        setShowCustomerPanel(true);

        if (type === "credit") {
          setTimeout(() => statementRef.current?.focus(), 80);
        } else {
          setTimeout(() => searchRef.current?.focus(), 30);
        }
      }
    } catch (error) {
      console.error("Failed to fetch customer details:", error);
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

  const handleAddNewCustomer = async (name) => {
    try {
      const { data } = await api.post(EP.CUSTOMERS.CREATE, {
        name: name.trim(),
        type: "credit",
        phone: "",
      });
      if (data.success) {
        await fetchData();
        const newCust = data.data;
        handleCustomerSelect({
          _id: newCust._id,
          name: newCust.name,
          phone: newCust.phone || "",
          customerType: "credit",
          type: "credit",
          currentBalance: 0,
          creditLimit: newCust.creditLimit || 0,
        });
        showMsg(`"${name}" saved as new customer`, "success");
      }
    } catch {
      showMsg("Customer save failed", "error");
    }
    setTimeout(() => searchRef.current?.focus(), 30);
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
    setTimeout(() => packingRef.current?.focus(), 30);
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

    setTimeout(() => packingRef.current?.focus(), 30);
  };

  const removeRow = () => {
    if (selItemIdx === null) return;
    setItems((p) => p.filter((_, i) => i !== selItemIdx));
    resetCurRow();
  };

  const totalQty = items.reduce((s, r) => s + (parseFloat(r.pcs) || 0), 0);

  const holdBill = () => {
    if (!items.length) return;
    setHoldBills((p) => [
      ...p,
      {
        id: Date.now(),
        invoiceNo,
        amount: billAmount,
        items: [...items],
        customerId,
        buyerName,
        customerType,
        prevBalance,
        extraDiscount,
        paymentMode,
        saleSource,
      },
    ]);
    fullReset();
    refreshInvoiceNo();
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
    if (window.confirm("Delete this held bill?"))
      setHoldBills((p) => p.filter((b) => b.id !== holdId));
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
    setTimeout(() => searchRef.current?.focus(), 50);
  };
  
  const loadSaleForEdit = (sale) => {
    setEditId(sale._id);
    setInvoiceNo(sale.invoiceNo);
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
      amount: it.amount || 0,
    }));
    setItems(loadedItems);

    setExtraDiscount(sale.extraDisc || 0);
    setReceived(sale.paidAmount || 0);

    resetCurRow();
    showMsg(`✏ Editing Invoice ${sale.invoiceNo}`, "success");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const navInvoice = async (dir) => {
    try {
      const { data } = await api.get(EP.SALES.GET_ALL);
      if (!data.success || !data.data?.length) return;
      const allSales = data.data;
      const curIdx = allSales.findIndex((s) =>
        editId ? s._id === editId : s.invoiceNo === invoiceNo,
      );
      let nextIdx = dir === "prev" ? curIdx - 1 : curIdx + 1;
      nextIdx = Math.max(0, Math.min(nextIdx, allSales.length - 1));
      if (nextIdx === curIdx) return;
      loadSaleForEdit(allSales[nextIdx]);
    } catch {
      showMsg("Navigation failed", "error");
    }
  };

  const buildPayload = () => ({
    invoiceNo,
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
      amount: parseFloat(r.amount) || 0,
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
  });
  
  const openSaleConfirm = () => {
    if (!items.length) {
      alert("Add at least one item");
      return;
    }

    if (customerId && customerType === "credit") {
      if (!creditStatement.trim()) {
        statementRef.current?.focus();
        showMsg("Note likhna zaroori hai credit sale ke liye", "error");
        return;
      }
      const payload = buildPayload();
      setPendingPayload(payload);
      confirmSaveWithPayload(payload, {
        extraDisc: payload.extraDisc,
        netTotal: payload.netTotal,
        paidAmount: 0,
        balance: payload.netTotal + (parseFloat(prevBalance) || 0),
        printType,
        withPrint: true,
      });
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
      const finalPayload = {
        ...payload,
        extraDisc: overrides.extraDisc,
        netTotal: overrides.netTotal,
        paidAmount: overrides.paidAmount,
        balance: overrides.balance,
        printType: overrides.printType,
      };
      const { data } = editId
        ? await api.put(EP.SALES.UPDATE(editId), finalPayload)
        : await api.post(EP.SALES.CREATE, finalPayload);

      if (data.success) {
        showMsg(editId ? "Sale updated!" : `Saved: ${data.data.invoiceNo}`);
        
        if (customerId) {
          try {
            const customerResponse = await api.get(EP.CUSTOMERS.GET_ONE(customerId));
            if (customerResponse.data.success) {
              const updatedCustomer = customerResponse.data.data;
              console.log("Updated customer balance:", updatedCustomer.currentBalance);
              setPrevBalance(updatedCustomer.currentBalance || 0);
            }
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
          items: payload.items,
          subTotal: finalPayload.subTotal,
          extraDisc: overrides.extraDisc,
          netTotal: overrides.netTotal,
          prevBalance: finalPayload.prevBalance,
          paidAmount: overrides.paidAmount,
          balance: overrides.balance,
        };
        
        if (gatepassPrint) {
          doPrint(saleObj, "Gatepass", { customerName: finalPayload.customerName, hidePrices: true });
          setGatepassPrint(false);
        }
        
        if (overrides.withPrint) {
          setPendingPrintSale(saleObj);
          setShowPrintModal(true);
        }
        setShowSaveModal(false);
        setPendingPayload(null);
        fullReset();
        await refreshInvoiceNo();
      } else {
        showMsg(data.message, "error");
      }
    } catch (e) {
      showMsg(e.response?.data?.message || "Save failed", "error");
    }
    setLoading(false);
  };

  const confirmSave = async (overrides) => {
    confirmSaveWithPayload(pendingPayload, overrides);
  };
  
  useEffect(() => {
    const handler = (e) => {
      if (
        showProductModal ||
        showHoldPreview ||
        showSaveModal ||
        showPrintModal
      )
        return;

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
  }, [
    items,
    showProductModal,
    showHoldPreview,
    showSaveModal,
    showPrintModal,
    billAmount,
  ]);

  return (
    <>
      <div className={`sl-page${creditWarning ? " sl-credit-mode" : ""}`}>
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
          <HoldPreviewModal
            bill={showHoldPreview}
            onResume={resumeHold}
            onClose={() => setShowHoldPreview(null)}
          />
        )}
        {showSaveModal && pendingPayload && (
          <SaveConfirmModal
            salePayload={pendingPayload}
            printType={printType}
            onConfirm={confirmSave}
            onClose={() => {
              setShowSaveModal(false);
              setPendingPayload(null);
            }}
          />
        )}
        {showPrintModal && pendingPrintSale && (
          <PrintOptionsModal
            sale={pendingPrintSale}
            allCustomers={allCustomers}
            defaultPrintType={printType}
            hideCustomerFields={pendingPrintSale.paymentMode === "Credit"}
            onPrint={(type, overrides) => {
              doPrint(pendingPrintSale, type, overrides);
              setShowPrintModal(false);
              setPendingPrintSale(null);
            }}
            onClose={() => {
              setShowPrintModal(false);
              setPendingPrintSale(null);
            }}
          />
        )}
        {/* TITLEBAR */}
        <div className="xp-titlebar">
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="rgba(255,255,255,0.85)"
          >
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM2 10h2a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2m4 0h6a1 1 0 0 1 0 2H6a1 1 0 0 1 0-2" />
          </svg>
          <span className="xp-tb-title">
            Sale Invoice — Asim Electric &amp; Electronic Store
          </span>
          <div className="xp-tb-actions">
            {editId && <div className="sl-edit-badge">✏ Editing Sale</div>}
            <div className="xp-tb-divider" />
            <div className="sl-shortcut-hints">
              <span>F2 Product</span>
              <span>F4 Hold</span>
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
            {/* Invoice info with big input and nav buttons */}
           {/* Invoice info with integrated nav buttons inside input */}
{/* Invoice info with integrated nav buttons inside input */}
<div className="sl-top-bar">
  <div className="sl-sale-title-box">Sale</div>
  
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
        onChange={(e) => setInvoiceNo(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const val = invoiceNo.trim();
            if (!val) return;
            try {
              const { data } = await api.get(
                EP.SALES.GET_ALL + `?invoiceNo=${val}`,
              );
              const sales = data.data;
              if (!sales || sales.length === 0) {
                showMsg(`Invoice "${val}" not found`, "error");
                await refreshInvoiceNo();
                return;
              }
              const exact = sales.find(
                (s) => s.invoiceNo?.toString() === val.toString(),
              );
              if (!exact) {
                showMsg(`Invoice "${val}" not found`, "error");
                await refreshInvoiceNo();
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
        }}
        onFocus={(e) => e.target.select()}
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
        color: "#888",
      }}
    />
  </div>
  <div className="sl-inv-field-grp">
    <label>Time</label>
    <div className="sl-time-box">{time}</div>
  </div>
</div>

            {/* Entry strip with product autocomplete */}
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
                    style={{ width: "100%", background: "#fffde7" }}
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
                </div>
              </div>
              <div className="sl-entry-cell" style={{ position: "relative" }}>
                <label>Packing</label>
                <input
                  ref={packingRef}
                  type="text"
                  className="xp-input sl-num-input"
                  style={{ width: 65, background: "#fffde7" }}
                  value={curRow.uom}
                  onChange={(e) =>
                    setCurRow((p) => ({ ...p, uom: e.target.value }))
                  }
                  onFocus={() => {
                    setPackingHiIdx(
                      Math.max(0, packingOptions.indexOf(curRow.uom)),
                    );
                  }}
                  onBlur={() => setTimeout(() => setPackingOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      pcsRef.current?.focus();
                      return;
                    }
                    if (packingOptions.length === 0) return;
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const idx = packingOptions.indexOf(curRow.uom);
                      const next =
                        e.key === "ArrowDown"
                          ? (idx + 1) % packingOptions.length
                          : (idx - 1 + packingOptions.length) %
                            packingOptions.length;
                      const newUom = packingOptions[next];

                      const product = allProducts.find(
                        (p) => p._id === curRow.productId,
                      );
                      if (product?.packingInfo) {
                        const pk = product.packingInfo.find(
                          (pk) => pk.measurement === newUom,
                        );
                        if (pk) {
                          setCurRow((p) => ({
                            ...p,
                            uom: newUom,
                            rate: pk.saleRate || 0,
                            pcs: pk.packing || 1,
                            amount: (pk.packing || 1) * (pk.saleRate || 0),
                          }));
                          return;
                        }
                      }
                      setCurRow((p) => ({ ...p, uom: newUom }));
                    }
                  }}
                  autoComplete="off"
                />
              </div>
              <div className="sl-entry-cell">
                <label>Pcs</label>
                <input
                  ref={pcsRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 60, background: "#fffde7" }}
                  value={curRow.pcs}
                  min={1}
                  onChange={(e) => updateCurRow("pcs", e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && rateRef.current?.focus()
                  }
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="sl-entry-cell">
                <label>Rate</label>
                <input
                  ref={rateRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 75, background: "#fffde7" }}
                  value={curRow.rate}
                  min={0}
                  onChange={(e) => updateCurRow("rate", e.target.value)}
                  onBlur={(e) => {
                    const product = allProducts.find(
                      (p) => p._id === curRow.productId,
                    );
                    if (product?.packingInfo) {
                      const pk = product.packingInfo.find(
                        (p) => p.measurement === curRow.uom,
                      );
                      if (pk) {
                        const purchaseRate =
                          pk.purchaseRate || pk.costRate || 0;
                        if (
                          purchaseRate > 0 &&
                          parseFloat(e.target.value) < purchaseRate
                        ) {
                          showMsg(
                            `Rate cannot be less than purchase rate (${purchaseRate})`,
                            "error",
                          );
                          updateCurRow("rate", purchaseRate);
                        }
                      }
                    }
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && amountRef.current?.focus()
                  }
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
                  onChange={(e) =>
                    setCurRow((p) => ({
                      ...p,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && addRef.current?.click()
                  }
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
                {totalQty.toLocaleString("en-PK")}
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
                        Search and add products to start the bill
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
                        style={{ color: "var(--xp-blue-dark)" }}
                      >
                        {Number(r.amount).toLocaleString("en-PK")}
                      </td>
                      <td className="muted">{r.rack}</td>
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
                <label>Net Amount</label>
                <input
                  className="sl-sum-val"
                  value={Number(subTotal).toLocaleString("en-PK")}
                  readOnly
                />
              </div>
              <div className="sl-sum-cell">
                <label>Bill Amount</label>
                <input
                  className="sl-sum-val"
                  value={Number(billAmount).toLocaleString("en-PK")}
                  readOnly
                />
              </div>
              <div className="sl-sum-cell">
                <label>Extra Discount</label>
                <input
                  ref={discRef}
                  type="text"
                  className="sl-sum-input"
                  style={{ background: "#fffde7" }}
                  value={extraDiscount}
                  min={0}
                  onChange={(e) => setExtraDiscount(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && receivedRef.current?.focus()
                  }
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="sl-sum-cell">
                <label>Received</label>
                <input
                  ref={receivedRef}
                  type="text"
                  className="sl-sum-input"
                  style={{ color: "var(--xp-green)", fontWeight: 700, background: "#fffde7" }}
                  value={received}
                  min={0}
                  onChange={(e) => setReceived(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && saveRef.current?.focus()
                  }
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="sl-sum-cell">
                <label>Balance</label>
                <input
                  className={`sl-sum-val sl-bal${balance > 0 ? " danger" : balance < 0 ? " success" : ""}`}
                  value={Number(balance).toLocaleString("en-PK")}
                  readOnly
                />
              </div>
            </div>

            {/* Customer bar */}
            <div className="sl-customer-bar">
              <div className="sl-cust-cell">
                <label>Code</label>
                <input
                  className="sl-cust-input"
                  style={{ width: 65, background: "#fffde7" }}
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const q = codeSearch.trim();
                      if (!q) return;
                      const found = allCustomers.find(
                        (c) =>
                          String(c.code).toLowerCase() === q.toLowerCase() &&
                          (c.customerType || c.type || "").toLowerCase() ===
                            "credit",
                      );
                      if (found) {
                        handleCustomerSelect(found);
                        setCodeSearch("");
                      } else {
                        showMsg(
                          `Code "${q}" — credit customer nahi mila`,
                          "error",
                        );
                      }
                    }
                  }}
                  autoComplete="off"
                />
              </div>

              <div className="sl-cust-cell sl-cust-buyer">
                <label>Buyer Name</label>
                <CustomerDropdown
                  allCustomers={allCustomers}
                  value={customerId}
                  displayName={buyerName}
                  customerType={customerType}
                  onSelect={handleCustomerSelect}
                  onClear={handleCustomerClear}
                  allowedTypes={["credit"]}
                />
              </div>

              <div className="sl-cust-cell">
                <label>Prev Balance</label>
                <input
                  type="text"
                  className="sl-cust-input"
                  style={{ width: 85, background: "#fffde7" }}
                  value={prevBalance}
                  onChange={(e) => setPrevBalance(e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="sl-cust-cell">
                <label>Net Recv.</label>
                <input
                  className="sl-cust-input sl-net-recv"
                  style={{
                    color: balance > 0 ? "var(--xp-red)" : "var(--xp-green)",
                    fontWeight: 700,
                    width: 85,
                  }}
                  value={Number(balance).toLocaleString("en-PK")}
                  readOnly
                />
              </div>

              <div className="sl-pay-btns">
                {["Cash", "Credit", "Bank", "Cheque"].map((m) => (
                  <button
                    key={m}
                    className={`sl-pay-btn${paymentMode === m ? " active-" + m.toLowerCase() : ""}`}
                    onClick={() => handlePaymentMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Gatepass Checkbox */}
            <div className="sl-gatepass-bar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 8px", background: "var(--xp-silver-4)", borderRadius: 4, marginTop: 6 }}>
              <label className="sl-check-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={gatepassPrint}
                  onChange={(e) => setGatepassPrint(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: "var(--xp-fs-sm)", fontWeight: 500 }}>🎫 Print Gatepass (No Prices)</span>
              </label>
              <span style={{ fontSize: "var(--xp-fs-xs)", color: "#666" }}>
                Gatepass will show items without rates and amounts
              </span>
            </div>

            {/* Credit Warning Bar */}
            {showCustomerPanel && customerId && (
              <div
                className={`sl-credit-warning-bar${creditWarning ? "" : " sl-credit-normal"}`}
              >
                <div className="sl-credit-warning-left">
                  {(() => {
                    const cust = allCustomers.find((c) => c._id === customerId);
                    return cust?.imageFront ? (
                      <img
                        src={cust.imageFront}
                        alt={cust.name}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 4,
                          objectFit: "cover",
                          border: "2px solid #fff",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          flexShrink: 0,
                        }}
                      >
                        👤
                      </div>
                    );
                  })()}
                  <div>
                    {creditWarning && (
                      <>
                        <div className="sl-credit-title">
                          ⚠ CREDIT LIMIT EXCEEDED
                        </div>
                        <div className="sl-credit-sub">
                          Balance: <b>{fmt(prevBalance)}</b> — Enter
                          authorization statement to proceed
                        </div>
                      </>
                    )}
                    {!creditWarning && (
                      <div className="sl-credit-sub" style={{ color: "#fff" }}>
                        Balance: <b>{fmt(prevBalance)}</b>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  ref={statementRef}
                  type="text"
                  className="sl-credit-statement-input"
                  style={{ background: "#fffde7" }}
                  placeholder={
                    creditWarning
                      ? "Enter reason / authorization statement to allow sale…"
                      : "Notes (optional)…"
                  }
                  value={creditStatement}
                  onChange={(e) => setCreditStatement(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      openSaleConfirm();
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="sl-right">
            {/* Hold Bills */}
            <div className="sl-hold-panel">
              <div className="sl-hold-title">
                <span>
                  Hold Bills{" "}
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
                          <td
                            style={{
                              fontFamily: "var(--xp-mono)",
                              fontSize: "var(--xp-fs-xs)",
                            }}
                          >
                            {b.invoiceNo}
                          </td>
                          <td
                            className="r"
                            style={{ color: "var(--xp-blue-dark)" }}
                          >
                            {Number(b.amount).toLocaleString("en-PK")}
                          </td>
                          <td
                            className="muted"
                            style={{ fontSize: "var(--xp-fs-xs)" }}
                          >
                            {b.buyerName}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="xp-btn xp-btn-sm xp-btn-ico"
                              style={{
                                width: 18,
                                height: 18,
                                fontSize: 9,
                                color: "var(--xp-red)",
                              }}
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
              <div className="sl-hold-scroll-btns">
                <button className="xp-btn xp-btn-sm xp-btn-ico">◀</button>
                <button className="xp-btn xp-btn-sm xp-btn-ico">▶</button>
              </div>
              <div style={{ padding: "4px 8px", flexShrink: 0 }}>
                <button
                  className="xp-btn xp-btn-sm"
                  style={{ width: "100%" }}
                  onClick={holdBill}
                  disabled={!items.length}
                >
                  Hold Bill (F4)
                </button>
              </div>
            </div>
            {/* Customer Photo */}
            {customerId &&
              (() => {
                const cust = allCustomers.find((c) => c._id === customerId);
                return cust ? (
                  <div
                    style={{
                      width: "100%",
                      height: 100,
                      marginTop: 6,
                      borderRadius: 6,
                      overflow: "hidden",
                      border: "2px solid var(--xp-silver-4)",
                      flexShrink: 0,
                      order: 2,
                    }}
                  >
                    {cust.imageFront ? (
                      <img
                        src={cust.imageFront}
                        alt={cust.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "var(--xp-silver-3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 48,
                        }}
                      >
                        👤
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
          </div>
        </div>

        {/* Commands bar */}
        <div className="sl-cmd-bar">
          <button
            className="xp-btn xp-btn-sm"
            onClick={fullReset}
            disabled={loading}
          >
            Refresh
          </button>
          <button
            ref={saveRef}
            className="xp-btn xp-btn-primary xp-btn-lg"
            onClick={openSaleConfirm}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save  *"}
          </button>
          <button className="xp-btn xp-btn-sm" onClick={() => {}}>
            Edit Record
          </button>
          <button
            className="xp-btn xp-btn-danger xp-btn-sm"
            disabled={!editId}
            onClick={async () => {
              if (!editId || !window.confirm("Delete this sale?")) return;
              try {
                await api.delete(EP.SALES.DELETE(editId));
                showMsg("Sale deleted");
                fullReset();
                refreshInvoiceNo();
              } catch {
                showMsg("Delete failed", "error");
              }
            }}
          >
            Delete Record
          </button>
          <div className="xp-toolbar-divider" />
          
          {/* Updated Commands Section with WhatsApp Button */}
          <div className="sl-cmd-checks">
            <label className="sl-check-label">
              <input
                type="checkbox"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
              />{" "}
              Send SMS
            </label>
            <label className="sl-check-label">
              <input type="checkbox" /> Print P.Bal
            </label>
            <button 
              className="xp-btn xp-btn-sm"
              style={{ 
                background: "#25D366", 
                color: "#fff",
                borderColor: "#128C7E",
                marginLeft: "4px",
                padding: "4px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              onClick={() => {
                if (items.length === 0) {
                  alert("No items to share");
                  return;
                }
                const saleObj = {
                  invoiceNo,
                  invoiceDate,
                  customerName: buyerName,
                  items: items,
                  subTotal,
                  extraDisc: extraDiscount,
                  netTotal: billAmount,
                  prevBalance,
                  paidAmount: received,
                  balance,
                };
                shareViaWhatsApp(saleObj, {
                  customerName: buyerName,
                  customerPhone: "",
                  hidePrices: false
                });
              }}
            >
              📱 WhatsApp
            </button>
          </div>
          
          <div className="xp-toolbar-divider" />
          <div className="sl-print-types">
            {["Thermal", "A4", "A5", "Gatepass"].map((pt) => (
              <label key={pt} className="sl-check-label">
                <input
                  type="radio"
                  name="pt"
                  checked={printType === pt}
                  onChange={() => setPrintType(pt)}
                />{" "}
                {pt}
              </label>
            ))}
          </div>
          <div className="xp-toolbar-divider" />
          <span className={`sl-inv-info${editId ? " edit-mode" : ""}`}>
            {editId
              ? "✏ Editing sale record"
              : `${invoiceNo} | Items: ${items.length} | Total: ${Number(subTotal).toLocaleString("en-PK")} | ${saleSource} / ${paymentMode}`}
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
      .sl-page {
        background: #ffffff;
      }
      
      input, .xp-input, .sl-product-input, .sl-num-input, .sl-sum-input, 
      .sl-cust-input, .sl-credit-statement-input, .sl-inv-input-large,
      .sl-date-input, .sl-sum-val {
        border-color: #000000 !important;
        border-width: 1px !important;
        border-style: solid !important;
        background: #ffffff !important;
      }
      
      .sl-items-table th,
      .sl-items-table td,
      .sl-hold-table th,
      .sl-hold-table td {
        border-color: #000000 !important;
        border-width: 1px !important;
      }
      
      .xp-btn, .sl-pay-btn, .sl-entry-btns .xp-btn {
        border-color: #000000 !important;
        border-width: 1px !important;
        border-style: solid !important;
      }
      
      .sl-summary-bar, .sl-customer-bar, .sl-gatepass-bar,
      .sl-top-bar, .sl-entry-strip, .sl-table-header-bar,
      .sl-hold-panel, .sl-right, .sl-left {
        border-color: #e0e0e0;
      }
      
      .sl-items-table tbody tr.sl-empty-row {
        display: none;
      }
      
      @font-face {
        font-family: 'UrduFont';
        src: local('Jameel Noori Nastaleeq'),
             local('Noto Nastaliq Urdu'),
             local('Urdu Typesetting'),
             local('Arial Unicode MS');
      }
      .urdu, .shop-urdu, .shop-addr, .banner, .terms-box, .terms {
        font-family: 'UrduFont', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 
                     'Urdu Typesetting', Arial, sans-serif !important;
        direction: rtl;
      }
      .xp-link-btn {
        text-decoration: none;
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

      .sl-page.sl-credit-mode .sl-right {
        background-color: #dc2626 !important;
        border-left: 3px solid #991b1b;
        transition: background-color 0.2s ease;
      }

      .sl-page.sl-credit-mode .sl-items-wrap {
        background-color: #dc2626 !important;
        border-radius: 6px;
      }

      .sl-page.sl-credit-mode .sl-items-table {
        background-color: #dc2626 !important;
      }

      .sl-page.sl-credit-mode .sl-items-table thead th {
        background-color: #991b1b !important;
        color: #ffffff !important;
        border-bottom: 2px solid #7f1d1d;
      }

      .sl-page.sl-credit-mode .sl-items-table tbody td {
        color: #ffffff !important;
        border-bottom-color: #b91c1c;
      }

      .sl-page.sl-credit-mode .sl-items-table td.muted,
      .sl-page.sl-credit-mode .sl-items-table .muted {
        color: #fecaca !important;
      }

      .sl-page.sl-credit-mode .sl-items-table tr.sl-sel-row td {
        background-color: #b91c1c !important;
        box-shadow: inset 0 0 0 2px #fef08a;
      }

      .sl-page.sl-credit-mode .sl-items-table tbody tr:hover td {
        background-color: #ef4444 !important;
        cursor: pointer;
      }

      .sl-page.sl-credit-mode .sl-items-table .sl-empty-row td {
        background-color: transparent;
      }

      .sl-page.sl-credit-mode .sl-items-table .xp-empty {
        color: #fef08a !important;
        background-color: transparent;
      }

      .sl-page.sl-credit-mode .sl-items-table td[style*="color: var(--xp-blue-dark)"] {
        color: #fef08a !important;
        font-weight: bold;
      }

      .sl-page.sl-credit-mode .sl-hold-panel {
        background-color: rgba(0, 0, 0, 0.1);
        border-color: #991b1b;
      }

      .sl-page.sl-credit-mode .sl-hold-table thead th {
        background-color: #991b1b;
        color: #ffffff;
      }

      .sl-page.sl-credit-mode .sl-hold-table tbody td {
        color: #ffffff;
      }

      .sl-page.sl-credit-mode .sl-hold-table td.muted {
        color: #fecaca;
      }

      .sl-page.sl-credit-mode .sl-hold-title {
        background-color: #991b1b;
        color: #ffffff;
      }

      .sl-page.sl-credit-mode .sl-summary-bar {
        background-color: rgba(0, 0, 0, 0.15);
        border-radius: 6px;
      }

      .sl-page.sl-credit-mode .sl-customer-bar {
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 6px;
      }

      .sl-page.sl-credit-mode input,
      .sl-page.sl-credit-mode .xp-input,
      .sl-page.sl-credit-mode .sl-product-input,
      .sl-page.sl-credit-mode .sl-num-input,
      .sl-page.sl-credit-mode .sl-sum-input,
      .sl-page.sl-credit-mode .sl-cust-input {
        background-color: #fffde7 !important;
        color: #1f2937 !important;
        border-color: #9ca3af;
      }

      .sl-page.sl-credit-mode input:read-only,
      .sl-page.sl-credit-mode .sl-sum-val {
        background-color: #fef3c7 !important;
        color: #1f2937 !important;
      }

      .sl-page.sl-credit-mode .sl-sum-val.sl-bal.danger {
        color: #fef08a !important;
        font-weight: bold;
        text-shadow: 0 0 2px rgba(0,0,0,0.3);
      }

      .sl-page.sl-credit-mode .sl-items-wrap::-webkit-scrollbar-track {
        background: #991b1b;
      }

      .sl-page.sl-credit-mode .sl-hold-table {
        background: #991b1b;
      }

      .sl-page.sl-credit-mode .sl-items-wrap::-webkit-scrollbar-thumb {
        background: #fecaca;
        border-radius: 4px;
      }

      .sl-page.sl-credit-mode .sl-items-wrap::-webkit-scrollbar-thumb:hover {
        background: #ffffff;
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
        /* Always Visible Clean Design */
.sl-inv-nav-container {
  position: relative;
  display: inline-block;
}

.sl-inv-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #64748b;
  transition: all 0.2s ease;
  z-index: 2;
}

.sl-inv-nav-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
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
  padding: 6px 36px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
}

.sl-inv-input-large:focus {
  border-color: #3b82f6 !important;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
      `}</style>
    </>
  );
}