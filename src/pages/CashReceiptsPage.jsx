// pages/CustomerLedgerPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function CustomerLedgerPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(isoD());
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  
  // Payment receipt states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  
  // Refs for keyboard navigation
  const searchRef = useRef(null);
  const amountRef = useRef(null);
  const remarksRef = useRef(null);
  const submitRef = useRef(null);

  useEffect(() => {
    loadCustomers();
    searchRef.current?.focus();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        setCustomers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      showMsg("Failed to load customers", "error");
    }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const handleSearch = (value) => {
    setSearchInput(value);
    if (value.trim().length > 0) {
      const filtered = customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(value.toLowerCase()) ||
          c.code?.toLowerCase().includes(value.toLowerCase()) ||
          c.phone?.includes(value)
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchInput(customer.name);
    setFilteredCustomers([]);
    setShowCustomerDropdown(false);
    // Reset payment form when customer changes
    setPaymentAmount("");
    setPaymentRemarks("");
    // Focus on amount input after customer selection
    setTimeout(() => {
      amountRef.current?.focus();
    }, 100);
  };

  const clearSelection = () => {
    setSelectedCustomer(null);
    setSearchInput("");
    setTransactions([]);
    setPaymentAmount("");
    setPaymentRemarks("");
    searchRef.current?.focus();
  };

  // Handle Enter key navigation
  const handleAmountKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const amountNum = parseFloat(paymentAmount);
      if (paymentAmount && !isNaN(amountNum) && amountNum > 0) {
        remarksRef.current?.focus();
      }
    }
  };

  const handleRemarksKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitRef.current?.click();
    }
  };

  const loadTransactions = async () => {
    if (!selectedCustomer) {
      showMsg("Please select a customer first", "error");
      return;
    }

    setLoading(true);
    setTransactions([]);

    try {
      // Fetch sales
      const salesRes = await api.get(EP.CUSTOMERS.SALE_HISTORY(selectedCustomer._id));
      let sales = salesRes.data.success ? (Array.isArray(salesRes.data.data) ? salesRes.data.data : []) : [];

      // Fetch raw purchases
      let rawPurchases = [];
      try {
        const rawPurchasesRes = await api.get(`${EP.RAW_PURCHASES.GET_ALL}?customerId=${selectedCustomer._id}`);
        if (rawPurchasesRes.data.success) {
          rawPurchases = Array.isArray(rawPurchasesRes.data.data) ? rawPurchasesRes.data.data : [];
        }
      } catch (err) {
        console.error("Failed to load raw purchases:", err);
      }

      // Fetch payments
      let payments = [];
      try {
        const paymentsRes = await api.get(EP.PAYMENTS.BY_CUSTOMER(selectedCustomer._id));
        if (paymentsRes.data.success) {
          payments = Array.isArray(paymentsRes.data.data) ? paymentsRes.data.data : [];
        }
      } catch (err) {
        console.error("Failed to load payments:", err);
      }

      // Fetch cash receipts
      let cashReceipts = [];
      try {
        const cashReceiptsRes = await api.get(EP.CASH_RECEIPTS.GET_BY_CUSTOMER(selectedCustomer._id));
        if (cashReceiptsRes.data.success) {
          cashReceipts = Array.isArray(cashReceiptsRes.data.data) ? cashReceiptsRes.data.data : [];
        }
      } catch (err) {
        console.error("Failed to load cash receipts:", err);
      }

      // Combine all transactions
      const allTransactions = [
        ...sales.map(s => ({
          ...s,
          type: "sale",
          transType: "Sale",
          date: s.invoiceDate,
          debit: s.netTotal || 0,
          credit: s.paidAmount || 0,
          balance: s.balance || 0,
          reference: s.invoiceNo,
          details: `${s.items?.length || 0} items`
        })),
        ...rawPurchases.map(r => ({
          ...r,
          type: "raw-purchase",
          transType: "Raw Purchase",
          date: r.invoiceDate,
          debit: r.netTotal || 0,
          credit: r.paidAmount || 0,
          balance: r.balance || 0,
          reference: r.invoiceNo,
          details: `${r.items?.length || 0} items`
        })),
        ...payments.map(p => ({
          ...p,
          type: "payment",
          transType: "Payment",
          date: p.paymentDate || p.createdAt?.split("T")[0],
          debit: 0,
          credit: p.amount || 0,
          balance: 0,
          reference: p.paymentNo || p._id?.slice(-8),
          details: p.remarks || "Payment received"
        })),
        ...cashReceipts.map(cr => ({
          ...cr,
          type: "cash-receipt",
          transType: "Cash Receipt",
          date: cr.receiptDate,
          debit: 0,
          credit: cr.amount || 0,
          balance: cr.newBalance || 0,
          reference: cr.receiptNo,
          details: cr.remarks || "Cash received"
        }))
      ];

      // Filter by date range
      const filtered = allTransactions.filter(t => {
        const transDate = t.date;
        return transDate >= fromDate && transDate <= toDate;
      });

      // Sort by date
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate running balance
      let runningBalance = 0;
      const transactionsWithBalance = filtered.map(t => {
        if (t.type === "sale" || t.type === "raw-purchase") {
          runningBalance += t.debit;
          runningBalance -= t.credit;
        } else if (t.type === "payment" || t.type === "cash-receipt") {
          runningBalance -= t.credit;
        }
        return { ...t, runningBalance };
      });

      setTransactions(transactionsWithBalance);
      
      if (transactionsWithBalance.length === 0) {
        showMsg("No transactions found for the selected date range", "info");
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
      showMsg("Failed to load transactions", "error");
    }

    setLoading(false);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!selectedCustomer) {
      showMsg("Please select a customer first", "error");
      return;
    }

    const amountNum = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amountNum) || amountNum <= 0) {
      showMsg("Please enter a valid amount", "error");
      amountRef.current?.focus();
      return;
    }

    const outstanding = selectedCustomer.currentBalance || 0;
    if (amountNum > outstanding) {
      showMsg(
        `Amount cannot exceed outstanding balance (PKR ${fmt(outstanding)})`,
        "error"
      );
      amountRef.current?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customerId: selectedCustomer._id,
        customerCode: selectedCustomer.code,
        customerName: selectedCustomer.name,
        customerPhoto: selectedCustomer.imageFront,
        amount: amountNum,
        remarks: paymentRemarks || "Cash received",
        receiptDate: isoD(),
        previousBalance: outstanding,
        newBalance: outstanding - amountNum,
      };

      const { data } = await api.post(EP.CASH_RECEIPTS.CREATE, payload);

      if (data.success) {
        showMsg(
          `Cash receipt of PKR ${fmt(amountNum)} recorded successfully!`,
          "success"
        );

        // Update customer's credit balance
        await api.put(`${EP.CUSTOMERS.UPDATE(selectedCustomer._id)}`, {
          currentBalance: outstanding - amountNum,
        });

        // Update selected customer balance
        setSelectedCustomer({
          ...selectedCustomer,
          currentBalance: outstanding - amountNum
        });

        // Reset payment form
        setPaymentAmount("");
        setPaymentRemarks("");

        // Refresh transactions
        await loadTransactions();
        
        // Focus back on amount input for next payment
        amountRef.current?.focus();
      } else {
        showMsg(data.message || "Failed to save receipt", "error");
      }
    } catch (err) {
      console.error("Error saving receipt:", err);
      showMsg(err.response?.data?.message || "Failed to save receipt", "error");
    }

    setSubmitting(false);
  };

  const handlePrintLedger = () => {
    if (!selectedCustomer || transactions.length === 0) {
      showMsg("No data to print", "error");
      return;
    }

    const printWindow = window.open("", "_blank");
    const html = buildLedgerHtml();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const buildLedgerHtml = () => {
    const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
    const printDateTime = new Date().toLocaleString("en-PK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const closingBalance = transactions[transactions.length - 1]?.runningBalance || 0;

    const rows = transactions.map((t, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #ddd">${t.date}</td>
        <td style="padding:6px;border:1px solid #ddd">${t.reference}</td>
        <td style="padding:6px;border:1px solid #ddd">${t.transType}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${t.debit > 0 ? `PKR ${fmt(t.debit)}` : "—"}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${t.credit > 0 ? `PKR ${fmt(t.credit)}` : "—"}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">PKR ${fmt(t.runningBalance)}</td>
        <td style="padding:6px;border:1px solid #ddd">${t.details || "—"}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Customer Ledger - ${selectedCustomer.name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:15px;font-size:11px}
        .ledger-container{max-width:1200px;margin:0 auto}
        .header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #333}
        .shop-name{font-size:18px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:5px}
        .shop-name-en{font-size:14px;font-weight:bold;margin-bottom:5px}
        .shop-addr{font-size:9px;color:#666;margin-bottom:3px}
        .title{font-size:16px;font-weight:bold;margin:15px 0;text-align:center}
        .customer-info{background:#f5f5f5;padding:10px;margin:10px 0;border-radius:6px;display:flex;gap:15px;align-items:center}
        .customer-photo{width:60px;height:60px;border-radius:50%;object-fit:cover}
        .customer-details{flex:1}
        .customer-name{font-size:14px;font-weight:bold;margin-bottom:5px}
        .date-range{background:#e8f0fe;padding:8px;margin:10px 0;border-radius:4px;text-align:center;font-size:10px}
        table{width:100%;border-collapse:collapse;margin:10px 0}
        th{background:#555;color:#fff;padding:8px;font-size:10px;border:1px solid #666}
        td{padding:6px;border:1px solid #ddd;font-size:10px}
        .totals{width:350px;margin-left:auto;margin-top:15px}
        .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:11px}
        .totals-row.bold{font-weight:bold;border-top:1px solid #333;margin-top:5px;padding-top:5px}
        .footer{text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:8px;color:#666}
        .text-right{text-align:right}
        .text-center{text-align:center}
      </style>
    </head>
    <body>
      <div class="ledger-container">
        <div class="header">
          <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
          <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
          <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
          <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
        </div>
        
        <div class="title">CUSTOMER LEDGER</div>
        
        <div class="customer-info">
          ${selectedCustomer.imageFront ? 
            `<img src="${selectedCustomer.imageFront}" class="customer-photo" alt="${selectedCustomer.name}">` : 
            `<div style="width:60px;height:60px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:30px">👤</div>`
          }
          <div class="customer-details">
            <div class="customer-name">${selectedCustomer.name}</div>
            <div>Code: ${selectedCustomer.code || "—"} | Phone: ${selectedCustomer.phone || "—"} | Area: ${selectedCustomer.area || "—"}</div>
            <div>Address: ${selectedCustomer.address || "—"}</div>
          </div>
        </div>
        
        <div class="date-range">
          Period: ${fromDate} to ${toDate}
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>Date</th>
              <th>Reference</th>
              <th>Type</th>
              <th class="text-right">Debit (Sale)</th>
              <th class="text-right">Credit (Payment)</th>
              <th class="text-right">Balance</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="totals-row"><span>Total Debit (Sales):</span><span>PKR ${fmt(totalDebit)}</span></div>
          <div class="totals-row"><span>Total Credit (Payments):</span><span>PKR ${fmt(totalCredit)}</span></div>
          <div class="totals-row bold"><span>Closing Balance:</span><span style="color:${closingBalance > 0 ? '#dc2626' : '#059669'}">PKR ${fmt(Math.abs(closingBalance))} ${closingBalance > 0 ? '(Receivable)' : '(Payable)'}</span></div>
        </div>
        
        <div class="footer">
          Printed on: ${printDateTime}<br>
          Developed by: AppHill / 03222292922 | www.apphill.pk
        </div>
      </div>
    </body>
    </html>`;
  };

  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const closingBalance = transactions[transactions.length - 1]?.runningBalance || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f1f5f9" }}>
      <div className="xp-titlebar">
        <button className="xp-cap-btn" onClick={() => navigate("/")}>←</button>
        <span className="xp-tb-title">Customer Ledger — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={loadTransactions} disabled={!selectedCustomer || loading}>
            {loading ? "Loading..." : "⟳ Show Transactions"}
          </button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrintLedger} disabled={transactions.length === 0}>
            🖨️ Print Preview
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : msg.type === "info" ? "xp-alert-info" : "xp-alert-error"}`} style={{ margin: "8px 16px 0" }}>
          {msg.text}
        </div>
      )}

      <div className="xp-page-body" style={{ padding: "16px" }}>
        {/* MAIN ROW - Customer Select + Customer Info + Payment Form ALL IN ONE */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0"
        }}>
          <form onSubmit={handleSubmitPayment}>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center" }}>
              {/* Customer Search with Label */}
              <div style={{ minWidth: "200px", flex: 2, position: "relative" }}>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>Select Customer *</div>
                <div style={{ position: "relative" }}>
                  <input
                    ref={searchRef}
                    type="text"
                    className="xp-input"
                    value={searchInput}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by code, name or phone..."
                    autoComplete="off"
                    style={{ width: "100%", paddingRight: selectedCustomer ? "30px" : "10px" }}
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "#e2e8f0",
                        border: "none",
                        borderRadius: "50%",
                        width: "22px",
                        height: "22px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    maxHeight: "250px",
                    overflowY: "auto",
                    zIndex: 100,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    marginTop: "4px"
                  }}>
                    {filteredCustomers.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => selectCustomer(c)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                      >
                        <div>
                          {c.imageFront ? (
                            <img src={c.imageFront} alt={c.name} width="40" height="40" style={{ borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{c.name}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            {c.code && <span>Code: {c.code} | </span>}
                            {c.phone && <span>📞 {c.phone}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#dc2626" }}>
                          PKR {fmt(c.currentBalance || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected Customer with Photo, Name & Code */}
              {selectedCustomer && (
                <>
                  {/* Customer Photo */}
                  <div>
                    {selectedCustomer.imageFront ? (
                      <img 
                        src={selectedCustomer.imageFront} 
                        alt={selectedCustomer.name} 
                        style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
                      />
                    ) : (
                      <div style={{ 
                        width: "50px", 
                        height: "50px", 
                        borderRadius: "50%", 
                        background: "#e2e8f0", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        fontSize: "24px" 
                      }}>
                        👤
                      </div>
                    )}
                  </div>
                  
                  {/* Customer Name & Code */}
                  <div style={{ minWidth: "150px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>{selectedCustomer.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Code: {selectedCustomer.code || "—"}</div>
                  </div>
                  
                  {/* Outstanding Balance */}
                  <div style={{ minWidth: "120px", textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>Outstanding</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: (selectedCustomer.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>
                      PKR {fmt(selectedCustomer.currentBalance || 0)}
                    </div>
                  </div>
                  
                  {/* Payment Amount Input */}
                  <div style={{ minWidth: "140px" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>Enter amount</div>
                    <input
                      ref={amountRef}
                      type="number"
                      className="xp-input"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      onKeyDown={handleAmountKeyDown}
                      placeholder="Amount"
                      step="1"
                      min="1"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  
                  {/* Remarks Input */}
                  <div style={{ minWidth: "140px", flex: 1 }}>
                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>Remarks</div>
                    <input
                      ref={remarksRef}
                      type="text"
                      className="xp-input"
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                      onKeyDown={handleRemarksKeyDown}
                      placeholder="Optional"
                      style={{ fontSize: "13px" }}
                    />
                  </div>
                  
                  {/* Submit Button */}
                  <div>
                    <button
                      ref={submitRef}
                      type="submit"
                      className="xp-btn"
                      disabled={submitting || !paymentAmount}
                      style={{ background: "#22c55e", color: "white", padding: "8px 20px", marginTop: "20px", whiteSpace: "nowrap" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#16a34a"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#22c55e"}
                    >
                      {submitting ? "Processing..." : "💰 Receive Payment"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Date Range Picker Row */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          display: "flex",
          gap: "15px",
          alignItems: "flex-end",
          flexWrap: "wrap"
        }}>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>From Date</div>
            <input
              type="date"
              className="xp-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: "160px" }}
            />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>To Date</div>
            <input
              type="date"
              className="xp-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: "160px" }}
            />
          </div>
          <div>
            <button
              className="xp-btn xp-btn-primary"
              onClick={loadTransactions}
              disabled={!selectedCustomer || loading}
              style={{ padding: "8px 24px" }}
            >
              {loading ? "Loading..." : "⟳ Show Transactions"}
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid #e2e8f0"
          }}>
            <h3 style={{ margin: 0, fontSize: "16px" }}>
              📊 Transaction Details
              {transactions.length > 0 && <span style={{ fontSize: "12px", fontWeight: "normal", marginLeft: "10px", color: "#64748b" }}>({transactions.length} records)</span>}
            </h3>
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              Period: {fromDate} to {toDate}
            </div>
          </div>

          {loading && (
            <div className="xp-loading" style={{ padding: "40px", textAlign: "center" }}>
              Loading transactions...
            </div>
          )}

          {!loading && transactions.length === 0 && selectedCustomer && (
            <div className="xp-empty" style={{ padding: "60px", textAlign: "center" }}>
              No transactions found for the selected date range
            </div>
          )}

          {!loading && transactions.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="xp-table" style={{ fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Type</th>
                    <th className="r">Debit (Sale)</th>
                    <th className="r">Credit (Payment)</th>
                    <th className="r">Balance</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={t._id || i} style={{
                      background: t.type === "payment" || t.type === "cash-receipt" ? "#f0fdf4" : "white"
                    }}>
                      <td style={{ textAlign: "center" }}>{i + 1}</td>
                      <td>{t.date}</td>
                      <td>
                        <strong>{t.reference}</strong>
                      </td>
                      <td>
                        <span className={`ledger-badge ${t.type === "sale" ? "badge-sale" : t.type === "raw-purchase" ? "badge-raw" : "badge-payment"}`}>
                          {t.transType}
                        </span>
                      </td>
                      <td className="r" style={{ color: "#dc2626" }}>
                        {t.debit > 0 ? `PKR ${fmt(t.debit)}` : "—"}
                      </td>
                      <td className="r" style={{ color: "#059669" }}>
                        {t.credit > 0 ? `PKR ${fmt(t.credit)}` : "—"}
                      </td>
                      <td className="r">
                        <strong style={{ color: t.runningBalance > 0 ? "#dc2626" : "#059669" }}>
                          PKR {fmt(Math.abs(t.runningBalance))}
                        </strong>
                      </td>
                      <td style={{ fontSize: "11px", color: "#64748b" }}>{t.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc", fontWeight: "bold" }}>
                  <tr>
                    <td colSpan="4" style={{ textAlign: "right" }}><strong>Totals:</strong></td>
                    <td className="r"><strong>PKR {fmt(totalDebit)}</strong></td>
                    <td className="r"><strong>PKR {fmt(totalCredit)}</strong></td>
                    <td className="r">
                      <strong style={{ color: closingBalance > 0 ? "#dc2626" : "#059669" }}>
                        PKR {fmt(Math.abs(closingBalance))}
                      </strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="xp-statusbar">
        <div className="xp-status-pane">📊 Customer Ledger</div>
        <div className="xp-status-pane">
          {selectedCustomer ? `Customer: ${selectedCustomer.name}` : "No customer selected"}
        </div>
        <div className="xp-status-pane">
          {transactions.length > 0 && `Balance: PKR ${fmt(Math.abs(closingBalance))}`}
        </div>
      </div>

      <style>{`
        .ledger-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
        }
        .badge-sale {
          background: #dbeafe;
          color: #2563eb;
        }
        .badge-raw {
          background: #fef3c7;
          color: #d97706;
        }
        .badge-payment {
          background: #dcfce7;
          color: #059669;
        }
        .xp-alert-info {
          background: #e0f2fe;
          color: #0369a1;
          border-left: 4px solid #0ea5e9;
        }
        .r {
          text-align: right;
        }
      `}</style>
    </div>
  );
}