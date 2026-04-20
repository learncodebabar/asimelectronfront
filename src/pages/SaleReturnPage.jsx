// pages/SaleReturnPage.jsx
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
const HOLD_KEY = "asim_return_hold_v1";

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


const TYPE_COLORS = {
  credit: { bg: "#fca5a5", color: "#7f1d1d", border: "#ef4444" },
  cash: { bg: "#86efac", color: "#14532d", border: "#22c55e" },
  debit: { bg: "#93c5fd", color: "#1e3a8a", border: "#3b82f6" },
  "raw-sale": { bg: "#fde68a", color: "#78350f", border: "#f59e0b" },
  "raw-purchase": { bg: "#d8b4fe", color: "#3b0764", border: "#a855f7" },
};

/* ── localStorage ── */
const loadHolds = () => {
  try {
    return JSON.parse(localStorage.getItem(HOLD_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveHolds = (b) => {
  try {
    localStorage.setItem(HOLD_KEY, JSON.stringify(b));
  } catch {}
};

/* ══════════════════════════════════════════════════════════
   PRINT BUILDER
══════════════════════════════════════════════════════════ */
const buildPrintHtml = (ret, type) => {
  const rows = ret.items.map((it, i) => ({ ...it, sr: i + 1 }));
  const totalQty = rows.reduce((s, r) => s + (r.pcs || 0), 0);

  const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
  const GOOGLE_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">`;

  if (type === "Thermal") {
    const itemRows = rows
      .map(
        (it) =>
          `<tr>
            <td style="text-align:center">${it.sr}</td>
            <td style="max-width:92px;word-break:break-word">${it.name}${it.uom ? ` (${it.uom})` : ""}</td>
            <td class="r">${it.pcs}</td>
            <td class="r">${Number(it.rate).toLocaleString()}</td>
            <td class="r"><b>${Number(it.amount).toLocaleString()}</b></td>
          </tr>`,
      )
      .join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
      *{box-sizing:border-box}
      body{font-family:'Courier New',Courier,monospace;font-size:10.5px;width:80mm;margin:0 auto;padding:3mm;color:#000}
      .urdu{font-family:${URDU_FONT};direction:rtl;text-align:center}
      .sn{text-align:center;font-size:16px;font-weight:bold;margin-bottom:1px;font-family:${URDU_FONT};direction:rtl}
      .ss{text-align:center;font-size:9px;color:#555;margin-bottom:1px;font-family:${URDU_FONT};direction:rtl}
      .badge{display:block;text-align:center;font-size:9px;border:2px solid #c00;padding:1px 0;margin:3px 0;letter-spacing:2px;font-weight:bold;color:#c00}
      .dash{border:none;border-top:1px dashed #666;margin:3px 0}
      .solid{border:none;border-top:2px solid #111;margin:3px 0}
      table{width:100%;border-collapse:collapse}
      th{border-bottom:1px solid #555;padding:2px;font-size:9px;font-weight:bold;text-align:left}
      td{padding:2px;font-size:9.5px;vertical-align:top}
      .r{text-align:right}
      .row{display:flex;justify-content:space-between;padding:1.5px 0;font-size:10.5px}
      .row.b{font-weight:bold;font-size:12px}
      .row.sep{border-top:1px dashed #555;margin-top:2px;padding-top:3px}
      .red{color:#b00}.green{color:#060}
      .foot{text-align:center;font-size:9px;color:#666;margin-top:5px;border-top:1px dashed #aaa;padding-top:4px}
      @media print{@page{size:80mm auto;margin:2mm}body{width:76mm}}
    </style></head><body>
      <div class="sn">${SHOP_INFO.name}</div>
      <div class="ss">${SHOP_INFO.address}</div>
      <div class="ss">${SHOP_INFO.phone1} | ${SHOP_INFO.phone2}</div>
      <span class="badge">SALE RETURN</span>
      <hr class="dash">
      <div class="row" style="font-size:9.5px"><span>Return #: <b>${ret.returnNo}</b></span><span>${ret.returnDate}</span></div>
      ${ret.saleInvNo ? `<div style="font-size:9px;color:#666">Ref Sale: ${ret.saleInvNo}</div>` : ""}
      <div style="font-size:10.5px;font-weight:bold">${ret.customerName}</div>
      <hr class="solid">
      <tr>
        <thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amt</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <hr class="dash">
      <div class="row b sep"><span>RETURN TOTAL</span><span>PKR ${Number(ret.netTotal).toLocaleString()}</span></div>
      <div class="row green"><span>Refunded</span><span>PKR ${Number(ret.paidAmount).toLocaleString()}</span></div>
      <div class="foot">Items: ${rows.length} | Qty: ${totalQty}<br>Thank you — ${SHOP_INFO.name}</div>
    </body></html>`;
  }

  const a5 = type === "A5";
  const sz = a5
    ? { title: 14, sub: 8.5, inv: 12, meta: 8, th: 8, td: 8, tot: 9, totB: 10.5 }
    : { title: 17, sub: 9.5, inv: 14, meta: 9, th: 9, td: 9, tot: 10, totB: 13 };

  const itemRows = rows
    .map(
      (it, i) =>
        `<tr style="background:${i % 2 === 0 ? "#fff" : "#fff5f5"}">
          <td style="text-align:center">${it.sr}</td>
          <td><strong>${it.name}</strong></td>
          <td>${it.uom || "—"}</td>
          <td align="right">${it.pcs}</td>
          <td align="right">${Number(it.rate).toLocaleString()}</td>
          <td align="right"><strong>${Number(it.amount).toLocaleString()}</strong></td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${sz.td}pt;color:#111;background:#fff;padding:${a5 ? "5mm" : "8mm"}}
    .urdu{font-family:${URDU_FONT};direction:rtl;text-align:center}
    .shop-urdu{font-size:${a5 ? "20px" : "26px"};font-weight:900;font-family:${URDU_FONT};direction:rtl;text-align:center;line-height:2}
    .shop-addr{font-size:${sz.sub}pt;color:#444;text-align:center;font-family:${URDU_FONT};direction:rtl;margin:2px 0;line-height:1.8}
    .shop-phones{font-size:${sz.sub}pt;font-weight:bold;text-align:center;margin-bottom:2px}
    .banner{background:#555;color:#fff;font-size:${a5 ? "7.5" : "8.5"}pt;text-align:center;padding:${a5 ? "2px 6px" : "3px 8px"};margin:${a5 ? "3px 0" : "4px 0"};font-family:${URDU_FONT};direction:rtl;line-height:2}
    .hdr{text-align:center;border-bottom:2px solid #c0392b;padding-bottom:${a5 ? "5px" : "8px"};margin-bottom:4px}
    .meta-strip{display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #ccc;padding:${a5 ? "4px 8px" : "5px 10px"};margin:${a5 ? "4px 0" : "5px 0"};font-size:${sz.meta}pt}
    .meta-left{flex:2}.meta-mid{flex:0.5;text-align:center;font-size:${a5 ? "18px" : "22px"};font-weight:900;color:#555}.meta-right{flex:2;text-align:right}
    .meta-row{margin-bottom:1px}.meta-lbl{color:#555}.meta-val{font-weight:700}
    table{width:100%;border-collapse:collapse;margin:${a5 ? "4px 0" : "5px 0"}}
    thead tr{background:#c0392b;color:#fff}
    th{padding:${a5 ? "3px 5px" : "5px 7px"};font-size:${sz.th}pt;font-weight:600;text-align:left}
    td{padding:${a5 ? "2px 5px" : "3px 7px"};font-size:${sz.td}pt;border-bottom:1px solid #fde8e8}
    tbody tr:last-child td{border-bottom:2px solid #fca5a5}
    .footer-wrap{display:flex;justify-content:space-between;align-items:flex-start;margin-top:${a5 ? "6px" : "10px"};gap:10px}
    .footer-left{flex:1.5}.footer-right{flex:1;border:1px solid #fca5a5;padding:${a5 ? "4px 8px" : "5px 10px"}}
    .footer-stat{font-size:${sz.meta}pt;font-weight:bold;margin-bottom:4px}
    .terms-box{font-family:${URDU_FONT};direction:rtl;font-size:${a5 ? "8" : "9"}pt;color:#444;border:1px dashed #aaa;padding:${a5 ? "3px 6px" : "5px 8px"};margin:${a5 ? "4px 0" : "5px 0"};line-height:2;text-align:right}
    .sig-line{font-size:${sz.sub}pt;margin-top:${a5 ? "8px" : "14px"};border-top:1px solid #999;display:inline-block;padding-top:2px;min-width:120px}
    .sum-row{display:flex;justify-content:space-between;font-size:${sz.tot}pt;padding:${a5 ? "3px 0" : "4px 0"};border-bottom:1px solid #eee}
    .sum-row.bold{font-weight:700;font-size:${sz.totB}pt;background:#fff5f5;padding:${a5 ? "3px 4px" : "4px 6px"}}
    .sum-row.sep{border-top:2px solid #c0392b;margin-top:2px}
    .red{color:#c0392b}.green{color:#1a7a1a}
    .devby{text-align:center;font-size:${a5 ? "7" : "8"}pt;color:#888;margin-top:${a5 ? "6px" : "10px"};border-top:1px solid #ddd;padding-top:${a5 ? "4px" : "6px"}}
    .page{margin-bottom:0}
    @media print{
      @page{size:${a5 ? "A5" : "A4"};margin:${a5 ? "4mm" : "8mm"}}
      body{padding:0}
    }
  </style></head><body>
    <div class="hdr">
      <div class="shop-urdu">${SHOP_INFO.name}</div>
      <div class="shop-addr">${SHOP_INFO.address}</div>
      <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
    </div>
    <div class="banner">${SHOP_INFO.urduBanner}</div>
    <div class="meta-strip">
      <div class="meta-left">
        <div class="meta-row"><span class="meta-lbl">Customer:</span> <span class="meta-val">${ret.customerName}</span></div>
        ${ret.saleInvNo ? `<div class="meta-row"><span class="meta-lbl">Ref Sale:</span> <span class="meta-val">${ret.saleInvNo}</span></div>` : ""}
      </div>
      <div class="meta-mid"><span class="meta-val">${rows.length}</span></div>
      <div class="meta-right">
        <div class="meta-row"><span class="meta-lbl">Return #:</span> <span class="meta-val">${ret.returnNo}</span></div>
        <div class="meta-row"><span class="meta-lbl">Date:</span> <span class="meta-val">${ret.returnDate}</span></div>
      </div>
    </div>
    <table>
      <thead><tr><th style="width:28px;text-align:center">Sr.#</th><th>Product</th><th style="width:50px">Unit</th><th style="width:42px;text-align:right">Qty</th><th style="width:70px;text-align:right">Rate</th><th style="width:80px;text-align:right">Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="footer-wrap">
      <div class="footer-left">
        <div class="footer-stat">Total Items: <b>${rows.length}</b></div>
        <div class="footer-stat">Total Quantity: <b>${totalQty}</b></div>
        <div class="terms-box">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
        <div class="sig-line">Signature</div>
      </div>
      <div class="footer-right">
        <div class="sum-row bold red"><span>Return Total</span><span>PKR ${Number(ret.netTotal).toLocaleString()}</span></div>
        <div class="sum-row green"><span>Refunded</span><span>PKR ${Number(ret.paidAmount).toLocaleString()}</span></div>
        <div class="sum-row bold sep ${ret.balance > 0 ? "red" : "green"}"><span>Balance</span><span>PKR ${Number(ret.balance).toLocaleString()}</span></div>
      </div>
    </div>
    <div class="devby">${SHOP_INFO.devBy}</div>
  </body></html>`;
};

const doPrint = (ret, type) => {
  const w = window.open("", "_blank", type === "Thermal" ? "width=420,height=640" : "width=900,height=700");
  w.document.write(buildPrintHtml(ret, type));
  w.document.close();
  setTimeout(() => w.print(), 400);
};

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
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: "95%", maxWidth: "1400px", height: "85vh", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: "12px", background: "#ffffff", border: "2px solid #000000" }}>
        <div className="xp-modal-tb" style={{ background: "#c0392b", padding: "10px 16px", borderRadius: "10px 10px 0 0" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>Search Products</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        <div className="cs-modal-filters" style={{ padding: "8px 12px", gap: "10px", background: "#f8fafc", borderBottom: "1px solid #000000", flexWrap: "wrap" }}>
          <div className="cs-modal-filter-grp" style={{ flex: 2, minWidth: "200px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Description / Code</label>
            <input ref={rDesc} type="text" className="xp-input" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => fk(e, rCat)} autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Category</label>
            <input ref={rCat} type="text" className="xp-input" value={cat} onChange={(e) => setCat(e.target.value)} onKeyDown={(e) => fk(e, rCompany)} autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Company</label>
            <input ref={rCompany} type="text" className="xp-input" value={company} onChange={(e) => setCompany(e.target.value)} onKeyDown={(e) => fk(e, null)} autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
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
                <thead><tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ width: 40, padding: "5px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>#</th>
                  <th style={{ width: 90, padding: "5px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Barcode</th>
                  <th style={{ padding: "5px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000" }}>Product Name</th>
                  <th style={{ width: 60, padding: "5px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Meas.</th>
                  <th style={{ width: 85, padding: "5px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Rate</th>
                  <th style={{ width: 65, padding: "5px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Stock</th>
                  <th style={{ width: 55, padding: "5px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Pack</th>
                  <th style={{ width: 65, padding: "5px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Rack#</th>
                </tr></thead>
                <tbody ref={tbodyRef} tabIndex={0} onKeyDown={tk}>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>No products found</td>
                    </tr>
                  )}
                  {rows.map((r, i) => (
                    <tr key={`${r._id}-${r._pi}`} style={{ background: i === hiIdx ? "#e5f0ff" : "white", cursor: "pointer" }} onClick={() => setHiIdx(i)} onDoubleClick={() => onSelect(r)}>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.code}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000" }}>
                        <button className="xp-link-btn" style={{ color: "#000000", textDecoration: "none", fontWeight: "bold", fontSize: "13px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: "0" }}>{r._name}</button>
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r._meas}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{Number(r._rate).toLocaleString("en-PK")}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r._stock}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r._pack}</td>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.rackNo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="cs-modal-hint" style={{ padding: "6px 12px", fontSize: "10px", color: "#000000", fontWeight: "bold", borderTop: "1px solid #000000", background: "#f8fafc", borderRadius: "0 0 10px 10px" }}>
          <span>↑↓ navigate</span> &nbsp;|&nbsp; <span>Enter / Double-click = select</span> &nbsp;|&nbsp; <span>Esc = close</span> &nbsp;|&nbsp; <span>Tab = filters</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SALE INVOICE SEARCH MODAL
══════════════════════════════════════════════════════════ */
function SearchSaleModal({ onSelect, onClose }) {
  const [searchId, setSearchId] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiIdx, setHiIdx] = useState(0);
  const listRef = useRef(null);
  const searchIdRef = useRef(null);

  const cleanInvoiceNo = (invNo) => {
    if (!invNo) return "";
    let cleaned = String(invNo);
    cleaned = cleaned.replace(/^INV-/i, '');
    cleaned = cleaned.replace(/^0+/, '');
    return cleaned;
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.SALES.GET_ALL);
      if (response.data.success) {
        let sales = response.data.data;
        if (Array.isArray(sales)) {
          if (searchId) {
            const searchIdLower = searchId.toLowerCase();
            sales = sales.filter(sale => {
              const cleanedNo = cleanInvoiceNo(sale.invoiceNo);
              return cleanedNo.toLowerCase().includes(searchIdLower) || 
                     String(sale.invoiceNo || "").toLowerCase().includes(searchIdLower);
            });
          }
          if (searchPhone) {
            const searchPhoneClean = searchPhone.replace(/\D/g, '');
            sales = sales.filter(sale => {
              const customerPhone = sale.customerPhone || sale.customer?.phone || "";
              const phoneClean = customerPhone.replace(/\D/g, '');
              return phoneClean.includes(searchPhoneClean);
            });
          }
          sales = sales.filter((sale) => sale.saleType === "sale" || sale.type === "sale" || (!sale.saleType && !sale.type));
        }
        setInvoices(sales);
        setHiIdx(sales.length > 0 ? 0 : -1);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [searchId, searchPhone]);

  useEffect(() => {
    setTimeout(() => searchIdRef.current?.focus(), 50);
  }, []);

  const handleListKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHiIdx((prev) => Math.min(prev + 1, invoices.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHiIdx((prev) => Math.max(prev - 1, 0));
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
      <div className="xp-modal" style={{ width: "95%", maxWidth: "1200px", height: "80vh", maxHeight: "80vh", display: "flex", flexDirection: "column", borderRadius: "12px", background: "#ffffff", border: "2px solid #000000" }}>
        <div className="xp-modal-tb" style={{ background: "#c0392b", padding: "10px 16px", borderRadius: "10px 10px 0 0" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>Search Sale Invoice</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        <div className="cs-modal-filters" style={{ padding: "12px 16px", gap: "12px", background: "#f8fafc", borderBottom: "1px solid #000000", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, width: "100%", marginBottom: 12, flexWrap: "wrap" }}>
            <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "200px" }}>
              <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Invoice #</label>
              <input ref={searchIdRef} type="text" className="xp-input" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Invoice number..." autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
            </div>
            <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "200px" }}>
              <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Customer Phone</label>
              <input type="tel" className="xp-input" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} placeholder="Phone number..." autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="xp-btn xp-btn-sm" onClick={clearFilters} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold" }}>Clear Filters</button>
              <button className="xp-btn xp-btn-sm" onClick={fetchInvoices} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold" }}>Search</button>
              <span style={{ fontSize: "11px", color: "#000000", fontWeight: "bold", alignSelf: "center" }}>{invoices.length} invoice(s) found</span>
            </div>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold" }}>Close</button>
          </div>
        </div>
        <div className="xp-modal-body" style={{ padding: 0, flex: 1, overflow: "hidden" }}>
          <div className="xp-table-panel" style={{ border: "none", height: "100%" }}>
            <div className="xp-table-scroll" style={{ height: "100%", overflow: "auto" }}>
              <table className="xp-table" style={{ fontSize: "12px", borderCollapse: "collapse", width: "100%", border: "1px solid #000000" }}>
                <thead><tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ width: 40, padding: "8px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>#</th>
                  <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Invoice #</th>
                  <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Date</th>
                  <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Customer Name</th>
                  <th style={{ padding: "8px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Phone</th>
                  <th style={{ width: 100, padding: "8px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Total Amount</th>
                  <th style={{ width: 60, padding: "8px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Items</th>
                </tr></thead>
                <tbody ref={listRef} tabIndex={0} onKeyDown={handleListKeyDown}>
                  {loading && (
                    <tr>
                      <td colSpan={7} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>Loading...</td>
                    </tr>
                  )}
                  {!loading && invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>No sale invoices found.</td>
                    </tr>
                  )}
                  {invoices.map((inv, i) => (
                    <tr key={inv._id} style={{ background: i === hiIdx ? "#e5f0ff" : "white", cursor: "pointer" }} onClick={() => setHiIdx(i)} onDoubleClick={() => onSelect(inv)}>
                      <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", fontFamily: "monospace" }}>
                        {cleanInvoiceNo(inv.invoiceNo) || "N/A"}
                      </td>
                      <td style={{ padding: "6px 4px", border: "1px solid #000000", fontSize: "11px", color: "#000000" }}>{inv.invoiceDate?.split("T")[0] || "-"}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000" }}>{inv.customerName || inv.customer?.name || "COUNTER SALE"}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #000000", fontSize: "11px", color: "#000000" }}>{inv.customerPhone || inv.customer?.phone || "-"}</td>
                      <td style={{ padding: "6px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#c0392b" }}>{Number(inv.netTotal || inv.total || 0).toLocaleString("en-PK")}</td>
                      <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{inv.items?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: "1px solid #000000", background: "#f8fafc", borderRadius: "0 0 10px 10px" }}>
          <div className="cs-modal-hint" style={{ margin: 0, fontSize: "10px", fontWeight: "bold", color: "#000000" }}>⬆⬇ = navigate results &nbsp;|&nbsp; Enter = select invoice &nbsp;|&nbsp; Esc = close</div>
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
      <div className="xp-modal" style={{ width: 560, border: "2px solid #000000" }}>
        <div className="xp-modal-tb" style={{ background: "#c0392b" }}>
          <span className="xp-modal-title" style={{ fontSize: "14px", fontWeight: "bold", color: "#ffffff" }}>Hold Return — {bill.returnNo}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff" }}>✕</button>
        </div>
        <div className="xp-modal-body" style={{ padding: 8 }}>
          <div style={{ marginBottom: 6, display: "flex", gap: 16, fontSize: "12px" }}>
            <span><b>Customer:</b> {bill.buyerName}</span>
            <span><b>Items:</b> {bill.items.length}</span>
            <span><b>Amount:</b> <span style={{ color: "#dc2626", fontWeight: 700 }}>{Number(bill.amount).toLocaleString("en-PK")}</span></span>
          </div>
          <div className="xp-table-panel" style={{ border: "none" }}>
            <div className="xp-table-scroll" style={{ maxHeight: 300 }}>
              <table className="xp-table" style={{ border: "1px solid #000000", width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "6px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>#</th>
                  <th style={{ padding: "6px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Code</th>
                  <th style={{ padding: "6px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Name</th>
                  <th style={{ padding: "6px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>UOM</th>
                  <th style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Pcs</th>
                  <th style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Rate</th>
                  <th style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Amount</th>
                </tr></thead>
                <tbody>
                  {bill.items.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: "5px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "5px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.code}</td>
                      <td style={{ padding: "5px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.name}</td>
                      <td style={{ padding: "5px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.uom}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.pcs}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{Number(r.rate).toLocaleString("en-PK")}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#dc2626" }}>{Number(r.amount).toLocaleString("en-PK")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderTop: "1px solid #000000", justifyContent: "flex-end", background: "#f8fafc" }}>
          <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", fontWeight: "bold" }}>Cancel</button>
          <button className="xp-btn xp-btn-sm" style={{ background: "#c0392b", color: "white", border: "1px solid #000000", fontWeight: "bold" }} onClick={() => onResume(bill.id)}>Resume This Return</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CUSTOMER DROPDOWN
══════════════════════════════════════════════════════════ */
function CustomerDropdown({ allCustomers, value, displayName, customerType, onSelect, onClear }) {
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
    return t === "credit" && c.name?.toUpperCase().trim() !== "COUNTER SALE";
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
    if (!isNavigating && matches.length > 0 && matches[0].name) {
      const remaining = matches[0].name.slice(originalQuery.length);
      setGhost(remaining);
    } else { setGhost(""); }
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
      if (selectedCustomer) { setQuery(selectedCustomer.name); setGhost(""); }
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
      if (selectedCustomer) { setQuery(selectedCustomer.name); setGhost(""); }
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

  const typeStyle = customerType && TYPE_COLORS[customerType] ? { background: TYPE_COLORS[customerType].bg, color: TYPE_COLORS[customerType].color, border: `1px solid ${TYPE_COLORS[customerType].border}` } : null;

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, position: "relative" }}>
        {typeStyle && <span className="cdd-type-badge" style={typeStyle}>{customerType}</span>}
        <div ref={parentRef} style={{ position: "relative", flex: 1, background: isFocused ? "#fffde7" : "transparent", borderRadius: "4px", transition: "background 0.15s ease" }}>
          {ghost && !isNavigating && (
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", whiteSpace: "nowrap", fontSize: "13px", fontFamily: "inherit", display: "flex", zIndex: 2, color: "#a0aec0", opacity: 1, backgroundColor: "transparent", paddingLeft: "4px" }}>
              <span style={{ visibility: "hidden", opacity: 1 }}>{originalQuery}</span>
              <span style={{ opacity: 1, color: "#a0aec0" }}>{ghost}</span>
            </div>
          )}
          <input ref={inputRef} className="sr-cust-input cdd-input" style={{ flex: 1, minWidth: 0, cursor: "text", background: "transparent", position: "relative", zIndex: 1, width: "100%", border: "none", outline: "none", padding: "4px" }} value={value ? query || displayName : query} onChange={handleChange} onKeyDown={handleKeyDown} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} autoComplete="off" spellCheck={false} />
        </div>
        {value && (
          <button className="xp-btn xp-btn-sm xp-btn-danger" style={{ height: 22, padding: "0 5px", fontSize: 10, flexShrink: 0 }} onMouseDown={(e) => { e.preventDefault(); onClear(); setQuery(""); setOriginalQuery(""); setGhost(""); setSuggestions([]); setSelectedSuggestionIndex(-1); setShowDropdown(false); setIsNavigating(false); inputRef.current?.focus(); }} title="Clear">✕</button>
        )}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", border: "1px solid #000000", borderRadius: 4, maxHeight: 200, overflowY: "auto", zIndex: 1000, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginTop: 2 }}>
          {suggestions.map((customer, idx) => (
            <div key={customer._id} onClick={() => selectCustomer(customer)} style={{ padding: "8px 12px", cursor: "pointer", backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white", borderBottom: "1px solid #000000", fontSize: 13 }} onMouseEnter={() => { setSelectedSuggestionIndex(idx); setIsNavigating(true); setQuery(customer.name); setGhost(""); }}>
              <div style={{ fontWeight: "bold", marginBottom: 2, color: "#000000" }}>{customer.name}</div>
              {customer.phone && <div style={{ fontSize: 10, color: "#6b7280" }}>📞 {customer.phone}</div>}
              {customer.currentBalance > 0 && <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>Balance: PKR {customer.currentBalance.toLocaleString("en-PK")}</div>}
            </div>
          ))}
        </div>
      )}
      {originalQuery && suggestions.length === 0 && <div style={{ position: "absolute", top: "100%", left: 0, fontSize: 10, color: "#9ca3af", marginTop: 2, padding: "4px 8px" }}>No customer found matching "{originalQuery}"</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE — SALE RETURN (RESPONSIVE)
══════════════════════════════════════════════════════════ */
export default function SaleReturnPage() {
  const [time, setTime] = useState(timeNow());
  const [allProducts, setAllProducts] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHoldPreview, setShowHoldPreview] = useState(null);
  const [showSaleSearchModal, setShowSaleSearchModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [curRow, setCurRow] = useState({ ...EMPTY_ROW });
  const [items, setItems] = useState([]);
  const [returnDate, setReturnDate] = useState(isoDate());
  const [returnNo, setReturnNo] = useState("1");
  const [saleInvNo, setSaleInvNo] = useState("");
  const [allSaleInvoices, setAllSaleInvoices] = useState([]);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(-1);

  const [customerId, setCustomerId] = useState("");
  const [buyerName, setBuyerName] = useState("COUNTER SALE");
  const [buyerCode, setBuyerCode] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [prevBalance, setPrevBalance] = useState(0);

  const [paid, setPaid] = useState(0);
  const [holdBills, setHoldBills] = useState(() => loadHolds());
  const [editId, setEditId] = useState(null);
  const [selItemIdx, setSelItemIdx] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [printType, setPrintType] = useState("A5");
  const [sendSms, setSendSms] = useState(false);
  const [packingOptions, setPackingOptions] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [creditCustomerSelected, setCreditCustomerSelected] = useState(false);

  const searchRef = useRef(null);
  const pcsRef = useRef(null);
  const rateRef = useRef(null);
  const addRef = useRef(null);
  const saveRef = useRef(null);
  const saleInvRef = useRef(null);
  const packingRef = useRef(null);
  const remarksRef = useRef(null);
  const paidRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);
  
  useEffect(() => {
    fetchData();
    fetchAllSaleInvoices();
  }, []);
  
  useEffect(() => {
    saveHolds(holdBills);
  }, [holdBills]);

  const subTotal = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const balance = subTotal - (parseFloat(paid) || 0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, salesRes] = await Promise.all([
        api.get(EP.PRODUCTS.GET_ALL),
        api.get(EP.CUSTOMERS.GET_ALL),
        api.get(EP.SALES.GET_ALL),
      ]);
      if (pRes.data.success) setAllProducts(pRes.data.data);
      if (cRes.data.success) setAllCustomers(cRes.data.data);
      
      let maxNum = 0;
      if (salesRes.data.success && salesRes.data.data && salesRes.data.data.length > 0) {
        salesRes.data.data.forEach(sale => {
          if (sale.saleType === "return" || sale.type === "return") {
            let num = sale.returnNo || sale.invoiceNo;
            if (typeof num === 'string') {
              num = num.replace(/^RTN-/i, '');
              num = num.replace(/^0+/, '');
            }
            num = parseInt(num, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        });
        setReturnNo(String(maxNum + 1));
      } else {
        setReturnNo("1");
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      showMsg("Failed to load data", "error");
    }
    setLoading(false);
  };

  const refreshReturnNo = async () => {
    try {
      const salesRes = await api.get(EP.SALES.GET_ALL);
      let maxNum = 0;
      if (salesRes.data.success && salesRes.data.data && salesRes.data.data.length > 0) {
        salesRes.data.data.forEach(sale => {
          if (sale.saleType === "return" || sale.type === "return") {
            let num = sale.returnNo || sale.invoiceNo;
            if (typeof num === 'string') {
              num = num.replace(/^RTN-/i, '');
              num = num.replace(/^0+/, '');
            }
            num = parseInt(num, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        });
        setReturnNo(String(maxNum + 1));
      } else {
        setReturnNo("1");
      }
    } catch (error) {
      console.error("Failed to refresh return number:", error);
      const current = parseInt(returnNo, 10) || 0;
      setReturnNo(String(current + 1));
    }
  };

  const fetchAllSaleInvoices = async () => {
    try {
      const response = await api.get(EP.SALES.GET_ALL);
      if (response.data.success) {
        let sales = response.data.data;
        if (Array.isArray(sales)) {
          sales = sales.filter((sale) => sale.saleType === "sale" || sale.type === "sale" || (!sale.saleType && !sale.type));
        }
        setAllSaleInvoices(sales);
      }
    } catch (error) {
      console.error("Failed to fetch sale invoices:", error);
    }
  };

  const loadSaleByInv = async (saleData = null) => {
    if (saleData) {
      try {
        if (saleData.customerId) {
          setCustomerId(saleData.customerId._id || saleData.customerId);
          setBuyerName(saleData.customerName || "COUNTER SALE");
          setPrevBalance(saleData.prevBalance || 0);
        }
        const loadedItems = (saleData.items || []).map((it) => ({
          productId: it.productId || it._id || "",
          code: it.code || "",
          name: it.description || it.name || "",
          uom: it.measurement || it.uom || "",
          rack: it.rack || "",
          pcs: it.qty || it.pcs || 1,
          rate: it.rate || 0,
          amount: it.amount || 0,
        }));
        setItems(loadedItems);
        setSaleInvNo(saleData.invoiceNo || "");
        if (saleData.invoiceDate) { setReturnDate(saleData.invoiceDate.split("T")[0]); }
        const index = allSaleInvoices.findIndex(inv => String(inv.invoiceNo) === String(saleData.invoiceNo));
        setCurrentInvoiceIndex(index);
        showMsg(`Loaded ${loadedItems.length} items from ${saleData.invoiceNo}`, "success");
        setShowSaleSearchModal(false);
        setTimeout(() => searchRef.current?.focus(), 50);
      } catch (error) {
        showMsg("Failed to load sale invoice", "error");
      }
      return;
    }
    if (!saleInvNo.trim()) {
      setShowSaleSearchModal(true);
      return;
    }
    try {
      const r = await api.get(EP.SALES.GET_ALL);
      if (r.data.success && r.data.data) {
        const sale = r.data.data.find(s => String(s.invoiceNo) === String(saleInvNo.trim()));
        if (!sale) { showMsg("Invoice not found", "error"); return; }
        if (sale.customerId) {
          setCustomerId(sale.customerId._id || sale.customerId);
          setBuyerName(sale.customerName || "COUNTER SALE");
          setPrevBalance(sale.prevBalance || 0);
        }
        const loadedItems = (sale.items || []).map((it) => ({
          productId: it.productId || it._id || "",
          code: it.code || "",
          name: it.description || it.name || "",
          uom: it.measurement || it.uom || "",
          rack: it.rack || "",
          pcs: it.qty || it.pcs || 1,
          rate: it.rate || 0,
          amount: it.amount || 0,
        }));
        setItems(loadedItems);
        if (sale.invoiceDate) { setReturnDate(sale.invoiceDate.split("T")[0]); }
        showMsg(`Loaded ${loadedItems.length} items from ${saleInvNo}`, "success");
        const index = allSaleInvoices.findIndex(inv => String(inv.invoiceNo) === String(saleInvNo.trim()));
        setCurrentInvoiceIndex(index);
        setTimeout(() => searchRef.current?.focus(), 50);
      } else { showMsg("Invoice not found", "error"); }
    } catch { showMsg("Could not load sale invoice", "error"); }
  };

  const loadNextInvoice = () => {
    if (currentInvoiceIndex < allSaleInvoices.length - 1) {
      const nextInvoice = allSaleInvoices[currentInvoiceIndex + 1];
      loadSaleByInv(nextInvoice);
    } else { showMsg("No more invoices", "info"); }
  };

  const loadPrevInvoice = () => {
    if (currentInvoiceIndex > 0) {
      const prevInvoice = allSaleInvoices[currentInvoiceIndex - 1];
      loadSaleByInv(prevInvoice);
    } else { showMsg("No previous invoices", "info"); }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3500);
  };

  const handleCustomerSelect = (c) => {
    setCustomerId(c._id);
    setBuyerName(c.name);
    setBuyerCode(c.code || "");
    const custType = c.customerType || c.type || "";
    setCustomerType(custType);
    setPrevBalance(c.currentBalance || 0);
    if (custType === "credit") {
      setCreditCustomerSelected(true);
      setShowRemarksInput(true);
      setRemarks("");
      setTimeout(() => remarksRef.current?.focus(), 100);
    } else {
      setCreditCustomerSelected(false);
      setShowRemarksInput(false);
      setRemarks("");
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  };

  const handleCustomerClear = () => {
    setCustomerId("");
    setBuyerName("COUNTER SALE");
    setBuyerCode("");
    setCustomerType("");
    setPrevBalance(0);
    setCreditCustomerSelected(false);
    setShowRemarksInput(false);
    setRemarks("");
  };

  const pickProduct = (product) => {
    if (!product._id) { showMsg("Product ID missing", "error"); return; }
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
    setSearchText(product._name || product.description || "");
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
    if (!curRow.name) return;
    if (!curRow.productId) { showMsg("Please select a valid product", "error"); return; }
    if (parseFloat(curRow.pcs) <= 0) { showMsg("Qty must be > 0", "error"); return; }
    if (selItemIdx !== null) {
      setItems((p) => { const u = [...p]; u[selItemIdx] = { ...curRow }; return u; });
      setSelItemIdx(null);
    } else setItems((p) => [...p, { ...curRow }]);
    resetCurRow();
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
    } else { setPackingOptions([]); }
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
    setHoldBills((p) => [...p, {
      id: Date.now(),
      returnNo,
      amount: subTotal,
      items: [...items],
      customerId,
      buyerName,
      buyerCode,
      customerType,
      prevBalance,
      saleInvNo,
      remarks,
    }]);
    fullReset();
    refreshReturnNo();
  };

  const resumeHold = (holdId) => {
    const bill = holdBills.find((b) => b.id === holdId);
    if (!bill) return;
    setItems(bill.items);
    setCustomerId(bill.customerId || "");
    setBuyerName(bill.buyerName || "COUNTER SALE");
    setBuyerCode(bill.buyerCode || "");
    setCustomerType(bill.customerType || "");
    setPrevBalance(bill.prevBalance || 0);
    setSaleInvNo(bill.saleInvNo || "");
    setRemarks(bill.remarks || "");
    if (bill.customerType === "credit") {
      setCreditCustomerSelected(true);
      setShowRemarksInput(true);
    }
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
    setCustomerId("");
    setBuyerName("COUNTER SALE");
    setBuyerCode("");
    setCustomerType("");
    setPrevBalance(0);
    setPaid(0);
    setSaleInvNo("");
    setEditId(null);
    setSelItemIdx(null);
    setCurrentInvoiceIndex(-1);
    setMsg({ text: "", type: "" });
    setRemarks("");
    setCreditCustomerSelected(false);
    setShowRemarksInput(false);
    setReturnDate(isoDate());
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const saveAndPrintDirect = async () => {
    if (!items.length) { alert("Add at least one item"); return; }
    if (creditCustomerSelected && !remarks.trim()) {
      remarksRef.current?.focus();
      showMsg("Please enter remarks for credit return", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        invoiceNo: parseInt(returnNo, 10) || 1,
        invoiceDate: returnDate,
        returnNo: parseInt(returnNo, 10) || 1,
        returnDate: returnDate,
        saleInvNo: saleInvNo || "",
        customerId: customerId || undefined,
        customerName: buyerName || "COUNTER SALE",
        customerPhone: buyerCode,
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
        prevBalance: parseFloat(prevBalance) || 0,
        paidAmount: parseFloat(paid) || 0,
        balance,
        sendSms,
        printType,
        remarks: remarks || "",
        saleType: "return",
      };
      const { data } = editId ? await api.put(EP.SALES.UPDATE(editId), payload) : await api.post(EP.SALES.CREATE, payload);
      if (data.success) {
        showMsg(editId ? "Return updated!" : `Saved: ${data.data.returnNo || data.data.invoiceNo}`);
        const retObj = {
          returnNo: data.data.returnNo || data.data.invoiceNo || returnNo,
          returnDate: payload.returnDate,
          saleInvNo: payload.saleInvNo,
          customerName: payload.customerName,
          items: payload.items,
          subTotal: payload.subTotal,
          netTotal: payload.netTotal,
          paidAmount: payload.paidAmount,
          balance: payload.balance,
        };
        doPrint(retObj, printType);
        fullReset();
        refreshReturnNo();
        setTimeout(() => searchRef.current?.focus(), 100);
      } else { showMsg(data.message, "error"); }
    } catch (e) {
      console.error("Save error:", e);
      showMsg(e.response?.data?.message || "Save failed", "error");
    }
    setLoading(false);
  };

  const handleRemarksKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (items.length > 0) { saveAndPrintDirect(); }
      else { showMsg("Add at least one item first", "error"); }
    }
  };

  const handlePaidKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (items.length > 0) { saveAndPrintDirect(); }
      else { showMsg("Add at least one item first", "error"); }
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (showProductModal || showHoldPreview) return;
      if (e.key === "*") {
        e.preventDefault();
        if (items.length === 0) { showMsg("Add at least one item first", "error"); return; }
        saveAndPrintDirect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, showProductModal, showHoldPreview, creditCustomerSelected, remarks]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "F2") { e.preventDefault(); setShowProductModal(true); }
      if (e.key === "F4") { e.preventDefault(); holdBill(); }
      if (e.key === "Escape" && !showProductModal && !showHoldPreview) resetCurRow();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, showProductModal, showHoldPreview]);

  return (
    <div className="sr-page">
      {showProductModal && <SearchModal allProducts={allProducts} onSelect={pickProduct} onClose={() => { setShowProductModal(false); setTimeout(() => searchRef.current?.focus(), 30); }} />}
      {showHoldPreview && <HoldPreviewModal bill={showHoldPreview} onResume={resumeHold} onClose={() => setShowHoldPreview(null)} />}
      {showSaleSearchModal && <SearchSaleModal onSelect={(sale) => loadSaleByInv(sale)} onClose={() => setShowSaleSearchModal(false)} />}

      {/* TITLEBAR */}
      <div className="xp-titlebar" style={{ background: "#c0392b" }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708z"/></svg>
        <span className="xp-tb-title" style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold" }}>Sale Return — Asim Electric &amp; Electronic Store</span>
        <div className="xp-tb-actions">
          {editId && <div className="sr-edit-badge">✏ Editing Return</div>}
          <div className="xp-tb-divider" />
          <div className="sl-shortcut-hints"><span>F2 Product</span><span>F4 Hold</span><span>* Save</span></div>
          <div className="xp-tb-divider" />
          <button className="xp-cap-btn">─</button>
          <button className="xp-cap-btn">□</button>
          <button className="xp-cap-btn xp-cap-close">✕</button>
        </div>
      </div>

      {msg.text && <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "4px 10px 0", flexShrink: 0, fontSize: "13px", fontWeight: "500" }}>{msg.text}</div>}

      <div className="sl-body">
        <div className="sl-left">
          {/* Top bar */}
          <div className="sl-top-bar">
            <div className="sl-sale-title-box" style={{ background: "#c0392b", border: "1px solid #c0392b" }}>Sale Return</div>
            
            <div className="sl-inv-field-grp">
              <label>Sale Inv. #</label>
              <div className="sl-inv-nav-container">
                <button className="sl-inv-nav-btn sl-inv-nav-prev" onClick={loadPrevInvoice} disabled={currentInvoiceIndex <= 0} type="button">◀</button>
                <input ref={saleInvRef} className="xp-input xp-input-sm sl-inv-input-large" value={saleInvNo} onChange={(e) => setSaleInvNo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (saleInvNo.trim()) { loadSaleByInv(); } else { setShowSaleSearchModal(true); } } if (e.key === "ArrowLeft") { e.preventDefault(); loadPrevInvoice(); } if (e.key === "ArrowRight") { e.preventDefault(); loadNextInvoice(); } }} placeholder="Invoice #" title="Enter invoice number | ← → arrows" style={{ background: "#fffde7", fontSize: "14px", fontWeight: "bold" }} />
                <button className="sl-inv-nav-btn sl-inv-nav-next" onClick={loadNextInvoice} disabled={currentInvoiceIndex >= allSaleInvoices.length - 1} type="button">▶</button>
              </div>
            </div>
            
            <div className="sl-inv-field-grp">
              <label>Return #</label>
              <input className="xp-input xp-input-sm sl-date-input" value={editId ? "EDIT MODE" : returnNo} readOnly style={{ background: "#f5f5f5", cursor: "not-allowed", width: "120px", textAlign: "center", fontWeight: "bold" }} />
            </div>
            
            <div className="sl-inv-field-grp">
              <label>Date</label>
              <input type="date" className="xp-input xp-input-sm sl-date-input" value={returnDate} readOnly style={{ background: "#f5f5f5", cursor: "not-allowed", width: "130px" }} />
            </div>
            
            <div className="sl-inv-field-grp">
              <label>Time</label>
              <div className="sl-time-box">{time}</div>
            </div>
          </div>

          {/* Entry strip */}
          <div className="sl-entry-strip">
            <div className="sl-entry-cell sl-entry-product">
              <label>Select Product <kbd>F2</kbd></label>
              <input ref={searchRef} type="text" className="sl-product-input" style={{ background: "#fffde7" }} value={searchText} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); setShowProductModal(true); } }} onChange={(e) => { setSearchText(e.target.value); if (curRow.name) { setCurRow({ ...EMPTY_ROW }); } }} autoFocus />
            </div>
            <div className="sl-entry-cell">
              <label>Packing</label>
              <input ref={packingRef} type="text" className="xp-input sl-num-input" style={{ width: 65, background: "#fffde7" }} value={curRow.uom} onChange={(e) => setCurRow((p) => ({ ...p, uom: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); pcsRef.current?.focus(); return; } if (packingOptions.length === 0) return; if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const idx = packingOptions.indexOf(curRow.uom); const next = e.key === "ArrowDown" ? (idx + 1) % packingOptions.length : (idx - 1 + packingOptions.length) % packingOptions.length; const newUom = packingOptions[next]; const product = allProducts.find(p => p._id === curRow.productId); if (product?.packingInfo) { const pk = product.packingInfo.find(pk => pk.measurement === newUom); if (pk) { setCurRow(prev => ({ ...prev, uom: newUom, rate: pk.saleRate || 0, pcs: pk.packing || 1, amount: (pk.packing || 1) * (pk.saleRate || 0) })); return; } } setCurRow(prev => ({ ...prev, uom: newUom })); } }} autoComplete="off" />
            </div>
            <div className="sl-entry-cell">
              <label>Pcs</label>
              <input ref={pcsRef} type="number" className="sl-num-input" style={{ width: 60, background: "#fffde7" }} value={curRow.pcs} min={1} onChange={(e) => updateCurRow("pcs", e.target.value)} onKeyDown={(e) => e.key === "Enter" && rateRef.current?.focus()} onFocus={(e) => e.target.select()} />
            </div>
            <div className="sl-entry-cell">
              <label>Rate</label>
              <input ref={rateRef} type="number" className="sl-num-input" style={{ width: 75, background: "#fffde7" }} value={curRow.rate} min={0} onChange={(e) => updateCurRow("rate", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRef.current?.click()} onFocus={(e) => e.target.select()} />
            </div>
            <div className="sl-entry-cell">
              <label>Amount</label>
              <input className="sl-num-input" style={{ width: 80, background: "#f5f5f5", fontWeight: "bold" }} value={Number(curRow.amount || 0).toLocaleString("en-PK")} readOnly />
            </div>
            <div className="sl-entry-cell sl-entry-btns-cell">
              <label>&nbsp;</label>
              <div className="sl-entry-btns">
                <button className="xp-btn xp-btn-sm" onClick={resetCurRow}>Reset</button>
                <button ref={addRef} className="xp-btn xp-btn-primary xp-btn-sm" style={{ background: "#22c55e", borderColor: "#059669" }} onClick={addRow}>{selItemIdx !== null ? "Update" : "Add"}</button>
                <button className="xp-btn xp-btn-sm" disabled={selItemIdx === null} onClick={() => selItemIdx !== null && loadRowForEdit(selItemIdx)}>Edit</button>
                <button className="xp-btn xp-btn-danger xp-btn-sm" disabled={selItemIdx === null} onClick={removeRow}>Remove</button>
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="sl-table-header-bar">
            <span className="sl-table-lbl">{curRow.name ? <span className="sl-cur-name-inline">{curRow.name}</span> : "Select Product"}</span>
            <span className="sl-table-qty">{totalQty.toLocaleString("en-PK")}</span>
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
                  <th style={{ width: 55 }} className="r">Pcs</th>
                  <th style={{ width: 80 }} className="r">Rate</th>
                  <th style={{ width: 90 }} className="r">Amount</th>
                  <th style={{ width: 50 }}>Rack</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr className="sl-empty-row">
                    <td colSpan={8} className="xp-empty" style={{ padding: 14 }}>Press F2 or Enter to search and add returned products</td>
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
                    <td className="r" style={{ color: "#dc2626" }}>{Number(r.amount).toLocaleString("en-PK")}</td>
                    <td className="muted">{r.rack}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary bar */}
          <div className="sl-summary-bar">
            <div className="sl-sum-cell"><label>Total Qty</label><input className="sl-sum-val" value={totalQty.toLocaleString("en-PK")} readOnly /></div>
            <div className="sl-sum-cell"><label>Net Amount</label><input className="sl-sum-val" value={Number(subTotal).toLocaleString("en-PK")} readOnly /></div>
            <div className="sl-sum-cell"><label>Bill Amount</label><input className="sl-sum-val" value={Number(subTotal).toLocaleString("en-PK")} readOnly /></div>
            <div className="sl-sum-cell"><label>Refunded</label><input ref={paidRef} type="number" className="sl-sum-input" style={{ background: "#fffde7", color: "#059669", fontWeight: 700 }} value={paid} min={0} onChange={(e) => setPaid(e.target.value)} onKeyDown={handlePaidKeyDown} onFocus={(e) => e.target.select()} /></div>
            <div className="sl-sum-cell"><label>Balance</label><input className={`sl-sum-val sl-bal${balance > 0 ? " danger" : balance < 0 ? " success" : ""}`} value={Number(balance).toLocaleString("en-PK")} readOnly /></div>
          </div>

          {/* Customer bar */}
          <div className="sl-customer-bar">
            <div className="sl-cust-cell">
              <label>Code</label>
              <input className="sl-cust-input" style={{ width: 65, background: "#fffde7" }} value={buyerCode} onChange={(e) => setBuyerCode(e.target.value)} />
            </div>
            <div className="sl-cust-cell sl-cust-buyer">
              <label>Buyer Name</label>
              <CustomerDropdown allCustomers={allCustomers} value={customerId} displayName={buyerName} customerType={customerType} onSelect={handleCustomerSelect} onClear={handleCustomerClear} />
            </div>
            <div className="sl-cust-cell">
              <label>Prev Balance</label>
              <input type="number" className="sl-cust-input" style={{ width: 85, background: "#fffde7" }} value={prevBalance} onChange={(e) => setPrevBalance(e.target.value)} onFocus={(e) => e.target.select()} />
            </div>
            <div className="sl-cust-cell">
              <label>Net Receivable</label>
              <input className="sl-cust-input sl-net-recv" style={{ color: balance > 0 ? "#dc2626" : "#059669", fontWeight: 700, width: 85 }} value={Number(balance).toLocaleString("en-PK")} readOnly />
            </div>
          </div>

          {/* Remarks input for credit customer */}
          {showRemarksInput && (
            <div className="sl-credit-warning-bar" style={{ background: "#fef3c7", borderLeftColor: "#f59e0b" }}>
              <div className="sl-credit-warning-left">
                <div>
                  <div className="sl-credit-title" style={{ color: "#92400e" }}>📝 CREDIT RETURN</div>
                  <div className="sl-credit-sub" style={{ color: "#92400e" }}>Please enter reason for credit return</div>
                </div>
              </div>
              <input ref={remarksRef} type="text" className="sl-credit-statement-input" style={{ background: "#fffde7", borderColor: "#f59e0b" }} placeholder="Enter remarks / reason for credit return..." value={remarks} onChange={(e) => setRemarks(e.target.value)} onKeyDown={handleRemarksKeyDown} />
            </div>
          )}
        </div>

        {/* RIGHT — Hold Bills */}
        <div className="sl-right">
          <div className="sl-hold-panel">
            <div className="sl-hold-title" style={{ background: "#c0392b" }}>
              <span>Hold Bills <kbd style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "0 3px", borderRadius: 2 }}>F4</kbd></span>
              <span className="sl-hold-cnt">{holdBills.length}</span>
            </div>
            <div className="sl-hold-table-wrap">
              <table className="sl-hold-table">
                <thead>
                  <tr>
                    <th style={{ width: 24 }}>#</th>
                    <th>Return #</th>
                    <th className="r">Amount</th>
                    <th>Customer</th>
                    <th style={{ width: 22 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {holdBills.length === 0 ? (
                    Array.from({ length: 8 }).map((_, i) => (<tr key={i}><td colSpan={5} style={{ height: 22 }} /></tr>))
                  ) : (
                    holdBills.map((b, i) => (
                      <tr key={b.id} onClick={() => setShowHoldPreview(b)} onDoubleClick={() => resumeHold(b.id)} title="Click = preview · Double-click = resume">
                        <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>{i + 1}</td>
                        <td style={{ fontFamily: "var(--xp-mono)", fontSize: "var(--xp-fs-xs)" }}>{b.returnNo}</td>
                        <td className="r" style={{ color: "#dc2626" }}>{Number(b.amount).toLocaleString("en-PK")}</td>
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
            <div style={{ padding: "4px 8px", flexShrink: 0 }}>
              <button className="xp-btn xp-btn-sm" style={{ width: "100%", background: "#c0392b", color: "white", borderColor: "#991b1b" }} onClick={holdBill} disabled={!items.length}>Hold Return (F4)</button>
            </div>
            <div className="sl-hold-hint" style={{ padding: "4px 8px", fontSize: 10, color: "#666", textAlign: "center", borderTop: "1px solid #e5e7eb" }}>Click = preview · Double-click = resume · ✕ = delete</div>
          </div>
        </div>
      </div>

      {/* Command bar */}
      <div className="sl-cmd-bar">
        <button className="xp-btn xp-btn-sm" onClick={fullReset} disabled={loading}>Refresh</button>
        <button ref={saveRef} className="xp-btn xp-btn-primary xp-btn-lg" onClick={saveAndPrintDirect} disabled={loading} style={{ background: "#22c55e", borderColor: "#059669" }}>{loading ? "Saving…" : "Save Record  *"}</button>
        <button className="xp-btn xp-btn-sm" onClick={() => {}}>Edit Record</button>
        <button className="xp-btn xp-btn-danger xp-btn-sm" disabled={!editId} onClick={async () => { if (!editId || !window.confirm("Delete this return?")) return; try { await api.delete(EP.SALES.DELETE(editId)); showMsg("Return deleted"); fullReset(); refreshReturnNo(); } catch { showMsg("Delete failed", "error"); } }}>Delete Record</button>
        <div className="xp-toolbar-divider" />
        <div className="sl-cmd-checks">
          <label className="sl-check-label"><input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} /> Send SMS</label>
        </div>
        <div className="xp-toolbar-divider" />
        <div className="sl-print-types">{["Thermal", "A4", "A5"].map((pt) => (<label key={pt} className="sl-check-label"><input type="radio" name="pt" checked={printType === pt} onChange={() => setPrintType(pt)} /> {pt}</label>))}</div>
        <div className="xp-toolbar-divider" />
        <span className={`sl-inv-info${editId ? " edit-mode" : ""}`}>{editId ? "✏ Editing return record" : `${returnNo} | Items: ${items.length} | Total: ${Number(subTotal).toLocaleString("en-PK")}`}</span>
        <button className="xp-btn xp-btn-sm" style={{ marginLeft: "auto" }} onClick={fullReset}>Close</button>
      </div>

      <style>{`
        .sr-page {
          background: #ffffff;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .sl-body {
          flex: 1;
          display: flex;
          gap: 12px;
          padding: 12px;
          overflow: hidden;
        }
        
        .sl-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          gap: 8px;
          min-width: 0;
        }
        
        .sl-right {
          width: 260px;
          flex-shrink: 0;
        }
        
        input, .xp-input, .sl-product-input, .sl-num-input, .sl-sum-input, 
        .sl-cust-input, .sl-inv-input-large, .sl-date-input, .sl-sum-val {
          border-color: #000000 !important;
          border-width: 1px !important;
          border-style: solid !important;
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
        
        .sl-items-wrap {
          flex: 1;
          overflow: auto;
          min-height: 0;
        }
        
        .sl-items-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .sl-items-table th, .sl-items-table td {
          border: 1px solid #000000;
          padding: 6px;
        }
        
        .sl-items-table th {
          background: #f1f5f9;
          font-weight: bold;
          color: #000000;
          position: sticky;
          top: 0;
        }
        
        .xp-alert {
          padding: 8px 16px;
          margin: 8px 16px 0;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .xp-alert-success {
          background: #dcfce7;
          color: #166534;
          border-left: 4px solid #22c55e;
        }
        
        .xp-alert-error {
          background: #fee2e2;
          color: #991b1b;
          border-left: 4px solid #ef4444;
        }
        
        .text-muted {
          color: #6b7280;
        }
        
        .r {
          text-align: right;
        }
        
        .sl-sum-val.danger {
          color: #dc2626;
          background: #fee2e2;
        }
        
        .sl-sum-val.success {
          color: #059669;
          background: #d1fae5;
        }
        
        .sl-product-input, .sl-num-input, .sl-sum-input, .sl-cust-input {
          background-color: #fffde7 !important;
        }
        
        .sl-sum-val, .sl-date-input[readonly] {
          background-color: #f5f5f5 !important;
        }

        @media screen and (max-width: 1024px) {
          .sl-right {
            width: 220px;
          }
          .sl-top-bar {
            gap: 8px;
            flex-wrap: wrap;
          }
          .sl-inv-input-large {
            width: 140px !important;
            font-size: 12px !important;
          }
        }

        @media screen and (max-width: 768px) {
          .sl-body {
            flex-direction: column;
          }
          .sl-right {
            width: 100%;
            height: 250px;
          }
          .sl-left {
            height: calc(100% - 260px);
          }
          .sl-entry-strip {
            flex-direction: column;
          }
          .sl-entry-cell {
            width: 100%;
          }
          .sl-entry-product {
            width: 100%;
          }
          .sl-num-input {
            width: 100% !important;
          }
          .sl-entry-btns {
            justify-content: space-between;
          }
          .sl-entry-btns .xp-btn {
            flex: 1;
            text-align: center;
          }
          .sl-summary-bar, .sl-customer-bar {
            flex-direction: column;
          }
          .sl-sum-cell, .sl-cust-cell {
            width: 100%;
          }
          .sl-sum-val, .sl-sum-input, .sl-cust-input {
            width: 100% !important;
          }
          .sl-cmd-bar {
            flex-direction: column;
          }
          .sl-cmd-bar .xp-btn {
            width: 100%;
          }
          .sl-cmd-checks, .sl-print-types {
            justify-content: center;
          }
          .sl-inv-info {
            text-align: center;
            order: -1;
          }
        }
      `}</style>
    </div>
  );
}