// pages/GeneralLedgerPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function GeneralLedgerPage() {
  const navigate = useNavigate();
  
  // State for active tab (Customer or Supplier)
  const [activeTab, setActiveTab] = useState("customer");
  
  // State for selected entity
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  // State for customers and suppliers
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // State for transactions
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(isoD());
  
  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState("simple");
  
  // Refs for keyboard navigation
  const codeInputRef = useRef(null);
  const accountTitleRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Load customers and suppliers on mount
  useEffect(() => {
    loadCustomers();
    loadSuppliers();
    codeInputRef.current?.focus();
  }, []);
  
  // Filter entities when search query changes (for dropdown suggestions)
  useEffect(() => {
    const entities = activeTab === "customer" ? customers : suppliers;
    if (searchQuery.trim()) {
      const filtered = entities.filter(e => 
        e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.phone?.includes(searchQuery)
      );
      setFilteredEntities(filtered);
      setShowDropdown(filtered.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setFilteredEntities([]);
      setShowDropdown(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [searchQuery, activeTab, customers, suppliers]);
  
  const loadCustomers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        setCustomers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  };
  
  const loadSuppliers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        const suppliersList = data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type === "supplier";
        });
        setSuppliers(suppliersList);
      }
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    }
  };
  
  const handleCodeSearch = () => {
    const code = codeSearch.trim().toUpperCase();
    if (!code) return;
    
    const entities = activeTab === "customer" ? customers : suppliers;
    const found = entities.find(e => e.code?.toUpperCase() === code);
    
    if (found) {
      selectEntity(found);
      setCodeSearch("");
    } else {
      alert(`${activeTab === "customer" ? "Customer" : "Supplier"} with code "${code}" not found`);
      setCodeSearch("");
    }
  };
  
  const selectEntity = (entity) => {
    setSelectedEntity(entity);
    setSearchQuery(entity.name);
    setFilteredEntities([]);
    setShowDropdown(false);
    setSelectedSuggestionIndex(-1);
    // Load ledger for selected entity
    loadLedger(entity._id);
  };
  
  const clearSelection = () => {
    setSelectedEntity(null);
    setSearchQuery("");
    setCodeSearch("");
    setTransactions([]);
    codeInputRef.current?.focus();
  };
  
  const loadLedger = async (entityId) => {
    setLoading(true);
    setTransactions([]);
    
    try {
      // Fetch sales for this customer
      const salesRes = await api.get(EP.CUSTOMERS.SALE_HISTORY(entityId));
      let sales = salesRes.data.success ? (Array.isArray(salesRes.data.data) ? salesRes.data.data : []) : [];
      
      // Fetch sale returns
      let saleReturns = [];
      try {
        const allSalesRes = await api.get(EP.SALES.GET_ALL);
        if (allSalesRes.data.success) {
          const allSales = Array.isArray(allSalesRes.data.data) ? allSalesRes.data.data : [];
          saleReturns = allSales.filter(s => 
            s.saleType === "return" && 
            (s.customerId?._id === entityId || s.customerId === entityId)
          );
        }
      } catch (err) {}
      
      // Fetch payments
      let payments = [];
      try {
        const paymentsRes = await api.get(EP.PAYMENTS.BY_CUSTOMER(entityId));
        if (paymentsRes.data.success) {
          payments = Array.isArray(paymentsRes.data.data) ? paymentsRes.data.data : [];
        }
      } catch (err) {}
      
      // Fetch cash receipts
      let cashReceipts = [];
      try {
        const cashReceiptsRes = await api.get(EP.CASH_RECEIPTS.GET_BY_CUSTOMER(entityId));
        if (cashReceiptsRes.data.success) {
          cashReceipts = Array.isArray(cashReceiptsRes.data.data) ? cashReceiptsRes.data.data : [];
        }
      } catch (err) {}
      
      // Fetch CPV payments (cash payments)
      let cpvPayments = [];
      try {
        const cpvRes = await api.get(EP.CPV.GET_ALL);
        if (cpvRes.data.success) {
          const cpvData = Array.isArray(cpvRes.data) ? cpvRes.data : cpvRes.data.data || [];
          cpvPayments = cpvData.filter(p => p.account_title === selectedEntity?.name);
        }
      } catch (err) {}
      
      // Combine all transactions
      const allTransactions = [
        ...sales.map(s => ({
          ...s,
          type: "sale",
          transType: "Sale",
          date: s.invoiceDate,
          transactionId: s.invoiceNo,
          remarks: s.remarks || `${s.items?.length || 0} items`,
          debit: s.netTotal || 0,
          credit: s.paidAmount || 0,
          balance: s.balance || 0,
          items: s.items || []
        })),
        ...saleReturns.map(r => ({
          ...r,
          type: "return",
          transType: "Sale Return",
          date: r.returnDate || r.invoiceDate,
          transactionId: r.returnNo || r.invoiceNo,
          remarks: r.remarks || "Sale return",
          debit: 0,
          credit: r.netTotal || 0,
          balance: r.balance || 0,
          items: r.items || []
        })),
        ...payments.map(p => ({
          ...p,
          type: "payment",
          transType: "Payment",
          date: p.paymentDate || p.createdAt?.split("T")[0],
          transactionId: p.paymentNo || p._id?.slice(-8),
          remarks: p.remarks || "Payment received",
          debit: 0,
          credit: p.amount || 0,
          balance: 0,
          items: []
        })),
        ...cashReceipts.map(cr => ({
          ...cr,
          type: "cash-receipt",
          transType: "Cash Receipt",
          date: cr.receiptDate,
          transactionId: cr.receiptNo,
          remarks: cr.remarks || "Cash received",
          debit: 0,
          credit: cr.amount || 0,
          balance: cr.remainingBalance || 0,
          items: []
        })),
        ...cpvPayments.map(cpv => ({
          ...cpv,
          type: "cash-payment",
          transType: "Cash Payment",
          date: cpv.date,
          transactionId: cpv.cpv_number,
          remarks: cpv.description || "Cash payment",
          debit: cpv.amount || 0,
          credit: 0,
          balance: 0,
          items: []
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
        if (t.type === "sale" || t.type === "cash-payment") {
          runningBalance += t.debit;
          runningBalance -= t.credit;
        } else if (t.type === "return") {
          runningBalance -= t.credit;
        } else if (t.type === "payment" || t.type === "cash-receipt") {
          runningBalance -= t.credit;
        }
        return { ...t, runningBalance };
      });
      
      setTransactions(transactionsWithBalance);
      
    } catch (err) {
      console.error("Failed to load ledger:", err);
    }
    
    setLoading(false);
  };
  
  // Keyboard navigation for dropdown (like CreditCustomersPage)
  const handleKeyDown = (e) => {
    if (!showDropdown || filteredEntities.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < filteredEntities.length - 1 ? prev + 1 : prev
      );
      setTimeout(() => {
        const selectedItem = dropdownRef.current?.children[selectedSuggestionIndex + 1];
        selectedItem?.scrollIntoView({ block: "nearest" });
      }, 10);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
      setTimeout(() => {
        const selectedItem = dropdownRef.current?.children[selectedSuggestionIndex - 1];
        selectedItem?.scrollIntoView({ block: "nearest" });
      }, 10);
    } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      selectEntity(filteredEntities[selectedSuggestionIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setFilteredEntities([]);
    }
  };
  
  // Handle Enter key on Code input - move to Account Title
  const handleCodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (codeSearch.trim()) {
        handleCodeSearch();
      }
      accountTitleRef.current?.focus();
    }
  };
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedEntity(null);
    setSearchQuery("");
    setCodeSearch("");
    setTransactions([]);
    setShowDropdown(false);
    setFilteredEntities([]);
    codeInputRef.current?.focus();
  };
  
  const refreshData = () => {
    if (selectedEntity) {
      loadLedger(selectedEntity._id);
    }
  };
  
  const handlePrint = () => {
    if (transactions.length === 0) {
      alert("No transactions to print");
      return;
    }
    setShowPrintModal(true);
  };
  
  const buildPrintHtml = () => {
    const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const closingBalance = transactions[transactions.length - 1]?.runningBalance || 0;
    const printDateTime = new Date().toLocaleString("en-PK", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
    
    if (printType === "simple") {
      const rows = transactions.map((t, i) => `
        <tr>
          <td style="padding:12px 10px;border:2px solid #000;font-size:14px;font-weight:bold;text-align:center">${i + 1}</td>
          <td style="padding:12px 10px;border:2px solid #000;font-size:14px;font-weight:bold">${t.date}</td>
          <td style="padding:12px 10px;border:2px solid #000;font-size:14px;font-weight:bold;font-family:monospace">${t.transactionId}</td>
          <td style="padding:12px 10px;border:2px solid #000;font-size:14px;font-weight:bold">${t.transType}</td>
          <td style="padding:12px 10px;border:2px solid #000;font-size:13px">${t.remarks || "—"}</td>
          <td style="padding:12px 10px;border:2px solid #000;text-align:right;font-size:14px;font-weight:bold">${t.debit > 0 ? `PKR ${fmt(t.debit)}` : "—"}</td>
          <td style="padding:12px 10px;border:2px solid #000;text-align:right;font-size:14px;font-weight:bold">${t.credit > 0 ? `PKR ${fmt(t.credit)}` : "—"}</td>
          <td style="padding:12px 10px;border:2px solid #000;text-align:right;font-size:14px;font-weight:bold">PKR ${fmt(Math.abs(t.runningBalance))}</td>
        </tr>
      `).join("");
      
      return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ledger Statement - ${selectedEntity.name}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:20px;font-size:14px}
          
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid #000;
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
            gap: 15px;
          }
          .shop-name{font-size:22px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:8px}
          .shop-name-en{font-size:16px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
          .shop-addr{font-size:11px;color:#444;margin:3px 0}
          .print-time{font-size:10px;color:#666;margin-top:5px}
          .customer-photo-small{width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid #000}
          .customer-name{font-size:18px;font-weight:bold;margin-bottom:8px;text-transform:uppercase}
          .customer-phone{font-size:13px;color:#333}
          .customer-code{font-size:12px;color:#666}
          
          .section-title{font-size:16px;font-weight:bold;margin:20px 0 15px;padding:10px;background:#333;color:#fff;text-transform:uppercase}
          table{width:100%;border-collapse:collapse;margin:15px 0}
          th{background:#555;color:#fff;padding:14px 10px;font-size:14px;border:2px solid #000;text-transform:uppercase;font-weight:bold}
          td{padding:10px;border:2px solid #000;font-size:13px}
          .totals{width:400px;margin-left:auto;margin-top:20px}
          .totals-row{display:flex;justify-content:space-between;padding:10px 0;font-size:14px}
          .totals-row.bold{font-weight:bold;border-top:3px solid #000;margin-top:8px;padding-top:12px;font-size:16px}
          .footer{text-align:center;margin-top:30px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#666}
          .text-center{text-align:center}
          .text-right{text-align:right}
          .red{color:#dc2626}
          .green{color:#059669}
          @media print{
            body{padding:8mm}
            .print-header{margin-bottom:15px}
            th,td{padding:8px}
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="shop-section">
            <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
            <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
            <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
            <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
            <div class="print-time">Printed on: ${printDateTime}</div>
          </div>
          <div class="customer-section">
            ${selectedEntity.imageFront ? 
              `<img src="${selectedEntity.imageFront}" class="customer-photo-small" alt="${selectedEntity.name}">` : 
              `<div style="width:70px;height:70px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:35px;border:2px solid #000">${activeTab === "customer" ? "👤" : "🏢"}</div>`
            }
            <div>
              <div class="customer-name">${selectedEntity.name}</div>
              <div class="customer-phone">📞 ${selectedEntity.phone || "N/A"}</div>
              <div class="customer-code">🆔 ${selectedEntity.code || "N/A"}</div>
              <div class="customer-code">📅 Statement Date: ${isoD()}</div>
            </div>
          </div>
        </div>
        
        <div class="section-title">📋 LEDGER STATEMENT</div>
        <div class="date-range" style="background:#f8fafc;padding:10px;margin:15px 0;border:2px solid #000;text-align:center;font-size:13px;font-weight:bold">
          Period: ${fromDate} to ${toDate}
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width:45px">#</th>
              <th>DATE</th>
              <th>VOUCHER #</th>
              <th>TYPE</th>
              <th>REMARKS</th>
              <th class="text-right">DEBIT</th>
              <th class="text-right">CREDIT</th>
              <th class="text-right">BALANCE</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right;font-weight:bold;font-size:14px;padding:12px">TOTALS:</td>
              <td class="text-right" style="font-weight:bold;font-size:14px">PKR ${fmt(totalDebit)}</td>
              <td class="text-right" style="font-weight:bold;font-size:14px">PKR ${fmt(totalCredit)}</td>
              <td class="text-right" style="font-weight:bold;font-size:14px">PKR ${fmt(Math.abs(closingBalance))}</td>
            </tr>
          </tfoot>
        </table>
        
        <div class="totals">
          <div class="totals-row"><span>Total Debit:</span><span>PKR ${fmt(totalDebit)}</span></div>
          <div class="totals-row"><span>Total Credit:</span><span>PKR ${fmt(totalCredit)}</span></div>
          <div class="totals-row bold"><span>Closing Balance:</span><span class="${closingBalance > 0 ? 'red' : 'green'}">PKR ${fmt(Math.abs(closingBalance))} ${closingBalance > 0 ? '(Receivable)' : '(Payable)'}</span></div>
        </div>
        
        <div class="footer">Thank you for your business! | Developed by: AppHill / 03222292922 | www.apphill.pk</div>
      </body>
      </html>`;
    } else {
      // Detailed print with items
      let detailedRows = "";
      transactions.forEach((t, i) => {
        detailedRows += `
          <tr style="background:#f8fafc">
            <td style="padding:12px 10px;border:2px solid #000;font-size:14px;font-weight:bold;text-align:center" rowspan="${Math.max(1, t.items?.length || 1)}">${i + 1}</td>
            <td style="padding:12px 10px;border:2px solid #000;font-size:14px;font-weight:bold" rowspan="${Math.max(1, t.items?.length || 1)}">${t.date}</td>
            <td style="padding:12px 10px;border:2px solid #000;font-size:14px;font-weight:bold;font-family:monospace" rowspan="${Math.max(1, t.items?.length || 1)}">${t.transactionId}</td>
            <td style="padding:12px 10px;border:2px solid #000;font-size:14px;font-weight:bold" rowspan="${Math.max(1, t.items?.length || 1)}">${t.transType}</td>
            <td style="padding:12px 10px;border:2px solid #000;font-size:13px" rowspan="${Math.max(1, t.items?.length || 1)}">${t.remarks || "—"}</td>
            <td style="padding:12px 10px;border:2px solid #000;text-align:right;font-size:14px;font-weight:bold" rowspan="${Math.max(1, t.items?.length || 1)}">${t.debit > 0 ? `PKR ${fmt(t.debit)}` : "—"}</td>
            <td style="padding:12px 10px;border:2px solid #000;text-align:right;font-size:14px;font-weight:bold" rowspan="${Math.max(1, t.items?.length || 1)}">${t.credit > 0 ? `PKR ${fmt(t.credit)}` : "—"}</td>
            <td style="padding:12px 10px;border:2px solid #000;text-align:right;font-size:14px;font-weight:bold" rowspan="${Math.max(1, t.items?.length || 1)}">PKR ${fmt(Math.abs(t.runningBalance))}</td>
          </tr>
        `;
        
        if (t.items && t.items.length > 0) {
          t.items.forEach((item, idx) => {
            detailedRows += `
              <tr style="background:#ffffff">
                <td colspan="8" style="padding:8px 10px 8px 25px;border:2px solid #ddd;font-size:12px">
                  📦 ${item.name || item.description} | Code: ${item.code} | Qty: ${item.pcs || item.qty} | Rate: PKR ${fmt(item.rate)} | Amount: PKR ${fmt(item.amount)}
                </td>
              </tr>
            `;
          });
        }
      });
      
      return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Detailed Ledger - ${selectedEntity.name}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:20px;font-size:14px}
          
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid #000;
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
            gap: 15px;
          }
          .shop-name{font-size:22px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:8px}
          .shop-name-en{font-size:16px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
          .shop-addr{font-size:11px;color:#444;margin:3px 0}
          .print-time{font-size:10px;color:#666;margin-top:5px}
          .customer-photo-small{width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid #000}
          .customer-name{font-size:18px;font-weight:bold;margin-bottom:8px;text-transform:uppercase}
          .customer-phone{font-size:13px;color:#333}
          .customer-code{font-size:12px;color:#666}
          
          .section-title{font-size:16px;font-weight:bold;margin:20px 0 15px;padding:10px;background:#333;color:#fff;text-transform:uppercase}
          table{width:100%;border-collapse:collapse;margin:15px 0}
          th{background:#555;color:#fff;padding:14px 10px;font-size:14px;border:2px solid #000;text-transform:uppercase;font-weight:bold}
          td{padding:10px;border:2px solid #000;font-size:13px}
          .totals{width:400px;margin-left:auto;margin-top:20px}
          .totals-row{display:flex;justify-content:space-between;padding:10px 0;font-size:14px}
          .totals-row.bold{font-weight:bold;border-top:3px solid #000;margin-top:8px;padding-top:12px;font-size:16px}
          .footer{text-align:center;margin-top:30px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#666}
          .text-center{text-align:center}
          .text-right{text-align:right}
          .red{color:#dc2626}
          .green{color:#059669}
          .statement-note {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin: 15px 0;
            font-style: italic;
            font-weight: bold;
          }
          @media print{
            body{padding:8mm}
            .print-header{margin-bottom:15px}
            th,td{padding:8px}
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="shop-section">
            <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
            <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
            <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
            <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
            <div class="print-time">Printed on: ${printDateTime}</div>
          </div>
          <div class="customer-section">
            ${selectedEntity.imageFront ? 
              `<img src="${selectedEntity.imageFront}" class="customer-photo-small" alt="${selectedEntity.name}">` : 
              `<div style="width:70px;height:70px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:35px;border:2px solid #000">${activeTab === "customer" ? "👤" : "🏢"}</div>`
            }
            <div>
              <div class="customer-name">${selectedEntity.name}</div>
              <div class="customer-phone">📞 ${selectedEntity.phone || "N/A"}</div>
              <div class="customer-code">🆔 ${selectedEntity.code || "N/A"}</div>
              <div class="customer-code">📅 Statement Date: ${isoD()}</div>
            </div>
          </div>
        </div>
        
        <div class="statement-note">📋 DETAILED LEDGER STATEMENT (WITH ITEMS)</div>
        <div class="date-range" style="background:#f8fafc;padding:10px;margin:15px 0;border:2px solid #000;text-align:center;font-size:13px;font-weight:bold">
          Period: ${fromDate} to ${toDate}
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width:45px">#</th>
              <th>DATE</th>
              <th>VOUCHER #</th>
              <th>TYPE</th>
              <th>REMARKS</th>
              <th class="text-right">DEBIT</th>
              <th class="text-right">CREDIT</th>
              <th class="text-right">BALANCE</th>
            </tr>
          </thead>
          <tbody>${detailedRows}</tbody>
        </table>
        
        <div class="totals">
          <div class="totals-row"><span>Total Debit:</span><span>PKR ${fmt(totalDebit)}</span></div>
          <div class="totals-row"><span>Total Credit:</span><span>PKR ${fmt(totalCredit)}</span></div>
          <div class="totals-row bold"><span>Closing Balance:</span><span class="${closingBalance > 0 ? 'red' : 'green'}">PKR ${fmt(Math.abs(closingBalance))} ${closingBalance > 0 ? '(Receivable)' : '(Payable)'}</span></div>
        </div>
        
        <div class="footer">Thank you for your business! | Developed by: AppHill / 03222292922 | www.apphill.pk</div>
      </body>
      </html>`;
    }
  };
  
  const handlePrintConfirm = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
    setShowPrintModal(false);
  };
  
  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const closingBalance = transactions[transactions.length - 1]?.runningBalance || 0;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Title Bar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>General Ledger — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={refreshData} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold" }}>
            ⟳ Refresh
          </button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrint} disabled={transactions.length === 0} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold", marginLeft: "8px" }}>
            🖨 Print
          </button>
        </div>
      </div>
      
      {/* Print Modal */}
      {showPrintModal && (
        <div className="scm-overlay" style={{ zIndex: 2000 }}>
          <div className="scm-window" style={{ maxWidth: 400 }}>
            <div className="scm-tb" style={{ background: "#1e40af" }}>
              <span className="scm-tb-title" style={{ color: "white", fontWeight: "bold" }}>Print Options</span>
              <button className="xp-cap-btn xp-cap-close" onClick={() => setShowPrintModal(false)} style={{ color: "white" }}>✕</button>
            </div>
            <div style={{ padding: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "10px" }}>Select Print Type:</label>
              <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" name="printType" value="simple" checked={printType === "simple"} onChange={() => setPrintType("simple")} />
                  <span>📄 Simple Ledger</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" name="printType" value="detailed" checked={printType === "detailed"} onChange={() => setPrintType("detailed")} />
                  <span>📋 Detailed (with Items)</span>
                </label>
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button className="xp-btn" onClick={() => setShowPrintModal(false)} style={{ border: "1px solid #000", padding: "6px 16px" }}>Cancel</button>
                <button className="xp-btn xp-btn-primary" onClick={handlePrintConfirm} style={{ background: "#22c55e", color: "white", border: "1px solid #000", padding: "6px 16px" }}>Print</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Customer / Supplier Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "2px", 
        padding: "12px 16px 0 16px", 
        background: "#ffffff",
        borderBottom: "2px solid #000000"
      }}>
        <button
          onClick={() => handleTabChange("customer")}
          style={{
            padding: "8px 24px",
            background: activeTab === "customer" ? "#1e40af" : "#f1f5f9",
            color: activeTab === "customer" ? "#ffffff" : "#1e293b",
            border: "1px solid #000000",
            borderBottom: activeTab === "customer" ? "none" : "1px solid #000000",
            borderRadius: "8px 8px 0 0",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          👥 Customers
        </button>
        <button
          onClick={() => handleTabChange("supplier")}
          style={{
            padding: "8px 24px",
            background: activeTab === "supplier" ? "#1e40af" : "#f1f5f9",
            color: activeTab === "supplier" ? "#ffffff" : "#1e293b",
            border: "1px solid #000000",
            borderBottom: activeTab === "supplier" ? "none" : "1px solid #000000",
            borderRadius: "8px 8px 0 0",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          🏢 Suppliers
        </button>
      </div>
      
      {/* Main Content */}
      <div className="xp-page-body" style={{ padding: "16px", background: "#ffffff", flex: 1, overflow: "auto" }}>
        
        {/* Search Section - ALL IN ONE ROW */}
    {/* Search Section - ALL IN ONE ROW */}
<div style={{
  background: "#ffffff",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "20px",
  border: "2px solid #000000"
}}>
  {/* All fields in one row */}
  <div style={{ 
    display: "flex", 
    gap: "12px", 
    alignItems: "flex-end", 
    flexWrap: "wrap"
  }}>
    {/* From Date */}
    <div style={{ minWidth: "130px" }}>
      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>From Date</label>
      <input
        type="date"
        className="xp-input"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        style={{ 
          height: "36px", 
          padding: "0 10px", 
          fontSize: "13px", 
          fontWeight: "500",
          border: "1px solid #000000", 
          borderRadius: "4px", 
          width: "130px",
          background: "#ffffff"
        }}
      />
    </div>
    
    {/* To Date */}
    <div style={{ minWidth: "130px" }}>
      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>To Date</label>
      <input
        type="date"
        className="xp-input"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        style={{ 
          height: "36px", 
          padding: "0 10px", 
          fontSize: "13px", 
          fontWeight: "500",
          border: "1px solid #000000", 
          borderRadius: "4px", 
          width: "130px",
          background: "#ffffff"
        }}
      />
    </div>
    
    {/* Code Input */}
    <div style={{ minWidth: "130px" }}>
      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Code</label>
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          ref={codeInputRef}
          type="text"
          className="xp-input"
          value={codeSearch}
          onChange={(e) => setCodeSearch(e.target.value)}
          onKeyDown={handleCodeKeyDown}
          placeholder="Enter code"
          style={{ 
            height: "36px", 
            padding: "0 10px", 
            fontSize: "13px", 
            fontWeight: "500",
            border: "1px solid #000000", 
            borderRadius: "4px",
            background: "#fffde7",
            width: "120px",
            textTransform: "uppercase"
          }}
        />
        <button
          onClick={handleCodeSearch}
          style={{
            height: "36px",
            padding: "0 16px",
            background: "#3b82f6",
            color: "white",
            border: "1px solid #000000",
            borderRadius: "4px",
            fontWeight: "bold",
            fontSize: "12px",
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          Search
        </button>
      </div>
    </div>
    
    {/* Account Title - Takes remaining space with dropdown */}
    <div style={{ flex: 2, minWidth: "250px", position: "relative" }}>
      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Account Title</label>
      <input
        ref={accountTitleRef}
        type="text"
        className="xp-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type name - suggestions will appear..."
        autoComplete="off"
        style={{ 
          width: "100%", 
          height: "36px", 
          padding: "0 10px", 
          fontSize: "13px", 
          fontWeight: "500",
          border: "1px solid #000000", 
          borderRadius: "4px",
          background: "#fffde7"
        }}
      />
      
      {/* Dropdown - like CreditCustomersPage */}
      {showDropdown && filteredEntities.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #000000",
            borderRadius: "4px",
            maxHeight: "250px",
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            marginTop: "4px"
          }}
        >
          {filteredEntities.map((entity, idx) => (
            <div
              key={entity._id}
              onClick={() => selectEntity(entity)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                cursor: "pointer",
                backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white",
                borderBottom: "1px solid #e2e8f0"
              }}
              onMouseEnter={() => setSelectedSuggestionIndex(idx)}
            >
              <div>
                {entity.imageFront ? (
                  <img src={entity.imageFront} alt={entity.name} width="30" height="30" style={{ borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", border: "1px solid #000000" }}>
                    {activeTab === "customer" ? "👤" : "🏢"}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "12px", color: "#1e293b" }}>{entity.name}</div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  {entity.code && <span>Code: {entity.code} | </span>}
                  {entity.phone && <span>📞 {entity.phone}</span>}
                </div>
              </div>
              <div style={{ fontSize: "10px", fontWeight: "bold", color: (entity.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>
                Bal: PKR {fmt(entity.currentBalance || 0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    
    {/* Show Transactions Button - At the end */}
    <div>
      <button
        className="xp-btn xp-btn-primary"
        onClick={() => selectedEntity && loadLedger(selectedEntity._id)}
        disabled={!selectedEntity || loading}
        style={{ 
          height: "36px", 
          padding: "0 24px", 
          fontSize: "12px", 
          fontWeight: "bold",
          background: "#22c55e",
          color: "white",
          border: "1px solid #000000",
          borderRadius: "4px",
          cursor: "pointer",
          whiteSpace: "nowrap"
        }}
      >
        {loading ? "Loading..." : "⟳ Show"}
      </button>
    </div>
  </div>
  
  {/* Selected Entity Info with Photo */}
  {selectedEntity && (
    <div style={{
      marginTop: "12px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "8px 12px",
      background: "#f8fafc",
      borderRadius: "6px",
      border: "1px solid #000000"
    }}>
      {selectedEntity.imageFront ? (
        <img src={selectedEntity.imageFront} alt={selectedEntity.name} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
      ) : (
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", border: "1px solid #000000" }}>
          {activeTab === "customer" ? "👤" : "🏢"}
        </div>
      )}
      <div>
        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>{selectedEntity.name}</div>
        <div style={{ fontSize: "10px", color: "#64748b" }}>
          Code: {selectedEntity.code || "—"} | Phone: {selectedEntity.phone || "—"} | Type: {activeTab === "customer" ? (selectedEntity.customerType || selectedEntity.type || "Customer") : "Supplier"}
        </div>
      </div>
      <button
        onClick={clearSelection}
        style={{
          marginLeft: "auto",
          background: "#ef4444",
          color: "white",
          border: "1px solid #000000",
          borderRadius: "4px",
          padding: "4px 12px",
          fontSize: "11px",
          fontWeight: "bold",
          cursor: "pointer"
        }}
      >
        Clear
      </button>
    </div>
  )}
</div>
        
        {/* Transaction Table */}
        <div style={{
          background: "#ffffff",
          borderRadius: "8px",
          padding: "16px",
          border: "2px solid #000000"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            paddingBottom: "8px",
            borderBottom: "2px solid #000000"
          }}>
            <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>
              📋 Transaction History {selectedEntity && `- ${selectedEntity.name}`}
              {transactions.length > 0 && <span style={{ fontSize: "11px", marginLeft: "8px", color: "#64748b" }}>({transactions.length})</span>}
            </h3>
            <div style={{ fontSize: "10px", color: "#64748b" }}>
              {fromDate} to {toDate}
            </div>
          </div>
          
          {!selectedEntity && (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontWeight: "500" }}>
              🔍 Select a {activeTab === "customer" ? "customer" : "supplier"} by Code or Account Title above
            </div>
          )}
          
          {loading && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
              Loading...
            </div>
          )}
          
          {!loading && selectedEntity && transactions.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
              📭 No transactions found
            </div>
          )}
          
          {!loading && transactions.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ 
                width: "100%", 
                borderCollapse: "collapse", 
                fontSize: "11px", 
                border: "2px solid #000000"
              }}>
       <thead>
  <tr style={{ background: "#f1f5f9" }}>
    <th style={{ padding: "6px 3px", textAlign: "center", width: "40px", border: "2px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>#</th>
    <th style={{ padding: "6px 3px", textAlign: "left", border: "2px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Date</th>
    <th style={{ padding: "6px 3px", textAlign: "left", border: "2px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Voucher #</th>
    <th style={{ padding: "6px 3px", textAlign: "left", border: "2px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Type</th>
    <th style={{ padding: "6px 3px", textAlign: "left", border: "2px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Remarks</th>
    <th style={{ padding: "6px 3px", textAlign: "right", border: "2px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Debit</th>
    <th style={{ padding: "6px 3px", textAlign: "right", border: "2px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Credit</th>
    <th style={{ padding: "6px 3px", textAlign: "right", border: "2px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>Balance</th>
  </tr>
</thead>

<tbody>
  {transactions.map((t, i) => (
    <tr key={t._id || i} style={{ borderBottom: "2px solid #000000" }}>
      <td style={{ padding: "4px 3px", textAlign: "center", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>{i + 1}</td>
      <td style={{ padding: "4px 3px", whiteSpace: "nowrap", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>{t.date}</td>
      <td style={{ padding: "4px 3px", fontFamily: "monospace", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", color: "#1e293b" }}>{t.transactionId}</td>
      <td style={{ padding: "4px 3px", border: "1px solid #000000" }}>
        <span style={{
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: "bold",
          background: t.type === "sale" ? "#dbeafe" : t.type === "return" ? "#fef3c7" : t.type === "payment" || t.type === "cash-receipt" ? "#dcfce7" : "#fef3c7",
          border: "1px solid #000000",
          display: "inline-block"
        }}>
          {t.transType}
        </span>
      </td>
      <td style={{ padding: "4px 3px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>{t.remarks || "—"}</td>
      <td style={{ padding: "4px 3px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", color: "#dc2626" }}>
        {t.debit > 0 ? `PKR ${fmt(t.debit)}` : "—"}
      </td>
      <td style={{ padding: "4px 3px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", color: "#059669" }}>
        {t.credit > 0 ? `PKR ${fmt(t.credit)}` : "—"}
      </td>
      <td style={{ padding: "4px 3px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", color: t.runningBalance > 0 ? "#dc2626" : "#059669" }}>
        PKR {fmt(Math.abs(t.runningBalance))}
      </td>
    </tr>
  ))}
</tbody>
  
               <tfoot style={{ background: "#f8fafc", borderTop: "3px solid #000000" }}>
  <tr>
    <td colSpan="5" style={{ padding: "6px 3px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", textTransform: "uppercase", color: "#000000" }}>TOTALS:</td>
    <td style={{ padding: "6px 3px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", color: "#dc2626" }}>PKR {fmt(totalDebit)}</td>
    <td style={{ padding: "6px 3px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", color: "#059669" }}>PKR {fmt(totalCredit)}</td>
    <td style={{ padding: "6px 3px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", color: closingBalance > 0 ? "#dc2626" : "#059669" }}>
      PKR {fmt(Math.abs(closingBalance))}
    </td>
  </tr>
</tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "4px 12px" }}>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "10px", fontWeight: "500" }}>📊 General Ledger</div>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "10px", fontWeight: "500" }}>
          {selectedEntity ? `${activeTab === "customer" ? "Customer" : "Supplier"}: ${selectedEntity.name}` : "No entity selected"}
        </div>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "10px", fontWeight: "500" }}>
          {transactions.length > 0 && `Balance: PKR ${fmt(Math.abs(closingBalance))}`}
        </div>
      </div>
    </div>
  );
}