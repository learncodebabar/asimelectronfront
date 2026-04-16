// pages/DamageInPage.jsx - Updated with sequential numbers starting from 1
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
const DAMAGE_IN_HOLD_KEY = "asim_damage_in_hold_v1";
const DAMAGE_IN_STORAGE_KEY = "asim_damage_in_records_v1";

const EMPTY_ROW = {
  productId: "",
  code: "",
  name: "",
  uom: "",
  rack: "",
  pcs: 1,
  rate: 0,
  amount: 0,
  reason: "",
};

const SHOP_INFO = {
  name: "عاصم الیکٹرک اینڈ الیکٹرونکس سٹور",
  nameEn: "Asim Electric & Electronic Store",
  address: "مین بازار نہاری ٹاؤن نزد بجلی گھر سٹاپ گوجرانوالہ روڈ فیصل آباد",
  phone1: "Faqir Hussain 0300 7262129",
  phone2: "PTCL 041 8711575",
  phone3: "Shop 0315 7262129",
  devBy: "Software developed by: Creative Babar / 03098325271 or visit website www.digitalglobalschool.com",
};

/* ── localStorage helpers ── */
const loadDamageInHolds = () => {
  try {
    return JSON.parse(localStorage.getItem(DAMAGE_IN_HOLD_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveDamageInHolds = (records) => {
  try {
    localStorage.setItem(DAMAGE_IN_HOLD_KEY, JSON.stringify(records));
  } catch {}
};

const loadDamageInRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(DAMAGE_IN_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveDamageInRecord = (record) => {
  try {
    const existing = loadDamageInRecords();
    existing.push({ ...record, savedAt: new Date().toISOString() });
    localStorage.setItem(DAMAGE_IN_STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
};

/* ══════════════════════════════════════════════════════════
   PRINT HTML BUILDER — Damage In Report
══════════════════════════════════════════════════════════ */

const buildDamageInPrintHtml = (record) => {
  const rows = record.items.map((it, i) => ({ ...it, sr: i + 1 }));
  const totalQty = rows.reduce((s, r) => s + (r.pcs || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);

  const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
  const GOOGLE_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">`;

  const itemRows = rows
    .map(
      (it) => `
      <tr>
        <td style="font-size:10px;vertical-align:top;padding:4px">${it.sr}</td>
        <td style="font-size:10px;vertical-align:top;padding:4px">${it.code}</td>
        <td style="font-size:11px;vertical-align:top;padding:4px">${it.name}</td>
        <td style="font-size:10px;vertical-align:top;padding:4px;text-align:center">${it.pcs} ${it.uom || ""}</td>
        <td style="font-size:10px;vertical-align:top;padding:4px;text-align:right">${fmt(it.rate)}</td>
        <td style="font-size:10px;vertical-align:top;padding:4px;text-align:right"><b>${fmt(it.amount)}</b></td>
        <td style="font-size:9px;vertical-align:top;padding:4px">${it.reason || "—"}</td>
      </tr>
    `,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${GOOGLE_FONT_LINK}<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;width:80mm;margin:0 auto;padding:3mm;color:#000}
    .urdu{font-family:${URDU_FONT};direction:rtl;text-align:center}
    .shop-urdu{font-size:18px;font-weight:bold;text-align:center;margin-bottom:3px;font-family:${URDU_FONT};direction:rtl}
    .shop-addr{font-size:9px;text-align:center;margin-bottom:2px;font-family:${URDU_FONT};direction:rtl}
    .shop-phones{font-size:8.5px;text-align:center;font-weight:bold;margin-bottom:4px}
    .header{text-align:center;border-bottom:2px solid #b71c1c;padding-bottom:5px;margin-bottom:8px}
    .damage-title{font-size:22px;font-weight:bold;margin:5px 0;letter-spacing:2px;color:#b71c1c}
    .meta-row{display:flex;justify-content:space-between;margin:4px 0;font-size:9px}
    .divider-dash{border:none;border-top:1px dashed #666;margin:4px 0}
    .divider-solid{border:none;border-top:1px solid #b71c1c;margin:4px 0}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:1px solid #b71c1c;background:#f5f5f5}
    th{font-size:10px;font-weight:bold;padding:5px 4px;text-align:left}
    th.r{text-align:right}
    td{padding:4px;font-size:10px;vertical-align:top;border-bottom:1px solid #eee}
    .footer{text-align:center;font-size:8px;color:#777;margin-top:10px;border-top:1px dashed #ccc;padding-top:5px}
    .signature{display:flex;justify-content:space-between;margin-top:15px;padding-top:10px}
    .sign-line{text-align:center;font-size:9px}
    .sign-line span{display:inline-block;border-top:1px solid #000;min-width:100px;margin-top:20px;padding-top:3px}
    .totals-box{margin-top:10px;border-top:2px solid #b71c1c;padding-top:8px}
    .sum-row{display:flex;justify-content:space-between;padding:3px 0}
    .sum-row.bold{font-weight:bold;font-size:12px}
    @media print{@page{size:80mm auto;margin:2mm}body{width:76mm}}
  </style></head><body>

    <div class="header">
      <div class="shop-urdu">${SHOP_INFO.name}</div>
      <div class="shop-addr">${SHOP_INFO.address}</div>
      <div class="shop-phones">${SHOP_INFO.phone1} | ${SHOP_INFO.phone2}</div>
      <div class="damage-title">⚠ DAMAGE IN REPORT</div>
    </div>

    <div class="meta-row">
      <span><b>Damage ID:</b> ${record.damageNo}</span>
      <span><b>Date:</b> ${record.damageDate}</span>
    </div>
    <div class="meta-row">
      <span><b>Supplier:</b> ${record.supplierName || "N/A"}</span>
      <span><b>Reference:</b> ${record.reference || "—"}</span>
    </div>
    <hr class="divider-dash">

    <table>
      <thead>
        <tr>
          <th style="width:25px">#</th>
          <th style="width:70px">Code</th>
          <th>Product Description</th>
          <th style="width:55px;text-align:center">Qty</th>
          <th style="width:65px;text-align:right">Rate</th>
          <th style="width:70px;text-align:right">Amount</th>
          <th style="width:80px">Reason</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <hr class="divider-solid">
    
    <div class="totals-box">
      <div class="sum-row"><span>Total Items:</span><span>${rows.length}</span></div>
      <div class="sum-row"><span>Total Quantity:</span><span>${totalQty}</span></div>
      <div class="sum-row bold"><span>Total Damage Value:</span><span>PKR ${fmt(totalAmount)}</span></div>
    </div>

    <div class="signature">
      <div class="sign-line">Recorded By<span></span></div>
      <div class="sign-line">Verified By<span></span></div>
    </div>

    <div class="footer">
      ${SHOP_INFO.devBy}
    </div>

  </body></html>`;
};

const doPrint = (record) => {
  const w = window.open("", "_blank", "width=500,height=700");
  w.document.write(buildDamageInPrintHtml(record));
  w.document.close();
  setTimeout(() => w.print(), 400);
};

/* ══════════════════════════════════════════════════════════
   PRODUCT SEARCH MODAL - With Supplier filter
══════════════════════════════════════════════════════════ */
function SearchModal({ allProducts, onSelect, onClose }) {
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [company, setCompany] = useState("");
  const [supplier, setSupplier] = useState("");
  const [rows, setRows] = useState([]);
  const [hiIdx, setHiIdx] = useState(0);
  const rDesc = useRef(null);
  const rCat = useRef(null);
  const rCompany = useRef(null);
  const rSupplier = useRef(null);
  const tbodyRef = useRef(null);

  const buildFlat = useCallback((products, d, c, co, s) => {
    const res = [];
    const ld = d.trim().toLowerCase(),
      lc = c.trim().toLowerCase(),
      lo = co.trim().toLowerCase(),
      ls = s.trim().toLowerCase();
    products.forEach((p) => {
      const ok =
        (!ld ||
          p.description?.toLowerCase().includes(ld) ||
          p.code?.toLowerCase().includes(ld)) &&
        (!lc || p.category?.toLowerCase().includes(lc)) &&
        (!lo || p.company?.toLowerCase().includes(lo)) &&
        (!ls || (p.supplierName || p.supplier || "").toLowerCase().includes(ls));
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
            _rate: pk.purchaseRate || pk.saleRate || 0,
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
    setRows(buildFlat(allProducts, "", "", "", ""));
  }, [allProducts, buildFlat]);

  useEffect(() => {
    const f = buildFlat(allProducts, desc, cat, company, supplier);
    setRows(f);
    setHiIdx(f.length > 0 ? 0 : -1);
  }, [desc, cat, company, supplier, allProducts, buildFlat]);

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
        border: "2px solid #b71c1c"
      }}>
        <div className="xp-modal-tb" style={{ 
          background: "#b71c1c", 
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
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>Search Products for Damage In</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        
        <div className="cs-modal-filters" style={{ 
          padding: "8px 12px", 
          gap: "10px", 
          background: "#f8fafc",
          borderBottom: "1px solid #b71c1c",
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
              style={{ height: "32px", fontSize: "12px", border: "1px solid #b71c1c", borderRadius: "4px", width: "100%", padding: "0 8px" }}
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
              style={{ height: "32px", fontSize: "12px", border: "1px solid #b71c1c", borderRadius: "4px", width: "100%", padding: "0 8px" }}
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
              onKeyDown={(e) => fk(e, rSupplier)}
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #b71c1c", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div className="cs-modal-filter-grp" style={{ flex: 1, minWidth: "140px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>Supplier</label>
            <input
              ref={rSupplier}
              type="text"
              className="xp-input"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              onKeyDown={(e) => fk(e, null)}
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #b71c1c", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", paddingBottom: "2px" }}>
            <span style={{ fontSize: "11px", color: "#b71c1c", fontWeight: "bold" }}>{rows.length} result(s)</span>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #b71c1c", borderRadius: "4px", fontWeight: "bold" }}>Close</button>
          </div>
        </div>
        
        <div className="xp-modal-body" style={{ padding: 0, flex: 1, overflow: "hidden" }}>
          <div className="xp-table-panel" style={{ border: "none", height: "100%" }}>
            <div className="xp-table-scroll" style={{ 
              height: "100%", 
              overflow: "auto",
              maxHeight: "calc(85vh - 110px)"
            }}>
             <table
  className="xp-table"
  style={{
    fontSize: "12px",
    borderCollapse: "collapse",
    width: "100%",
    border: "1px solid #b71c1c",
  }}
>
  <thead>
    <tr
      style={{
        background: "#f1f5f9",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <th style={{ width: 40, textAlign: "center" }}>#</th>
      <th style={{ width: 90, textAlign: "left" }}>Barcode</th>
      <th style={{ textAlign: "left" }}>Product Name</th>
      <th style={{ width: 60, textAlign: "center" }}>Meas.</th>
      <th style={{ width: 85, textAlign: "right" }}>Rate</th>
      <th style={{ width: 65, textAlign: "right" }}>Stock</th>
      <th style={{ width: 55, textAlign: "right" }}>Pack</th>
      <th style={{ width: 65, textAlign: "center" }}>Rack#</th>
      <th style={{ width: 100, textAlign: "left" }}>Supplier</th>
    </tr>
  </thead>

  <tbody ref={tbodyRef} tabIndex={0} onKeyDown={tk}>
    {rows.length === 0 && (
      <tr>
        <td colSpan={9} style={{ textAlign: "center" }}>
          No products found
        </td>
      </tr>
    )}

    {rows.map((r, i) => (
      <tr
        key={`${r._id}-${r._pi}`}
        style={{
          background: i === hiIdx ? "#ffebee" : "white",
          cursor: "pointer",
        }}
        onClick={() => setHiIdx(i)}
        onDoubleClick={() => onSelect(r)}
      >
        <td style={{ textAlign: "center" }}>{i + 1}</td>
        <td>{r.code}</td>
        <td>{r._name}</td>
        <td style={{ textAlign: "center" }}>{r._meas}</td>
        <td style={{ textAlign: "right" }}>
          {Number(r._rate).toLocaleString("en-PK")}
        </td>
        <td style={{ textAlign: "right" }}>{r._stock}</td>
        <td style={{ textAlign: "right" }}>{r._pack}</td>
        <td style={{ textAlign: "center" }}>
          {r.rackNo || "—"}
        </td>
        <td>{r.supplierName || r.supplier || "—"}</td>
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
          color: "#b71c1c", 
          fontWeight: "bold",
          borderTop: "1px solid #b71c1c", 
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
   DAMAGE IN HOLD PREVIEW MODAL
══════════════════════════════════════════════════════════ */
function DamageInHoldPreviewModal({ record, onResume, onClose }) {
  if (!record) return null;
  const total = record.items.reduce((s, r) => s + Number(r.amount || 0), 0);
  return (
    <div
      className="xp-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="xp-modal" style={{ width: 560 }}>
        <div className="xp-modal-tb" style={{ background: "#b71c1c" }}>
          <span className="xp-modal-title">Held Damage Record — {record.damageNo}</span>
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
              <b>Supplier:</b> {record.supplierName || "N/A"}
            </span>
            <span>
              <b>Items:</b> {record.items.length}
            </span>
            <span>
              <b>Amount:</b>{" "}
              <span style={{ color: "#b71c1c", fontWeight: 700 }}>
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
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {record.items.map((r, i) => (
                    <tr key={i}>
                      <td className="text-muted">{i + 1}</td>
                      <td className="text-muted">{r.code}</td>
                      <td>{r.name}</td>
                      <td className="text-muted">{r.uom}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">{fmt(r.rate)}</td>
                      <td className="r" style={{ color: "#b71c1c", fontWeight: 700 }}>
                        {fmt(r.amount)}
                      </td>
                      <td className="text-muted" style={{ fontSize: 10 }}>{r.reason || "—"}</td>
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
            style={{ background: "#b71c1c", borderColor: "#8b0000" }}
            onClick={() => onResume(record.id)}
          >
            Resume This Record
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE — DAMAGE IN with Sequential Numbers
══════════════════════════════════════════════════════════ */
export default function DamageInPage() {
  const [time, setTime] = useState(timeNow());
  const [allProducts, setAllProducts] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHoldPreview, setShowHoldPreview] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [curRow, setCurRow] = useState({ ...EMPTY_ROW });
  const [items, setItems] = useState([]);
  const [damageDate, setDamageDate] = useState(isoDate());
  const [damageNo, setDamageNo] = useState("1");
  const amountRef = useRef(null);
  const reasonRef = useRef(null);

  const [holdRecords, setHoldRecords] = useState(() => loadDamageInHolds());
  const [selItemIdx, setSelItemIdx] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [packingOptions, setPackingOptions] = useState([]);
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
    fetchProducts();
    loadAllRecords();
  }, []);
  
  useEffect(() => {
    saveDamageInHolds(holdRecords);
  }, [holdRecords]);

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const pRes = await api.get(EP.PRODUCTS.GET_ALL);
      if (pRes.data.success) setAllProducts(pRes.data.data);
    } catch {
      showMsg("Failed to load products", "error");
    }
    setLoading(false);
  };

  const loadAllRecords = () => {
    const saved = loadDamageInRecords();
    setAllRecords(saved);
  };

  const fetchNextDamageNo = async () => {
    const records = loadDamageInRecords();
    const holds = loadDamageInHolds();
    const allItems = [...records, ...holds];
    
    if (allItems.length > 0) {
      // Find the maximum number from all records and holds
      let maxNum = 0;
      allItems.forEach(item => {
        const num = parseInt(item.damageNo);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });
      setDamageNo(String(maxNum + 1));
    } else {
      setDamageNo("1");
    }
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
      reason: "",
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
    setTimeout(() => pcsRef.current?.focus(), 30);
  };

  const removeRow = () => {
    if (selItemIdx === null) return;
    setItems((p) => p.filter((_, i) => i !== selItemIdx));
    resetCurRow();
  };

  const holdRecord = () => {
    if (!items.length) {
      showMsg("No items to hold", "error");
      return;
    }
    setHoldRecords((p) => [
      ...p,
      {
        id: Date.now(),
        damageNo,
        damageDate,
        amount: subTotal,
        items: [...items],
        supplierName: "",
        reference: "",
      },
    ]);
    showMsg(`Damage record held: ${damageNo}`);
    fullReset();
    fetchNextDamageNo();
  };

  const resumeRecord = (holdId) => {
    const record = holdRecords.find((r) => r.id === holdId);
    if (!record) return;
    setItems(record.items);
    setDamageNo(record.damageNo);
    setDamageDate(record.damageDate || isoDate());
    setHoldRecords((p) => p.filter((r) => r.id !== holdId));
    setShowHoldPreview(null);
    resetCurRow();
    showMsg(`Resumed damage record: ${record.damageNo}`, "success");
  };

  const deleteHold = (holdId, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this held damage record?"))
      setHoldRecords((p) => p.filter((r) => r.id !== holdId));
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
    fetchNextDamageNo();
    setDamageDate(isoDate());
    setTimeout(() => searchRef.current?.focus(), 50);
  };
  
  const buildPayload = () => ({
    damageNo,
    damageDate,
    items: items.map((r) => ({
      productId: r.productId || undefined,
      code: r.code,
      name: r.name,
      description: r.name,
      uom: r.uom,
      rack: r.rack,
      pcs: parseFloat(r.pcs) || 1,
      rate: parseFloat(r.rate) || 0,
      amount: parseFloat(r.amount) || 0,
      reason: r.reason || "",
    })),
    totalQty,
    totalAmount: subTotal,
  });
  
  const saveDamageRecord = async () => {
    if (!items.length) {
      alert("Please add at least one damaged product");
      return;
    }
    
    setLoading(true);
    
    try {
      const finalRecord = {
        ...buildPayload(),
        supplierName: "Walk-in Damage",
        reference: "",
        savedAt: new Date().toISOString(),
      };
      
      const saved = saveDamageInRecord(finalRecord);
      
      if (saved) {
        showMsg(`Damage record saved: ${damageNo}`, "success");
        loadAllRecords();
        doPrint(finalRecord);
        fullReset();
        await fetchNextDamageNo();
      } else {
        showMsg("Failed to save damage record", "error");
      }
    } catch (e) {
      showMsg("Save failed", "error");
    }
    
    setLoading(false);
  };

  const loadRecordForEdit = (record) => {
    setEditId(record.damageNo);
    setDamageNo(record.damageNo);
    setDamageDate(record.damageDate);
    
    const loadedItems = (record.items || []).map((it) => ({
      productId: it.productId || "",
      code: it.code || "",
      name: it.name || it.description || "",
      uom: it.uom || "",
      rack: it.rack || "",
      pcs: it.pcs || it.qty || 1,
      rate: it.rate || 0,
      amount: it.amount || 0,
      reason: it.reason || "",
    }));
    setItems(loadedItems);
    
    resetCurRow();
    showMsg(`✏ Editing Damage Record ${record.damageNo}`, "success");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const navRecord = (dir) => {
    if (allRecords.length === 0) {
      loadAllRecords();
      return;
    }
    
    // Sort records by damage number numerically
    const sortedRecords = [...allRecords].sort((a, b) => {
      const numA = parseInt(a.damageNo);
      const numB = parseInt(b.damageNo);
      return numA - numB;
    });
    
    const curIdx = sortedRecords.findIndex((r) => r.damageNo === damageNo);
    let nextIdx = dir === "prev" ? curIdx - 1 : curIdx + 1;
    nextIdx = Math.max(0, Math.min(nextIdx, sortedRecords.length - 1));
    
    if (nextIdx === curIdx) return;
    if (nextIdx >= 0 && nextIdx < sortedRecords.length) {
      loadRecordForEdit(sortedRecords[nextIdx]);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (showProductModal || showHoldPreview) return;

      if (e.key === "F2") {
        e.preventDefault();
        setShowProductModal(true);
      }
      if (e.key === "F4") {
        e.preventDefault();
        holdRecord();
      }
      if (e.key === "*" || (e.ctrlKey && e.key === "s")) {
        e.preventDefault();
        if (items.length > 0) {
          saveRef.current?.click();
        }
      }
      if (e.key === "ArrowUp" && !editId) {
        e.preventDefault();
        navRecord("prev");
      }
      if (e.key === "ArrowDown" && !editId) {
        e.preventDefault();
        navRecord("next");
      }
      if (e.key === "Escape") resetCurRow();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, showProductModal, showHoldPreview, allRecords, damageNo, editId]);

  return (
    <>
      <div className="sl-page damage-in-page">
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
          <DamageInHoldPreviewModal
            record={showHoldPreview}
            onResume={resumeRecord}
            onClose={() => setShowHoldPreview(null)}
          />
        )}
        
        <div className="xp-titlebar" style={{ background: "#b71c1c" }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="rgba(255,255,255,0.85)"
          >
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z" />
          </svg>
          <span className="xp-tb-title">
            Damage In — Asim Electric &amp; Electronic Store
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
              <div className="sl-sale-title-box" style={{ background: "#b71c1c" }}>Damage In</div>
              
              <div className="sl-inv-field-grp">
                <label>Damage ID</label>
                <div className="sl-inv-nav-container">
                  <button
                    className="sl-inv-nav-btn sl-inv-nav-prev"
                    onClick={() => navRecord("prev")}
                    title="Previous Record (↑)"
                    type="button"
                  >
                    ◀
                  </button>
                  
                  <input
                    className="xp-input xp-input-sm sl-inv-input-large"
                    style={{ borderColor: "#b71c1c" }}
                    value={damageNo}
                    onChange={(e) => setDamageNo(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = damageNo.trim();
                        if (!val) return;
                        const found = allRecords.find((r) => r.damageNo === val);
                        if (found) {
                          loadRecordForEdit(found);
                        } else {
                          showMsg(`Damage record "${val}" not found`, "error");
                        }
                      }
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        navRecord(e.key === "ArrowUp" ? "prev" : "next");
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                  
                  <button
                    className="sl-inv-nav-btn sl-inv-nav-next"
                    onClick={() => navRecord("next")}
                    title="Next Record (↓)"
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
                  value={damageDate}
                  onChange={(e) => setDamageDate(e.target.value)}
                  style={{ borderColor: "#b71c1c" }}
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
                  Select Damaged Product <kbd>F2</kbd>
                </label>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    ref={searchRef}
                    type="text"
                    className="sl-product-input"
                    style={{ width: "100%", background: "#fffde7", borderColor: "#b71c1c" }}
                    placeholder="Search by code, name, category, company, supplier..."
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
                            _rate: pk?.purchaseRate || pk?.saleRate || 0,
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
                              _rate: pk?.purchaseRate || pk?.saleRate || 0,
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
                      border: "1px solid #b71c1c",
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
                            background: idx === selectedProductSuggestionIdx ? "#ffebee" : "white",
                            borderBottom: "1px solid #eee"
                          }}
                          onClick={() => {
                            const pk = p.packingInfo?.[0];
                            pickProduct({
                              ...p,
                              _pi: 0,
                              _meas: pk?.measurement || "",
                              _rate: pk?.purchaseRate || pk?.saleRate || 0,
                              _pack: pk?.packing || 1,
                              _stock: pk?.openingQty || 0,
                              _name: [p.category, p.description, p.company].filter(Boolean).join(" "),
                            });
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{p.code} - {p.description}</div>
                          <div style={{ fontSize: 10, color: "#666" }}>{p.category} | {p.company} | Supplier: {p.supplierName || "—"}</div>
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
                  style={{ width: 60, background: "#fffde7", borderColor: "#b71c1c" }}
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
                  style={{ width: 75, background: "#fffde7", borderColor: "#b71c1c" }}
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
                  style={{ width: 80, background: "#fffde7", borderColor: "#b71c1c" }}
                  value={curRow.amount || 0}
                  onChange={(e) =>
                    setCurRow((p) => ({
                      ...p,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => e.key === "Enter" && reasonRef.current?.focus()}
                />
              </div>
              <div className="sl-entry-cell">
                <label>Reason</label>
                <input
                  ref={reasonRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 100, background: "#fffde7", borderColor: "#b71c1c" }}
                  value={curRow.reason}
                  placeholder="Damage reason..."
                  onChange={(e) => setCurRow((p) => ({ ...p, reason: e.target.value }))}
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
                    style={{ background: "#b71c1c", borderColor: "#8b0000" }}
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
                  "Select Damaged Product"
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
                    <th>Product Name</th>
                    <th style={{ width: 55 }} className="r">
                      Pcs
                    </th>
                    <th style={{ width: 80 }} className="r">
                      Rate
                    </th>
                    <th style={{ width: 90 }} className="r">
                      Amount
                    </th>
                    <th style={{ width: 120 }}>Damage Reason</th>
                    <th style={{ width: 50 }}>Rack</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="xp-empty" style={{ padding: 14 }}>
                        ⚠ Search and add damaged products
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
                      <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>
                        {i + 1}
                      </td>
                      <td className="muted">{r.code}</td>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td className="r">{r.pcs}</td>
                      <td className="r">{fmt(r.rate)}</td>
                      <td className="r" style={{ color: "#b71c1c", fontWeight: 600 }}>
                        {fmt(r.amount)}
                      </td>
                      <td className="muted" style={{ fontSize: 11 }}>{r.reason || "—"}</td>
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
                <input className="sl-sum-val" value={totalQty.toLocaleString("en-PK")} readOnly />
              </div>
              <div className="sl-sum-cell">
                <label>Total Damage Value</label>
                <input className="sl-sum-val" style={{ color: "#b71c1c", fontWeight: "bold", fontSize: "16px" }} value={fmt(subTotal)} readOnly />
              </div>
              <div className="sl-sum-cell" style={{ flex: 2 }}>
                <label style={{ color: "#666" }}>Press * or Ctrl+S to save</label>
              </div>
            </div>
          </div>

          {/* Right panel - Hold Records */}
          <div className="sl-right">
            <div className="sl-hold-panel">
              <div className="sl-hold-title" style={{ background: "#b71c1c" }}>
                <span>
                  📋 Damage Hold{" "}
                  <kbd style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "0 3px", borderRadius: 2 }}>F4</kbd>
                </span>
                <span className="sl-hold-cnt">{holdRecords.length}</span>
              </div>
              <div className="sl-hold-table-wrap">
                <table className="sl-hold-table">
                  <thead>
                    <tr>
                      <th style={{ width: 24 }}>#</th>
                      <th>Damage ID</th>
                      <th className="r">Amount</th>
                      <th>Date</th>
                      <th style={{ width: 22 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdRecords.length === 0 ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}><td colSpan={5} style={{ height: 22 }} /></tr>
                      ))
                    ) : (
                      holdRecords.map((r, i) => (
                        <tr
                          key={r.id}
                          onClick={() => setShowHoldPreview(r)}
                          onDoubleClick={() => resumeRecord(r.id)}
                          style={{ cursor: "pointer" }}
                          title="Click = preview · Double-click = resume"
                        >
                          <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>{i + 1}</td>
                          <td style={{ fontFamily: "var(--xp-mono)", fontSize: "var(--xp-fs-xs)" }}>{r.damageNo}</td>
                          <td className="r" style={{ color: "#b71c1c", fontWeight: 600 }}>{fmt(r.amount)}</td>
                          <td className="muted" style={{ fontSize: "var(--xp-fs-xs)" }}>{r.damageDate}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="xp-btn xp-btn-sm xp-btn-ico"
                              style={{ width: 18, height: 18, fontSize: 9, color: "var(--xp-red)" }}
                              onClick={(e) => deleteHold(r.id, e)}
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
                  style={{ width: "100%", background: "#b71c1c", color: "white", borderColor: "#8b0000" }}
                  onClick={holdRecord}
                  disabled={!items.length}
                >
                  📌 Hold Damage Record (F4)
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: 8, padding: "8px", background: "#ffebee", borderRadius: 6, textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#b71c1c" }}>
                💡 Tip: Press <kbd style={{ background: "#fff", padding: "2px 6px", borderRadius: 3 }}>*</kbd> or <kbd style={{ background: "#fff", padding: "2px 6px", borderRadius: 3 }}>Ctrl+S</kbd> to save damage record
              </span>
            </div>
          </div>
        </div>

        {/* Commands bar */}
        <div className="sl-cmd-bar">
          <button className="xp-btn xp-btn-sm" onClick={fullReset} disabled={loading}>
            🆕 New Record
          </button>
          <button
            ref={saveRef}
            className="xp-btn xp-btn-primary xp-btn-lg"
            style={{ background: "#b71c1c", borderColor: "#8b0000" }}
            onClick={saveDamageRecord}
            disabled={loading || items.length === 0}
          >
            {loading ? "Saving…" : "💾 Save Damage Record  *"}
          </button>
          <div className="xp-toolbar-divider" />
          <span className="sl-inv-info">
            ⚠ {damageNo} | Items: {items.length} | Total Damage: PKR {fmt(subTotal)}
          </span>
          <button className="xp-btn xp-btn-sm" style={{ marginLeft: "auto" }} onClick={fullReset}>
            Close
          </button>
        </div>

        {/* Status bar */}
        <div className="xp-statusbar">
          <div className="xp-status-pane">⚠ {damageNo}</div>
          <div className="xp-status-pane">Items: {items.length}</div>
          <div className="xp-status-pane">Qty: {totalQty}</div>
          <div className="xp-status-pane">Damage Value: PKR {fmt(subTotal)}</div>
          <div className="xp-status-pane">Hold: {holdRecords.length}</div>
        </div>
      </div>

      <style>{`
      .damage-in-page {
        background: #ffffff;
      }
      
      .damage-in-page input, 
      .damage-in-page .xp-input, 
      .damage-in-page .sl-product-input, 
      .damage-in-page .sl-num-input, 
      .damage-in-page .sl-sum-input,
      .damage-in-page .sl-inv-input-large,
      .damage-in-page .sl-date-input {
        border-color: #b71c1c !important;
        border-width: 1px !important;
        border-style: solid !important;
      }
      
      .damage-in-page .sl-items-table th,
      .damage-in-page .sl-items-table td,
      .damage-in-page .sl-hold-table th,
      .damage-in-page .sl-hold-table td {
        border-color: #b71c1c !important;
        border-width: 1px !important;
      }
      
      .damage-in-page .sl-items-table thead th {
        background: #b71c1c !important;
        color: white !important;
      }
      
      .damage-in-page tr.sl-sel-row td {
        background-color: #ffebee !important;
      }
      
      .damage-in-page .sl-hold-title {
        background: #b71c1c !important;
        color: white !important;
      }
      
      .damage-in-page .sl-summary-bar {
        border-top: 1px solid #b71c1c;
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
        background: #b71c1c;
        border-color: #8b0000;
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
        border-color: #b71c1c !important;
        outline: none;
        box-shadow: 0 0 0 3px rgba(183, 28, 28, 0.1);
      }
      `}</style>
    </>
  );
}