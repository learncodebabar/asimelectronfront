// pages/DamageOutPage.jsx - Fixed missing closing tags
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
const DAMAGE_OUT_HOLD_KEY = "asim_damage_out_hold_v1";
const DAMAGE_OUT_STORAGE_KEY = "asim_damage_out_records_v1";
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
  damageInRef: "",
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
const loadDamageInRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(DAMAGE_IN_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const loadDamageOutHolds = () => {
  try {
    return JSON.parse(localStorage.getItem(DAMAGE_OUT_HOLD_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveDamageOutHolds = (records) => {
  try {
    localStorage.setItem(DAMAGE_OUT_HOLD_KEY, JSON.stringify(records));
  } catch {}
};

const loadDamageOutRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(DAMAGE_OUT_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveDamageOutRecord = (record) => {
  try {
    const existing = loadDamageOutRecords();
    existing.push({ ...record, savedAt: new Date().toISOString() });
    localStorage.setItem(DAMAGE_OUT_STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
};

/* ══════════════════════════════════════════════════════════
   PRINT HTML BUILDER — Damage Out Report
══════════════════════════════════════════════════════════ */

const buildDamageOutPrintHtml = (record) => {
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
        <td style="font-size:9px;vertical-align:top;padding:4px">${it.damageInRef || "—"}</td>
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
    .header{text-align:center;border-bottom:2px solid #e65100;padding-bottom:5px;margin-bottom:8px}
    .damage-title{font-size:22px;font-weight:bold;margin:5px 0;letter-spacing:2px;color:#e65100}
    .meta-row{display:flex;justify-content:space-between;margin:4px 0;font-size:9px}
    .divider-dash{border:none;border-top:1px dashed #666;margin:4px 0}
    .divider-solid{border:none;border-top:1px solid #e65100;margin:4px 0}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:1px solid #e65100;background:#f5f5f5}
    th{font-size:10px;font-weight:bold;padding:5px 4px;text-align:left}
    th.r{text-align:right}
    td{padding:4px;font-size:10px;vertical-align:top;border-bottom:1px solid #eee}
    .footer{text-align:center;font-size:8px;color:#777;margin-top:10px;border-top:1px dashed #ccc;padding-top:5px}
    .signature{display:flex;justify-content:space-between;margin-top:15px;padding-top:10px}
    .sign-line{text-align:center;font-size:9px}
    .sign-line span{display:inline-block;border-top:1px solid #000;min-width:100px;margin-top:20px;padding-top:3px}
    .totals-box{margin-top:10px;border-top:2px solid #e65100;padding-top:8px}
    .sum-row{display:flex;justify-content:space-between;padding:3px 0}
    .sum-row.bold{font-weight:bold;font-size:12px}
    @media print{@page{size:80mm auto;margin:2mm}body{width:76mm}}
  </style></head><body>

    <div class="header">
      <div class="shop-urdu">${SHOP_INFO.name}</div>
      <div class="shop-addr">${SHOP_INFO.address}</div>
      <div class="shop-phones">${SHOP_INFO.phone1} | ${SHOP_INFO.phone2}</div>
      <div class="damage-title">⚠ DAMAGE OUT REPORT</div>
    </div>

    <div class="meta-row">
      <span><b>Damage Out ID:</b> ${record.damageOutNo}</span>
      <span><b>Date:</b> ${record.damageOutDate}</span>
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
          <th style="width:80px">Damage In Ref</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <hr class="divider-solid">
    
    <div class="totals-box">
      <div class="sum-row"><span>Total Items:</span><span>${rows.length}</span></div>
      <div class="sum-row"><span>Total Quantity:</span><span>${totalQty}</span></div>
      <div class="sum-row bold"><span>Total Damage Out Value:</span><span>PKR ${fmt(totalAmount)}</span></div>
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
  w.document.write(buildDamageOutPrintHtml(record));
  w.document.close();
  setTimeout(() => w.print(), 400);
};

/* ══════════════════════════════════════════════════════════
   DAMAGE IN PRODUCT SEARCH MODAL - Only shows products from Damage In
══════════════════════════════════════════════════════════ */
function DamageInProductSearchModal({ onSelect, onClose }) {
  const [searchText, setSearchText] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [hiIdx, setHiIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    loadDamageInData();
  }, []);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const loadDamageInData = () => {
    setLoading(true);
    const records = loadDamageInRecords();
    const products = [];
    records.forEach(record => {
      record.items.forEach(item => {
        products.push({
          ...item,
          damageInRef: record.damageNo,
          damageInDate: record.damageDate,
        });
      });
    });
    setFilteredProducts(products);
    setLoading(false);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    const searchLower = value.toLowerCase();
    const records = loadDamageInRecords();
    const products = [];
    records.forEach(record => {
      record.items.forEach(item => {
        if (!searchLower || 
            item.code?.toLowerCase().includes(searchLower) ||
            item.name?.toLowerCase().includes(searchLower)) {
          products.push({
            ...item,
            damageInRef: record.damageNo,
            damageInDate: record.damageDate,
          });
        }
      });
    });
    setFilteredProducts(products);
    setHiIdx(products.length > 0 ? 0 : -1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHiIdx((prev) => Math.min(prev + 1, filteredProducts.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHiIdx((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts[hiIdx]) {
        onSelect(filteredProducts[hiIdx]);
      }
    }
  };

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000 }}>
      <div className="xp-modal" style={{ 
        width: "95%", 
        maxWidth: "1200px", 
        height: "85vh",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px",
        background: "#ffffff",
        border: "2px solid #e65100"
      }}>
        <div className="xp-modal-tb" style={{ 
          background: "#e65100", 
          padding: "10px 16px",
          borderRadius: "10px 10px 0 0"
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
          </svg>
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>SEARCH DAMAGED PRODUCTS (FROM DAMAGE IN)</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        
        <div className="cs-modal-filters" style={{ 
          padding: "12px 16px", 
          gap: "10px", 
          background: "#f8fafc",
          borderBottom: "1px solid #e65100",
          flexWrap: "wrap"
        }}>
          <div className="cs-modal-filter-grp" style={{ flex: 2, minWidth: "200px" }}>
            <label className="xp-label" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", marginBottom: "3px", display: "block" }}>SEARCH PRODUCT</label>
            <input
              ref={searchRef}
              type="text"
              className="xp-input"
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by code or name..."
              autoComplete="off"
              style={{ height: "32px", fontSize: "12px", border: "1px solid #e65100", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", paddingBottom: "2px" }}>
            <span style={{ fontSize: "11px", color: "#e65100", fontWeight: "bold" }}>{filteredProducts.length} PRODUCT(S) FOUND</span>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #e65100", borderRadius: "4px", fontWeight: "bold" }}>CLOSE</button>
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
                border: "1px solid #e65100"
              }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ width: 40, padding: "8px 6px", textAlign: "center", border: "1px solid #e65100", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>SR.#</th>
                    <th style={{ width: 100, padding: "8px 6px", textAlign: "left", border: "1px solid #e65100", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>CODE</th>
                    <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #e65100", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>PRODUCT NAME</th>
                    <th style={{ width: 60, padding: "8px 6px", textAlign: "center", border: "1px solid #e65100", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>UOM</th>
                    <th style={{ width: 85, padding: "8px 6px", textAlign: "right", border: "1px solid #e65100", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>RATE</th>
                    <th style={{ width: 70, padding: "8px 6px", textAlign: "center", border: "1px solid #e65100", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>AVAIL QTY</th>
                    <th style={{ width: 100, padding: "8px 6px", textAlign: "left", border: "1px solid #e65100", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>DAMAGE IN REF</th>
                    <th style={{ width: 100, padding: "8px 6px", textAlign: "left", border: "1px solid #e65100", fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>DAMAGE REASON</th>
                  </tr>
                </thead>
                <tbody ref={listRef} tabIndex={0} onKeyDown={handleKeyDown}>
                  {loading && (
                    <tr>
                      <td colSpan={8} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#e65100", fontSize: "12px", fontWeight: "bold" }}>
                        LOADING...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#e65100", fontSize: "12px", fontWeight: "bold" }}>
                        NO DAMAGED PRODUCTS FOUND. PLEASE ADD DAMAGE IN FIRST.
                      </td>
                    </tr>
                  )}
                  {filteredProducts.map((product, i) => (
                    <tr
                      key={`${product.productId}-${i}`}
                      style={{
                        background: i === hiIdx ? "#fff3e0" : "white",
                        cursor: "pointer"
                      }}
                      onClick={() => setHiIdx(i)}
                      onDoubleClick={() => onSelect(product)}
                    >
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "6px 6px", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>
                        {product.code}
                      </td>
                      <td style={{ padding: "6px 6px", border: "1px solid #e65100", fontSize: "14px", fontWeight: "bold", color: "#000000" }}>
                        {product.name}
                      </td>
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #e65100", fontSize: "13px", fontWeight: "bold", color: "#000000" }}>{product.uom || "—"}</td>
                      <td style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #e65100", fontSize: "13px", fontWeight: "bold", color: "#000000" }}>
                        {fmt(product.rate)}
                      </td>
                      <td style={{ padding: "6px 6px", textAlign: "center", border: "1px solid #e65100", fontSize: "13px", fontWeight: "bold", color: "#e65100" }}>
                        {product.pcs}
                      </td>
                      <td style={{ padding: "6px 6px", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>
                        {product.damageInRef}
                      </td>
                      <td style={{ padding: "6px 6px", border: "1px solid #e65100", fontSize: "11px", color: "#000000" }}>
                        {product.reason || "—"}
                      </td>
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
          color: "#e65100", 
          fontWeight: "bold",
          borderTop: "1px solid #e65100", 
          background: "#f8fafc",
          borderRadius: "0 0 10px 10px"
        }}>
          <span>↑↓ NAVIGATE</span> &nbsp;|&nbsp; <span>ENTER / DOUBLE-CLICK = SELECT</span> &nbsp;|&nbsp; <span>ESC = CLOSE</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DAMAGE OUT HOLD PREVIEW MODAL
══════════════════════════════════════════════════════════ */
function DamageOutHoldPreviewModal({ record, onResume, onClose }) {
  if (!record) return null;
  const total = record.items.reduce((s, r) => s + Number(r.amount || 0), 0);
  return (
    <div
      className="xp-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="xp-modal" style={{ width: 560 }}>
        <div className="xp-modal-tb" style={{ background: "#e65100" }}>
          <span className="xp-modal-title">HOLD DAMAGE OUT — {record.damageOutNo}</span>
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
              <b>ITEMS:</b> {record.items.length}
            </span>
            <span>
              <b>AMOUNT:</b>{" "}
              <span style={{ color: "#e65100", fontWeight: 700 }}>
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
                    <th>CODE</th>
                    <th>NAME</th>
                    <th>UOM</th>
                    <th className="r">QTY</th>
                    <th className="r">RATE</th>
                    <th className="r">AMOUNT</th>
                    <th>DAMAGE IN REF</th>
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
                      <td className="r" style={{ color: "#e65100", fontWeight: 700 }}>
                        {fmt(r.amount)}
                      </td>
                      <td className="text-muted" style={{ fontSize: 10 }}>{r.damageInRef || "—"}</td>
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
            CANCEL
          </button>
          <button
            className="xp-btn xp-btn-primary xp-btn-sm"
            style={{ background: "#e65100", borderColor: "#bf360c" }}
            onClick={() => onResume(record.id)}
          >
            RESUME THIS RECORD
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE — DAMAGE OUT
══════════════════════════════════════════════════════════ */
export default function DamageOutPage() {
  const [time, setTime] = useState(timeNow());
  const [allDamageInProducts, setAllDamageInProducts] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHoldPreview, setShowHoldPreview] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [curRow, setCurRow] = useState({ ...EMPTY_ROW });
  const [items, setItems] = useState([]);
  const [damageOutDate, setDamageOutDate] = useState(isoDate());
  const [damageOutNo, setDamageOutNo] = useState("1");
  const amountRef = useRef(null);
  const reasonRef = useRef(null);

  const [holdRecords, setHoldRecords] = useState(() => loadDamageOutHolds());
  const [selItemIdx, setSelItemIdx] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
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
    loadDamageInProducts();
    loadAllRecords();
  }, []);
  
  useEffect(() => {
    saveDamageOutHolds(holdRecords);
  }, [holdRecords]);

  useEffect(() => {
    if (!searchText.trim()) {
      setProductSuggestions([]);
      setShowProductSuggestions(false);
      return;
    }
    
    const q = searchText.trim().toLowerCase();
    const matches = allDamageInProducts.filter(p => 
      p.code?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q)
    ).slice(0, 10);
    
    setProductSuggestions(matches);
    setShowProductSuggestions(matches.length > 0 && !curRow.name);
    setSelectedProductSuggestionIdx(-1);
  }, [searchText, allDamageInProducts, curRow.name]);

  const subTotal = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalQty = items.reduce((s, r) => s + (parseFloat(r.pcs) || 0), 0);

  const loadDamageInProducts = () => {
    const records = loadDamageInRecords();
    const products = [];
    records.forEach(record => {
      record.items.forEach(item => {
        products.push({
          ...item,
          damageInRef: record.damageNo,
          damageInDate: record.damageDate,
          availableQty: item.pcs,
        });
      });
    });
    setAllDamageInProducts(products);
  };

  const loadAllRecords = () => {
    const saved = loadDamageOutRecords();
    setAllRecords(saved);
  };

  const fetchNextDamageOutNo = async () => {
    const records = loadDamageOutRecords();
    const holds = loadDamageOutHolds();
    const allItems = [...records, ...holds];
    
    if (allItems.length > 0) {
      let maxNum = 0;
      allItems.forEach(item => {
        const num = parseInt(item.damageOutNo);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });
      setDamageOutNo(String(maxNum + 1));
    } else {
      setDamageOutNo("1");
    }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3500);
  };
  
  const pickProduct = (product) => {
    if (!product.productId) {
      showMsg("Product ID missing", "error");
      return;
    }
    setCurRow({
      productId: product.productId,
      code: product.code || "",
      name: product.name || "",
      uom: product.uom || "",
      rack: product.rack || "",
      pcs: 1,
      rate: product.rate || 0,
      amount: product.rate || 0,
      reason: product.reason || "",
      damageInRef: product.damageInRef || "",
      maxQty: product.availableQty || product.pcs || 1,
    });
    setSearchText(product.code || "");
    setShowProductModal(false);
    setShowProductSuggestions(false);
    setTimeout(() => pcsRef.current?.focus(), 30);
  };

  const updateCurRow = (field, val) => {
    setCurRow((prev) => {
      const u = { ...prev, [field]: val };
      if (field === "pcs") {
        const maxQty = prev.maxQty || 1;
        let pcsValue = parseFloat(val) || 0;
        if (pcsValue > maxQty) {
          showMsg(`Cannot exceed available quantity (${maxQty})`, "error");
          pcsValue = maxQty;
        }
        u.pcs = pcsValue;
      }
      u.amount = (parseFloat(field === "pcs" ? u.pcs : prev.pcs) || 0) *
                  (parseFloat(field === "rate" ? val : prev.rate) || 0);
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
    
    const existingIndex = items.findIndex(i => i.productId === curRow.productId && i.damageInRef === curRow.damageInRef);
    if (existingIndex !== -1 && selItemIdx === null) {
      showMsg("This product is already added. Please edit the existing row.", "error");
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
    setSelItemIdx(null);
    setShowProductSuggestions(false);
    setTimeout(() => searchRef.current?.focus(), 30);
  };

  const loadRowForEdit = (idx) => {
    setSelItemIdx(idx);
    const r = items[idx];
    setCurRow({ ...r, maxQty: r.pcs });
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
        damageOutNo,
        damageOutDate,
        amount: subTotal,
        items: [...items],
      },
    ]);
    showMsg(`Damage out record held: ${damageOutNo}`);
    fullReset();
    fetchNextDamageOutNo();
  };

  const resumeRecord = (holdId) => {
    const record = holdRecords.find((r) => r.id === holdId);
    if (!record) return;
    setItems(record.items);
    setDamageOutNo(record.damageOutNo);
    setDamageOutDate(record.damageOutDate || isoDate());
    setHoldRecords((p) => p.filter((r) => r.id !== holdId));
    setShowHoldPreview(null);
    resetCurRow();
    showMsg(`Resumed damage out record: ${record.damageOutNo}`, "success");
  };

  const deleteHold = (holdId, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this held damage out record?"))
      setHoldRecords((p) => p.filter((r) => r.id !== holdId));
  };

  const fullReset = () => {
    setItems([]);
    setCurRow({ ...EMPTY_ROW });
    setSearchText("");
    setSelItemIdx(null);
    setMsg({ text: "", type: "" });
    setShowProductSuggestions(false);
    setEditId(null);
    fetchNextDamageOutNo();
    setDamageOutDate(isoDate());
    setTimeout(() => searchRef.current?.focus(), 50);
  };
  
  const buildPayload = () => ({
    damageOutNo,
    damageOutDate,
    items: items.map((r) => ({
      productId: r.productId || undefined,
      code: r.code,
      name: r.name,
      uom: r.uom,
      rack: r.rack,
      pcs: parseFloat(r.pcs) || 1,
      rate: parseFloat(r.rate) || 0,
      amount: parseFloat(r.amount) || 0,
      reason: r.reason || "",
      damageInRef: r.damageInRef || "",
    })),
    totalQty,
    totalAmount: subTotal,
  });
  
  const saveDamageOutRecord = async () => {
    if (!items.length) {
      alert("Please add at least one damaged product for disposal");
      return;
    }
    
    setLoading(true);
    
    try {
      const finalRecord = {
        ...buildPayload(),
        savedAt: new Date().toISOString(),
      };
      
      const saved = saveDamageOutRecord(finalRecord);
      
      if (saved) {
        showMsg(`Damage out record saved: ${damageOutNo}`, "success");
        loadAllRecords();
        doPrint(finalRecord);
        fullReset();
        await fetchNextDamageOutNo();
      } else {
        showMsg("Failed to save damage out record", "error");
      }
    } catch (e) {
      showMsg("Save failed", "error");
    }
    
    setLoading(false);
  };

  const loadRecordForEdit = (record) => {
    setEditId(record.damageOutNo);
    setDamageOutNo(record.damageOutNo);
    setDamageOutDate(record.damageOutDate);
    
    const loadedItems = (record.items || []).map((it) => ({
      productId: it.productId || "",
      code: it.code || "",
      name: it.name || "",
      uom: it.uom || "",
      rack: it.rack || "",
      pcs: it.pcs || 1,
      rate: it.rate || 0,
      amount: it.amount || 0,
      reason: it.reason || "",
      damageInRef: it.damageInRef || "",
    }));
    setItems(loadedItems);
    
    resetCurRow();
    showMsg(`✏ Editing Damage Out Record ${record.damageOutNo}`, "success");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const navRecord = (dir) => {
    if (allRecords.length === 0) {
      loadAllRecords();
      return;
    }
    
    const sortedRecords = [...allRecords].sort((a, b) => {
      const numA = parseInt(a.damageOutNo);
      const numB = parseInt(b.damageOutNo);
      return numA - numB;
    });
    
    const curIdx = sortedRecords.findIndex((r) => r.damageOutNo === damageOutNo);
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
  }, [items, showProductModal, showHoldPreview, allRecords, damageOutNo, editId]);

  return (
    <>
      <div className="sl-page damage-out-page">
        {showProductModal && (
          <DamageInProductSearchModal
            onSelect={pickProduct}
            onClose={() => {
              setShowProductModal(false);
              setTimeout(() => searchRef.current?.focus(), 30);
            }}
          />
        )}
        {showHoldPreview && (
          <DamageOutHoldPreviewModal
            record={showHoldPreview}
            onResume={resumeRecord}
            onClose={() => setShowHoldPreview(null)}
          />
        )}
        
        <div className="xp-titlebar" style={{ background: "#e65100" }}>
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
            DAMAGE OUT — ASIM ELECTRIC &amp; ELECTRONIC STORE
          </span>
          <div className="xp-tb-actions">
            <div className="xp-tb-divider" />
            <div className="sl-shortcut-hints">
              <span>F2 PRODUCT</span>
              <span>F4 HOLD</span>
              <span>↑/↓ NAVIGATE</span>
              <span>* SAVE</span>
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
              <div className="sl-sale-title-box" style={{ background: "#e65100" }}>DAMAGE OUT</div>
              
              <div className="sl-inv-field-grp">
                <label>DAMAGE OUT ID</label>
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
                    style={{ borderColor: "#e65100" }}
                    value={damageOutNo}
                    onChange={(e) => setDamageOutNo(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = damageOutNo.trim();
                        if (!val) return;
                        const found = allRecords.find((r) => r.damageOutNo === val);
                        if (found) {
                          loadRecordForEdit(found);
                        } else {
                          showMsg(`Damage out record "${val}" not found`, "error");
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
                <label>DATE</label>
                <input
                  type="date"
                  className="xp-input xp-input-sm sl-date-input"
                  value={damageOutDate}
                  readOnly
                  style={{ 
                    borderColor: "#e65100",
                    background: "#f5f5f5",
                    cursor: "not-allowed",
                    color: "#888"
                  }}
                />
              </div>
              <div className="sl-inv-field-grp">
                <label>TIME</label>
                <div className="sl-time-box">{time}</div>
              </div>
            </div>

            {/* Entry strip */}
            <div className="sl-entry-strip">
              <div className="sl-entry-cell sl-entry-product">
                <label>
                  SELECT DAMAGED PRODUCT <kbd>F2</kbd>
                </label>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    ref={searchRef}
                    type="text"
                    className="sl-product-input"
                    style={{ width: "100%", background: "#fffde7", borderColor: "#e65100" }}
                    placeholder="Search damaged products from Damage In records..."
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
                          pickProduct(productSuggestions[selectedProductSuggestionIdx]);
                          setProductSuggestions([]);
                          setShowProductSuggestions(false);
                        } else if (searchText.trim()) {
                          setShowProductModal(true);
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
                      border: "1px solid #e65100",
                      borderRadius: 4,
                      maxHeight: 200,
                      overflowY: "auto",
                      zIndex: 100,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}>
                      {productSuggestions.map((p, idx) => (
                        <div
                          key={p.productId}
                          style={{
                            padding: "6px 10px",
                            cursor: "pointer",
                            background: idx === selectedProductSuggestionIdx ? "#fff3e0" : "white",
                            borderBottom: "1px solid #eee"
                          }}
                          onClick={() => pickProduct(p)}
                        >
                          <div style={{ fontWeight: 500 }}>{p.code} - {p.name}</div>
                          <div style={{ fontSize: 10, color: "#666" }}>Qty: {p.availableQty} | Damage In: {p.damageInRef}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="sl-entry-cell">
                <label>QTY</label>
                <input
                  ref={pcsRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 60, background: "#fffde7", borderColor: "#e65100" }}
                  value={curRow.pcs}
                  min={1}
                  max={curRow.maxQty}
                  onChange={(e) => updateCurRow("pcs", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && rateRef.current?.focus()}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="sl-entry-cell">
                <label>RATE</label>
                <input
                  ref={rateRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 75, background: "#fffde7", borderColor: "#e65100" }}
                  value={curRow.rate}
                  min={0}
                  onChange={(e) => updateCurRow("rate", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && amountRef.current?.focus()}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="sl-entry-cell">
                <label>AMOUNT</label>
                <input
                  ref={amountRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 80, background: "#fffde7", borderColor: "#e65100" }}
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
                <label>REASON</label>
                <input
                  ref={reasonRef}
                  type="text"
                  className="sl-num-input"
                  style={{ width: 100, background: "#fffde7", borderColor: "#e65100" }}
                  value={curRow.reason}
                  placeholder="Damage reason"
                  onChange={(e) => setCurRow((p) => ({ ...p, reason: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addRef.current?.click()}
                />
              </div>
              <div className="sl-entry-cell sl-entry-btns-cell">
                <label>&nbsp;</label>
                <div className="sl-entry-btns">
                  <button className="xp-btn xp-btn-sm" onClick={resetCurRow}>
                    RESET
                  </button>
                  <button
                    ref={addRef}
                    className="xp-btn xp-btn-primary xp-btn-sm"
                    style={{ background: "#e65100", borderColor: "#bf360c" }}
                    onClick={addRow}
                  >
                    {selItemIdx !== null ? "UPDATE" : "ADD"}
                  </button>
                  <button
                    className="xp-btn xp-btn-sm"
                    disabled={selItemIdx === null}
                    onClick={() =>
                      selItemIdx !== null && loadRowForEdit(selItemIdx)
                    }
                  >
                    EDIT
                  </button>
                  <button
                    className="xp-btn xp-btn-danger xp-btn-sm"
                    disabled={selItemIdx === null}
                    onClick={removeRow}
                  >
                    REMOVE
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
                  "SELECT DAMAGED PRODUCT FROM DAMAGE IN"
                )}
              </span>
              <span className="sl-table-qty">
                TOTAL QTY: {totalQty.toLocaleString("en-PK")}
              </span>
            </div>

            {/* Items table */}
            <div className="sl-items-wrap">
              <table className="sl-items-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>SR.#</th>
                    <th style={{ width: 72 }}>CODE</th>
                    <th>PRODUCT NAME</th>
                    <th style={{ width: 55 }} className="r">
                      QTY
                    </th>
                    <th style={{ width: 80 }} className="r">
                      RATE
                    </th>
                    <th style={{ width: 90 }} className="r">
                      AMOUNT
                    </th>
                    <th style={{ width: 100 }}>DAMAGE IN REF</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="xp-empty" style={{ padding: 14 }}>
                        ⚠ SEARCH AND ADD DAMAGED PRODUCTS FROM DAMAGE IN RECORDS
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
                      <td className="r">{r.pcs} {r.uom}</td>
                      <td className="r">{fmt(r.rate)}</td>
                      <td className="r" style={{ color: "#e65100", fontWeight: 600 }}>
                        {fmt(r.amount)}
                      </td>
                      <td className="muted" style={{ fontSize: 11 }}>{r.damageInRef || "—"}</td>
                      <td><button className="xp-btn xp-btn-sm xp-btn-danger" style={{ padding: "2px 6px" }} onClick={() => removeRow()}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary bar */}
            <div className="sl-summary-bar">
              <div className="sl-sum-cell">
                <label>TOTAL QTY</label>
                <input className="sl-sum-val" value={totalQty.toLocaleString("en-PK")} readOnly />
              </div>
              <div className="sl-sum-cell">
                <label>TOTAL DAMAGE VALUE</label>
                <input className="sl-sum-val" style={{ color: "#e65100", fontWeight: "bold", fontSize: "16px" }} value={fmt(subTotal)} readOnly />
              </div>
              <div className="sl-sum-cell" style={{ flex: 2 }}>
                <label style={{ color: "#666" }}>PRESS * OR CTRL+S TO SAVE</label>
              </div>
            </div>
          </div>

          {/* Right panel - Hold Records */}
          <div className="sl-right">
            <div className="sl-hold-panel">
              <div className="sl-hold-title" style={{ background: "#e65100" }}>
                <span>
                  📋 DAMAGE OUT HOLD{" "}
                  <kbd style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "0 3px", borderRadius: 2 }}>F4</kbd>
                </span>
                <span className="sl-hold-cnt">{holdRecords.length}</span>
              </div>
              <div className="sl-hold-table-wrap">
                <table className="sl-hold-table">
                  <thead>
                    <tr>
                      <th style={{ width: 24 }}>#</th>
                      <th>DAMAGE OUT ID</th>
                      <th className="r">AMOUNT</th>
                      <th>DATE</th>
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
                          title="CLICK = PREVIEW · DOUBLE-CLICK = RESUME"
                        >
                          <td className="muted" style={{ textAlign: "center", fontSize: "var(--xp-fs-xs)" }}>{i + 1}</td>
                          <td style={{ fontFamily: "var(--xp-mono)", fontSize: "var(--xp-fs-xs)" }}>{r.damageOutNo}</td>
                          <td className="r" style={{ color: "#e65100", fontWeight: 600 }}>{fmt(r.amount)}</td>
                          <td className="muted" style={{ fontSize: "var(--xp-fs-xs)" }}>{r.damageOutDate}</td>
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
                  style={{ width: "100%", background: "#e65100", color: "white", borderColor: "#bf360c" }}
                  onClick={holdRecord}
                  disabled={!items.length}
                >
                  📌 HOLD DAMAGE OUT (F4)
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: 8, padding: "8px", background: "#fff3e0", borderRadius: 6, textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#e65100" }}>
                💡 TIP: PRESS <kbd style={{ background: "#fff", padding: "2px 6px", borderRadius: 3 }}>*</kbd> OR <kbd style={{ background: "#fff", padding: "2px 6px", borderRadius: 3 }}>CTRL+S</kbd> TO SAVE
              </span>
            </div>
          </div>
        </div>

        {/* Commands bar */}
        <div className="sl-cmd-bar">
          <button className="xp-btn xp-btn-sm" onClick={fullReset} disabled={loading}>
            🆕 NEW RECORD
          </button>
          <button
            ref={saveRef}
            className="xp-btn xp-btn-primary xp-btn-lg"
            style={{ background: "#e65100", borderColor: "#bf360c" }}
            onClick={saveDamageOutRecord}
            disabled={loading || items.length === 0}
          >
            {loading ? "SAVING…" : "💾 SAVE DAMAGE OUT  *"}
          </button>
          <div className="xp-toolbar-divider" />
          <span className="sl-inv-info">
            ⚠ {damageOutNo} | ITEMS: {items.length} | TOTAL: PKR {fmt(subTotal)}
          </span>
          <button className="xp-btn xp-btn-sm" style={{ marginLeft: "auto" }} onClick={fullReset}>
            CLOSE
          </button>
        </div>

        {/* Status bar */}
        <div className="xp-statusbar">
          <div className="xp-status-pane">⚠ {damageOutNo}</div>
          <div className="xp-status-pane">ITEMS: {items.length}</div>
          <div className="xp-status-pane">QTY: {totalQty}</div>
          <div className="xp-status-pane">VALUE: PKR {fmt(subTotal)}</div>
          <div className="xp-status-pane">HOLD: {holdRecords.length}</div>
        </div>
      </div>

      <style>{`
      .damage-out-page {
        background: #ffffff;
      }
      
      .damage-out-page input, 
      .damage-out-page .xp-input, 
      .damage-out-page .sl-product-input, 
      .damage-out-page .sl-num-input, 
      .damage-out-page .sl-sum-input,
      .damage-out-page .sl-cust-input,
      .damage-out-page .sl-inv-input-large,
      .damage-out-page .sl-date-input {
        border-color: #e65100 !important;
        border-width: 1px !important;
        border-style: solid !important;
      }
      
      .damage-out-page .sl-items-table th,
      .damage-out-page .sl-items-table td,
      .damage-out-page .sl-hold-table th,
      .damage-out-page .sl-hold-table td {
        border-color: #e65100 !important;
        border-width: 1px !important;
      }
      
      .damage-out-page .sl-items-table thead th {
        background: #e65100 !important;
        color: white !important;
      }
      
      .damage-out-page tr.sl-sel-row td {
        background-color: #fff3e0 !important;
      }
      
      .damage-out-page .sl-hold-title {
        background: #e65100 !important;
        color: white !important;
      }
      
      .damage-out-page .sl-summary-bar {
        border-top: 1px solid #e65100;
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
        background: #e65100;
        border-color: #bf360c;
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
        border-color: #e65100 !important;
        outline: none;
        box-shadow: 0 0 0 3px rgba(230, 81, 0, 0.1);
      }
      `}</style>
    </>
  );
}