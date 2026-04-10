// pages/CreditCustomersPage.jsx
import React, { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/CreditCustomersPage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

// Build Complete Customer Statement HTML for Print (Smaller Font)
const buildCustomerStatementHtml = (customer, sales, rawPurchases, payments) => {
  const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
  
  const totalSales = sales.reduce((s, x) => s + (x.netTotal || 0), 0);
  const totalPaid = sales.reduce((s, x) => s + (x.paidAmount || 0), 0);
  const totalRaw = rawPurchases.reduce((s, x) => s + (x.netTotal || 0), 0);
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstanding = customer.currentBalance || 0;
  
  // Build detailed invoice rows with items in proper table format
  const allInvoices = [...sales, ...rawPurchases].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  
  let invoiceRows = "";
  let counter = 1;
  
  allInvoices.forEach((inv) => {
    // Main invoice row
    invoiceRows += `
      <tr style="background:${inv.saleType === "raw-purchase" ? "#fef3c7" : "#e8f0fe"}">
        <td style="padding:6px;border:1px solid #ddd;font-size:10px;font-weight:bold;text-align:center">${counter}</td>
        <td style="padding:6px;border:1px solid #ddd;font-size:10px;font-weight:bold">${inv.invoiceNo}</td>
        <td style="padding:6px;border:1px solid #ddd;font-size:10px;font-weight:bold">${inv.invoiceDate}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;font-size:10px;font-weight:bold">PKR ${fmt(inv.netTotal)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;font-size:10px;font-weight:bold">PKR ${fmt(inv.paidAmount)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;font-size:10px;font-weight:bold">PKR ${fmt(inv.balance)}</td>
      </tr>
    `;
    
    // Items rows (indented)
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach((it, idx) => {
        invoiceRows += `
          <tr style="background:#f9f9f9">
            <td style="padding:3px 6px 3px 25px;border:1px solid #ddd;font-size:9px;text-align:center">${String.fromCharCode(97 + idx)}</td>
            <td colspan="2" style="padding:3px 6px;border:1px solid #ddd;font-size:9px">${it.description || it.name}</td>
            <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;font-size:9px">${it.qty || it.pcs || 0} ${it.measurement || it.uom || ""}</td>
            <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;font-size:9px">PKR ${fmt(it.rate || 0)}</td>
            <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;font-size:9px">PKR ${fmt(it.amount || 0)}</td>
          </tr>
        `;
      });
    }
    
    counter++;
  });
  
  const paymentRows = payments.map((p, i) => `
    <tr>
      <td style="padding:5px;border:1px solid #ddd;font-size:10px;text-align:center">${i + 1}</td>
      <td style="padding:5px;border:1px solid #ddd;font-size:10px">${p.paymentDate || p.createdAt?.split("T")[0]}</td>
      <td style="padding:5px;border:1px solid #ddd;text-align:right;font-size:10px">PKR ${fmt(p.amount)}</td>
      <td style="padding:5px;border:1px solid #ddd;font-size:10px">${p.remarks || "—"}</td>
    </tr>
  `).join("");
  
  // Get current date and time for print
  const printDateTime = new Date().toLocaleString("en-PK", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Customer Statement - ${customer.name}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:15px;font-size:10px}
      
      /* Header with shop left and customer right */
      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #333;
      }
      .shop-section {
        text-align: left;
        flex: 2;
      }
      .customer-section {
        text-align: right;
        flex: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 10px;
      }
      .shop-name{font-size:16px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:3px}
      .shop-name-en{font-size:12px;font-weight:bold;margin-bottom:3px}
      .shop-addr{font-size:8px;color:#666;margin:2px 0}
      .print-time{font-size:7px;color:#999;margin-top:3px}
      .customer-photo-small{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid #333}
      .customer-name{font-size:12px;font-weight:bold;margin-bottom:2px}
      .customer-phone{font-size:9px;color:#666}
      
      .customer-info{background:#f5f5f5;padding:10px;margin:10px 0;border-radius:6px;display:flex;gap:15px;flex-wrap:wrap;align-items:center}
      .customer-photo{width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #333}
      .customer-details{flex:1}
      .customer-details h3{font-size:12px;margin-bottom:5px}
      .customer-details p{font-size:9px;margin:2px 0}
      .section-title{font-size:11px;font-weight:bold;margin:12px 0 6px;padding:5px;background:#333;color:#fff}
      table{width:100%;border-collapse:collapse;margin:5px 0}
      th{background:#555;color:#fff;padding:5px;font-size:9px;border:1px solid #666}
      td{padding:5px;border:1px solid #ddd;font-size:9px}
      .totals{width:300px;margin-left:auto;margin-top:12px}
      .totals-row{display:flex;justify-content:space-between;padding:4px 0;font-size:9px}
      .totals-row.bold{font-weight:bold;border-top:1px solid #333;margin-top:3px;padding-top:3px}
      .footer{text-align:center;margin-top:20px;padding-top:6px;border-top:1px solid #ddd;font-size:7px;color:#666}
      .text-center{text-align:center}
      .text-right{text-align:right}
      @media print{body{padding:5mm}}
    </style>
  </head>
  <body>
    <!-- Header with Shop on Left and Customer on Right -->
    <div class="print-header">
      <div class="shop-section">
        <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
        <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
        <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
        <div class="print-time">Printed on: ${printDateTime}</div>
      </div>
      <div class="customer-section">
        ${customer.imageFront ? 
          `<img src="${customer.imageFront}" class="customer-photo-small" alt="${customer.name}">` : 
          `<div style="width:50px;height:50px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:25px">👤</div>`
        }
        <div>
          <div class="customer-name">${customer.name}</div>
          <div class="customer-phone">📞 ${customer.phone || "N/A"}</div>
          <div class="customer-phone">🆔 ${customer.code || "N/A"}</div>
               <p>📍 ${customer.address || ""} ${customer.area ? `(${customer.area})` : ""}</p>
                <p>📅 Statement Date: ${isoD()}</p>
        </div>
      </div>
    </div>
    
    <!-- Detailed Customer Info 
   
    </div>
    -->
    <div class="section-title">💰 INVOICES (With Items Details)</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th>Invoice No</th>
          <th>Date</th>
          <th class="text-right">Total</th>
          <th class="text-right">Paid</th>
          <th class="text-right">Balance</th>
        </tr>
      </thead>
      <tbody>${invoiceRows}</tbody>
    </table>
    
    ${payments.length > 0 ? `
    <div class="section-title">💳 PAYMENT HISTORY</div>
    <table>
      <thead>
        <tr><th style="width:30px">#</th><th>Date</th><th class="text-right">Amount</th><th>Remarks</th></tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>` : ""}
    
    <div class="totals">
      <div class="totals-row"><span>Total Sales:</span><span>PKR ${fmt(totalSales)}</span></div>
      <div class="totals-row"><span>Raw Purchases:</span><span>PKR ${fmt(totalRaw)}</span></div>
      <div class="totals-row"><span>Total Paid:</span><span>PKR ${fmt(totalPaid + totalPayments)}</span></div>
      <div class="totals-row bold"><span>Outstanding Balance:</span><span style="color:#dc2626">PKR ${fmt(outstanding)}</span></div>
    </div>
    
    <div class="footer">Thank you for your business! | Developed by: AppHill / 03222292922 | www.apphill.pk</div>
  </body>
  </html>`;
};

// Build Single Invoice HTML for Print (Smaller Font)
const buildInvoiceHtml = (invoice, customer) => {
  const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
  const rows = invoice.items?.map((it, i) => ({ ...it, sr: i + 1 })) || [];
  
  const itemRows = rows.map(it => `
    <tr>
      <td style="padding:4px 6px;border:1px solid #ddd;font-size:9px;text-align:center">${it.sr}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;font-size:9px">${it.description || it.name}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;text-align:right;font-size:9px">${it.qty || it.pcs || 0} ${it.measurement || it.uom || ""}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;text-align:right;font-size:9px">PKR ${fmt(it.rate || 0)}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;text-align:right;font-size:9px">PKR ${fmt(it.amount || 0)}</td>
    </tr>
  `).join("");
  
  const printDateTime = new Date().toLocaleString("en-PK", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.invoiceNo}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:12px;font-size:10px}
      
      /* Header with shop left and customer right */
      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #333;
      }
      .shop-section {
        text-align: left;
        flex: 2;
      }
      .customer-section {
        text-align: right;
        flex: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
      }
      .shop-name{font-size:14px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:2px}
      .shop-name-en{font-size:11px;font-weight:bold;margin-bottom:2px}
      .shop-addr{font-size:7px;color:#666;margin:1px 0}
      .print-time{font-size:6px;color:#999;margin-top:2px}
      .customer-photo-small{width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #333}
      .customer-name{font-size:11px;font-weight:bold;margin-bottom:2px}
      .customer-phone{font-size:8px;color:#666}
      
      .invoice-title{font-size:13px;font-weight:bold;margin:10px 0;padding:5px;background:#333;color:#fff;text-align:center}
      .info-row{display:flex;justify-content:space-between;margin:8px 0;padding:6px;background:#f5f5f5;border-radius:4px;font-size:9px}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      th{background:#555;color:#fff;padding:5px;font-size:9px;border:1px solid #666}
      td{padding:4px 6px;border:1px solid #ddd;font-size:9px}
      .totals{width:280px;margin-left:auto;margin-top:10px}
      .totals-row{display:flex;justify-content:space-between;padding:3px 0;font-size:9px}
      .totals-row.bold{font-weight:bold;border-top:1px solid #333;margin-top:3px;padding-top:3px}
      .footer{text-align:center;margin-top:15px;padding-top:6px;border-top:1px solid #ddd;font-size:7px;color:#666}
      .text-right{text-align:right}
      @media print{body{padding:3mm}}
    </style>
  </head>
  <body>
    <!-- Header with Shop on Left and Customer on Right -->
    <div class="print-header">
      <div class="shop-section">
        <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
        <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
        <div class="shop-addr">Main Bazar Nahari Town, Faisalabad</div>
        <div class="shop-addr">Ph: 0300 7262129, 041 8711575</div>
        <div class="print-time">Printed on: ${printDateTime}</div>
      </div>
      <div class="customer-section">
        ${customer.imageFront ? 
          `<img src="${customer.imageFront}" class="customer-photo-small" alt="${customer.name}">` : 
          `<div style="width:40px;height:40px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:20px">👤</div>`
        }
        <div>
          <div class="customer-name">${customer.name}</div>
          <div class="customer-phone">📞 ${customer.phone || "N/A"}</div>
        </div>
      </div>
    </div>
    
    <div class="invoice-title">${invoice.saleType === "raw-purchase" ? "RAW PURCHASE INVOICE" : "SALES INVOICE"}</div>
    <div class="info-row">
      <span><strong>Invoice No:</strong> ${invoice.invoiceNo}</span>
      <span><strong>Date:</strong> ${invoice.invoiceDate}</span>
    </div>
    <div class="info-row">
      <span><strong>Customer:</strong> ${customer.name}</span>
      <span><strong>Phone:</strong> ${customer.phone || ""}</span>
    </div>
    <table>
      <thead>
        <tr><th style="width:30px">#</th><th>Description</th><th class="text-right">Qty</th><th class="text-right">Rate</th><th class="text-right">Amount</th></tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Sub Total:</span><span>PKR ${fmt(invoice.subTotal || 0)}</span></div>
      ${invoice.extraDisc > 0 ? `<div class="totals-row"><span>Discount:</span><span>PKR ${fmt(invoice.extraDisc)}</span></div>` : ""}
      <div class="totals-row bold"><span>Net Total:</span><span>PKR ${fmt(invoice.netTotal || 0)}</span></div>
      ${invoice.prevBalance > 0 ? `<div class="totals-row"><span>Previous Balance:</span><span>PKR ${fmt(invoice.prevBalance)}</span></div>` : ""}
      <div class="totals-row"><span>Paid:</span><span>PKR ${fmt(invoice.paidAmount || 0)}</span></div>
      <div class="totals-row bold ${(invoice.balance || 0) > 0 ? 'red' : 'green'}"><span>Balance:</span><span>PKR ${fmt(invoice.balance || 0)}</span></div>
    </div>
    <div class="footer">Thank you for your business! | Developed by: AppHill / 03222292922</div>
  </body>
  </html>`;
};

// Print/Share Functions
const printCustomerStatement = (customer, sales, rawPurchases, payments) => {
  const html = buildCustomerStatementHtml(customer, sales, rawPurchases, payments);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

const shareCustomerStatement = async (customer, sales, rawPurchases, payments) => {
  const phone = customer.phone?.replace(/\D/g, "");
  if (!phone) {
    alert("No phone number available");
    return;
  }
  const html = buildCustomerStatementHtml(customer, sales, rawPurchases, payments);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
        setTimeout(() => {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Customer Statement - ${customer.name}`)}`, '_blank');
        }, 1000);
      }, 500);
    };
  }
};

const printInvoice = (invoice, customer) => {
  const html = buildInvoiceHtml(invoice, customer);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

const shareInvoice = async (invoice, customer) => {
  const phone = customer.phone?.replace(/\D/g, "");
  if (!phone) {
    alert("No phone number available");
    return;
  }
  const html = buildInvoiceHtml(invoice, customer);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
        setTimeout(() => {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Invoice ${invoice.invoiceNo} - ${customer.name}`)}`, '_blank');
        }, 1000);
      }, 500);
    };
  }
};

/* ═══════════════════════════════════════════════════════════
   CUSTOMER DETAIL PAGE - Shows all customer details, invoices, payments
════════════════════════════════════════════════════════════ */
function CustomerDetailPage({ customer, onBack }) {
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rawPurchases, setRawPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState({});
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [customer._id]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const salesRes = await api.get(EP.CUSTOMERS.SALE_HISTORY(customer._id));
      if (salesRes.data.success) {
        setSales(Array.isArray(salesRes.data.data) ? salesRes.data.data : []);
      } else {
        setSales([]);
      }
      
      try {
        const paymentsRes = await api.get(`/payments/customer/${customer._id}`);
        if (paymentsRes.data.success) {
          setPayments(Array.isArray(paymentsRes.data.data) ? paymentsRes.data.data : []);
        } else {
          setPayments([]);
        }
      } catch (err) {
        setPayments([]);
      }
      
      try {
        const rawPurchasesRes = await api.get(`${EP.RAW_PURCHASES.GET_ALL}?customerId=${customer._id}`);
        if (rawPurchasesRes.data.success) {
          setRawPurchases(Array.isArray(rawPurchasesRes.data.data) ? rawPurchasesRes.data.data : []);
        } else {
          setRawPurchases([]);
        }
      } catch (err) {
        setRawPurchases([]);
      }
    } catch (err) {
      console.error("Failed to load customer data:", err);
      setSales([]);
      setPayments([]);
      setRawPurchases([]);
    }
    setLoading(false);
  };

  const toggleInvoiceExpand = (invoiceId) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const toggleExpandAll = () => {
    const newExpandAll = !expandAll;
    setExpandAll(newExpandAll);
    const allInvoiceIds = [...sales, ...rawPurchases].map(inv => inv._id);
    const newExpandedState = {};
    if (newExpandAll) {
      allInvoiceIds.forEach(id => { newExpandedState[id] = true; });
    }
    setExpandedInvoices(newExpandedState);
  };

  const totalSales = Array.isArray(sales) ? sales.reduce((s, x) => s + (x.netTotal || 0), 0) : 0;
  const totalPaid = Array.isArray(sales) ? sales.reduce((s, x) => s + (x.paidAmount || 0), 0) : 0;
  const totalRawPurchases = Array.isArray(rawPurchases) ? rawPurchases.reduce((s, x) => s + (x.netTotal || 0), 0) : 0;
  const totalPayments = Array.isArray(payments) ? payments.reduce((s, p) => s + (p.amount || 0), 0) : 0;
  const outstanding = customer.currentBalance || 0;

  const allTransactions = [
    ...(Array.isArray(sales) ? sales.map(s => ({ ...s, type: "sale", date: s.invoiceDate })) : []),
    ...(Array.isArray(rawPurchases) ? rawPurchases.map(r => ({ ...r, type: "raw-purchase", date: r.invoiceDate })) : []),
    ...(Array.isArray(payments) ? payments.map(p => ({ ...p, type: "payment", date: p.paymentDate || p.createdAt?.split("T")[0], amount: p.amount })) : [])
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleFullDetails = () => {
    setTimeout(() => {
      printCustomerStatement(customer, sales, rawPurchases, payments);
    }, 100);
  };

  // Render invoice items in table format
  const renderInvoiceItems = (invoice) => {
    const items = invoice.items || [];
    if (items.length === 0) return null;
    
    return (
      <tr className="invoice-details-row">
        <td colSpan="8" style={{ padding: "0", background: "#f8fafc" }}>
          <table className="xp-table" style={{ margin: "0", fontSize: "11px", border: "none", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 35, background: "#e2e8f0", padding: "4px", fontSize: "10px" }}>#</th>
                <th style={{ background: "#e2e8f0", padding: "4px", fontSize: "10px" }}>Product</th>
                <th style={{ width: 60, background: "#e2e8f0", padding: "4px", fontSize: "10px", textAlign: "center" }}>Qty</th>
                <th style={{ width: 80, background: "#e2e8f0", padding: "4px", fontSize: "10px", textAlign: "right" }}>Rate</th>
                <th style={{ width: 90, background: "#e2e8f0", padding: "4px", fontSize: "10px", textAlign: "right" }}>Amount</th>
                <th style={{ width: 50, background: "#e2e8f0", padding: "4px", fontSize: "10px", textAlign: "center" }}>Rack</th>
                <th style={{ width: 55, background: "#e2e8f0", padding: "4px", fontSize: "10px", textAlign: "center" }}>UOM</th>
                <th style={{ width: 50, background: "#e2e8f0", padding: "4px", fontSize: "10px", textAlign: "center" }}>Disc%</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "4px", fontSize: "10px", textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ padding: "4px", fontSize: "10px" }}>{it.description || it.name}</td>
                  <td style={{ padding: "4px", fontSize: "10px", textAlign: "center" }}>{it.qty || it.pcs || 0}</td>
                  <td style={{ padding: "4px", fontSize: "10px", textAlign: "right" }}>PKR {fmt(it.rate || 0)}</td>
                  <td style={{ padding: "4px", fontSize: "10px", textAlign: "right" }}>PKR {fmt(it.amount || 0)}</td>
                  <td style={{ padding: "4px", fontSize: "10px", textAlign: "center" }}>{it.rack || "—"}</td>
                  <td style={{ padding: "4px", fontSize: "10px", textAlign: "center" }}>{it.measurement || it.uom || "—"}</td>
                  <td style={{ padding: "4px", fontSize: "10px", textAlign: "center" }}>{it.disc || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </td>
      </tr>
    );
  };

  return (
    <div className="cp-customer-detail-page">
      {/* Header with Customer Photo */}
      <div className="cp-detail-header">
        <button className="xp-btn xp-btn-sm" onClick={onBack}>← Back to List</button>
        <div className="cp-customer-photo">
          {customer.imageFront ? (
            <img src={customer.imageFront} alt={customer.name} className="cp-photo-img" />
          ) : (
            <div className="cp-photo-placeholder">👤</div>
          )}
        </div>
        <div className="cp-customer-info">
          <h2>{customer.name}</h2>
          <div className="cp-customer-badges">
            {customer.code && <span className="cp-badge">Code: {customer.code}</span>}
            {customer.phone && <span className="cp-badge">📞 {customer.phone}</span>}
            {customer.area && <span className="cp-badge">📍 {customer.area}</span>}
            {customer.address && <span className="cp-badge">🏠 {customer.address}</span>}
          </div>
        </div>
        <div className="cp-detail-actions">
          <button className="xp-btn xp-btn-primary" onClick={handleFullDetails}>
            📄 Print Full Statement
          </button>
          <button className="xp-btn xp-btn-wa" onClick={() => shareCustomerStatement(customer, sales, rawPurchases, payments)}>
            📱 Share Statement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="cc-stat-grid" style={{ marginBottom: 20 }}>
        <div className="cc-stat-card"><div className="cc-stat-label">Total Sales</div><div className="cc-stat-val">PKR {fmt(totalSales)}</div></div>
        <div className="cc-stat-card green"><div className="cc-stat-label">Total Paid</div><div className="cc-stat-val success">PKR {fmt(totalPaid + totalPayments)}</div></div>
        <div className="cc-stat-card"><div className="cc-stat-label">Raw Purchases</div><div className="cc-stat-val">PKR {fmt(totalRawPurchases)}</div></div>
        <div className="cc-stat-card red"><div className="cc-stat-label">Outstanding</div><div className="cc-stat-val danger">PKR {fmt(outstanding)}</div></div>
        <div className="cc-stat-card"><div className="cc-stat-label">Transactions</div><div className="cc-stat-val">{allTransactions.length}</div></div>
      </div>

      {/* Tabs */}
      <div className="xp-tab-bar">
        <button className={`xp-tab${activeTab === "invoices" ? " active" : ""}`} onClick={() => setActiveTab("invoices")}>📋 Invoices ({(sales.length || 0) + (rawPurchases.length || 0)})</button>
        <button className={`xp-tab${activeTab === "payments" ? " active" : ""}`} onClick={() => setActiveTab("payments")}>💳 Payments ({payments.length || 0})</button>
        <button className={`xp-tab${activeTab === "raw" ? " active" : ""}`} onClick={() => setActiveTab("raw")}>📦 Raw Purchases ({rawPurchases.length || 0})</button>
        <button className={`xp-tab${activeTab === "all" ? " active" : ""}`} onClick={() => setActiveTab("all")}>📊 All Transactions ({allTransactions.length})</button>
      </div>

      {/* Expand/Collapse All Button */}
      {(activeTab === "invoices" || activeTab === "raw") && (sales.length > 0 || rawPurchases.length > 0) && (
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
          <button className="xp-btn xp-btn-sm" onClick={toggleExpandAll}>
            {expandAll ? "📋 Collapse All Invoices" : "📋 Expand All Invoices (Show Items)"}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="xp-table-panel">
        {loading && <div className="xp-loading">Loading...</div>}
        
        {/* Invoices Tab */}
        {activeTab === "invoices" && !loading && (
          <div className="xp-table-scroll">
            <table className="xp-table">
              <thead>
                <tr>
                  <th style={{ width: 35 }}>#</th>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th className="r">Total</th>
                  <th className="r">Paid</th>
                  <th className="r">Balance</th>
                  <th>Type</th>
                  <th style={{ width: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...(Array.isArray(sales) ? sales : []), ...(Array.isArray(rawPurchases) ? rawPurchases : [])]
                  .sort((a,b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
                  .map((inv, i) => {
                    const isExpanded = expandedInvoices[inv._id];
                    return (
                      <Fragment key={inv._id || i}>
                        <tr style={{ background: inv.saleType === "raw-purchase" ? "#fef3c7" : "white" }}>
                          <td style={{ textAlign: "center" }}>{i + 1}</td>
                          <td><strong>{inv.invoiceNo}</strong></td>
                          <td>{inv.invoiceDate}</td>
                          <td className="r">PKR {fmt(inv.netTotal)}</td>
                          <td className="r success">PKR {fmt(inv.paidAmount)}</td>
                          <td className="r">{inv.balance > 0 ? <span className="danger">PKR {fmt(inv.balance)}</span> : "✓"}</td>
                          <td><span className={`xp-badge ${inv.saleType === "raw-purchase" ? "xp-badge-raw" : "xp-badge-sale"}`}>{inv.saleType === "raw-purchase" ? "Raw Purchase" : "Sale"}</span></td>
                          <td>
                            <div className="cc-act">
                              <button className="xp-btn xp-btn-sm xp-btn-ico" onClick={() => toggleInvoiceExpand(inv._id)} title={isExpanded ? "Hide Items" : "Show Items"}>
                                {isExpanded ? "📄 Hide" : "📄 Show Items"}
                              </button>
                              <button className="xp-btn xp-btn-sm xp-btn-ico" onClick={() => handleViewInvoice(inv)} title="View Invoice">👁️</button>
                              <button className="xp-btn xp-btn-sm xp-btn-ico" onClick={() => printInvoice(inv, customer)} title="Print Invoice">🖨️</button>
                              <button className="xp-btn xp-btn-sm xp-btn-ico cc-btn-wa-sm" onClick={() => shareInvoice(inv, customer)} title="Share Invoice">📱</button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && renderInvoiceItems(inv)}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && !loading && (
          <div className="xp-table-scroll">
            <table className="xp-table">
              <thead>
                <tr>
                  <th style={{ width: 35 }}>#</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th className="r">Amount</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(payments) && payments.map((p, i) => (
                  <tr key={p._id || i}>
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td><strong>PAY-{p.paymentNo || p._id?.slice(-6)}</strong></td>
                    <td>{p.paymentDate || p.createdAt?.split("T")[0]}</td>
                    <td className="r success">PKR {fmt(p.amount)}</td>
                    <td>{p.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3"><strong>Total</strong></td>
                  <td className="r success"><strong>PKR {fmt(totalPayments)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Raw Purchases Tab */}
        {activeTab === "raw" && !loading && (
          <div className="xp-table-scroll">
            <table className="xp-table">
              <thead>
                <tr>
                  <th style={{ width: 35 }}>#</th>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th className="r">Total</th>
                  <th className="r">Paid</th>
                  <th className="r">Balance</th>
                  <th style={{ width: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(rawPurchases) && rawPurchases.map((r, i) => {
                  const isExpanded = expandedInvoices[r._id];
                  return (
                    <Fragment key={r._id || i}>
                      <tr style={{ background: "#fef3c7" }}>
                        <td style={{ textAlign: "center" }}>{i + 1}</td>
                        <td><strong>{r.invoiceNo}</strong></td>
                        <td>{r.invoiceDate}</td>
                        <td className="r">PKR {fmt(r.netTotal)}</td>
                        <td className="r success">PKR {fmt(r.paidAmount)}</td>
                        <td className="r">{r.balance > 0 ? <span className="danger">PKR {fmt(r.balance)}</span> : "✓"}</td>
                        <td>
                          <div className="cc-act">
                            <button className="xp-btn xp-btn-sm xp-btn-ico" onClick={() => toggleInvoiceExpand(r._id)} title={isExpanded ? "Hide Items" : "Show Items"}>
                              {isExpanded ? "📄 Hide" : "📄 Show Items"}
                            </button>
                            <button className="xp-btn xp-btn-sm xp-btn-ico" onClick={() => handleViewInvoice(r)}>👁️</button>
                            <button className="xp-btn xp-btn-sm xp-btn-ico" onClick={() => printInvoice(r, customer)}>🖨️</button>
                            <button className="xp-btn xp-btn-sm xp-btn-ico cc-btn-wa-sm" onClick={() => shareInvoice(r, customer)}>📱</button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && renderInvoiceItems(r)}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* All Transactions Tab */}
        {activeTab === "all" && !loading && (
          <div className="xp-table-scroll">
            <table className="xp-table">
              <thead>
                <tr>
                  <th style={{ width: 35 }}>#</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th className="r">Debit</th>
                  <th className="r">Credit</th>
                  <th>Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((t, i) => (
                  <tr key={t._id || i} className={t.type === "payment" ? "cc-payment-row" : ""}>
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td><strong>{t.invoiceNo || t._id?.slice(-6)}</strong></td>
                    <td>{t.date}</td>
                    <td className="r">{t.type !== "payment" ? `PKR ${fmt(t.netTotal)}` : "—"}</td>
                    <td className="r success">{t.type === "payment" ? `PKR ${fmt(t.amount)}` : (t.paidAmount > 0 ? `PKR ${fmt(t.paidAmount)}` : "—")}</td>
                    <td>{t.type === "payment" ? "💵 Payment" : (t.saleType === "raw-purchase" ? "📦 Raw Purchase" : "🛒 Sale")}</td>
                    <td>{t.remarks || (t.items?.length ? `${t.items.length} items` : "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="xp-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="xp-modal" style={{ maxWidth: 900, width: "90%", maxHeight: "85vh", overflow: "auto" }}>
            <div className="xp-modal-tb">
              <span className="xp-modal-title">Invoice {selectedInvoice.invoiceNo}</span>
              <button className="xp-cap-btn xp-cap-close" onClick={() => setShowInvoiceModal(false)}>✕</button>
            </div>
            <div className="xp-modal-body" style={{ padding: 20 }}>
              <div dangerouslySetInnerHTML={{ __html: buildInvoiceHtml(selectedInvoice, customer) }} />
            </div>
            <div className="xp-modal-footer">
              <button className="xp-btn" onClick={() => printInvoice(selectedInvoice, customer)}>🖨️ Print</button>
              <button className="xp-btn xp-btn-wa" onClick={() => shareInvoice(selectedInvoice, customer)}>📱 Share on WhatsApp</button>
              <button className="xp-btn" onClick={() => setShowInvoiceModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cp-customer-detail-page {
          padding: 16px;
          height: 100%;
          overflow: auto;
          background: #fff;
        }
        .cp-detail-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          flex-wrap: wrap;
        }
        .cp-customer-photo {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          overflow: hidden;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        .cp-photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cp-photo-placeholder {
          font-size: 40px;
        }
        .cp-customer-info {
          flex: 1;
        }
        .cp-customer-info h2 {
          margin: 0 0 8px 0;
          color: #fff;
          font-size: 18px;
        }
        .cp-customer-badges {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .cp-badge {
          background: rgba(255,255,255,0.2);
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          color: #fff;
        }
        .cp-detail-actions {
          display: flex;
          gap: 10px;
        }
        .invoice-details-row td {
          padding: 8px !important;
          background: #f8fafc;
        }
        .xp-badge-raw {
          background: #fef3c7;
          color: #d97706;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
        }
        .xp-badge-sale {
          background: #dbeafe;
          color: #2563eb;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
        }
        .xp-btn-wa {
          background: #25D366;
          color: #fff;
          border-color: #128C7E;
        }
        .xp-btn-wa:hover {
          background: #128C7E;
        }
        .danger { color: #dc2626; font-weight: bold; }
        .success { color: #059669; }
        .red { color: #dc2626; }
        .green { color: #059669; }
        .cc-act {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .xp-btn-ico {
          padding: 4px 8px;
          font-size: 11px;
        }
        .r {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE - Credit Customers List with Search
════════════════════════════════════════════════════════════ */
export default function CreditCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const searchRef = useRef(null);

  useEffect(() => {
    loadCustomers();
    searchRef.current?.focus();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL + "?type=credit");
      if (data.success) {
        setCustomers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      showMsg("Failed to load customers", "error");
    }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const totalCustomers = Array.isArray(customers) ? customers.length : 0;
  const dueCustomers = Array.isArray(customers) ? customers.filter((c) => (c.currentBalance || 0) > 0) : [];
  const totalDue = Array.isArray(customers) ? customers.reduce((s, c) => s + Math.max(0, c.currentBalance || 0), 0) : 0;

  const filtered = Array.isArray(customers) ? customers.filter((c) => {
    const query = search.toLowerCase();
    return !query || 
      c.name?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      c.code?.toLowerCase().includes(query) ||
      c.area?.toLowerCase().includes(query);
  }) : [];

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
  };

  if (selectedCustomer) {
    return <CustomerDetailPage customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f1f5f9" }}>
      <div className="xp-titlebar">
        <button className="xp-cap-btn" onClick={() => navigate("/")}>←</button>
        <span className="xp-tb-title">Credit Customers — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-primary xp-btn-sm" onClick={() => navigate("/customers")}>+ Add Customer</button>
        </div>
      </div>

      {msg.text && <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "8px 16px 0" }}>{msg.text}</div>}

      <div className="xp-page-body" style={{ padding: "16px" }}>
        <div className="cc-stat-grid">
          <div className="cc-stat-card"><div className="cc-stat-label">Total Customers</div><div className="cc-stat-val">{totalCustomers}</div></div>
          <div className="cc-stat-card red"><div className="cc-stat-label">With Due</div><div className="cc-stat-val danger">{dueCustomers.length}</div></div>
          <div className="cc-stat-card red"><div className="cc-stat-label">Total Outstanding</div><div className="cc-stat-val danger">PKR {fmt(totalDue)}</div></div>
        </div>

        <div className="xp-toolbar" style={{ marginTop: 12 }}>
          <div className="xp-search-wrap" style={{ flex: 1 }}>
            <svg className="xp-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
            </svg>
            <input ref={searchRef} type="text" className="xp-input" style={{ paddingLeft: "32px" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, code or area..." autoFocus />
          </div>
          <span className="text-muted" style={{ fontSize: 12 }}>{filtered.length} customers found</span>
        </div>

        <div className="xp-table-panel" style={{ marginTop: 12 }}>
          {loading && <div className="xp-loading">Loading customers...</div>}
          {!loading && filtered.length === 0 && <div className="xp-empty">No customers found</div>}
          {!loading && filtered.length > 0 && (
            <div className="xp-table-scroll">
              <table className="xp-table" style={{ fontSize: 13, cursor: "pointer" }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Code</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Area</th>
                    <th className="r">Outstanding</th>
                    <th>Status</th>
                    <th style={{ width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c._id} className={(c.currentBalance || 0) > 0 ? "cc-row-due" : ""}>
                      <td className="text-muted">{i + 1}</td>
                      <td><span className="xp-code">{c.code || "—"}</span></td>
                      <td><button className="xp-link-btn" onClick={() => handleCustomerClick(c)}><strong>{c.name}</strong></button></td>
                      <td className="text-muted">{c.phone || "—"}</td>
                      <td className="text-muted">{c.area || "—"}</td>
                      <td className="r"><span className={`xp-amt${(c.currentBalance || 0) > 0 ? " danger" : ""}`}>{fmt(c.currentBalance || 0)}</span></td>
                      <td><span className={`xp-badge ${(c.currentBalance || 0) > 0 ? "xp-badge-due" : "xp-badge-clear"}`}>{(c.currentBalance || 0) > 0 ? "Due" : "Clear"}</span></td>
                      <td>
                        <div className="cc-act">
                          <button className="xp-btn xp-btn-sm xp-btn-ico" onClick={() => handleCustomerClick(c)} title="Full Details">📋</button>
                          {c.phone && (
                            <button className="xp-btn xp-btn-sm xp-btn-ico cc-btn-wa-sm" onClick={(e) => { 
                              e.stopPropagation(); 
                              const msg = `Assalam-o-Alaikum *${c.name}*,\n\nOutstanding: *PKR ${fmt(c.currentBalance)}*`;
                              window.open(`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                            }}>📱</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}><strong>Total</strong></td>
                    <td className="r xp-amt danger"><strong>PKR {fmt(filtered.reduce((s, c) => s + Math.max(0, c.currentBalance || 0), 0))}</strong></td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="xp-statusbar">
        <div className="xp-status-pane">👥 {totalCustomers} customers</div>
        <div className="xp-status-pane">⚠️ {dueCustomers.length} due</div>
        <div className="xp-status-pane">💰 Outstanding: PKR {fmt(totalDue)}</div>
      </div>
    </div>
  );
}