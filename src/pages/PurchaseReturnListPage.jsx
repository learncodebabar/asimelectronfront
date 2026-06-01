// pages/PurchaseReturnListPage.jsx
import { useState, useEffect } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/SalePage.css";
import { SHOP_INFO } from "../constants/shopInfo.js";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");

export default function PurchaseReturnListPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [printType, setPrintType] = useState("Thermal");

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.PURCHASE_RETURNS.GET_ALL);
      console.log("Purchase Returns API Response:", response.data);
      
      if (response.data.success && response.data.data) {
        setReturns(response.data.data);
        console.log("Found returns:", response.data.data.length);
      } else {
        console.log("No returns found or API error");
        setReturns([]);
      }
    } catch (error) {
      console.error("Failed to fetch purchase returns:", error);
      try {
        const fallbackResponse = await api.get(EP.PURCHASES.GET_ALL);
        if (fallbackResponse.data.success && fallbackResponse.data.data) {
          const purchaseReturns = fallbackResponse.data.data.filter(r => 
            r.type === "purchase_return" || 
            r.returnNo || 
            (r.purchaseInvNo && r.purchaseInvNo !== "")
          );
          setReturns(purchaseReturns);
          console.log("Found returns from fallback:", purchaseReturns.length);
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    }
    setLoading(false);
  };

  const handleViewDetails = (returnItem) => {
    setSelectedReturn(returnItem);
    setShowModal(true);
  };

  const handlePrint = (returnItem) => {
    const printWindow = window.open("", "_blank", printType === "Thermal" ? "width=420,height=640" : "width=900,height=700");
    if (printWindow) {
      printWindow.document.write(buildPrintHtml(returnItem, printType));
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } else {
      alert("Popup blocked! Please allow popups for printing.");
    }
  };

  const buildPrintHtml = (ret, type) => {
    const rows = (ret.items || []).map((it, i) => ({ ...it, sr: i + 1 }));
    const totalQty = rows.reduce((s, r) => s + (r.pcs || r.quantity || 0), 0);
    const totalAmount = ret.netTotal || ret.totalAmount || ret.subTotal || 0;

    const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
    const GOOGLE_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">`;

    // Thermal Print (80mm width)
    if (type === "Thermal") {
      const itemRows = rows.map((it) => `
        <tr>
          <td style="font-size:9px;vertical-align:top;padding:2px 1px">${it.sr}</td>
          <td style="font-size:9.5px;vertical-align:top;word-break:break-word;max-width:100px;padding:2px 1px">${it.name || it.description}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right;padding:2px 1px">${it.pcs || it.quantity || it.qty} ${it.uom || it.measurement || ""}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right;padding:2px 1px">${Number(it.rate || it.unitPrice || 0).toLocaleString()}</td>
          <td style="font-size:9px;vertical-align:top;text-align:right;padding:2px 1px"><b>${Number(it.amount || it.total || 0).toLocaleString()}</b></td>
        </tr>
      `).join("");

      return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        ${GOOGLE_FONT_LINK}
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 10px; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 2mm 3mm; 
            color: #000; 
          }
          .urdu { font-family: ${URDU_FONT}; direction: rtl; text-align: center; }
          .shop-urdu { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 2px; font-family: ${URDU_FONT}; direction: rtl; }
          .shop-addr { font-size: 9px; text-align: center; margin-bottom: 1px; font-family: ${URDU_FONT}; direction: rtl; }
          .shop-phones { font-size: 8.5px; text-align: center; font-weight: bold; margin-bottom: 3px; }
          .banner { background: #dc2626; color: #fff; font-size: 8px; text-align: center; padding: 2px 4px; margin: 3px 0; font-family: ${URDU_FONT}; direction: rtl; line-height: 1.8; }
          .meta-row { display: flex; justify-content: space-between; font-size: 9px; margin: 2px 0; }
          .meta-bold { font-weight: bold; font-size: 10px; }
          .divider-solid { border: none; border-top: 2px solid #000; margin: 3px 0; }
          .divider-dash { border: none; border-top: 1px dashed #666; margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; }
          thead tr { border-bottom: 1px solid #000; }
          th { font-size: 8.5px; font-weight: bold; padding: 2px 1px; text-align: left; }
          th.r { text-align: right; }
          td { padding: 2px 1px; font-size: 9px; vertical-align: top; }
          .sum-row { display: flex; justify-content: space-between; font-size: 10px; padding: 1.5px 0; }
          .sum-row.bold { font-weight: bold; font-size: 11px; }
          .sum-row.sep { border-top: 1px dashed #555; margin-top: 2px; padding-top: 2px; }
          .red { color: #b00; }
          .green { color: #060; }
          .totals-box { margin-top: 4px; }
          .terms { font-family: ${URDU_FONT}; direction: rtl; font-size: 9px; color: #333; border: 1px dashed #999; padding: 4px; margin-top: 4px; line-height: 2; text-align: right; }
          .devby { text-align: center; font-size: 7.5px; color: #777; margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 3px; }
          @media print { @page { size: 80mm auto; margin: 1mm; } body { width: 78mm; } }
        </style>
      </head>
      <body>
        <div class="shop-urdu">${SHOP_INFO.name}</div>
        <div class="shop-addr">${SHOP_INFO.address}</div>
        <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
        <div class="banner">PURCHASE RETURN</div>
        <div class="meta-row">
          <span><b>Return #:</b></span>
          <span><b>${ret.returnNo}</b></span>
        </div>
        <div class="meta-row">
          <span><b>Date:</b></span>
          <span>${ret.returnDate}</span>
        </div>
        <div class="meta-row">
          <span><b>Supplier:</b></span>
          <span>${ret.supplierName}</span>
        </div>
        ${ret.purchaseInvNo ? `<div class="meta-row"><span><b>Ref Purchase:</b></span><span>${ret.purchaseInvNo}</span></div>` : ""}
        <hr class="divider-dash">
        <table>
          <thead>
            <tr>
              <th style="width:20px">#</th>
              <th>Product</th>
              <th class="r">Qty</th>
              <th class="r">Rate</th>
              <th class="r">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <hr class="divider-dash">
        <div class="totals-box">
          <div class="sum-row"><span>Total Qty:</span><span><b>${totalQty}</b></span></div>
          <div class="sum-row"><span>Total Items:</span><span><b>${rows.length}</b></span></div>
          <div class="sum-row bold sep"><span>Return Total:</span><span>${Number(totalAmount).toLocaleString()}</span></div>
          <div class="sum-row green"><span>Refund Amount:</span><span>PKR ${Number(ret.paidAmount || 0).toLocaleString()}</span></div>
          <div class="sum-row bold sep green"><span>Balance:</span><span>PKR ${Number((totalAmount - (ret.paidAmount || 0))).toLocaleString()}</span></div>
        </div>
        ${ret.notes ? `<div class="remarks-box" style="font-size:8px;color:#555;margin-top:3px;padding:2px;border-top:1px dashed #ccc;"><b>Remarks:</b> ${ret.notes}</div>` : ""}
        <div class="terms">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
        <div class="devby">${SHOP_INFO.devBy}</div>
      </body>
      </html>`;
    }

    // A4/A5 format
    const a5 = type === "A5";
    const sz = a5
      ? { title: 14, sub: 8.5, inv: 12, meta: 8, th: 8, td: 8, tot: 9, totB: 10.5 }
      : { title: 17, sub: 9.5, inv: 14, meta: 9, th: 9, td: 9, tot: 10, totB: 13 };

    const itemRows = rows.map((it, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#fff5f5"}">
        <td style="text-align:center;padding:6px;border:1px solid #dc2626">${it.sr}</td>
        <td style="padding:6px;border:1px solid #dc2626"><strong>${it.name || it.description}</strong></td>
        <td style="text-align:center;padding:6px;border:1px solid #dc2626">${it.uom || it.measurement || "—"}</td>
        <td style="text-align:right;padding:6px;border:1px solid #dc2626">${it.pcs || it.quantity || it.qty}</td>
        <td style="text-align:right;padding:6px;border:1px solid #dc2626">${Number(it.rate || it.unitPrice || 0).toLocaleString()}</td>
        <td style="text-align:right;padding:6px;border:1px solid #dc2626;font-weight:bold">${Number(it.amount || it.total || 0).toLocaleString()}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${GOOGLE_FONT_LINK}
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: ${sz.td}pt; color: #111; background: #fff; padding: ${a5 ? "5mm" : "8mm"}; }
        .shop-urdu { font-size: ${a5 ? "20px" : "26px"}; font-weight: 900; font-family: ${URDU_FONT}; direction: rtl; text-align: center; line-height: 2; }
        .shop-addr { font-size: ${sz.sub}pt; color: #444; text-align: center; font-family: ${URDU_FONT}; direction: rtl; margin: 2px 0; line-height: 1.8; }
        .shop-phones { font-size: ${sz.sub}pt; font-weight: bold; text-align: center; margin-bottom: 2px; }
        .banner { background: #dc2626; color: #fff; font-size: ${a5 ? "7.5" : "8.5"}pt; text-align: center; padding: ${a5 ? "2px 6px" : "3px 8px"}; margin: ${a5 ? "3px 0" : "4px 0"}; font-family: ${URDU_FONT}; direction: rtl; line-height: 2; }
        .hdr { text-align: center; border-bottom: 2px solid #000; padding-bottom: ${a5 ? "5px" : "8px"}; margin-bottom: 4px; }
        .meta-strip { display: flex; justify-content: space-between; align-items: flex-start; border: 1px solid #dc2626; padding: ${a5 ? "4px 8px" : "5px 10px"}; margin: ${a5 ? "4px 0" : "5px 0"}; font-size: ${sz.meta}pt; }
        .meta-left { flex: 2; }
        .meta-mid { flex: 0.5; text-align: center; font-size: ${a5 ? "18px" : "22px"}; font-weight: 900; color: #dc2626; }
        .meta-right { flex: 2; text-align: right; }
        .meta-row { margin-bottom: 1px; }
        .meta-lbl { color: #555; }
        .meta-val { font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin: ${a5 ? "4px 0" : "5px 0"}; }
        thead tr { background: #dc2626; color: #fff; }
        th { padding: ${a5 ? "3px 5px" : "5px 7px"}; font-size: ${sz.th}pt; font-weight: 600; text-align: left; border: 1px solid #991b1b; }
        td { padding: ${a5 ? "2px 5px" : "3px 7px"}; font-size: ${sz.td}pt; border-bottom: 1px solid #fde8e8; border: 1px solid #dc2626; }
        .footer-wrap { display: flex; justify-content: space-between; align-items: flex-start; margin-top: ${a5 ? "6px" : "10px"}; gap: 10px; }
        .footer-left { flex: 1.5; }
        .footer-right { flex: 1; border: 1px solid #fca5a5; padding: ${a5 ? "4px 8px" : "5px 10px"}; }
        .footer-stat { font-size: ${sz.meta}pt; font-weight: bold; margin-bottom: 4px; }
        .terms-box { font-family: ${URDU_FONT}; direction: rtl; font-size: ${a5 ? "8" : "9"}pt; color: #444; border: 1px dashed #aaa; padding: ${a5 ? "3px 6px" : "5px 8px"}; margin: ${a5 ? "4px 0" : "5px 0"}; line-height: 2; text-align: right; }
        .sig-line { font-size: ${sz.sub}pt; margin-top: ${a5 ? "8px" : "14px"}; border-top: 1px solid #999; display: inline-block; padding-top: 2px; min-width: 120px; }
        .sum-row { display: flex; justify-content: space-between; font-size: ${sz.tot}pt; padding: ${a5 ? "3px 0" : "4px 0"}; border-bottom: 1px solid #eee; }
        .sum-row.bold { font-weight: 700; font-size: ${sz.totB}pt; background: #fff5f5; padding: ${a5 ? "3px 4px" : "4px 6px"}; }
        .sum-row.sep { border-top: 2px solid #dc2626; margin-top: 2px; }
        .red { color: #dc2626; }
        .green { color: #059669; }
        .devby { text-align: center; font-size: ${a5 ? "7" : "8"}pt; color: #888; margin-top: ${a5 ? "6px" : "10px"}; border-top: 1px solid #ddd; padding-top: ${a5 ? "4px" : "6px"}; }
        @media print { @page { size: ${a5 ? "A5" : "A4"}; margin: ${a5 ? "5mm" : "10mm"}; } body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="hdr">
        <div class="shop-urdu">${SHOP_INFO.name}</div>
        <div class="shop-addr">${SHOP_INFO.address}</div>
        <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
      </div>
      <div class="banner">PURCHASE RETURN</div>
      <div class="meta-strip">
        <div class="meta-left">
          <div class="meta-row"><span class="meta-lbl">Supplier:</span> <span class="meta-val">${ret.supplierName}</span></div>
          ${ret.purchaseInvNo ? `<div class="meta-row"><span class="meta-lbl">Ref Purchase:</span> <span class="meta-val">${ret.purchaseInvNo}</span></div>` : ""}
        </div>
        <div class="meta-mid"><span class="meta-val">${rows.length}</span></div>
        <div class="meta-right">
          <div class="meta-row"><span class="meta-lbl">Return #:</span> <span class="meta-val">${ret.returnNo}</span></div>
          <div class="meta-row"><span class="meta-lbl">Date:</span> <span class="meta-val">${ret.returnDate}</span></div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:28px;text-align:center">Sr.#</th>
            <th>Product</th>
            <th style="width:50px">Unit</th>
            <th style="width:42px;text-align:right">Qty</th>
            <th style="width:70px;text-align:right">Rate</th>
            <th style="width:80px;text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="footer-wrap">
        <div class="footer-left">
          <div class="footer-stat">Total Items: <b>${rows.length}</b></div>
          <div class="footer-stat">Total Quantity: <b>${totalQty}</b></div>
          ${ret.notes ? `<div class="footer-stat" style="color:#dc2626">Remarks: ${ret.notes}</div>` : ""}
          <div class="terms-box">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
          <div class="sig-line">Signature</div>
        </div>
        <div class="footer-right">
          <div class="sum-row bold red"><span>Return Total</span><span>PKR ${Number(totalAmount).toLocaleString()}</span></div>
          <div class="sum-row green"><span>Refunded</span><span>PKR ${Number(ret.paidAmount || 0).toLocaleString()}</span></div>
          <div class="sum-row bold sep ${(totalAmount - (ret.paidAmount || 0)) > 0 ? "red" : "green"}"><span>Balance</span><span>PKR ${Number((totalAmount - (ret.paidAmount || 0))).toLocaleString()}</span></div>
        </div>
      </div>
      <div class="devby">${SHOP_INFO.devBy}</div>
    </body>
    </html>`;
  };

  const filteredReturns = returns.filter(r => 
    (r.returnNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.supplierName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.purchaseInvNo || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalReturns = filteredReturns.length;
  const totalAmount = filteredReturns.reduce((sum, r) => sum + (r.netTotal || r.totalAmount || r.subTotal || 0), 0);
  const totalRefund = filteredReturns.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const totalItems = filteredReturns.reduce((sum, r) => sum + (r.items?.length || 0), 0);
  const totalQty = filteredReturns.reduce((sum, r) => 
    sum + (r.items || []).reduce((s, item) => s + (item.pcs || item.quantity || item.qty || 0), 0), 0
  );

  return (
    <div className="sl-page purchase-return-list-page">
      {/* Title Bar */}
      <div className="xp-titlebar" style={{ background: "#dc2626", borderRadius: "8px 8px 0 0", padding: "12px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "18px" }}>←</button>
          <span className="xp-tb-title" style={{ color: "white", fontWeight: "bold", fontSize: "16px" }}>Purchase Returns List</span>
        </div>
        <div className="xp-tb-actions">
          <button onClick={fetchReturns} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "4px 12px", borderRadius: "4px", cursor: "pointer" }}>⟳ Refresh</button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #dc2626" }}>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Returns</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#dc2626" }}>{totalReturns}</div>
          </div>
          <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Return Value</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#d97706" }}>PKR {fmt(totalAmount)}</div>
          </div>
          <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #10b981" }}>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Refund</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#059669" }}>PKR {fmt(totalRefund)}</div>
          </div>
          <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Items Returned</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2563eb" }}>{totalItems} ({totalQty} qty)</div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            className="xp-input"
            placeholder="Search by Return #, or Supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "300px", borderColor: "#dc2626", borderRadius: "8px", padding: "10px 14px" }}
          />
          <button className="xp-btn xp-btn-sm" onClick={fetchReturns} style={{ borderColor: "#dc2626", borderRadius: "6px", padding: "8px 16px" }}>Refresh</button>
          
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>Print Type:</span>
            {["Thermal", "A4", "A5"].map((pt) => (
              <label key={pt} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", cursor: "pointer" }}>
                <input type="radio" name="printType" checked={printType === pt} onChange={() => setPrintType(pt)} style={{ accentColor: "#dc2626" }} /> {pt}
              </label>
            ))}
          </div>
        </div>
        
        {/* Results Table */}
        <div className="xp-table-panel" style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div className="xp-table-scroll" style={{ overflowX: "auto", maxHeight: "calc(100vh - 320px)" }}>
            <table className="xp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#dc2626", color: "white", position: "sticky", top: 0 }}>
                  <th style={{ padding: "12px", textAlign: "center", width: 50 }}>#</th>
                  <th style={{ padding: "12px", textAlign: "left", width: 120 }}>Return #</th>
                  <th style={{ padding: "12px", textAlign: "left", width: 110 }}>Date</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Supplier</th>
                  <th style={{ padding: "12px", textAlign: "left", width: 140 }}>Ref Purchase Inv</th>
                  <th style={{ padding: "12px", textAlign: "center", width: 70 }}>Items</th>
                  <th style={{ padding: "12px", textAlign: "center", width: 80 }}>Qty</th>
                  <th style={{ padding: "12px", textAlign: "right", width: 130 }}>Total Amount</th>
                  <th style={{ padding: "12px", textAlign: "center", width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (<tr><td colSpan="9" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>)}
                {!loading && filteredReturns.length === 0 && (<tr><td colSpan="9" style={{ padding: "40px", textAlign: "center" }}>No purchase returns found</td></tr>)}
                {filteredReturns.map((r, i) => {
                  const itemQty = (r.items || []).reduce((s, item) => s + (item.pcs || item.quantity || item.qty || 0), 0);
                  const totalAmount = r.netTotal || r.totalAmount || r.subTotal || 0;
                  return (
                    <tr key={r._id} style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer" }} onDoubleClick={() => handleViewDetails(r)}>
                      <td style={{ padding: "10px", textAlign: "center", color: "#6b7280" }}>{i + 1}</td>
                      <td style={{ padding: "10px", fontWeight: "bold", color: "#dc2626" }}>{r.returnNo}</td>
                      <td style={{ padding: "10px", color: "#4b5563" }}>{r.returnDate}</td>
                      <td style={{ padding: "10px", fontWeight: "500", color: "#1e3a5f" }}>{r.supplierName}</td>
                      <td style={{ padding: "10px", color: "#6b7280" }}>{r.purchaseInvNo || "-"}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>{r.items?.length || 0}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>{itemQty}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(totalAmount)}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); handleViewDetails(r); }} style={{ padding: "5px 10px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>View</button>
                          <button onClick={(e) => { e.stopPropagation(); handlePrint(r); }} style={{ padding: "5px 10px", background: "#f59e0b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>Print</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredReturns.length > 0 && (
                <tfoot style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #dc2626" }}>
                  <tr>
                    <td colSpan="7" style={{ padding: "10px", textAlign: "right" }}>Total:</td>
                    <td style={{ padding: "10px", textAlign: "right", color: "#dc2626" }}>PKR {fmt(totalAmount)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedReturn && (
        <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)} style={{ zIndex: 2000 }}>
          <div className="xp-modal" style={{ width: "90%", maxWidth: "1000px", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: "12px", overflow: "hidden" }}>
            <div className="xp-modal-tb" style={{ background: "#dc2626", padding: "12px 16px" }}>
              <span className="xp-modal-title" style={{ color: "white", fontWeight: "bold" }}>Purchase Return Details — {selectedReturn.returnNo}</span>
              <button className="xp-cap-btn xp-cap-close" onClick={() => setShowModal(false)} style={{ color: "white" }}>✕</button>
            </div>
            
            <div className="xp-modal-body" style={{ padding: "16px", overflow: "auto", flex: 1, background: "#f9fafb" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px", padding: "16px", background: "white", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Return #</div><div style={{ fontSize: "18px", fontWeight: "bold", color: "#dc2626" }}>{selectedReturn.returnNo}</div></div>
                <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Date</div><div style={{ fontSize: "14px", fontWeight: "500" }}>{selectedReturn.returnDate}</div></div>
                <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Supplier</div><div style={{ fontSize: "14px", fontWeight: "500", color: "#1e3a5f" }}>{selectedReturn.supplierName}</div></div>
                {selectedReturn.purchaseInvNo && <div><div style={{ fontSize: "11px", color: "#6b7280" }}>Reference Purchase</div><div style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280" }}>{selectedReturn.purchaseInvNo}</div></div>}
                {selectedReturn.notes && <div style={{ gridColumn: "span 2" }}><div style={{ fontSize: "11px", color: "#6b7280" }}>Remarks</div><div style={{ fontSize: "13px", padding: "8px", background: "#fef2f2", borderRadius: "6px" }}>{selectedReturn.notes}</div></div>}
              </div>

              <div style={{ background: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead style={{ background: "#dc2626", color: "white" }}>
                      <tr>
                        <th style={{ padding: "10px", textAlign: "center", width: 50 }}>#</th>
                        <th style={{ padding: "10px", textAlign: "left", width: 100 }}>Code</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Product Name</th>
                        <th style={{ padding: "10px", textAlign: "center", width: 70 }}>UOM</th>
                        <th style={{ padding: "10px", textAlign: "right", width: 70 }}>Qty</th>
                        <th style={{ padding: "10px", textAlign: "right", width: 100 }}>Rate</th>
                        <th style={{ padding: "10px", textAlign: "right", width: 110 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReturn.items || []).map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "8px", textAlign: "center" }}>{idx + 1}</td>
                          <td style={{ padding: "8px" }}>{it.code || "—"}</td>
                          <td style={{ padding: "8px", fontWeight: "500" }}>{it.name || it.description || "—"}</td>
                          <td style={{ padding: "8px", textAlign: "center" }}>{it.uom || it.measurement || "—"}</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>{it.pcs || it.quantity || it.qty || 0}</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>{fmt(it.rate || it.unitPrice || 0)}</td>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>{fmt(it.amount || it.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: "#fef2f2", fontWeight: "bold" }}>
                      <tr>
                        <td colSpan="4" style={{ padding: "10px", textAlign: "right" }}>Totals:</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>{(selectedReturn.items || []).reduce((s, it) => s + (it.pcs || it.quantity || it.qty || 0), 0)}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>—</td>
                        <td style={{ padding: "10px", textAlign: "right", color: "#dc2626", fontSize: "15px" }}>PKR {fmt(selectedReturn.netTotal || selectedReturn.totalAmount || selectedReturn.subTotal || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px", justifyContent: "flex-end", background: "white" }}>
              <button className="xp-btn" onClick={() => setShowModal(false)}>Close</button>
              <button className="xp-btn" style={{ background: "#f59e0b", color: "white", borderColor: "#d97706" }} onClick={() => handlePrint(selectedReturn)}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .purchase-return-list-page { background: #f3f4f6; min-height: 100vh; }
        .xp-table th { background: #dc2626 !important; color: white !important; }
        .xp-table tr:hover { background: #fef2f2 !important; }
        button { transition: all 0.2s ease; }
        button:hover { transform: translateY(-1px); filter: brightness(1.05); }
      `}</style>
    </div>
  );
}