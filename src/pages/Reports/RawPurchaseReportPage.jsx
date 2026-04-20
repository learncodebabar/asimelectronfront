// pages/Reports/RawPurchaseReportPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";
import "../../styles/SalePage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoDate = () => new Date().toISOString().split("T")[0];

export default function RawPurchaseReportPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(isoDate());
  const [toDate, setToDate] = useState(isoDate());
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const purchasesRes = await api.get(EP.RAW_PURCHASES.GET_ALL);
      if (purchasesRes.data.success) {
        setPurchases(purchasesRes.data.data);
        filterPurchases(purchasesRes.data.data, fromDate, toDate, selectedSupplier);
        
        // Extract unique suppliers from purchases
        const uniqueSuppliers = new Map();
        purchasesRes.data.data.forEach(p => {
          if (p.customerId && p.customerName) {
            if (!uniqueSuppliers.has(p.customerId)) {
              uniqueSuppliers.set(p.customerId, {
                id: p.customerId,
                name: p.customerName,
                code: p.customerCode || ""
              });
            }
          } else if (p.customerName && !p.customerId) {
            if (!uniqueSuppliers.has(p.customerName)) {
              uniqueSuppliers.set(p.customerName, {
                id: p.customerName,
                name: p.customerName,
                code: ""
              });
            }
          }
        });
        setSuppliers(Array.from(uniqueSuppliers.values()));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  const filterPurchases = (data = purchases, from, to, supplier) => {
    let filtered = [...data];
    
    if (from) {
      filtered = filtered.filter(p => p.invoiceDate >= from);
    }
    if (to) {
      filtered = filtered.filter(p => p.invoiceDate <= to);
    }
    if (supplier) {
      filtered = filtered.filter(p => p.customerId === supplier || p.customerName === supplier);
    }
    
    filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
    setFilteredPurchases(filtered);
  };

  const handleDateChange = () => {
    filterPurchases(purchases, fromDate, toDate, selectedSupplier);
  };

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier.id);
    setSearchTerm(supplier.name);
    setShowSupplierDropdown(false);
    filterPurchases(purchases, fromDate, toDate, supplier.id);
  };

  const clearSupplier = () => {
    setSelectedSupplier("");
    setSearchTerm("");
    setShowSupplierDropdown(false);
    filterPurchases(purchases, fromDate, toDate, "");
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredPurchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
  const totalItems = filteredPurchases.reduce((sum, p) => sum + (p.items?.length || 0), 0);
  const totalQty = filteredPurchases.reduce((sum, p) => {
    const itemsQty = (p.items || []).reduce((acc, i) => acc + (i.pcs || i.qty || 0), 0);
    return sum + itemsQty;
  }, 0);
  const totalPaid = filteredPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalBalance = filteredPurchases.reduce((sum, p) => sum + (p.balance || 0), 0);

  const handlePrint = () => {
    if (!filteredPurchases.length) {
      alert("No data to print");
      return;
    }
    
    const printWindow = window.open("", "_blank", "width=1200,height=700");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const buildPrintHtml = () => {
    const rows = filteredPurchases.map((p, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #000;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #000;font-weight:bold">${p.invoiceNo}</td>
        <td style="padding:6px;border:1px solid #000">${p.invoiceDate?.split("T")[0]}</td>
        <td style="padding:6px;border:1px solid #000;font-weight:bold">${p.customerName || "COUNTER SALE"}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${p.items?.length || 0}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${(p.items || []).reduce((sum, i) => sum + (i.pcs || i.qty || 0), 0)}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right;font-weight:bold">${fmt(p.netTotal || 0)}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right">${fmt(p.paidAmount || 0)}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right;font-weight:bold;color:${(p.balance || 0) > 0 ? "#dc2626" : "#059669"}">${fmt(p.balance || 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Raw Purchase Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:15px}
        .header{text-align:center;margin-bottom:15px;padding-bottom:8px;border-bottom:2px solid #000}
        .shop-name{font-size:20px;font-weight:bold;margin-bottom:3px}
        .shop-addr{font-size:10px;color:#444;margin-bottom:2px}
        .title{font-size:16px;font-weight:bold;margin:12px 0;padding:8px;background:#1a1a1a;color:#fff;text-align:center}
        .date-range{background:#f5f5f5;padding:6px;margin:10px 0;border:1px solid #000;text-align:center;font-size:11px}
        .info{display:flex;justify-content:space-between;margin:10px 0;padding:6px;background:#f5f5f5;border:1px solid #000;font-size:11px}
        table{width:100%;border-collapse:collapse;margin:10px 0}
        th{background:#1a1a1a;color:#fff;padding:8px;border:1px solid #000;font-size:11px}
        td{padding:6px;border:1px solid #000;font-size:10px}
        .totals{width:400px;margin-left:auto;margin-top:15px}
        .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:11px}
        .totals-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:8px;font-size:13px}
        .footer{text-align:center;margin-top:20px;padding-top:8px;border-top:1px solid #ddd;font-size:9px;color:#666}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
        <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
      </div>
      <div class="title">RAW PURCHASE REPORT</div>
      <div class="date-range">Period: ${fromDate} to ${toDate}</div>
      <div class="info">
        <div><strong>Supplier:</strong> ${selectedSupplier ? (suppliers.find(s => s.id === selectedSupplier)?.name || selectedSupplier) : "All Suppliers"}</div>
        <div><strong>Printed:</strong> ${new Date().toLocaleString()}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Invoice</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Items</th>
            <th>Qty</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="9" style="text-align:center">No records found</td></tr>'}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Total Invoices:</span><span>${filteredPurchases.length}</span></div>
        <div class="totals-row"><span>Total Items:</span><span>${totalItems}</span></div>
        <div class="totals-row"><span>Total Quantity:</span><span>${totalQty}</span></div>
        <div class="totals-row"><span>Total Amount:</span><span>PKR ${fmt(totalAmount)}</span></div>
        <div class="totals-row"><span>Total Paid:</span><span>PKR ${fmt(totalPaid)}</span></div>
        <div class="totals-row bold"><span>Total Balance:</span><span>PKR ${fmt(totalBalance)}</span></div>
      </div>
      <div class="footer">Thank you for your business! | Developed by: Creative Babar / 03098325271</div>
    </body>
    </html>`;
  };

  const handleViewInvoice = (purchase) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(buildInvoiceHtml(purchase));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const buildInvoiceHtml = (purchase) => {
    const rows = (purchase.items || []).map((item, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #000;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #000">${item.code || "—"}</td>
        <td style="padding:6px;border:1px solid #000">${item.name || item.description || "—"}</td>
        <td style="padding:6px;border:1px solid #000;text-align:center">${item.uom || "—"}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right">${item.pcs || item.qty || 1}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right">${fmt(item.rate || 0)}</td>
        <td style="padding:6px;border:1px solid #000;text-align:right;font-weight:bold">${fmt(item.amount || 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Raw Purchase - ${purchase.invoiceNo}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:15px}
        .header{text-align:center;margin-bottom:15px;padding-bottom:8px;border-bottom:2px solid #000}
        .shop-name{font-size:18px;font-weight:bold}
        .shop-addr{font-size:10px;color:#444}
        .title{font-size:14px;font-weight:bold;margin:10px 0;padding:6px;background:#1a1a1a;color:#fff;text-align:center}
        .info{display:flex;justify-content:space-between;margin:10px 0;padding:8px;background:#f5f5f5;border:1px solid #000;font-size:11px}
        table{width:100%;border-collapse:collapse;margin:10px 0}
        th{background:#1a1a1a;color:#fff;padding:8px;border:1px solid #000;font-size:10px}
        td{padding:6px;border:1px solid #000;font-size:10px}
        .total{text-align:right;margin-top:10px;padding:8px;border-top:2px solid #000;font-weight:bold;font-size:13px}
        .footer{text-align:center;margin-top:15px;padding-top:6px;border-top:1px solid #ddd;font-size:9px}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
      </div>
      <div class="title">RAW PURCHASE INVOICE</div>
      <div class="info">
        <div><strong>Invoice:</strong> ${purchase.invoiceNo}</div>
        <div><strong>Date:</strong> ${purchase.invoiceDate?.split("T")[0]}</div>
        <div><strong>Supplier:</strong> ${purchase.customerName || "COUNTER SALE"}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Code</th><th>Product</th><th>UOM</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">TOTAL: PKR ${fmt(purchase.netTotal || 0)}</div>
      <div class="footer">Printed: ${new Date().toLocaleString()}</div>
    </body>
    </html>`;
  };

  return (
    <div className="sl-page" style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1a1a1a", borderBottom: "2px solid #000", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navigate("/")} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "4px 10px", cursor: "pointer", borderRadius: "3px", fontSize: "12px" }}>← Back</button>
          <span style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>Raw Purchase Report — Asim Electric Store</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={fetchData} style={{ padding: "4px 12px", background: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button onClick={handlePrint} disabled={!filteredPurchases.length} style={{ padding: "4px 12px", background: filteredPurchases.length ? "#1a1a1a" : "#ccc", color: "#fff", border: "1px solid #000", cursor: filteredPurchases.length ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: "bold" }}>🖨 Print</button>
        </div>
      </div>

      <div style={{ padding: "10px" }}>
        {/* Filter Section */}
        <div style={{ border: "1px solid #000", padding: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); handleDateChange(); }} style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "11px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); handleDateChange(); }} style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "11px" }} />
            </div>
            <div style={{ flex: 2, minWidth: "250px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Supplier</label>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search supplier by name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSupplierDropdown(true);
                  if (e.target.value === "") {
                    clearSupplier();
                  }
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                style={{ border: "1px solid #000", padding: "5px 8px", width: "100%", fontSize: "11px" }}
              />
              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div ref={dropdownRef} style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #000", maxHeight: "200px", overflowY: "auto", zIndex: 10, marginTop: "2px" }}>
                  {filteredSuppliers.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleSupplierSelect(s)}
                      style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #ddd" }}
                      onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
                      onMouseLeave={(e) => e.target.style.background = "#fff"}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "11px" }}>{s.name}</div>
                      {s.code && <div style={{ fontSize: "9px", color: "#666" }}>Code: {s.code}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <button onClick={clearSupplier} style={{ padding: "5px 12px", background: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>Clear</button>
            </div>
          </div>
        </div>

        {/* Summary Info */}
        {filteredPurchases.length > 0 && (
          <div style={{ background: "#f5f5f5", padding: "6px 10px", marginBottom: "10px", border: "1px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", fontSize: "11px" }}>
            <div>
              <span style={{ fontWeight: "bold" }}>📊 Showing {filteredPurchases.length} Purchase{filteredPurchases.length !== 1 ? "s" : ""}</span>
              {selectedSupplier && <span style={{ marginLeft: "12px" }}>Supplier: <strong>{suppliers.find(s => s.id === selectedSupplier)?.name || selectedSupplier}</strong></span>}
            </div>
            <div>
              <span>{fromDate} to {toDate}</span>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {filteredPurchases.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", marginBottom: "10px" }}>
            <div style={{ background: "#1a1a1a", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>📄 INVOICES</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{filteredPurchases.length}</div>
            </div>
            <div style={{ background: "#059669", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>📦 ITEMS</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{totalItems}</div>
            </div>
            <div style={{ background: "#d97706", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>🔢 QUANTITY</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{totalQty}</div>
            </div>
            <div style={{ background: "#1e40af", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>💰 TOTAL AMOUNT</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{fmt(totalAmount)}</div>
            </div>
            <div style={{ background: "#8b5cf6", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>💵 PAID</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{fmt(totalPaid)}</div>
            </div>
            <div style={{ background: "#dc2626", color: "#fff", padding: "8px", textAlign: "center", border: "1px solid #000" }}>
              <div style={{ fontSize: "9px", opacity: 0.8 }}>⚖️ BALANCE</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{fmt(totalBalance)}</div>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div style={{ border: "1px solid #000", overflow: "hidden" }}>
          <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 450px)", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "2px solid #000" }}>
                <tr>
                  <th style={{ width: 40, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>#</th>
                  <th style={{ width: 100, padding: "6px 8px", border: "1px solid #000", textAlign: "left" }}>Invoice</th>
                  <th style={{ width: 90, padding: "6px 8px", border: "1px solid #000", textAlign: "left" }}>Date</th>
                  <th style={{ minWidth: 150, padding: "6px 8px", border: "1px solid #000", textAlign: "left" }}>Supplier</th>
                  <th style={{ width: 60, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Items</th>
                  <th style={{ width: 70, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Qty</th>
                  <th style={{ width: 110, padding: "6px 8px", border: "1px solid #000", textAlign: "right" }}>Amount</th>
                  <th style={{ width: 110, padding: "6px 8px", border: "1px solid #000", textAlign: "right" }}>Paid</th>
                  <th style={{ width: 110, padding: "6px 8px", border: "1px solid #000", textAlign: "right" }}>Balance</th>
                  <th style={{ width: 70, padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="10" style={{ padding: "30px", textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && filteredPurchases.length === 0 && (
                  <tr><td colSpan="10" style={{ padding: "30px", textAlign: "center", color: "#999" }}>No purchase records found</td></tr>
                )}
                {filteredPurchases.map((p, i) => (
                  <tr key={p._id} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", fontWeight: "bold", fontFamily: "monospace" }}>{p.invoiceNo}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>{p.invoiceDate?.split("T")[0]}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", fontWeight: "bold" }}>{p.customerName || "COUNTER SALE"}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center" }}>{p.items?.length || 0}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center" }}>{(p.items || []).reduce((sum, i) => sum + (i.pcs || i.qty || 0), 0)}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold" }}>{fmt(p.netTotal || 0)}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", color: "#059669" }}>{fmt(p.paidAmount || 0)}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold", color: (p.balance || 0) > 0 ? "#dc2626" : "#059669" }}>{fmt(p.balance || 0)}</td>
                    <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "center" }}>
                      <button onClick={() => handleViewInvoice(p)} style={{ padding: "3px 10px", background: "#1a1a1a", color: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "10px" }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredPurchases.length > 0 && (
                <tfoot style={{ background: "#f5f5f5", borderTop: "2px solid #000" }}>
                  <tr>
                    <td colSpan="6" style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>TOTALS:</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>{fmt(totalAmount)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>{fmt(totalPaid)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", color: totalBalance > 0 ? "#dc2626" : "#059669" }}>{fmt(totalBalance)}</td>
                    <td style={{ padding: "6px 8px" }}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ background: "#f5f5f5", borderTop: "1px solid #000", padding: "4px 12px", display: "flex", justifyContent: "space-between", fontSize: "10px", position: "fixed", bottom: 0, left: 0, right: 0 }}>
        <div>Raw Purchase Report</div>
        <div>Records: {filteredPurchases.length}</div>
        <div>Total: PKR {fmt(totalAmount)}</div>
      </div>
    </div>
  );
}