// pages/DamageOutPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/SalePage.css";
import "../styles/DamagePage.css";

const isoDate = () => new Date().toISOString().split("T")[0];
const timeNow = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const SHOP_NAME = "Asim Electric and Electronic Store";
const DAMAGE_IN_STORAGE_KEY = "asim_damage_in_records_v1";
const DAMAGE_OUT_STORAGE_KEY = "asim_damage_out_records_v1";
const HOLD_KEY = "asim_damageout_hold_v1";

const EMPTY_ENTRY = {
  productId: "",
  code: "",
  name: "",
  uom: "",
  packing: "",
  pcs: 1,
  rate: 0,
  amount: 0,
  damageInId: "",
  category: "",
  company: "",
  supplier: "",
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

const loadDamageInRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(DAMAGE_IN_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
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
   SEARCH MODAL — Full search with Category, Company, Supplier
══════════════════════════════════════════════════════════ */
function SearchModal({ damagedProducts, onSelect, onClose }) {
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

  const filterProducts = useCallback(() => {
    const ld = desc.trim().toLowerCase();
    const lc = cat.trim().toLowerCase();
    const lo = company.trim().toLowerCase();
    const ls = supplier.trim().toLowerCase();
    
    const filtered = damagedProducts.filter(p => {
      const matchDesc = !ld || 
        p.name?.toLowerCase().includes(ld) || 
        p.code?.toLowerCase().includes(ld) ||
        p.description?.toLowerCase().includes(ld);
      const matchCat = !lc || p.category?.toLowerCase().includes(lc);
      const matchCompany = !lo || p.company?.toLowerCase().includes(lo);
      const matchSupplier = !ls || p.supplierName?.toLowerCase().includes(ls) || p.supplier?.toLowerCase().includes(ls);
      
      return matchDesc && matchCat && matchCompany && matchSupplier;
    });
    
    setRows(filtered);
    setHiIdx(filtered.length > 0 ? 0 : -1);
  }, [damagedProducts, desc, cat, company, supplier]);

  useEffect(() => {
    rDesc.current?.focus();
    filterProducts();
  }, [filterProducts]);

  useEffect(() => {
    filterProducts();
  }, [desc, cat, company, supplier, filterProducts]);

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
        border: "2px solid #e65100"
      }}>
        <div className="xp-modal-tb" style={{ 
          background: "#e65100", 
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
          <span className="xp-modal-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>Search Damaged Products (from Damage In)</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "18px" }}>✕</button>
        </div>
        
        <div className="cs-modal-filters" style={{ 
          padding: "8px 12px", 
          gap: "10px", 
          background: "#f8fafc",
          borderBottom: "1px solid #e65100",
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
              style={{ height: "32px", fontSize: "12px", border: "1px solid #e65100", borderRadius: "4px", width: "100%", padding: "0 8px" }}
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
              style={{ height: "32px", fontSize: "12px", border: "1px solid #e65100", borderRadius: "4px", width: "100%", padding: "0 8px" }}
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
              style={{ height: "32px", fontSize: "12px", border: "1px solid #e65100", borderRadius: "4px", width: "100%", padding: "0 8px" }}
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
              style={{ height: "32px", fontSize: "12px", border: "1px solid #e65100", borderRadius: "4px", width: "100%", padding: "0 8px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", paddingBottom: "2px" }}>
            <span style={{ fontSize: "11px", color: "#e65100", fontWeight: "bold" }}>{rows.length} damaged product(s)</span>
            <button className="xp-btn xp-btn-sm" onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #e65100", borderRadius: "4px", fontWeight: "bold" }}>Close</button>
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
                    <th style={{ width: 40, padding: "5px 4px", textAlign: "center", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>#</th>
                    <th style={{ width: 80, padding: "5px 4px", textAlign: "center", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Damage In ID</th>
                    <th style={{ width: 90, padding: "5px 4px", textAlign: "left", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Code</th>
                    <th style={{ padding: "5px 4px", textAlign: "left", border: "1px solid #e65100", fontSize: "14px", fontWeight: "bold", color: "#000000" }}>Product Name</th>
                    <th style={{ width: 80, padding: "5px 4px", textAlign: "left", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Category</th>
                    <th style={{ width: 80, padding: "5px 4px", textAlign: "left", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Company</th>
                    <th style={{ width: 80, padding: "5px 4px", textAlign: "left", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Supplier</th>
                    <th style={{ width: 55, padding: "5px 4px", textAlign: "right", border: "1px solid #e65100", fontSize: "13px", fontWeight: "bold", color: "#e65100" }}>Avail. Qty</th>
                    <th style={{ width: 80, padding: "5px 4px", textAlign: "right", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Rate</th>
                    <th style={{ width: 90, padding: "5px 4px", textAlign: "right", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#e65100" }}>Amount</th>
                    <th style={{ width: 100, padding: "5px 4px", textAlign: "left", border: "1px solid #e65100", fontSize: "10px", fontWeight: "bold", color: "#000000" }}>Reason</th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef} tabIndex={0} onKeyDown={tk}>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="xp-empty" style={{ padding: "30px", textAlign: "center", color: "#e65100", fontSize: "12px", fontWeight: "bold" }}>
                        {damagedProducts.length === 0 ? "No damaged products found. Please add products to Damage In first." : "No matching products found"}
                      </td>
                    </tr>
                  )}
                  {rows.map((r, i) => (
                    <tr
                      key={`${r.damageInId}-${r.productId}`}
                      style={{
                        background: i === hiIdx ? "#fff3e0" : "white",
                        cursor: "pointer"
                      }}
                      onClick={() => setHiIdx(i)}
                      onDoubleClick={() => onSelect(r)}
                    >
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{i + 1}</td>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.damageInId}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.code}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #e65100", fontSize: "14px", fontWeight: "bold", color: "#000000" }}>{r.name}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.category || "—"}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.company || "—"}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{r.supplierName || r.supplier || "—"}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #e65100", fontSize: "13px", fontWeight: "bold", color: "#e65100" }}>{r.availableQty}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#000000" }}>{fmt(r.rate)}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #e65100", fontSize: "11px", fontWeight: "bold", color: "#e65100" }}>{fmt(r.amount)}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #e65100", fontSize: "10px", fontWeight: "bold", color: "#000000" }}>{r.reason || "—"}</td>
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
          <span>↑↓ navigate</span> &nbsp;|&nbsp; <span>Enter / Double-click = select</span> &nbsp;|&nbsp; <span>Esc = close</span> &nbsp;|&nbsp; <span>Tab = filters</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PRINT MODAL
══════════════════════════════════════════════════════════ */
function PrintModal({ record, onClose }) {
  const {
    invoiceNo,
    invoiceDate,
    buyerName,
    items,
    totalQty,
    netAmount,
    previousBalance,
    netReceivable,
  } = record;
  const doPrint = () => {
    const rowsHtml = items
      .map(
        (it, i) =>
          `<tr><td style="text-align:center">${i + 1}</td><td style="text-align:center">${it.damageInId || "—"}</td><td style="text-align:center">${it.code || ""}</td><td style="font-weight:bold">${it.name}</td><td style="text-align:right">${it.pcs}</td><td style="text-align:right">${Number(it.rate).toLocaleString()}</td><td style="text-align:right"><b>${Number(it.amount).toLocaleString()}</b></td></tr>`,
      )
      .join("");
    const win = window.open("", "_blank", "width=900,height=700");
    win.document
      .write(`<!DOCTYPE html><html><head><title>Damage Out ${invoiceNo}</title><style>
        body{font-family:Arial;font-size:12px;padding:20px}
        h2,h3{margin:0 0 4px;text-align:center}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ccc;padding:5px}
        th{background:#ffe0b2}
        .meta{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0;padding:6px 10px;background:#fff8e1;border:1px solid #ffd54f}
        .tots{float:right;min-width:240px;margin-top:10px}
        .tr{display:flex;justify-content:space-between;padding:2px 0}
        .tr.b{font-weight:bold;border-top:2px solid #000;margin-top:4px;padding-top:4px}
      </style></head><body>
      <h2>${SHOP_NAME}</h2><h3>DAMAGE OUT</h3>
      <div class='meta'><span><b>Invoice:</b> ${invoiceNo}</span><span><b>Date:</b> ${invoiceDate}</span><span><b>Party:</b> ${buyerName || "COUNTER SALE"}</span></div>
      <table><thead><tr><th>#</th><th>Damage In ID</th><th>Code</th><th>Name</th><th>Pcs</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <div class='tots'><div class='tr'><span>Total Qty</span><span>${totalQty}</span></div><div class='tr'><span>Net Amount</span><span>PKR ${Number(netAmount).toLocaleString()}</span></div><div class='tr'><span>Prev Balance</span><span>PKR ${Number(previousBalance).toLocaleString()}</span></div><div class='tr b'><span>Net Payable</span><span>PKR ${Number(netReceivable).toLocaleString()}</span></div></div>
      <br style='clear:both'><div style='text-align:center;margin-top:24px;font-size:11px;color:#888;border-top:1px dashed #ccc;padding-top:8px'>Thank you — ${SHOP_NAME}</div>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };
  useEffect(() => {
    doPrint();
  }, []);
  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="xp-modal xp-modal-lg">
        <div className="xp-modal-tb" style={{ background: "#e65100" }}>
          <span className="xp-modal-title">Damage Out — {invoiceNo}</span>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button>
        </div>
        <div className="xp-modal-body">
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{SHOP_NAME}</div>
            <div style={{ fontSize: 12, color: "#e65100", fontWeight: 600 }}>── DAMAGE OUT ──</div>
          </div>
          <div className="cs-inv-meta">
            <span>Invoice: <strong>{invoiceNo}</strong></span>
            <span>Date: <strong>{invoiceDate}</strong></span>
            <span>Party: <strong>{buyerName || "COUNTER SALE"}</strong></span>
          </div>
          <div className="xp-table-panel" style={{ marginTop: 8 }}>
            <table className="xp-table">
              <thead><tr><th>#</th><th>Damage In ID</th><th>Code</th><th>Name</th><th className="r">Pcs</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="text-muted">{it.damageInId || "—"}</td>
                    <td><span className="xp-code">{it.code}</span></td>
                    <td>{it.name}</td>
                    <td className="r">{it.pcs}</td>
                    <td className="r xp-amt">{fmt(it.rate)}</td>
                    <td className="r xp-amt">{fmt(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ maxWidth: 260, marginLeft: "auto", marginTop: 10 }}>
            {[["Total Qty", totalQty, false], ["Net Amount", fmt(netAmount), false], ["Prev Balance", fmt(previousBalance), false], ["Net Payable", `Rs. ${fmt(netReceivable)}`, true]].map(([l, v, bold]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: bold ? 700 : 400, borderTop: bold ? "2px solid #333" : "1px dotted #ddd", marginTop: bold ? 4 : 0 }}>
                <span>{l}</span><span>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="xp-modal-footer">
          <button className="xp-btn xp-btn-sm dmg-out-btn" onClick={doPrint}>🖨 Print Again</button>
          <button className="xp-btn xp-btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SAVE CONFIRM MODAL
══════════════════════════════════════════════════════════ */
function SaveConfirmModal({ record, onClose }) {
  const paidRef = useRef(null);
  const [paid, setPaid] = useState(record.netAmount);
  const paidVal = useRef(record.netAmount);

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
        onClose(null);
      }
      if (e.key === "Enter" && document.activeElement === paidRef.current) {
        e.preventDefault();
        const p = Number(paidVal.current || 0);
        onClose({ paid: p, remaining: record.netAmount - p });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handlePaidChange = (e) => {
    const v = e.target.value;
    setPaid(v);
    paidVal.current = v;
  };
  const remaining = record.netAmount - Number(paid || 0);
  const handleSave = () => {
    const p = Number(paidVal.current || 0);
    onClose({ paid: p, remaining: record.netAmount - p });
  };

  return (
    <div className="xp-overlay">
      <div style={{
        background: "var(--xp-silver-1)",
        border: "2px solid #e65100",
        borderRight: "2px solid #8d3900",
        borderBottom: "2px solid #8d3900",
        boxShadow: "var(--xp-shadow-window)",
        width: 480,
        maxWidth: "96vw",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--xp-font)",
      }}>
        <div style={{
          height: 28,
          background: "#e65100",
          display: "flex",
          alignItems: "center",
          padding: "0 4px 0 10px",
          gap: 6,
        }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "1px 1px 2px rgba(0,0,0,0.7)" }}>
            Confirm Save — {record.invoiceNo}
          </span>
          <button className="xp-cap-btn xp-cap-close" onClick={() => onClose(null)}>✕</button>
        </div>
        <div style={{ display: "flex", padding: "12px 12px 8px", gap: 0 }}>
          {[
            { label: "Net Amount", val: fmt(record.netAmount), color: "#e65100", editable: false, bg: "linear-gradient(180deg,#fff3e0 0%,#ffe0b2 100%)" },
            { label: "Paid", val: paid, color: "#1565c0", editable: true, bg: "linear-gradient(180deg,#dde8f8 0%,#c5d8f5 100%)" },
            { label: remaining >= 0 ? "Remaining" : "Overpaid", val: fmt(Math.abs(remaining)), color: remaining > 0 ? "#e65100" : "#2e7d32", editable: false, bg: remaining > 0 ? "linear-gradient(180deg,#fff3e0 0%,#ffe0b2 100%)" : "linear-gradient(180deg,#d4edda 0%,#b8dfc4 100%)" },
          ].map((box, idx) => (
            <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px", background: box.bg, border: "1px solid #ddd", borderLeft: idx > 0 ? "none" : "1px solid #ddd", borderRadius: idx === 0 ? "3px 0 0 3px" : idx === 2 ? "0 3px 3px 0" : 0 }}>
              <div style={{ fontSize: "var(--xp-fs-xs)", fontWeight: 700, color: box.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{box.label}</div>
              {box.editable ? (
                <input ref={paidRef} type="number" value={paid} onChange={handlePaidChange} onFocus={(e) => e.target.select()} style={{ fontSize: 28, fontWeight: 900, color: "#1565c0", fontFamily: "var(--xp-mono)", textAlign: "center", width: "100%", background: "transparent", border: "none", borderBottom: "2px solid #1565c0", outline: "none", padding: 0, MozAppearance: "textfield" }} />
              ) : (
                <div style={{ fontSize: 28, fontWeight: 900, color: box.color, fontFamily: "var(--xp-mono)", lineHeight: 1 }}>{remaining < 0 && idx === 2 && <span style={{ fontSize: 18, marginRight: 2 }}>−</span>}{box.val}</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: "var(--xp-silver-2)", boxShadow: "0 1px 0 #fff", margin: "0 12px" }} />
        <div style={{ display: "flex", gap: 6, padding: "8px 12px 10px", justifyContent: "center" }}>
          <button className="xp-btn xp-btn-sm" style={{ minWidth: 130, background: "#e65100", color: "#fff", borderColor: "#8d3900", fontWeight: 700 }} onClick={handleSave}>💾 Save Record</button>
          <button className="xp-btn xp-btn-sm" onClick={() => onClose(null)}>↩ Cancel</button>
        </div>
        <div style={{ background: "var(--xp-silver-3)", borderTop: "1px solid var(--xp-silver-2)", padding: "3px 12px", fontSize: 10.5, color: "#666", textAlign: "center" }}>↵ Enter = Save &nbsp;|&nbsp; Esc = Cancel</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE - DAMAGE OUT
══════════════════════════════════════════════════════════ */
export default function DamageOutPage() {
  const [time, setTime] = useState(timeNow());
  const [invoiceNo, setInvoiceNo] = useState("1");
  const [invoiceDate, setInvoiceDate] = useState(isoDate());
  const [buyerName, setBuyerName] = useState("COUNTER SALE");
  const [buyerCode, setBuyerCode] = useState("");
  const [previousBalance, setPreviousBalance] = useState(0);
  const [entry, setEntry] = useState({ ...EMPTY_ENTRY });
  const [searchText, setSearchText] = useState("");
  const [selItemIdx, setSelItemIdx] = useState(null);
  const [items, setItems] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState(null);
  const [damagedProducts, setDamagedProducts] = useState([]);
  const [holdBills, setHoldBills] = useState(() => loadHolds());
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [saving, setSaving] = useState(false);
  const [savedRecords, setSavedRecords] = useState([]);
  const [selId, setSelId] = useState(null);
  const [editId, setEditId] = useState(null);

  const searchRef = useRef(null);
  const pcsRef = useRef(null);
  const rateRef = useRef(null);
  const addBtnRef = useRef(null);
  const saveRef = useRef(null);

  const totalQty = items.reduce((s, r) => s + Number(r.pcs || 0), 0);
  const netAmount = items.reduce((s, r) => s + Number(r.amount || 0), 0);
  const balance = netAmount + Number(previousBalance || 0);
  const netReceivable = balance;

  useEffect(() => {
    const t = setInterval(() => setTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);
  
  useEffect(() => {
    loadDamagedProducts();
    loadSavedRecords();
    fetchNextInvoiceNo();
  }, []);
  
  useEffect(() => {
    saveHolds(holdBills);
  }, [holdBills]);

  const loadDamagedProducts = () => {
    const damageInRecords = loadDamageInRecords();
    const damageOutRecords = loadDamageOutRecords();
    
    const allDamagedItems = [];
    
    damageInRecords.forEach(record => {
      record.items.forEach(item => {
        const disposedQty = damageOutRecords.reduce((total, outRecord) => {
          const disposedItem = outRecord.items.find(i => 
            i.damageInId === record.damageNo && i.productId === item.productId
          );
          return total + (disposedItem ? disposedItem.pcs : 0);
        }, 0);
        
        const availableQty = item.pcs - disposedQty;
        
        if (availableQty > 0) {
          allDamagedItems.push({
            ...item,
            damageInId: record.damageNo,
            damageInDate: record.damageDate,
            supplierName: record.supplierName,
            availableQty: availableQty,
            originalQty: item.pcs,
            category: item.category || "",
            company: item.company || "",
            supplier: record.supplierName || "",
          });
        }
      });
    });
    
    setDamagedProducts(allDamagedItems);
  };

  const loadSavedRecords = () => {
    const records = loadDamageOutRecords();
    setSavedRecords(records);
  };

  const fetchNextInvoiceNo = () => {
    const records = loadDamageOutRecords();
    if (records.length > 0) {
      const maxNum = Math.max(...records.map(r => parseInt(r.invoiceNo) || 0));
      setInvoiceNo(String(maxNum + 1));
    } else {
      setInvoiceNo("1");
    }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const pickProduct = (product) => {
    setEntry({
      productId: product.productId,
      damageInId: product.damageInId,
      code: product.code || "",
      name: product.name || "",
      uom: product.uom || "",
      packing: product.packing || "",
      pcs: 1,
      rate: product.rate || 0,
      amount: product.rate || 0,
      maxPcs: product.availableQty,
      category: product.category || "",
      company: product.company || "",
      supplier: product.supplier || "",
    });
    setSearchText(product.name || "");
    setShowSearch(false);
    setTimeout(() => pcsRef.current?.focus(), 30);
  };

  const updateEntry = (field, val) => {
    setEntry((prev) => {
      const u = { ...prev, [field]: val };
      if (field === "pcs") {
        const pcsNum = parseFloat(val) || 0;
        if (pcsNum > prev.maxPcs) {
          showMsg(`Maximum available is ${prev.maxPcs} pcs`, "error");
          return prev;
        }
        u.amount = pcsNum * (parseFloat(prev.rate) || 0);
      }
      if (field === "rate") {
        u.amount = (parseFloat(prev.pcs) || 0) * (parseFloat(val) || 0);
      }
      return u;
    });
  };

  const addItem = () => {
    if (!entry.name) {
      setShowSearch(true);
      return;
    }
    if (!entry.productId) {
      showMsg("Please select a damaged product", "error");
      return;
    }
    if (parseFloat(entry.pcs) <= 0) {
      showMsg("Pcs must be > 0", "error");
      return;
    }
    if (parseFloat(entry.pcs) > entry.maxPcs) {
      showMsg(`Only ${entry.maxPcs} pcs available for disposal`, "error");
      return;
    }
    if (selItemIdx !== null) {
      setItems((prev) => {
        const u = [...prev];
        u[selItemIdx] = { ...entry };
        return u;
      });
      setSelItemIdx(null);
    } else {
      setItems((p) => [...p, { ...entry }]);
    }
    resetEntry();
    loadDamagedProducts();
  };

  const resetEntry = () => {
    setEntry({ ...EMPTY_ENTRY });
    setSearchText("");
    setSelItemIdx(null);
    setTimeout(() => searchRef.current?.focus(), 30);
  };

  const loadItemForEdit = (idx) => {
    setSelItemIdx(idx);
    setEntry({ ...items[idx] });
    setSearchText(items[idx].name);
    setTimeout(() => pcsRef.current?.focus(), 30);
  };

  const removeItem = () => {
    if (selItemIdx === null) return;
    setItems((p) => p.filter((_, i) => i !== selItemIdx));
    resetEntry();
    loadDamagedProducts();
  };

  const holdBill = () => {
    if (!items.length) {
      showMsg("Please add items first", "error");
      return;
    }
    setHoldBills((prev) => [
      ...prev,
      {
        id: Date.now(),
        invoiceNo,
        invoiceDate,
        buyerName,
        buyerCode,
        items: [...items],
        previousBalance,
      },
    ]);
    showMsg(`Bill held: ${invoiceNo}`);
    resetForm(false);
  };

  const resumeHold = (bill, idx) => {
    setInvoiceNo(bill.invoiceNo);
    setInvoiceDate(bill.invoiceDate);
    setBuyerName(bill.buyerName);
    setBuyerCode(bill.buyerCode || "");
    setItems(bill.items);
    setPreviousBalance(bill.previousBalance || 0);
    const holdId = bill.id || idx;
    setHoldBills((prev) =>
      prev.filter((b) => (b.id || prev.indexOf(b)) !== holdId)
    );
    resetEntry();
    showMsg("Hold restored");
  };

  const openConfirm = () => {
    if (!items.length) {
      showMsg("No items to save", "error");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmClose = async (overrides) => {
    setShowConfirm(false);
    if (!overrides) return;
    setSaving(true);
    
    try {
      const finalRecord = {
        invoiceNo,
        invoiceDate,
        buyerName,
        buyerCode,
        items: items.map(i => ({
          damageInId: i.damageInId,
          productId: i.productId,
          code: i.code,
          name: i.name,
          uom: i.uom,
          packing: i.packing,
          pcs: parseFloat(i.pcs) || 1,
          rate: parseFloat(i.rate) || 0,
          amount: parseFloat(i.amount) || 0,
        })),
        totalQty,
        netAmount,
        previousBalance: Number(previousBalance) || 0,
        balance,
        netReceivable,
        paidAmount: overrides.paid,
        remaining: overrides.remaining,
      };
      
      const saved = saveDamageOutRecord(finalRecord);
      
      if (saved) {
        showMsg(`Damage Out saved: ${invoiceNo}`);
        setReceiptRecord(finalRecord);
        loadSavedRecords();
        fetchNextInvoiceNo();
        resetForm(false);
        loadDamagedProducts();
      } else {
        showMsg("Save failed", "error");
      }
    } catch (e) {
      showMsg("Save failed", "error");
    }
    setSaving(false);
  };

  const handleDelete = () => {
    if (!selId) return showMsg("Select a record first", "error");
    if (!confirm("Delete this record?")) return;
    
    const records = loadDamageOutRecords();
    const filtered = records.filter(r => (r._id || r.invoiceNo) !== selId);
    localStorage.setItem(DAMAGE_OUT_STORAGE_KEY, JSON.stringify(filtered));
    setSavedRecords(filtered);
    setSelId(null);
    loadDamagedProducts();
    showMsg("Record deleted");
  };

  const handleLoad = (rec) => {
    setEditId(rec.invoiceNo);
    setInvoiceNo(rec.invoiceNo);
    setInvoiceDate(rec.invoiceDate);
    setBuyerName(rec.buyerName || "COUNTER SALE");
    setBuyerCode(rec.buyerCode || "");
    setItems(rec.items || []);
    setPreviousBalance(rec.previousBalance || 0);
    setSelId(rec.invoiceNo);
    resetEntry();
    showMsg(`Loaded: ${rec.invoiceNo}`);
  };

  const handlePreview = () => {
    if (!items.length) {
      showMsg("No items to preview", "error");
      return;
    }
    setReceiptRecord({
      invoiceNo,
      invoiceDate,
      buyerName,
      items,
      totalQty,
      netAmount,
      previousBalance: Number(previousBalance) || 0,
      netReceivable,
    });
  };

  const resetForm = (clearHold = true) => {
    setItems([]);
    resetEntry();
    setBuyerName("COUNTER SALE");
    setBuyerCode("");
    setPreviousBalance(0);
    setSelId(null);
    setEditId(null);
    if (clearHold) setHoldBills([]);
    fetchNextInvoiceNo();
  };

  const navRecord = (dir) => {
    if (savedRecords.length === 0) return;
    
    const sortedRecords = [...savedRecords].sort((a, b) => {
      const numA = parseInt(a.invoiceNo);
      const numB = parseInt(b.invoiceNo);
      return numA - numB;
    });
    
    const curIdx = sortedRecords.findIndex((r) => r.invoiceNo === invoiceNo);
    let nextIdx = dir === "prev" ? curIdx - 1 : curIdx + 1;
    nextIdx = Math.max(0, Math.min(nextIdx, sortedRecords.length - 1));
    
    if (nextIdx === curIdx) return;
    if (nextIdx >= 0 && nextIdx < sortedRecords.length) {
      handleLoad(sortedRecords[nextIdx]);
    }
  };

  useEffect(() => {
    const h = (e) => {
      if (showSearch || receiptRecord || showConfirm) return;
      if (e.key === "F2") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "F4") {
        e.preventDefault();
        holdBill();
      }
      if (e.key === "F5") {
        e.preventDefault();
        handlePreview();
      }
      if (e.key === "F10" || (e.ctrlKey && e.key === "s")) {
        e.preventDefault();
        if (items.length > 0) saveRef.current?.click();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        navRecord("prev");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navRecord("next");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        resetEntry();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [items, entry, showSearch, receiptRecord, showConfirm, savedRecords, invoiceNo]);

  const EMPTY_ROWS = Math.max(0, 8 - items.length);

  return (
    <div className="sl-page damage-out-page">
      {showSearch && (
        <SearchModal
          damagedProducts={damagedProducts}
          onSelect={pickProduct}
          onClose={() => {
            setShowSearch(false);
            setTimeout(() => searchRef.current?.focus(), 30);
          }}
        />
      )}
      {receiptRecord && (
        <PrintModal
          record={receiptRecord}
          onClose={() => setReceiptRecord(null)}
        />
      )}
      {showConfirm && (
        <SaveConfirmModal
          record={{
            invoiceNo,
            invoiceDate,
            buyerName,
            items,
            totalQty,
            netAmount,
            billAmount: netAmount,
            previousBalance: Number(previousBalance) || 0,
            balance,
            netReceivable,
          }}
          onClose={handleConfirmClose}
        />
      )}

      {/* TITLEBAR */}
      <div className="xp-titlebar" style={{ background: "#e65100" }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
        </svg>
        <span className="xp-tb-title">Damage Out — {SHOP_NAME}</span>
        <div className="xp-tb-actions">
          <div className="sl-shortcut-hints">
            <span>F2 Search</span>
            <span>F4 Hold</span>
            <span>F5 Preview</span>
            <span>↑/↓ Navigate</span>
            <span>F10 Save</span>
          </div>
          <div className="xp-tb-divider" />
          <button className="xp-cap-btn">─</button>
          <button className="xp-cap-btn">□</button>
          <button className="xp-cap-btn xp-cap-close">✕</button>
        </div>
      </div>

      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "4px 10px 0", flexShrink: 0 }}>
          {msg.text}
        </div>
      )}

      {/* BODY */}
      <div className="sl-body">
        <div className="sl-left">
          {/* Top bar with navigation */}
          <div className="sl-top-bar">
            <div className="sl-sale-title-box" style={{ background: "#e65100", border: "1px solid #bf360c" }}>Damage Out</div>
            
            <div className="sl-inv-field-grp">
              <label>Invoice #</label>
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
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = invoiceNo.trim();
                      if (!val) return;
                      const found = savedRecords.find((r) => r.invoiceNo === val);
                      if (found) {
                        handleLoad(found);
                      } else {
                        showMsg(`Invoice "${val}" not found`, "error");
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
              <input type="date" className="xp-input xp-input-sm sl-date-input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={{ borderColor: "#e65100" }} />
            </div>
            <div className="sl-inv-field-grp">
              <label>Time</label>
              <div className="sl-time-box">{time}</div>
            </div>
          </div>

          {/* Entry strip */}
          <div className="sl-entry-strip">
            <div className="sl-entry-cell sl-entry-product">
              <label>Select Damaged Product <kbd>F2</kbd></label>
              <input
                ref={searchRef}
                type="text"
                className="sl-product-input"
                style={{ width: "100%", background: "#fffde7", borderColor: "#e65100" }}
                value={searchText}
                readOnly={!!entry.name}
                placeholder="F2 or click — search damaged products..."
                onClick={() => setShowSearch(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "F2") {
                    e.preventDefault();
                    setShowSearch(true);
                  }
                }}
                autoFocus
              />
              {damagedProducts.length === 0 && !entry.name && (
                <div style={{ fontSize: 10, color: "#e65100", marginTop: 2 }}>⚠ No damaged products available. Please add products to Damage In first.</div>
              )}
            </div>
            <div className="sl-entry-cell">
              <label>Pcs</label>
              <input ref={pcsRef} type="text" className="sl-num-input" style={{ width: 60, background: "#fffde7", borderColor: "#e65100" }} value={entry.pcs} min={1} onChange={(e) => updateEntry("pcs", e.target.value)} onKeyDown={(e) => e.key === "Enter" && rateRef.current?.focus()} onFocus={(e) => e.target.select()} />
            </div>
            <div className="sl-entry-cell">
              <label>Rate</label>
              <input ref={rateRef} type="text" className="sl-num-input" style={{ width: 75, background: "#fffde7", borderColor: "#e65100" }} value={entry.rate} min={0} onChange={(e) => updateEntry("rate", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBtnRef.current?.click()} onFocus={(e) => e.target.select()} />
            </div>
            <div className="sl-entry-cell">
              <label>Amount</label>
              <input className="sl-num-input" style={{ width: 80, background: "#fffde7", borderColor: "#e65100" }} value={fmt(entry.amount)} readOnly />
            </div>
            <div className="sl-entry-cell sl-entry-btns-cell">
              <label>&nbsp;</label>
              <div className="sl-entry-btns">
                <button className="xp-btn xp-btn-sm" onClick={resetEntry}>Reset</button>
                <button ref={addBtnRef} className="xp-btn xp-btn-primary xp-btn-sm" style={{ background: "#e65100", borderColor: "#bf360c" }} onClick={addItem}>{selItemIdx !== null ? "Update" : "Add"}</button>
                <button className="xp-btn xp-btn-sm" disabled={selItemIdx === null} onClick={() => selItemIdx !== null && loadItemForEdit(selItemIdx)}>Edit</button>
                <button className="xp-btn xp-btn-danger xp-btn-sm" disabled={selItemIdx === null} onClick={removeItem}>Remove</button>
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="sl-table-header-bar">
            <span className="sl-table-lbl">{entry.name ? <span className="sl-cur-name-inline" style={{ fontWeight: "bold", fontSize: "14px" }}>{entry.name}</span> : "Select Damaged Product"}</span>
            <span className="sl-table-qty">{totalQty.toLocaleString("en-PK")}</span>
          </div>

          {/* Items table */}
          <div className="sl-items-wrap">
            <table className="sl-items-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>Sr.#</th>
                  <th style={{ width: 80 }}>Damage In ID</th>
                  <th style={{ width: 72 }}>Code</th>
                  <th>Product Name</th>
                  <th style={{ width: 55 }} className="r">Pcs</th>
                  <th style={{ width: 80 }} className="r">Rate</th>
                  <th style={{ width: 90 }} className="r">Amount</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={8} className="xp-empty" style={{ padding: 14 }}>F2 to select damaged products from Damage In records</td></tr>
                )}
                {items.map((r, i) => (
                  <tr key={i} className={selItemIdx === i ? "sl-sel-row" : ""} onClick={() => setSelItemIdx(i === selItemIdx ? null : i)} onDoubleClick={() => loadItemForEdit(i)}>
                    <td className="muted" style={{ textAlign: "center" }}>{i + 1}</td>
                    <td className="muted">{r.damageInId || "—"}</td>
                    <td className="muted">{r.code}</td>
                    <td style={{ fontWeight: "bold", fontSize: "14px" }}>{r.name}</td>
                    <td className="r">{r.pcs}</td>
                    <td className="r">{fmt(r.rate)}</td>
                    <td className="r" style={{ color: "#e65100", fontWeight: "bold" }}>{fmt(r.amount)}</td>
                    <td style={{ textAlign: "center" }}><button className="xp-btn xp-btn-sm xp-btn-danger" style={{ padding: "2px 6px" }} onClick={() => removeItem()}>✕</button></td>
                  </tr>
                ))}
                {Array.from({ length: EMPTY_ROWS }).map((_, i) => (<tr key={`e${i}`} className="sl-empty-row"><td colSpan={8} /></tr>))}
              </tbody>
            </table>
          </div>

          {/* Summary bar */}
          <div className="sl-summary-bar">
            <div className="sl-sum-cell"><label>Total Qty</label><input className="sl-sum-val" value={totalQty} readOnly /></div>
            <div className="sl-sum-cell"><label>Net Amount</label><input className="sl-sum-val" value={fmt(netAmount)} readOnly /></div>
            <div className="sl-sum-cell"><label>Prev Balance</label><input type="text" className="sl-sum-input" style={{ background: "#fffde7", borderColor: "#e65100" }} value={previousBalance} onChange={(e) => setPreviousBalance(e.target.value)} onFocus={(e) => e.target.select()} /></div>
            <div className="sl-sum-cell"><label>Net Payable</label><input className="sl-sum-val" style={{ color: "#e65100", fontWeight: "bold" }} value={fmt(netReceivable)} readOnly /></div>
          </div>

          {/* Buyer bar */}
          <div className="sl-customer-bar">
            <div className="sl-cust-cell"><label>Code</label><input className="sl-cust-input" style={{ width: 55, background: "#fffde7", borderColor: "#e65100" }} value={buyerCode} onChange={(e) => setBuyerCode(e.target.value)} /></div>
            <div className="sl-cust-cell" style={{ flex: 1 }}><label>Buyer / Party Name</label><input className="sl-cust-input" style={{ width: "100%", background: "#fffde7", borderColor: "#e65100" }} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} /></div>
          </div>
        </div>

        {/* RIGHT: Hold Bills */}
        <div className="sl-right">
          <div className="sl-hold-panel">
            <div className="sl-hold-title" style={{ background: "#e65100" }}>
              <span>Hold Bills <kbd style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "0 3px", borderRadius: 2 }}>F4</kbd></span>
              <span className="sl-hold-cnt">{holdBills.length}</span>
            </div>
            <div className="sl-hold-table-wrap">
              <table className="sl-hold-table">
                <thead><tr><th style={{ width: 24 }}>#</th><th>Bill #</th><th className="r">Amount</th><th>Party</th><th style={{ width: 22 }}></th></tr></thead>
                <tbody>
                  {holdBills.length === 0 ? Array.from({ length: 8 }).map((_, i) => (<tr key={i}><td colSpan={5} style={{ height: 22 }} /></tr>)) : holdBills.map((b, i) => (
                    <tr key={b.id || i} onClick={() => resumeHold(b, i)} style={{ cursor: "pointer" }} title="Click = restore">
                      <td className="muted" style={{ textAlign: "center" }}>{i + 1}</td>
                      <td style={{ fontFamily: "var(--xp-mono)" }}>{b.invoiceNo}</td>
                      <td className="r" style={{ color: "#e65100" }}>{fmt(b.items.reduce((s, r) => s + Number(r.amount || 0), 0))}</td>
                      <td className="muted" style={{ fontSize: 10 }}>{b.buyerName}</td>
                      <td style={{ textAlign: "center" }}><button className="xp-btn xp-btn-sm xp-btn-ico" style={{ width: 18, height: 18, fontSize: 9, color: "var(--xp-red)" }} onClick={(e) => { e.stopPropagation(); setHoldBills((p) => p.filter((_, j) => j !== i)); }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "4px 8px", flexShrink: 0 }}>
              <button className="xp-btn xp-btn-sm" style={{ width: "100%", background: "#e65100", color: "white", borderColor: "#bf360c" }} onClick={holdBill} disabled={!items.length}>Hold Bill (F4)</button>
            </div>
          </div>
        </div>
      </div>

      {/* CMD BAR */}
      <div className="sl-cmd-bar">
        <button className="xp-btn xp-btn-sm" onClick={() => loadDamagedProducts()}>Refresh Stock</button>
        <button ref={saveRef} className="xp-btn xp-btn-primary xp-btn-lg" style={{ background: "#e65100", borderColor: "#bf360c" }} onClick={openConfirm} disabled={saving || items.length === 0}>{saving ? "Saving…" : "💾 Save Damage Record  F10"}</button>
        <div className="xp-toolbar-divider" />
        <span className="sl-inv-info">DO-{invoiceNo} | Items: {items.length} | Total: {fmt(netAmount)}</span>
        <button className="xp-btn xp-btn-sm" style={{ marginLeft: "auto" }} onClick={() => resetForm(true)}>Close</button>
      </div>

      {/* Status bar */}
      <div className="xp-statusbar">
        <div className="xp-status-pane">DO {invoiceNo}</div>
        <div className="xp-status-pane">{buyerName}</div>
        <div className="xp-status-pane">Items: {items.length}</div>
        <div className="xp-status-pane">Qty: {totalQty}</div>
        <div className="xp-status-pane">Net: PKR {fmt(netAmount)}</div>
        <div className="xp-status-pane">Available Damaged: {damagedProducts.length}</div>
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
          background: #fffde7 !important;
        }
        
        .damage-out-page input:read-only,
        .damage-out-page .sl-sum-val {
          background: #f5f5f5 !important;
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
        .damage-out-page .sl-inv-nav-container {
          position: relative;
          display: inline-block;
        }

        .damage-out-page .sl-inv-nav-btn {
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

        .damage-out-page .sl-inv-nav-btn:hover {
          background: #e65100;
          border-color: #bf360c;
          color: white;
          transform: translateY(-50%) scale(1.05);
        }

        .damage-out-page .sl-inv-nav-btn:active {
          transform: translateY(-50%) scale(0.95);
        }

        .damage-out-page .sl-inv-nav-prev {
          left: 4px;
        }

        .damage-out-page .sl-inv-nav-next {
          right: 4px;
        }

        .damage-out-page .sl-inv-input-large {
          width: 180px !important;
          text-align: center !important;
          padding: 6px 32px !important;
          font-size: 18px !important;
          font-weight: bold !important;
          background: #ffffff !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
        }

        .damage-out-page .sl-inv-input-large:focus {
          border-color: #e65100 !important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(230, 81, 0, 0.1);
        }

        .damage-out-page .sl-items-table td {
          font-size: 13px;
        }
        
        .damage-out-page .sl-items-table td:first-child,
        .damage-out-page .sl-items-table td:nth-child(2),
        .damage-out-page .sl-items-table td:nth-child(3) {
          font-size: 12px;
        }
        
        .damage-out-page .sl-product-input {
          background: #fffde7 !important;
        }
      `}</style>
    </div>
  );
}