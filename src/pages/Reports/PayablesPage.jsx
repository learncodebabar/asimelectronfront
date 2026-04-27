// pages/PayablesPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function PayablesPage() {
  const navigate = useNavigate();
  
  // State
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentDate, setPaymentDate] = useState(isoD());
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  
  const searchRef = useRef(null);
  const amountRef = useRef(null);
  
  useEffect(() => {
    loadSuppliers();
    searchRef.current?.focus();
  }, []);
  
  // Filter invoices by date range
  useEffect(() => {
    if (!invoices.length) {
      setFilteredInvoices([]);
      return;
    }
    
    let filtered = [...invoices];
    if (fromDate) {
      filtered = filtered.filter(inv => inv.invoiceDate >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(inv => inv.invoiceDate <= toDate);
    }
    setFilteredInvoices(filtered);
  }, [invoices, fromDate, toDate]);
  
  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        // Filter only suppliers
        const suppliersList = data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type === "supplier";
        });
        setSuppliers(suppliersList);
      }
    } catch (err) {
      showMsg("Failed to load suppliers", "error");
    }
    setLoading(false);
  };
  
  const loadSupplierDetails = async (supplier) => {
    setSelectedSupplier(supplier);
    setLoading(true);
    try {
      // Get purchase invoices for this supplier
      const purchasesRes = await api.get(EP.PURCHASES.GET_ALL);
      const supplierPurchases = (purchasesRes.data.data || []).filter(p => 
        p.supplierName === supplier.name || p.supplierId === supplier._id
      );
      
      // Get CPV payments for this supplier
      const cpvRes = await api.get(EP.CPV.GET_ALL);
      const cpvData = Array.isArray(cpvRes.data) ? cpvRes.data : cpvRes.data.data || [];
      const supplierPayments = cpvData.filter(p => 
        p.account_title?.toLowerCase() === supplier.name?.toLowerCase()
      );
      
      // Calculate totals
      const totalPurchases = supplierPurchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
      const totalPaid = supplierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const outstanding = totalPurchases - totalPaid;
      
      setInvoices(supplierPurchases.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate)));
      setPayments(supplierPayments.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setFromDate("");
      setToDate("");
      
      // Update supplier current balance
      setSelectedSupplier(prev => ({ 
        ...prev, 
        currentBalance: outstanding,
        totalPurchases,
        totalPaid
      }));
      
    } catch (err) {
      console.error("Failed to load supplier details:", err);
      showMsg("Failed to load supplier details", "error");
    }
    setLoading(false);
  };
  
  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };
  
  const filteredSuppliers = suppliers.filter(s => {
    const query = searchTerm.toLowerCase();
    return !query || 
      s.name?.toLowerCase().includes(query) ||
      s.phone?.includes(query) ||
      s.code?.toLowerCase().includes(query) ||
      s.area?.toLowerCase().includes(query);
  });
  
  const totalPayable = filteredSuppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance || 0), 0);
  const dueCount = filteredSuppliers.filter(s => (s.currentBalance || 0) > 0).length;
  
  const handleMakePayment = () => {
    if (!selectedSupplier) return;
    setPaymentAmount("");
    setPaymentRemarks("");
    setPaymentDate(isoD());
    setShowPaymentModal(true);
    setTimeout(() => amountRef.current?.focus(), 100);
  };
  
  const handlePaymentSubmit = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showMsg("Please enter a valid amount", "error");
      return;
    }
    
    if (amount > (selectedSupplier.currentBalance || 0)) {
      showMsg(`Amount cannot exceed outstanding balance (PKR ${fmt(selectedSupplier.currentBalance)})`, "error");
      return;
    }
    
    setSubmitting(true);
    try {
      const cpvNumber = `CPV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const payload = {
        cpv_number: cpvNumber,
        date: paymentDate,
        code: selectedSupplier.code || "",
        account_title: selectedSupplier.name,
        description: paymentRemarks || `Payment to supplier - ${selectedSupplier.name}`,
        invoice: "",
        amount: amount,
        send_sms: false,
      };
      
      await api.post(EP.CPV.CREATE, payload);
      showMsg(`Payment of PKR ${fmt(amount)} recorded successfully!`, "success");
      
      // Refresh supplier details
      await loadSupplierDetails(selectedSupplier);
      await loadSuppliers();
      setShowPaymentModal(false);
      
    } catch (err) {
      showMsg(err.response?.data?.error || "Payment failed", "error");
    }
    setSubmitting(false);
  };
  
  const handleViewStatement = (supplier) => {
    loadSupplierDetails(supplier);
  };
  
  const handleBackToList = () => {
    setSelectedSupplier(null);
    setInvoices([]);
    setPayments([]);
    setFilteredInvoices([]);
    setFromDate("");
    setToDate("");
  };
  
  const handlePrintStatement = () => {
    if (!selectedSupplier) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(buildStatementHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };
  
  const buildStatementHtml = () => {
    const filteredInvoicesList = filteredInvoices.length > 0 ? filteredInvoices : invoices;
    const invoiceRows = filteredInvoicesList.map((inv, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #000">${i + 1}</td>
        <td style="padding:8px;border:1px solid #000">${inv.invoiceNo}</td>
        <td style="padding:8px;border:1px solid #000">${inv.invoiceDate}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(inv.netTotal || 0)}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(inv.paidAmount || 0)}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt((inv.netTotal || 0) - (inv.paidAmount || 0))}</td>
      </tr>
    `).join("");
    
    const paymentRows = payments.map((p, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #000">${i + 1}</td>
        <td style="padding:8px;border:1px solid #000">${p.cpv_number}</td>
        <td style="padding:8px;border:1px solid #000">${p.date?.slice(0, 10) || p.createdAt?.slice(0, 10)}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(p.amount)}</td>
        <td style="padding:8px;border:1px solid #000">${p.description || p.remarks || "—"}</td>
      </tr>
    `).join("");
    
    const totalInvoices = filteredInvoicesList.reduce((sum, inv) => sum + (inv.netTotal || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstanding = selectedSupplier.currentBalance || 0;
    
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Supplier Statement - ${selectedSupplier.name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #000}
        .shop-name{font-size:22px;font-weight:bold}
        .shop-addr{font-size:11px;color:#444}
        .title{font-size:16px;font-weight:bold;margin:15px 0;background:#dc2626;color:#fff;padding:8px;text-align:center}
        .supplier-info{background:#f8fafc;padding:12px;margin-bottom:20px;border:2px solid #000}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th{background:#000;color:#fff;padding:10px;border:1px solid #000}
        td{padding:8px;border:1px solid #000}
        .text-right{text-align:right}
        .totals{width:400px;margin-left:auto;margin-top:20px}
        .totals-row{display:flex;justify-content:space-between;padding:6px 0}
        .totals-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:8px}
        .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
      </div>
      <div class="title">SUPPLIER PAYABLE STATEMENT</div>
      <div class="supplier-info">
        <div><strong>Supplier:</strong> ${selectedSupplier.name}</div>
        <div><strong>Code:</strong> ${selectedSupplier.code || "—"} | <strong>Phone:</strong> ${selectedSupplier.phone || "—"}</div>
        <div><strong>Address:</strong> ${selectedSupplier.address || "—"} ${selectedSupplier.area ? `(${selectedSupplier.area})` : ""}</div>
      </div>
      
      <h3>📋 PURCHASE INVOICES</h3>
      <table><thead><tr><th>#</th><th>Invoice #</th><th>Date</th><th class="text-right">Total</th><th class="text-right">Paid</th><th class="text-right">Balance</th></tr></thead>
      <tbody>${invoiceRows || '<tr><td colspan="6" style="text-align:center">No invoices found</td></tr>'}</tbody>
      </table>
      
      <h3>💳 PAYMENT HISTORY</h3>
      <table><thead><tr><th>#</th><th>CPV #</th><th>Date</th><th class="text-right">Amount</th><th>Remarks</th></tr></thead>
      <tbody>${paymentRows || '<tr><td colspan="5" style="text-align:center">No payments found</td></tr>'}</tbody>
      </table>
      
      <div class="totals">
        <div class="totals-row"><span>Total Purchases:</span><span>PKR ${fmt(totalInvoices)}</span></div>
        <div class="totals-row"><span>Total Paid:</span><span>PKR ${fmt(totalPaid)}</span></div>
        <div class="totals-row bold"><span>Outstanding Payable:</span><span class="red">PKR ${fmt(outstanding)}</span></div>
      </div>
      <div class="footer">Printed on: ${new Date().toLocaleString()} | Developed by: Creative Babar / 03098325271</div>
    </body>
    </html>`;
  };
  
  // If a supplier is selected, show detailed view
  if (selectedSupplier) {
    const totalInvoicesAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.netTotal || 0), 0);
    const totalInvoicesPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalInvoicesBalance = totalInvoicesAmount - totalInvoicesPaid;
    
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
        {/* Titlebar */}
        <div className="xp-titlebar" style={{ background: "#dc2626", padding: "8px 16px" }}>
          <button className="xp-cap-btn" onClick={handleBackToList} style={{ color: "white", fontSize: "16px", background: "rgba(255,255,255,0.2)" }}>←</button>
          <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Payables — {selectedSupplier.name}</span>
          <div className="xp-tb-actions">
            <button className="xp-btn xp-btn-sm" onClick={handlePrintStatement} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold", background: "#fff", color: "#000", border: "1px solid #000" }}>🖨 Print</button>
            <button className="xp-btn xp-btn-sm" onClick={handleMakePayment} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold", background: "#22c55e", color: "white", border: "1px solid #000" }}>💰 Make Payment</button>
            <button className="xp-cap-btn xp-cap-close" onClick={handleBackToList}>✕</button>
          </div>
        </div>
        
        {msg.text && (
          <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "8px 16px", fontSize: "12px", padding: "6px 12px", fontWeight: "500", border: "1px solid #000" }}>
            {msg.text}
          </div>
        )}
        
        <div style={{ padding: "16px", background: "#ffffff", flex: 1, overflow: "auto" }}>
          {/* Supplier Info Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
            <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000", textTransform: "uppercase", marginBottom: "4px" }}>Total Purchases</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(selectedSupplier.totalPurchases || 0)}</div>
            </div>
            <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000", textTransform: "uppercase", marginBottom: "4px" }}>Total Paid</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#059669" }}>PKR {fmt(selectedSupplier.totalPaid || 0)}</div>
            </div>
            <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000", textTransform: "uppercase", marginBottom: "4px" }}>Outstanding</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(selectedSupplier.currentBalance || 0)}</div>
            </div>
            <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000", textTransform: "uppercase", marginBottom: "4px" }}>Total Invoices</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000" }}>{invoices.length}</div>
            </div>
          </div>
          
          {/* Date Filter Row */}
          <div style={{
            background: "#f8fafc",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "16px",
            border: "1px solid #000000",
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            flexWrap: "wrap"
          }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "3px" }}>FROM DATE</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ height: "32px", padding: "0 10px", border: "1px solid #000", borderRadius: "4px", fontSize: "12px" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "3px" }}>TO DATE</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ height: "32px", padding: "0 10px", border: "1px solid #000", borderRadius: "4px", fontSize: "12px" }} />
            </div>
            <div>
              <button onClick={() => { setFromDate(""); setToDate(""); }} style={{ height: "32px", padding: "0 16px", background: "#ef4444", color: "white", border: "1px solid #000", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Clear Filters</button>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "bold" }}>
              Showing: {filteredInvoices.length} of {invoices.length} invoices
            </div>
          </div>
          
          {/* Invoices Table */}
          <div style={{ background: "#ffffff", borderRadius: "8px", border: "2px solid #000000", marginBottom: "20px", overflow: "hidden" }}>
            <div style={{ background: "#000", color: "#fff", padding: "10px 12px", fontWeight: "bold", fontSize: "13px" }}>
              📋 Purchase Invoices
            </div>
            <div style={{ overflowX: "auto", maxHeight: "300px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f1f5f9" }}>
                  <tr>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "center", width: "40px" }}>#</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "left" }}>Invoice #</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "right" }}>Total (PKR)</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "right" }}>Paid (PKR)</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "right" }}>Balance (PKR)</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "center", width: "80px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>}
                  {!loading && filteredInvoices.length === 0 && <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No invoices found</td></tr>}
                  {filteredInvoices.map((inv, i) => {
                    const balance = (inv.netTotal || 0) - (inv.paidAmount || 0);
                    return (
                      <tr key={inv._id} style={{ borderBottom: "1px solid #000" }}>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000" }}>{i + 1}</td>
                        <td style={{ padding: "8px", border: "1px solid #000", fontWeight: "bold", fontFamily: "monospace" }}>{inv.invoiceNo}</td>
                        <td style={{ padding: "8px", border: "1px solid #000" }}>{inv.invoiceDate}</td>
                        <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>PKR {fmt(inv.netTotal)}</td>
                        <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000", color: "#059669" }}>PKR {fmt(inv.paidAmount)}</td>
                        <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000", fontWeight: "bold", color: balance > 0 ? "#dc2626" : "#059669" }}>PKR {fmt(balance)}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000" }}>
                          <span style={{ background: balance > 0 ? "#fee2e2" : "#d1fae5", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", border: "1px solid #000" }}>
                            {balance > 0 ? "Due" : "Paid"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredInvoices.length > 0 && (
                  <tfoot style={{ background: "#f8fafc", borderTop: "2px solid #000" }}>
                    <tr>
                      <td colSpan="3" style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>TOTALS:</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>PKR {fmt(totalInvoicesAmount)}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#059669" }}>PKR {fmt(totalInvoicesPaid)}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(totalInvoicesBalance)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          
          {/* Payments Table */}
          <div style={{ background: "#ffffff", borderRadius: "8px", border: "2px solid #000000", overflow: "hidden" }}>
            <div style={{ background: "#000", color: "#fff", padding: "10px 12px", fontWeight: "bold", fontSize: "13px" }}>
              💳 Payment History
            </div>
            <div style={{ overflowX: "auto", maxHeight: "300px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f1f5f9" }}>
                  <tr>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "center", width: "40px" }}>#</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "left" }}>CPV #</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "right" }}>Amount (PKR)</th>
                    <th style={{ padding: "8px", border: "1px solid #000", textAlign: "left" }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>}
                  {!loading && payments.length === 0 && <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No payments recorded</td></tr>}
                  {payments.map((p, i) => (
                    <tr key={p._id} style={{ borderBottom: "1px solid #000" }}>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000" }}>{i + 1}</td>
                      <td style={{ padding: "8px", border: "1px solid #000", fontWeight: "bold", fontFamily: "monospace" }}>{p.cpv_number}</td>
                      <td style={{ padding: "8px", border: "1px solid #000" }}>{p.date?.slice(0, 10) || p.createdAt?.slice(0, 10)}</td>
                      <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000", fontWeight: "bold", color: "#059669" }}>PKR {fmt(p.amount)}</td>
                      <td style={{ padding: "8px", border: "1px solid #000" }}>{p.description || p.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                {payments.length > 0 && (
                  <tfoot style={{ background: "#f8fafc", borderTop: "2px solid #000" }}>
                    <tr>
                      <td colSpan="3" style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>TOTAL:</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#059669" }}>PKR {fmt(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
        
        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="scm-overlay" onClick={(e) => e.target === e.currentTarget && setShowPaymentModal(false)} style={{ zIndex: 2000 }}>
            <div className="scm-window" style={{ maxWidth: 450, width: "90%" }}>
              <div className="scm-tb" style={{ background: "#dc2626" }}>
                <span className="scm-tb-title" style={{ color: "white", fontWeight: "bold" }}>Make Payment — {selectedSupplier.name}</span>
                <button className="xp-cap-btn xp-cap-close" onClick={() => setShowPaymentModal(false)} style={{ color: "white" }}>✕</button>
              </div>
              <div style={{ padding: "20px" }}>
                <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #000" }}>
                  <div><strong>Outstanding Balance:</strong> <span style={{ color: "#dc2626", fontWeight: "bold" }}>PKR {fmt(selectedSupplier.currentBalance)}</span></div>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Payment Date</label>
                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid #000", borderRadius: "4px", fontSize: "12px" }} />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Amount (PKR)</label>
                  <input ref={amountRef} type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" step="1" style={{ width: "100%", padding: "8px", border: "1px solid #000", borderRadius: "4px", fontSize: "14px", fontWeight: "bold", textAlign: "right" }} onKeyDown={(e) => e.key === "Enter" && handlePaymentSubmit()} />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Remarks (Optional)</label>
                  <input type="text" value={paymentRemarks} onChange={(e) => setPaymentRemarks(e.target.value)} placeholder="Payment remarks..." style={{ width: "100%", padding: "8px", border: "1px solid #000", borderRadius: "4px", fontSize: "12px" }} />
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button className="xp-btn" onClick={() => setShowPaymentModal(false)} style={{ border: "1px solid #000", padding: "8px 20px", fontWeight: "bold" }}>Cancel</button>
                  <button className="xp-btn xp-btn-primary" onClick={handlePaymentSubmit} disabled={submitting} style={{ background: "#22c55e", color: "white", border: "1px solid #000", padding: "8px 20px", fontWeight: "bold" }}>{submitting ? "Processing..." : "Confirm Payment"}</button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
          <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>🏢 Payables - {selectedSupplier.name}</div>
          <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Outstanding: PKR {fmt(selectedSupplier.currentBalance)}</div>
          <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Invoices: {invoices.length} | Payments: {payments.length}</div>
        </div>
      </div>
    );
  }
  
  // Main suppliers list view
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#dc2626", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px", background: "rgba(255,255,255,0.2)" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Accounts Payable — Suppliers</span>
        <div className="xp-tb-actions">
          <button className="xp-cap-btn" onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }}>□</button>
          <button className="xp-cap-btn xp-cap-close" onClick={() => navigate("/")}>✕</button>
        </div>
      </div>
      
      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "8px 16px", fontSize: "12px", padding: "6px 12px", fontWeight: "500", border: "1px solid #000" }}>
          {msg.text}
        </div>
      )}
      
      <div style={{ padding: "16px", background: "#ffffff", flex: 1, overflow: "auto" }}>
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000", textTransform: "uppercase", marginBottom: "4px" }}>Total Suppliers</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#000" }}>{suppliers.length}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000", textTransform: "uppercase", marginBottom: "4px" }}>With Payable</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#dc2626" }}>{dueCount}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000", textTransform: "uppercase", marginBottom: "4px" }}>Total Payable</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(totalPayable)}</div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="xp-toolbar" style={{ marginBottom: "16px" }}>
          <div className="xp-search-wrap" style={{ width: "100%", position: "relative" }}>
            <svg className="xp-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#666" }}>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
            </svg>
            <input 
              ref={searchRef} 
              type="text" 
              className="xp-input" 
              style={{ 
                paddingLeft: "32px", 
                border: "2px solid #000000", 
                borderRadius: "6px", 
                height: "40px", 
                width: "100%", 
                fontSize: "13px",
                background: "#ffffff"
              }} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Search by supplier name, code, phone or area..." 
              autoFocus 
            />
          </div>
        </div>
        
        {/* Suppliers Table */}
        <div className="xp-table-panel" style={{ border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
          {loading && <div className="xp-loading" style={{ padding: "40px", textAlign: "center", fontSize: "13px" }}>Loading suppliers...</div>}
          {!loading && filteredSuppliers.length === 0 && <div className="xp-empty" style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>No suppliers found</div>}
          {!loading && filteredSuppliers.length > 0 && (
            <div className="xp-table-scroll" style={{ overflowX: "auto" }}>
              <table className="xp-table" style={{ fontSize: "13px", cursor: "pointer", width: "100%", borderCollapse: "collapse", border: "2px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#000000", color: "#ffffff" }}>
                    <th style={{ width: 40, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Code</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Supplier Name</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Phone</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Area</th>
                    <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Payable Amount</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Status</th>
                    <th style={{ width: 100, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((s, i) => (
                    <tr key={s._id} style={{ borderBottom: "1px solid #000000", background: (s.currentBalance || 0) > 0 ? "#fef2f2" : "#ffffff" }}>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold", color: "#666" }}>{i + 1}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", background: "#f5f5f5" }}>{s.code || "—"}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000" }}>
                        <button className="xp-link-btn" onClick={() => handleViewStatement(s)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
                          <strong>{s.name}</strong>
                        </button>
                      </td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{s.phone || "—"}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{s.area || "—"}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: (s.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>
                        PKR {fmt(s.currentBalance || 0)}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                        <span style={{ background: (s.currentBalance || 0) > 0 ? "#fee2e2" : "#d1fae5", color: (s.currentBalance || 0) > 0 ? "#dc2626" : "#059669", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid #000000" }}>
                          {(s.currentBalance || 0) > 0 ? "Payable" : "Cleared"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button className="xp-btn xp-btn-sm" onClick={() => handleViewStatement(s)} style={{ border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="View Statement">📋</button>
                          {s.phone && (
                            <button className="xp-btn xp-btn-sm" onClick={(e) => { 
                              e.stopPropagation(); 
                              const msg = `Assalam-o-Alaikum *${s.name}*,\n\nPayable Amount: *PKR ${fmt(s.currentBalance)}*`;
                              window.open(`https://wa.me/${s.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                            }} style={{ background: "#25D366", color: "#ffffff", border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="WhatsApp">📱</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f5f5f5", fontWeight: "bold", borderTop: "2px solid #000000" }}>
                  <tr>
                    <td colSpan="5" style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>Total Payable:</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(totalPayable)}</td>
                    <td colSpan="2" style={{ padding: "10px 8px", border: "1px solid #000000" }}> </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e293b" }}>🏢 Accounts Payable</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e293b" }}>{filteredSuppliers.length} suppliers | {dueCount} with payable</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#dc2626" }}>Total Payable: PKR {fmt(totalPayable)}</div>
      </div>
      
      <style>{`
        .scm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .scm-window {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: modalIn 0.2s ease;
        }
        .scm-tb {
          background: #1e293b;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .scm-tb-title {
          font-weight: 600;
          font-size: 14px;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}