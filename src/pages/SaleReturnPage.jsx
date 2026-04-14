// pages/SaleReturnPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/SaleReturnPage.css";

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

const SHOP_INFO = {
  name: "Asim Electric & Electronic Store",
  address: "Main Bazar, Lahore",
  phone: "0300-0000000",
};

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
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}
      body{font-family:'Courier New',Courier,monospace;font-size:10.5px;width:78mm;margin:0 auto;padding:3mm;color:#111}
      .sn{text-align:center;font-size:15px;font-weight:bold;margin-bottom:1px}
      .ss{text-align:center;font-size:9px;color:#555;margin-bottom:1px}
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
      <div class="ss">${SHOP_INFO.address} | Ph: ${SHOP_INFO.phone}</div>
      <span class="badge">SALE RETURN</span>
      <hr class="dash">
      <div class="row" style="font-size:9.5px"><span>Return #: <b>${ret.returnNo}</b></span><span>${ret.returnDate}</span></div>
      ${ret.saleInvNo ? `<div style="font-size:9px;color:#666">Ref Sale: ${ret.saleInvNo}</div>` : ""}
      <div style="font-size:10.5px;font-weight:bold">${ret.customerName}</div>
      <hr class="solid">
      <table>
        <thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amt</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </tr>
      <hr class="dash">
      <div class="row b sep"><span>RETURN TOTAL</span><span>PKR ${Number(ret.netTotal).toLocaleString()}</span></div>
      <div class="row green"><span>Refunded</span><span>PKR ${Number(ret.paidAmount).toLocaleString()}</span></div>
      <div class="foot">Items: ${rows.length} | Qty: ${totalQty}<br>Thank you — ${SHOP_INFO.name}</div>
    </body></html>`;
  }

  const a5 = type === "A5";
  const sz = a5
    ? { title: 17, sub: 9, inv: 13, meta: 8.5, th: 8.5, td: 8.5, tot: 9.5, totB: 11.5 }
    : { title: 22, sub: 10, inv: 15, meta: 10, th: 10, td: 10, tot: 11, totB: 14 };

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

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${sz.td}pt;color:#1a1a2e;background:#fff;padding:${a5 ? "7mm" : "12mm"}}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c0392b;padding-bottom:${a5 ? "7px" : "11px"};margin-bottom:${a5 ? "8px" : "12px"}}
    .hn{font-size:${sz.title}pt;font-weight:900;color:#c0392b;letter-spacing:-.5px;line-height:1.1}
    .hs{font-size:${sz.sub}pt;color:#666;margin-top:2px}
    .ir{text-align:right}
    .il{font-size:${sz.inv}pt;font-weight:800;color:#c0392b;letter-spacing:1.5px;text-transform:uppercase}
    .ino{font-size:${sz.inv - 1}pt;font-weight:700;color:#111;margin-top:1px}
    .idate{font-size:${sz.sub}pt;color:#777}
    .info{display:flex;gap:${a5 ? "6px" : "10px"};background:#fff5f5;border:1px solid #fca5a5;border-radius:4px;padding:${a5 ? "5px 10px" : "7px 14px"};margin-bottom:${a5 ? "8px" : "12px"};font-size:${sz.meta}pt}
    .ii{display:flex;flex-direction:column;gap:1px}
    .ilb{font-size:${sz.meta - 1}pt;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
    .iv{font-weight:600;color:#111}
    table{width:100%;border-collapse:collapse;margin-bottom:${a5 ? "8px" : "14px"}}
    thead tr{background:#c0392b;color:#fff}
    th{padding:${a5 ? "4px 6px" : "6px 9px"};text-align:left;font-size:${sz.th}pt;font-weight:600;white-space:nowrap}
    td{padding:${a5 ? "3px 6px" : "5px 9px"};font-size:${sz.td}pt;border-bottom:1px solid #fde8e8}
    tbody tr:last-child td{border-bottom:2px solid #fca5a5}
    .bwrap{display:flex;justify-content:flex-end}
    .tbox{width:${a5 ? "205px" : "265px"};border:1px solid #fca5a5;border-radius:4px;overflow:hidden}
    .tr{display:flex;justify-content:space-between;padding:${a5 ? "4px 10px" : "5px 14px"};font-size:${sz.tot}pt;border-bottom:1px solid #fde8e8}
    .tr:last-child{border-bottom:none}
    .tr.b{font-weight:700;font-size:${sz.totB}pt;background:#fff5f5}
    .tr.sep{border-top:2px solid #c0392b}
    .red{color:#c0392b}.green{color:#15803d}
    .foot{margin-top:${a5 ? "12px" : "22px"};display:flex;justify-content:space-between;align-items:flex-end;border-top:1px dashed #bbb;padding-top:${a5 ? "8px" : "12px"}}
    .ft{font-size:${sz.sub}pt;color:#888;line-height:1.7}
    .sig{text-align:center;font-size:${sz.sub}pt;color:#555}
    .sl{border-top:1px solid #999;width:${a5 ? "100px" : "130px"};margin:0 auto 2px}
    @media print{@page{size:${a5 ? "A5" : "A4"};margin:${a5 ? "5mm" : "10mm"}}body{padding:0}}
  </style></head><body>
    <div class="hdr">
      <div>
        <div class="hn">${SHOP_INFO.name}</div>
        <div class="hs">📍 ${SHOP_INFO.address}</div>
        <div class="hs">📞 ${SHOP_INFO.phone}</div>
      </div>
      <div class="ir">
        <div class="il">Sale Return</div>
        <div class="ino"># ${ret.returnNo}</div>
        <div class="idate">${ret.returnDate}</div>
      </div>
    </div>
    <div class="info">
      <div class="ii" style="flex:2"><span class="ilb">Customer</span><span class="iv">${ret.customerName}</span></div>
      ${ret.saleInvNo ? `<div class="ii" style="flex:1"><span class="ilb">Ref Invoice</span><span class="iv">${ret.saleInvNo}</span></div>` : ""}
      <div class="ii" style="flex:1;text-align:right"><span class="ilb">Items / Qty</span><span class="iv">${rows.length} / ${totalQty}</span></div>
    </div>
    <table>
      <thead><tr><th width="24">#</th><th>Description</th><th width="46">UOM</th><th width="38" align="right">Qty</th><th width="68" align="right">Rate</th><th width="78" align="right">Amount</th></td></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="bwrap">
      <div class="tbox">
        <div class="tr"><span>Sub Total</span><span class="red">${Number(ret.subTotal).toLocaleString()}</span></div>
        <div class="tr b red sep"><span>Return Total</span><span>PKR ${Number(ret.netTotal).toLocaleString()}</span></div>
        <div class="tr green"><span>Refunded</span><span>PKR ${Number(ret.paidAmount).toLocaleString()}</span></div>
        <div class="tr b sep ${ret.balance > 0 ? "red" : "green"}"><span>Balance</span><span>PKR ${Number(ret.balance).toLocaleString()}</span></div>
      </div>
    </div>
    <div class="foot">
      <div class="ft">Return processed — ${SHOP_INFO.name}<br>Computer Generated Document</div>
      <div class="sig"><div class="sl"></div>Authorized Signature</div>
    </div>
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
        <div className="xp-modal-tb" style={{ background: "#1e40af", padding: "10px 16px", borderRadius: "10px 10px 0 0" }}>
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
                  {rows.length === 0 && <tr><td colSpan={8} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>No products found</td></tr>}
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
function SearchSaleModal({ onSelect, onClose, onNext, onPrev, hasNext, hasPrev }) {
  const [searchId, setSearchId] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchPrice, setSearchPrice] = useState("");
  const [priceOperator, setPriceOperator] = useState("eq");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiIdx, setHiIdx] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  
  const searchIdRef = useRef(null);
  const searchPhoneRef = useRef(null);
  const searchPriceRef = useRef(null);
  const listRef = useRef(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.SALES.GET_ALL);
      if (response.data.success) {
        let sales = response.data.data;
        if (Array.isArray(sales)) {
          if (searchId) {
            const searchIdLower = searchId.toLowerCase();
            sales = sales.filter(sale => sale.invoiceNo?.toLowerCase().includes(searchIdLower) || sale._id?.toLowerCase().includes(searchIdLower));
          }
          if (searchPhone) {
            const searchPhoneClean = searchPhone.replace(/\D/g, '');
            sales = sales.filter(sale => {
              const customerPhone = sale.customerPhone || sale.customer?.phone || "";
              const phoneClean = customerPhone.replace(/\D/g, '');
              return phoneClean.includes(searchPhoneClean);
            });
          }
          if (searchPrice) {
            const priceValue = parseFloat(searchPrice);
            sales = sales.filter(sale => {
              const total = sale.netTotal || sale.total || 0;
              switch(priceOperator) {
                case "eq": return total === priceValue;
                case "gt": return total > priceValue;
                case "lt": return total < priceValue;
                case "gte": return total >= priceValue;
                case "lte": return total <= priceValue;
                default: return true;
              }
            });
          }
          sales = sales.filter((sale) => sale.saleType === "sale" || sale.type === "sale" || (!sale.saleType && !sale.type) || sale.invoiceNo?.startsWith("INV-"));
        }
        setInvoices(sales);
        setTotalInvoices(sales.length);
        setHiIdx(sales.length > 0 ? 0 : -1);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [searchId, searchPhone, searchPrice, priceOperator]);

  useEffect(() => {
    setTimeout(() => searchIdRef.current?.focus(), 50);
  }, []);

  const handleFieldKeyDown = (e, fieldType) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (fieldType === "id") {
        searchPhoneRef.current?.focus();
      } else if (fieldType === "phone") {
        searchPriceRef.current?.focus();
      } else if (fieldType === "amount") {
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
    setSearchPrice("");
    setPriceOperator("eq");
    setTimeout(() => searchIdRef.current?.focus(), 50);
  };

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ width: "95%", maxWidth: "1200px", height: "85vh", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: "12px", background: "#ffffff", border: "2px solid #000000" }}>
        <div className="xp-modal-tb" style={{ background: "#1e40af", padding: "10px 16px", borderRadius: "10px 10px 0 0" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>Search Sale Invoice</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        <div className="cs-modal-filters" style={{ padding: "12px 16px", gap: "12px", background: "#f8fafc", borderBottom: "1px solid #000000", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", marginBottom: 12 }}>
            <div className="cs-modal-filter-grp">
              <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Invoice # / ID</label>
              <input ref={searchIdRef} type="text" className="xp-input" value={searchId} onChange={(e) => setSearchId(e.target.value)} onKeyDown={(e) => handleFieldKeyDown(e, "id")} placeholder="Invoice number or ID..." autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
            </div>
            <div className="cs-modal-filter-grp">
              <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Customer Phone</label>
              <input ref={searchPhoneRef} type="tel" className="xp-input" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} onKeyDown={(e) => handleFieldKeyDown(e, "phone")} placeholder="Phone number..." autoComplete="off" style={{ height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", width: "100%", padding: "0 8px" }} />
            </div>
            <div className="cs-modal-filter-grp">
              <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Amount / Price</label>
              <div style={{ display: "flex", gap: 6 }}>
                <select className="xp-input" value={priceOperator} onChange={(e) => setPriceOperator(e.target.value)} style={{ width: 70, height: "32px", border: "1px solid #000000", borderRadius: "4px" }}>
                  <option value="eq">=</option><option value="gt">&gt;</option><option value="lt">&lt;</option><option value="gte">≥</option><option value="lte">≤</option>
                </select>
                <input ref={searchPriceRef} type="text" className="xp-input" value={searchPrice} onChange={(e) => { const value = e.target.value; if (value === '' || /^\d*\.?\d*$/.test(value)) { setSearchPrice(value); } }} onKeyDown={(e) => handleFieldKeyDown(e, "amount")} placeholder="Amount..." style={{ flex: 1, height: "32px", fontSize: "12px", border: "1px solid #000000", borderRadius: "4px", padding: "0 8px" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="xp-btn xp-btn-sm" onClick={clearFilters} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold" }}>Clear Filters</button>
              <button className="xp-btn xp-btn-sm" onClick={fetchInvoices} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold" }}>Search</button>
              <span style={{ fontSize: "11px", color: "#000000", fontWeight: "bold", alignSelf: "center" }}>{totalInvoices} invoice(s) found</span>
            </div>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold" }}>Close</button>
          </div>
        </div>
        <div className="xp-modal-body" style={{ padding: 0, flex: 1, overflow: "hidden" }}>
          <div className="xp-table-panel" style={{ border: "none", height: "100%" }}>
            <div className="xp-table-scroll" style={{ height: "100%", overflow: "auto", maxHeight: "calc(85vh - 150px)" }}>
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
                  {loading && <tr><td colSpan={7} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>Loading...</td></tr>}
                  {!loading && invoices.length === 0 && <tr><td colSpan={7} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>No sale invoices found.</td></tr>}
                  {invoices.map((inv, i) => (
                    <tr key={inv._id} style={{ background: i === hiIdx ? "#e5f0ff" : "white", cursor: "pointer" }} onClick={() => setHiIdx(i)} onDoubleClick={() => onSelect(inv)}>
                      <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", fontFamily: "monospace" }}>{inv.invoiceNo || inv.returnNo || "N/A"}</td>
                      <td style={{ padding: "6px 4px", border: "1px solid #000000", fontSize: "11px", color: "#000000" }}>{inv.invoiceDate?.split("T")[0] || inv.date?.split("T")[0] || "-"}</td>
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
          <div className="cs-modal-hint" style={{ margin: 0, fontSize: "10px", fontWeight: "bold", color: "#000000" }}>⬆⬇ = navigate results &nbsp;|&nbsp; Enter = select invoice &nbsp;|&nbsp; Tab between fields &nbsp;|&nbsp; Esc = close</div>
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
      <div className="xp-modal" style={{ width: 520, border: "2px solid #000000" }}>
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
            <div className="xp-table-scroll" style={{ maxHeight: 280 }}>
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
  const [returnNo, setReturnNo] = useState("RTN-00001");
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
      const [pRes, cRes] = await Promise.all([
        api.get(EP.PRODUCTS.GET_ALL),
        api.get(EP.CUSTOMERS.GET_ALL),
      ]);
      if (pRes.data.success) setAllProducts(pRes.data.data);
      if (cRes.data.success) setAllCustomers(cRes.data.data);
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const date = String(today.getDate()).padStart(2, '0');
      setReturnNo(`RTN-${year}${month}${date}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
    } catch {
      showMsg("Failed to load data", "error");
    }
    setLoading(false);
  };

  const fetchAllSaleInvoices = async () => {
    try {
      const response = await api.get(EP.SALES.GET_ALL);
      if (response.data.success) {
        let sales = response.data.data;
        if (Array.isArray(sales)) {
          sales = sales.filter((sale) => sale.saleType === "sale" || sale.type === "sale" || (!sale.saleType && !sale.type) || sale.invoiceNo?.startsWith("INV-"));
        }
        setAllSaleInvoices(sales);
      }
    } catch (error) {
      console.error("Failed to fetch sale invoices:", error);
    }
  };

  const refreshReturnNo = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    setReturnNo(`RTN-${year}${month}${date}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
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
        setSaleInvNo(saleData.invoiceNo || saleData.returnNo || "");
        if (saleData.invoiceDate) { setReturnDate(saleData.invoiceDate.split("T")[0]); }
        const index = allSaleInvoices.findIndex(inv => (inv.invoiceNo || inv.returnNo) === (saleData.invoiceNo || saleData.returnNo));
        setCurrentInvoiceIndex(index);
        showMsg(`Loaded ${loadedItems.length} items from ${saleData.invoiceNo || saleData.returnNo}`, "success");
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
        const sale = r.data.data.find(s => s.invoiceNo === saleInvNo.trim());
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
        const index = allSaleInvoices.findIndex(inv => (inv.invoiceNo || inv.returnNo) === saleInvNo.trim());
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
        invoiceNo: returnNo,
        invoiceDate: returnDate,
        returnNo: returnNo,
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
      if (e.key === "F10" || (e.ctrlKey && e.key === "s")) { e.preventDefault(); saveAndPrintDirect(); }
      if (e.key === "Escape" && !showProductModal && !showHoldPreview) resetCurRow();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, showProductModal, showHoldPreview]);

  return (
    <div className="sr-page">
      {showProductModal && <SearchModal allProducts={allProducts} onSelect={pickProduct} onClose={() => { setShowProductModal(false); setTimeout(() => searchRef.current?.focus(), 30); }} />}
      {showHoldPreview && <HoldPreviewModal bill={showHoldPreview} onResume={resumeHold} onClose={() => setShowHoldPreview(null)} />}
      {showSaleSearchModal && <SearchSaleModal onSelect={(sale) => loadSaleByInv(sale)} onClose={() => setShowSaleSearchModal(false)} onNext={loadNextInvoice} onPrev={loadPrevInvoice} hasNext={currentInvoiceIndex < allSaleInvoices.length - 1} hasPrev={currentInvoiceIndex > 0} />}

      {/* TITLEBAR */}
      <div className="xp-titlebar sr-titlebar" style={{ background: "#c0392b" }}>
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

      <div className="sr-body">
        <div className="sr-left">
          {/* Top bar - Responsive */}
          <div className="sr-top-bar" style={{ display: "flex", gap: "8px", alignItems: "flex-end", padding: "6px 10px", background: "#f8fafc", border: "1px solid #000000", borderRadius: "6px", flexWrap: "nowrap", overflowX: "auto", minWidth: "0" }}>
            <div className="sr-title-box" style={{ padding: "4px 14px", background: "#c0392b", color: "white", borderRadius: "4px", fontWeight: "bold", fontSize: "14px", whiteSpace: "nowrap", flexShrink: 0 }}>Sale Return</div>
            <div className="sr-inv-field-grp" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "1", minWidth: "140px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", whiteSpace: "nowrap" }}>Sale Inv. #</label>
              <div className="sr-inv-nav-container" style={{ position: "relative", display: "inline-block", width: "100%" }}>
                <button className="sr-inv-nav-btn sr-inv-nav-prev" onClick={loadPrevInvoice} disabled={currentInvoiceIndex <= 0} type="button" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", background: "#f3f4f6", border: "1px solid #000000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: "24px", height: "24px", borderRadius: "4px", color: "#000000", fontSize: "10px", fontWeight: "bold", transition: "all 0.2s ease", zIndex: 2, left: "3px" }}>◀</button>
                <input ref={saleInvRef} className="xp-input xp-input-sm sr-inv-input" value={saleInvNo} onChange={(e) => setSaleInvNo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (saleInvNo.trim()) { loadSaleByInv(); } else { setShowSaleSearchModal(true); } } if (e.key === "ArrowLeft") { e.preventDefault(); loadPrevInvoice(); } if (e.key === "ArrowRight") { e.preventDefault(); loadNextInvoice(); } }} placeholder="Invoice #" title="Enter invoice number | ← → arrows" style={{ width: "100%", minWidth: "120px", paddingLeft: "28px", paddingRight: "28px", textAlign: "center", border: "1px solid #000000", borderRadius: "4px", height: "30px", fontSize: "11px", fontWeight: "500" }} />
                <button className="sr-inv-nav-btn sr-inv-nav-next" onClick={loadNextInvoice} disabled={currentInvoiceIndex >= allSaleInvoices.length - 1} type="button" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", background: "#f3f4f6", border: "1px solid #000000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: "24px", height: "24px", borderRadius: "4px", color: "#000000", fontSize: "10px", fontWeight: "bold", transition: "all 0.2s ease", zIndex: 2, right: "3px" }}>▶</button>
              </div>
            </div>
            <div className="sr-inv-field-grp" style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "100px", flexShrink: 0 }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", whiteSpace: "nowrap" }}>Return #</label>
              <input className="xp-input xp-input-sm sr-inv-input" value={editId ? "EDIT MODE" : returnNo} readOnly style={{ background: "#f5f5f5", border: "1px solid #000000", borderRadius: "4px", height: "30px", width: "100%", textAlign: "center", fontSize: "11px" }} />
            </div>
            <div className="sr-inv-field-grp" style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "90px", flexShrink: 0 }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", whiteSpace: "nowrap" }}>Date</label>
              <input type="date" className="xp-input xp-input-sm sr-date-input" value={returnDate} readOnly style={{ border: "1px solid #000000", borderRadius: "4px", height: "30px", background: "#f5f5f5", cursor: "not-allowed", width: "100%", fontSize: "11px" }} />
            </div>
            <div className="sr-inv-field-grp" style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "80px", flexShrink: 0 }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", whiteSpace: "nowrap" }}>Time</label>
              <div className="sr-time-box" style={{ border: "1px solid #000000", borderRadius: "4px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", background: "#ffffff", fontSize: "11px", padding: "0 6px" }}>{time}</div>
            </div>
          </div>

          {/* Entry strip */}
          <div className="sr-entry-strip" style={{ display: "flex", gap: "8px", alignItems: "flex-end", padding: "8px", background: "#f8fafc", border: "1px solid #000000", borderRadius: "6px", flexWrap: "wrap" }}>
            <div className="sr-entry-cell sr-entry-product" style={{ flex: "2", minWidth: "180px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Select Product <kbd>F2</kbd></label>
              <input ref={searchRef} type="text" className="sr-product-input" style={{ background: "#fffde7", border: "1px solid #000000", borderRadius: "4px", height: "36px", cursor: "text", width: "100%" }} value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); setShowProductModal(true); } }} placeholder="Press F2 or Enter to search..." autoFocus />
            </div>
            <div className="sr-entry-cell" style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "70px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Packing</label>
              <input ref={packingRef} type="text" className="xp-input sr-num-input" style={{ width: "70px", background: "#fffde7", border: "1px solid #000000", borderRadius: "4px", height: "36px" }} value={curRow.uom} onChange={(e) => setCurRow((p) => ({ ...p, uom: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); pcsRef.current?.focus(); return; } if (packingOptions.length === 0) return; if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const currentIdx = packingOptions.indexOf(curRow.uom); let nextIdx; if (e.key === "ArrowDown") { nextIdx = currentIdx + 1; if (nextIdx >= packingOptions.length) nextIdx = 0; } else { nextIdx = currentIdx - 1; if (nextIdx < 0) nextIdx = packingOptions.length - 1; } const newUom = packingOptions[nextIdx]; const product = allProducts.find(p => p._id === curRow.productId); if (product?.packingInfo) { const pk = product.packingInfo.find(pk => pk.measurement === newUom); if (pk) { setCurRow(prev => ({ ...prev, uom: newUom, rate: pk.saleRate || 0, pcs: pk.packing || 1, amount: (pk.packing || 1) * (pk.saleRate || 0) })); return; } } setCurRow(prev => ({ ...prev, uom: newUom })); } }} autoComplete="off" />
            </div>
            <div className="sr-entry-cell" style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "60px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Pcs</label>
              <input ref={pcsRef} type="number" className="sr-num-input" style={{ width: "60px", background: "#fffde7", border: "1px solid #000000", borderRadius: "4px", height: "36px" }} value={curRow.pcs} min={1} onChange={(e) => updateCurRow("pcs", e.target.value)} onKeyDown={(e) => e.key === "Enter" && rateRef.current?.focus()} onFocus={(e) => e.target.select()} />
            </div>
            <div className="sr-entry-cell" style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "75px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Rate</label>
              <input ref={rateRef} type="number" className="sr-num-input" style={{ width: "75px", background: "#fffde7", border: "1px solid #000000", borderRadius: "4px", height: "36px" }} value={curRow.rate} min={0} onChange={(e) => updateCurRow("rate", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRef.current?.click()} onFocus={(e) => e.target.select()} />
            </div>
            <div className="sr-entry-cell" style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "80px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Amount</label>
              <input className="sr-num-input" style={{ width: "80px", background: "#f5f5f5", border: "1px solid #000000", borderRadius: "4px", height: "36px", fontWeight: "bold" }} value={Number(curRow.amount || 0).toLocaleString("en-PK")} readOnly />
            </div>
            <div className="sr-entry-cell sr-entry-btns-cell" style={{ flex: "1", minWidth: "280px" }}>
              <label>&nbsp;</label>
              <div className="sr-entry-btns" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button className="xp-btn xp-btn-sm" onClick={resetCurRow} style={{ border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold", padding: "4px 10px" }}>Reset</button>
                <button ref={addRef} className="xp-btn xp-btn-sm sr-btn-add" onClick={addRow} style={{ background: "#22c55e", color: "white", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold", padding: "4px 10px" }}>{selItemIdx !== null ? "Update" : "Add"}</button>
                <button className="xp-btn xp-btn-sm" disabled={selItemIdx === null} onClick={() => selItemIdx !== null && loadRowForEdit(selItemIdx)} style={{ border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold", padding: "4px 10px" }}>Edit</button>
                <button className="xp-btn xp-btn-danger xp-btn-sm" disabled={selItemIdx === null} onClick={removeRow} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", fontWeight: "bold", padding: "4px 10px" }}>Remove</button>
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="sr-table-header-bar" style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", background: "#fef3c7", border: "1px solid #000000", borderRadius: "4px" }}>
            <span className="sr-table-lbl" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{curRow.name ? <span className="sr-cur-name-inline" style={{ background: "#fef3c7", padding: "2px 8px", borderRadius: "4px" }}>{curRow.name}</span> : "Select Product"}</span>
            <span className="sr-table-qty" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{totalQty.toLocaleString("en-PK")}</span>
          </div>

          {/* Items table - takes maximum space */}
          <div className="sr-items-wrap" style={{ flex: "1", overflow: "auto", minHeight: "0", border: "1px solid #000000", borderRadius: "6px" }}>
            <table className="sr-items-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ width: "40px", padding: "6px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>#</th>
                  <th style={{ width: "80px", padding: "6px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>Code</th>
                  <th style={{ padding: "6px 6px", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>Name</th>
                  <th style={{ width: "65px", padding: "6px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>UOM</th>
                  <th style={{ width: "55px", padding: "6px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>Pcs</th>
                  <th style={{ width: "80px", padding: "6px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>Rate</th>
                  <th style={{ width: "90px", padding: "6px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="xp-empty" style={{ padding: "40px", textAlign: "center", color: "#000000", fontSize: "12px", fontWeight: "bold" }}>Press F2 or Enter to search and add returned products</td>
                  </tr>
                )}
                {items.map((r, i) => (
                  <tr key={i} className={selItemIdx === i ? "sr-sel-row" : ""} onClick={() => setSelItemIdx(i === selItemIdx ? null : i)} onDoubleClick={() => loadRowForEdit(i)} style={{ background: selItemIdx === i ? "#e5f0ff" : "white", cursor: "pointer" }}>
                    <td style={{ padding: "5px 6px", textAlign: "center", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.code}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #000000", fontSize: "12px", fontWeight: "bold", color: "#000000" }}>{r.name}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.uom}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.pcs}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{Number(r.rate).toLocaleString("en-PK")}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #000000", fontSize: "11px", fontWeight: "bold", color: "#dc2626" }}>{Number(r.amount).toLocaleString("en-PK")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary bar - Responsive */}
          <div className="sr-summary-bar" style={{ display: "flex", gap: "8px", padding: "6px 10px", background: "#f8fafc", borderTop: "1px solid #000000", borderBottom: "1px solid #000000", flexWrap: "wrap" }}>
            <div className="sr-sum-cell" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "1", minWidth: "70px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Total Qty</label>
              <input className="sr-sum-val" value={totalQty.toLocaleString("en-PK")} readOnly style={{ width: "100%", height: "30px", border: "1px solid #000000", borderRadius: "4px", textAlign: "right", fontWeight: "bold", background: "#f5f5f5" }} />
            </div>
            <div className="sr-sum-cell" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "1", minWidth: "80px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Net Amount</label>
              <input className="sr-sum-val" value={Number(subTotal).toLocaleString("en-PK")} readOnly style={{ width: "100%", height: "30px", border: "1px solid #000000", borderRadius: "4px", textAlign: "right", fontWeight: "bold", background: "#f5f5f5" }} />
            </div>
            <div className="sr-sum-cell" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "1", minWidth: "80px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Bill Amount</label>
              <input className="sr-sum-val" value={Number(subTotal).toLocaleString("en-PK")} readOnly style={{ width: "100%", height: "30px", border: "1px solid #000000", borderRadius: "4px", textAlign: "right", fontWeight: "bold", background: "#f5f5f5" }} />
            </div>
            <div className="sr-sum-cell" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "1", minWidth: "80px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Refunded</label>
              <input ref={paidRef} type="number" className="sr-sum-input" style={{ width: "100%", height: "30px", border: "1px solid #000000", borderRadius: "4px", textAlign: "right", fontWeight: "bold", background: "#fffde7", color: "#059669" }} value={paid} min={0} onChange={(e) => setPaid(e.target.value)} onKeyDown={handlePaidKeyDown} onFocus={(e) => e.target.select()} />
            </div>
            <div className="sr-sum-cell" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "1", minWidth: "80px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Balance</label>
              <input className={`sr-sum-val${balance > 0 ? " danger" : balance < 0 ? " success" : ""}`} value={Number(balance).toLocaleString("en-PK")} readOnly style={{ width: "100%", height: "30px", border: "1px solid #000000", borderRadius: "4px", textAlign: "right", fontWeight: "bold", color: balance > 0 ? "#dc2626" : "#059669", background: "#f5f5f5" }} />
            </div>
          </div>

          {/* Customer bar - Responsive */}
          <div className="sr-customer-bar" style={{ display: "flex", gap: "8px", padding: "6px 10px", background: "#f8fafc", borderTop: "1px solid #000000", flexWrap: "wrap" }}>
            <div className="sr-cust-cell" style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "70px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Code</label>
              <input className="sr-cust-input" style={{ width: "70px", height: "30px", border: "1px solid #000000", borderRadius: "4px", background: "#fffde7" }} value={buyerCode} onChange={(e) => setBuyerCode(e.target.value)} />
            </div>
            <div className="sr-cust-cell sr-cust-buyer" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "2", minWidth: "180px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Buyer Name</label>
              <div style={{ border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", minHeight: "30px" }}>
                <CustomerDropdown allCustomers={allCustomers} value={customerId} displayName={buyerName} customerType={customerType} onSelect={handleCustomerSelect} onClear={handleCustomerClear} />
              </div>
            </div>
            <div className="sr-cust-cell" style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "90px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Prev Balance</label>
              <input type="number" className="sr-cust-input" style={{ width: "90px", height: "30px", border: "1px solid #000000", borderRadius: "4px", background: "#fffde7", textAlign: "right" }} value={prevBalance} onChange={(e) => setPrevBalance(e.target.value)} />
            </div>
            <div className="sr-cust-cell" style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "90px" }}>
              <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Net Receivable</label>
              <input className="sr-cust-input sr-net-recv" style={{ width: "90px", height: "30px", border: "1px solid #000000", borderRadius: "4px", textAlign: "right", fontWeight: "bold", color: balance > 0 ? "#dc2626" : "#059669", background: "#f5f5f5" }} value={Number(balance).toLocaleString("en-PK")} readOnly />
            </div>
          </div>

          {/* Remarks input for credit customer */}
          {showRemarksInput && (
            <div className="sr-remarks-bar" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#fef3c7", borderRadius: "6px", marginTop: "8px", border: "1px solid #f59e0b", flexWrap: "wrap" }}>
              <label style={{ fontWeight: "bold", color: "#92400e", fontSize: "12px" }}>📝 Remarks (Credit Return):</label>
              <input ref={remarksRef} type="text" className="xp-input" style={{ flex: "1", background: "#fffde7", border: "1px solid #f59e0b", height: "32px", borderRadius: "4px", minWidth: "150px" }} value={remarks} onChange={(e) => setRemarks(e.target.value)} onKeyDown={handleRemarksKeyDown} placeholder="Enter reason for credit return..." autoComplete="off" />
              <span style={{ fontSize: "10px", color: "#92400e", fontWeight: "bold" }}>Press Enter to Save & Print</span>
            </div>
          )}
        </div>

        {/* RIGHT — Hold Bills */}
        <div className="sr-right" style={{ width: "260px", flexShrink: 0 }}>
          <div className="sr-hold-panel" style={{ border: "1px solid #000000", borderRadius: "6px", background: "#ffffff", height: "100%", display: "flex", flexDirection: "column" }}>
            <div className="sr-hold-title" style={{ padding: "8px", background: "#c0392b", color: "#ffffff", fontWeight: "bold", borderBottom: "1px solid #000000", display: "flex", justifyContent: "space-between" }}>
              <span>Hold Bills <kbd style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "0 3px", borderRadius: 2 }}>F4</kbd></span>
              <span className="sr-hold-cnt" style={{ background: "#ffffff", color: "#c0392b", padding: "2px 8px", borderRadius: "12px" }}>{holdBills.length}</span>
            </div>
            <div className="sr-hold-table-wrap" style={{ overflow: "auto", flex: 1 }}>
              <table className="sr-hold-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ width: 30, padding: "6px 4px", border: "1px solid #000000", fontSize: "10px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>#</th><th style={{ padding: "6px 4px", border: "1px solid #000000", fontSize: "10px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>Bill #</th><th style={{ padding: "6px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "10px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>Amount</th><th style={{ padding: "6px 4px", border: "1px solid #000000", fontSize: "10px", fontWeight: "bold", color: "#000000", background: "#f1f5f9" }}>Customer</th><th style={{ width: 25, padding: "6px 4px", border: "1px solid #000000", background: "#f1f5f9" }}></th></tr></thead>
                <tbody>
                  {holdBills.length === 0 ? Array.from({ length: 6 }).map((_, i) => (<tr key={i}><td colSpan={5} style={{ height: "30px", border: "1px solid #000000" }} /></tr>)) : holdBills.map((b, i) => (<tr key={b.id} onClick={() => setShowHoldPreview(b)} onDoubleClick={() => resumeHold(b.id)} style={{ cursor: "pointer" }}><td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "10px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td><td style={{ padding: "4px 4px", border: "1px solid #000000", fontSize: "10px", fontWeight: "bold", color: "#000000" }}>{b.returnNo}</td><td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "10px", fontWeight: "bold", color: "#dc2626" }}>{Number(b.amount).toLocaleString("en-PK")}</td><td style={{ padding: "4px 4px", border: "1px solid #000000", fontSize: "10px", fontWeight: "bold", color: "#000000" }}>{b.buyerName}</td><td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000" }}><button onClick={(e) => deleteHold(b.id, e)} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "3px", width: "18px", height: "18px", fontSize: "10px", cursor: "pointer" }}>✕</button></td></tr>))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "6px 8px" }}><button className="xp-btn xp-btn-sm" style={{ width: "100%", border: "1px solid #000000", fontWeight: "bold", padding: "6px" }} onClick={holdBill} disabled={!items.length}>Hold Return (F4)</button></div>
            <div className="sr-hold-hint" style={{ padding: "4px 8px", fontSize: "9px", color: "#666", textAlign: "center", borderTop: "1px solid #000000", background: "#f8fafc" }}>Click = preview · Dbl-click = resume · ✕ = delete</div>
          </div>
        </div>
      </div>

      {/* Command bar - Responsive */}
      <div className="sr-cmd-bar" style={{ display: "flex", gap: "8px", padding: "6px 10px", background: "#ffffff", borderTop: "1px solid #000000", flexWrap: "wrap" }}>
        <button className="xp-btn xp-btn-sm" onClick={fullReset} disabled={loading} style={{ border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }}>Refresh</button>
        <button className="xp-btn xp-btn-sm sr-btn-save-primary" onClick={saveAndPrintDirect} disabled={loading} style={{ background: "#22c55e", color: "white", border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }}>{loading ? "Saving…" : "Save Record  *"}</button>
        <button className="xp-btn xp-btn-sm" onClick={() => {}} style={{ border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }}>Edit Record</button>
        <button className="xp-btn xp-btn-danger xp-btn-sm" disabled={!editId} onClick={async () => { if (!editId || !window.confirm("Delete this return?")) return; try { await api.delete(EP.SALES.DELETE(editId)); showMsg("Return deleted"); fullReset(); refreshReturnNo(); } catch { showMsg("Delete failed", "error"); } }} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }}>Delete Record</button>
        <div className="xp-toolbar-divider" style={{ width: "1px", background: "#000000" }} />
        <div className="sr-cmd-checks" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <label className="sr-check-label" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "bold", color: "#000000" }}><input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} /> Send SMS</label>
        </div>
        <div className="xp-toolbar-divider" style={{ width: "1px", background: "#000000" }} />
        <div className="sr-print-types" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>{["Thermal", "A4", "A5"].map((pt) => (<label key={pt} className="sr-check-label" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "bold", color: "#000000" }}><input type="radio" name="sr-print" checked={printType === pt} onChange={() => setPrintType(pt)} /> {pt}</label>))}</div>
        <div className="xp-toolbar-divider" style={{ width: "1px", background: "#000000" }} />
        <span className="sr-inv-info" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{editId ? "✏ Editing return record" : `${returnNo} | Items: ${items.length} | Total: ${Number(subTotal).toLocaleString("en-PK")}`}</span>
        <button className="xp-btn xp-btn-sm" style={{ marginLeft: "auto", border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} onClick={fullReset}>Close</button>
      </div>

      <style>{`
        .sr-page { background: #ffffff; height: 100%; display: flex; flex-direction: column; }
        .sr-body { flex: 1; display: flex; gap: 12px; padding: 12px; overflow: hidden; }
        .sr-left { flex: 1; display: flex; flex-direction: column; overflow: hidden; gap: 8px; min-width: 0; }
        .sr-right { width: 260px; flex-shrink: 0; }
        .sr-items-wrap { flex: 1; overflow: auto; min-height: 0; border: 1px solid #000000; border-radius: 6px; }
        .sr-items-table { width: 100%; border-collapse: collapse; }
        .sr-items-table th, .sr-items-table td { border: 1px solid #000000; }
        .sr-items-table th { background: #f1f5f9; font-weight: bold; color: #000000; position: sticky; top: 0; }
        .xp-alert { padding: 8px 16px; margin: 8px 16px 0; border-radius: 4px; font-size: 13px; font-weight: 500; }
        .xp-alert-success { background: #dcfce7; color: #166534; border-left: 4px solid #22c55e; }
        .xp-alert-error { background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444; }
        .text-muted { color: #6b7280; }
        .r { text-align: right; }

        @media screen and (max-width: 1200px) {
          .sr-right { width: 240px; }
          .sr-items-table th, .sr-items-table td { padding: 4px 4px; }
          .sr-summary-bar, .sr-customer-bar { padding: 4px 8px; }
          .sr-sum-cell input, .sr-cust-cell input { height: 28px; font-size: 11px; }
          .sr-top-bar { gap: 6px !important; padding: 4px 6px !important; }
          .sr-title-box { padding: 2px 10px !important; font-size: 13px !important; }
          .sr-inv-nav-container { min-width: 140px !important; }
          .sr-inv-input { height: 28px !important; font-size: 10px !important; padding: 0 24px !important; }
          .sr-inv-nav-btn { width: 22px !important; height: 22px !important; font-size: 9px !important; }
          .sr-time-box, .sr-date-input { height: 28px !important; font-size: 10px !important; }
        }

        @media screen and (max-width: 1024px) {
          .sr-right { width: 220px; }
          .sr-top-bar { gap: 4px !important; padding: 3px 4px !important; }
          .sr-title-box { padding: 2px 8px !important; font-size: 12px !important; }
          .sr-inv-nav-container { min-width: 120px !important; }
          .sr-inv-input { height: 26px !important; font-size: 9px !important; padding: 0 22px !important; }
          .sr-inv-nav-btn { width: 20px !important; height: 20px !important; font-size: 8px !important; }
          .sr-time-box, .sr-date-input { height: 26px !important; font-size: 9px !important; }
        }
      `}</style>
    </div>
  );
}