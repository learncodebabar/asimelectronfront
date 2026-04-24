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
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // State for customers and suppliers
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // State for transactions
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Default to TODAY'S date range
  const [fromDate, setFromDate] = useState(isoD());
  const [toDate, setToDate] = useState(isoD());
  
  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState("simple");
  
  // Refs for keyboard navigation
  const codeInputRef = useRef(null);
  const accountTitleRef = useRef(null);
  const remarksRef = useRef(null);
  
  // Load customers and suppliers on mount
  useEffect(() => {
    loadCustomers();
    loadSuppliers();
    codeInputRef.current?.focus();
  }, []);
  
  // Get filtered entities based on search query (for ghost text)
  const getFilteredEntitiesForGhost = (query) => {
    const entities = activeTab === "customer" ? customers : suppliers;
    if (!query.trim()) return [];
    const searchLower = query.toLowerCase();
    return entities.filter(e => 
      e.name?.toLowerCase().startsWith(searchLower)
    );
  };
  
  // Handle ghost text and suggestions
  useEffect(() => {
    if (!originalQuery.trim()) {
      setFilteredEntities([]);
      setGhost("");
      setShowSuggestions(false);
      return;
    }
    
    const matches = getFilteredEntitiesForGhost(originalQuery);
    setFilteredEntities(matches);
    setShowSuggestions(matches.length > 0);
    
    if (!isNavigating && matches.length > 0 && matches[0].name) {
      const remaining = matches[0].name.slice(originalQuery.length);
      setGhost(remaining);
    } else {
      setGhost("");
    }
  }, [originalQuery, isNavigating, activeTab, customers, suppliers]);
  
  const loadCustomers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL + "?type=credit");
      if (data.success) {
        const creditCustomers = data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type !== "supplier";
        });
        setCustomers(creditCustomers);
      } else {
        await loadCustomersFallback();
      }
    } catch (err) {
      console.error("Failed to load credit customers:", err);
      await loadCustomersFallback();
    }
  };
  
  const loadCustomersFallback = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        const allCustomers = data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type !== "supplier";
        });
        const creditCustomers = allCustomers.filter(c => (c.currentBalance || 0) > 0);
        setCustomers(creditCustomers);
      }
    } catch (err2) {
      console.error("Failed to load customers fallback:", err2);
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
  
  const selectEntity = (entity) => {
    setSelectedEntity(entity);
    setSearchQuery(entity.name);
    setOriginalQuery(entity.name);
    setCodeSearch(entity.code || "");
    setFilteredEntities([]);
    setGhost("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
    loadLedger(entity._id);
  };
  
  const clearSelection = () => {
    setSelectedEntity(null);
    setSearchQuery("");
    setOriginalQuery("");
    setGhost("");
    setCodeSearch("");
    setRemarks("");
    setTransactions([]);
    setFilteredEntities([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
    codeInputRef.current?.focus();
  };
  
  const loadLedger = async (entityId) => {
    setLoading(true);
    setTransactions([]);
    
    try {
      const salesRes = await api.get(EP.CUSTOMERS.SALE_HISTORY(entityId));
      let sales = salesRes.data.success ? (Array.isArray(salesRes.data.data) ? salesRes.data.data : []) : [];
      
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
      
      let payments = [];
      try {
        const paymentsRes = await api.get(EP.PAYMENTS.BY_CUSTOMER(entityId));
        if (paymentsRes.data.success) {
          payments = Array.isArray(paymentsRes.data.data) ? paymentsRes.data.data : [];
        }
      } catch (err) {}
      
      let cashReceipts = [];
      try {
        const cashReceiptsRes = await api.get(EP.CASH_RECEIPTS.GET_BY_CUSTOMER(entityId));
        if (cashReceiptsRes.data.success) {
          cashReceipts = Array.isArray(cashReceiptsRes.data.data) ? cashReceiptsRes.data.data : [];
        }
      } catch (err) {}
      
      let cpvPayments = [];
      try {
        const cpvRes = await api.get(EP.CPV.GET_ALL);
        if (cpvRes.data.success) {
          const cpvData = Array.isArray(cpvRes.data) ? cpvRes.data : cpvRes.data.data || [];
          cpvPayments = cpvData.filter(p => p.account_title === selectedEntity?.name);
        }
      } catch (err) {}
      
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
      
      const filtered = allTransactions.filter(t => {
        const transDate = t.date;
        return transDate >= fromDate && transDate <= toDate;
      });
      
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
      
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
  
  const handleCodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = codeSearch.trim().toUpperCase();
      if (code) {
        const entities = activeTab === "customer" ? customers : suppliers;
        const found = entities.find(e => e.code?.toUpperCase() === code);
        if (found) {
          selectEntity(found);
          setCodeSearch(found.code || "");
        } else {
          alert(`${activeTab === "customer" ? "Credit Customer" : "Supplier"} with code "${code}" not found`);
        }
      }
      accountTitleRef.current?.focus();
    }
  };
  
  const handleKeyDown = (e) => {
    // Handle ghost text acceptance (Right Arrow or Tab)
    if (ghost && (e.key === "ArrowRight" || e.key === "Tab") && !isNavigating) {
      e.preventDefault();
      const fullName = originalQuery + ghost;
      setSearchQuery(fullName);
      setOriginalQuery(fullName);
      setGhost("");
      setIsNavigating(false);
      
      // Select the matched customer
      const matchedEntity = filteredEntities[0];
      if (matchedEntity) {
        selectEntity(matchedEntity);
      }
      return;
    }
    
    // Handle Arrow Down
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredEntities.length === 0) return;
      
      setIsNavigating(true);
      setShowSuggestions(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = 0;
      } else {
        newIndex = selectedSuggestionIndex + 1;
        if (newIndex >= filteredEntities.length) {
          newIndex = 0;
        }
      }
      
      setSelectedSuggestionIndex(newIndex);
      
      const selectedEntityItem = filteredEntities[newIndex];
      if (selectedEntityItem) {
        setSearchQuery(selectedEntityItem.name);
        setGhost("");
      }
      return;
    }
    
    // Handle Arrow Up
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredEntities.length === 0) return;
      
      setIsNavigating(true);
      setShowSuggestions(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = filteredEntities.length - 1;
      } else {
        newIndex = selectedSuggestionIndex - 1;
        if (newIndex < 0) {
          newIndex = filteredEntities.length - 1;
        }
      }
      
      setSelectedSuggestionIndex(newIndex);
      
      const selectedEntityItem = filteredEntities[newIndex];
      if (selectedEntityItem) {
        setSearchQuery(selectedEntityItem.name);
        setGhost("");
      }
      return;
    }
    
    // Handle Enter
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (selectedSuggestionIndex >= 0 && filteredEntities[selectedSuggestionIndex]) {
        selectEntity(filteredEntities[selectedSuggestionIndex]);
      } else if (filteredEntities.length > 0 && filteredEntities[0]) {
        selectEntity(filteredEntities[0]);
      }
      return;
    }
    
    // Handle Escape
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchQuery("");
      setOriginalQuery("");
      setGhost("");
      setFilteredEntities([]);
      setSelectedSuggestionIndex(-1);
      setShowSuggestions(false);
      setIsNavigating(false);
      if (selectedEntity) clearSelection();
      accountTitleRef.current?.blur();
    }
  };
  
  const handleAccountTitleChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setOriginalQuery(newValue);
    if (selectedEntity && newValue !== selectedEntity.name) {
      clearSelection();
    }
    setSelectedSuggestionIndex(-1);
    setShowSuggestions(true);
    setIsNavigating(false);
  };
  
  const handleRemarksKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedEntity) {
        loadLedger(selectedEntity._id);
      }
    }
  };
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedEntity(null);
    setSearchQuery("");
    setOriginalQuery("");
    setGhost("");
    setCodeSearch("");
    setRemarks("");
    setTransactions([]);
    setFilteredEntities([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
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
          .print-header{display:flex;justify-content:space-between;margin-bottom:25px;padding-bottom:15px;border-bottom:3px solid #000}
          .shop-section{text-align:left;flex:2}
          .customer-section{text-align:right;flex:1;display:flex;justify-content:flex-end;align-items:center;gap:15px}
          .shop-name{font-size:22px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:8px}
          .shop-name-en{font-size:16px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
          .shop-addr{font-size:11px;color:#444;margin:3px 0}
          .print-time{font-size:10px;color:#666;margin-top:5px}
          .customer-photo-small{width:70px;height:70px;object-fit:cover;border:3px solid #000}
          .customer-name{font-size:18px;font-weight:bold;margin-bottom:8px;text-transform:uppercase}
          .customer-phone{font-size:13px;color:#333}
          .customer-code{font-size:12px;color:#666}
          .section-title{font-size:16px;font-weight:bold;margin:20px 0 15px;padding:10px;background:#333;color:#fff;text-transform:uppercase}
          table{width:100%;border-collapse:collapse;margin:15px 0}
          th{background:#555;color:#fff;padding:14px 10px;font-size:14px;border:2px solid #000;text-transform:uppercase;font-weight:bold}
          td{padding:10px;border:2px solid #000;font-size:13px}
          .balance-box{width:400px;margin-left:auto;margin-top:20px;border:2px solid #000;padding:15px;background:#f8fafc}
          .balance-row{display:flex;justify-content:space-between;font-size:16px;font-weight:bold}
          .footer{text-align:center;margin-top:30px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#666}
          .text-right{text-align:right}
          .red{color:#dc2626}
          .green{color:#059669}
          @media print{body{padding:8mm}}
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
              `<div style="width:70px;height:70px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:35px;border:2px solid #000">${activeTab === "customer" ? "👤" : "🏢"}</div>`
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
        <div class="date-range" style="background:#f8fafc;padding:10px;margin:15px 0;border:2px solid #000;text-align:center;font-size:13px;font-weight:bold">Period: ${fromDate} to ${toDate}</div>
        <tr><thead><tr><th style="width:45px">#</th><th>DATE</th><th>VOUCHER #</th><th>TYPE</th><th>REMARKS</th><th class="text-right">DEBIT</th><th class="text-right">CREDIT</th><th class="text-right">BALANCE</th></tr></thead>
        <tbody>${rows}</tbody>
        </table>
        <div class="balance-box"><div class="balance-row"><span>Closing Balance:</span><span class="${closingBalance > 0 ? 'red' : 'green'}">PKR ${fmt(Math.abs(closingBalance))} ${closingBalance > 0 ? '(Receivable)' : '(Payable)'}</span></div></div>
        <div class="footer">Thank you for your business! | Developed by: Creative Babar / 03098325271| www.digitalglobalschool.com</div>
      </body>
      </html>`;
    } else {
      // DETAILED PRINT
      let detailedRows = "";
      transactions.forEach((t, i) => {
        let itemsHtml = "";
        if (t.items && t.items.length > 0) {
          itemsHtml = `<div style="border:1px solid #000;border-radius:4px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin:0;">
              <thead><tr style="background:#f0f0f0;"><th style="padding:4px 6px;border:1px solid #000;text-align:left;">Item</th><th style="padding:4px 6px;border:1px solid #000;text-align:center;">Qty</th><th style="padding:4px 6px;border:1px solid #000;text-align:right;">Rate</th><th style="padding:4px 6px;border:1px solid #000;text-align:right;">Amount</th></tr></thead>
              <tbody>`;
          
          t.items.forEach((item, idx) => {
            itemsHtml += `<tr><td style="padding:4px 6px;border:1px solid #000;font-size:10px;">${item.name || item.description || "—"} (${item.code || "—"})</td><td style="padding:4px 6px;border:1px solid #000;text-align:center;">${item.pcs || item.qty || 1}</td><td style="padding:4px 6px;border:1px solid #000;text-align:right;">${fmt(item.rate || 0)}</td><td style="padding:4px 6px;border:1px solid #000;text-align:right;font-weight:bold;">${fmt(item.amount || 0)}</td></tr>`;
          });
          
          itemsHtml += `</tbody></table></div>`;
        } else {
          itemsHtml = `<div style="border:1px solid #000;border-radius:4px;padding:6px 8px;font-size:11px;background:#fafafa;">${t.remarks || "—"}</div>`;
        }
        
        detailedRows += `
          <tr style="page-break-inside:avoid;">
            <td style="padding:12px 8px;border:2px solid #000;font-size:13px;font-weight:bold;text-align:center;vertical-align:top;">${i + 1}</td>
            <td style="padding:12px 8px;border:2px solid #000;font-size:13px;font-weight:bold;vertical-align:top;">${t.date}</td>
            <td style="padding:12px 8px;border:2px solid #000;font-size:13px;font-weight:bold;font-family:monospace;vertical-align:top;">${t.transactionId}</td>
            <td style="padding:12px 8px;border:2px solid #000;vertical-align:top;"><span style="padding:4px 10px;border-radius:4px;font-size:11px;font-weight:bold;background:${t.type === "sale" ? "#dbeafe" : t.type === "return" ? "#fef3c7" : "#dcfce7"};border:1px solid #000;display:inline-block;">${t.transType}</span></td>
            <td style="padding:12px 8px;border:2px solid #000;font-size:12px;vertical-align:top;max-width:300px;">${itemsHtml}</td>
            <td style="padding:12px 8px;border:2px solid #000;text-align:right;font-size:13px;font-weight:bold;color:#dc2626;vertical-align:top;">${t.debit > 0 ? `PKR ${fmt(t.debit)}` : "—"}</td>
            <td style="padding:12px 8px;border:2px solid #000;text-align:right;font-size:13px;font-weight:bold;color:#059669;vertical-align:top;">${t.credit > 0 ? `PKR ${fmt(t.credit)}` : "—"}</td>
            <td style="padding:12px 8px;border:2px solid #000;text-align:right;font-size:13px;font-weight:bold;color:${t.runningBalance > 0 ? "#dc2626" : "#059669"};vertical-align:top;">PKR ${fmt(Math.abs(t.runningBalance))}</td>
          </tr>
        `;
      });
      
      return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Detailed Ledger - ${selectedEntity.name}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:15px;font-size:13px}
          .print-header{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #000}
          .shop-section{text-align:left;flex:2}
          .customer-section{text-align:right;flex:1;display:flex;justify-content:flex-end;align-items:center;gap:15px}
          .shop-name{font-size:20px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:6px}
          .shop-name-en{font-size:14px;font-weight:bold;margin-bottom:4px;text-transform:uppercase}
          .shop-addr{font-size:10px;color:#444;margin:2px 0}
          .print-time{font-size:9px;color:#666;margin-top:4px}
          .customer-photo-small{width:60px;height:60px;object-fit:cover;border:2px solid #000}
          .customer-name{font-size:16px;font-weight:bold;margin-bottom:6px;text-transform:uppercase}
          .customer-phone{font-size:11px;color:#333}
          .customer-code{font-size:10px;color:#666}
          .section-title{font-size:14px;font-weight:bold;margin:15px 0 12px;padding:8px;background:#333;color:#fff;text-transform:uppercase}
          table{width:100%;border-collapse:collapse;margin:12px 0}
          th{background:#555;color:#fff;padding:10px 8px;font-size:12px;border:2px solid #000;text-transform:uppercase;font-weight:bold}
          td{padding:10px 8px;border:2px solid #000;vertical-align:top}
          .balance-box{width:380px;margin-left:auto;margin-top:15px;border:2px solid #000;padding:12px;background:#f8fafc}
          .balance-row{display:flex;justify-content:space-between;font-size:14px;font-weight:bold}
          .footer{text-align:center;margin-top:25px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#666}
          .text-right{text-align:right}
          .red{color:#dc2626}
          .green{color:#059669}
          .statement-note{text-align:center;font-size:11px;color:#666;margin:12px 0;font-style:italic;font-weight:bold}
          @media print{body{padding:5mm}}
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
              `<div style="width:60px;height:60px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:30px;border:2px solid #000">${activeTab === "customer" ? "👤" : "🏢"}</div>`
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
        <div class="date-range" style="background:#f8fafc;padding:8px;margin:12px 0;border:1.5px solid #000;text-align:center;font-size:11px;font-weight:bold">Period: ${fromDate} to ${toDate}</div>
        <table><thead><tr><th style="width:40px">#</th><th>DATE</th><th>VOUCHER #</th><th>TYPE</th><th>REMARKS / ITEMS</th><th class="text-right">DEBIT</th><th class="text-right">CREDIT</th><th class="text-right">BALANCE</th></tr></thead>
        <tbody>${detailedRows}</tbody>
        </table>
        <div class="balance-box"><div class="balance-row"><span>Closing Balance:</span><span class="${closingBalance > 0 ? 'red' : 'green'}">PKR ${fmt(Math.abs(closingBalance))} ${closingBalance > 0 ? '(Receivable)' : '(Payable)'}</span></div></div>
        <div class="footer">Thank you for your business! | Developed by: Creative Babar / 03098325271 | www.digitalglobalschool.com</div>
      </body>
      </html>`;
    }
  };
  
  const handlePrintConfirm = () => {
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
    setShowPrintModal(false);
  };
  
  const closingBalance = transactions[transactions.length - 1]?.runningBalance || 0;
  
  // Filter transactions by remarks
  const filteredTransactions = remarks 
    ? transactions.filter(t => t.remarks?.toLowerCase().includes(remarks.toLowerCase()))
    : transactions;
  
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
          👥 Credit Customers
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
        
        {/* Search Section */}
        <div style={{
          background: "#ffffff",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "20px",
          border: "1px solid #000000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative"
        }}>
          {/* Left side: Input fields */}
          <div style={{ flex: 1, minWidth: 0, marginRight: "20px" }}>
            <div style={{ 
              display: "flex", 
              gap: "8px", 
              alignItems: "flex-end", 
              flexWrap: "wrap"
            }}>
              <div style={{ width: "100px" }}>
                <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>From</label>
                <input type="date" className="xp-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ height: "32px", padding: "0 8px", fontSize: "12px", fontWeight: "500", border: "1px solid #000000", borderRadius: "4px", width: "100%", background: "#ffffff" }} />
              </div>
              <div style={{ width: "100px" }}>
                <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>To</label>
                <input type="date" className="xp-input" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ height: "32px", padding: "0 8px", fontSize: "12px", fontWeight: "500", border: "1px solid #000000", borderRadius: "4px", width: "100%", background: "#ffffff" }} />
              </div>
              <div style={{ width: "100px" }}>
                <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Code</label>
                <input ref={codeInputRef} type="text" className="xp-input" value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} onKeyDown={handleCodeKeyDown} style={{ height: "32px", padding: "0 8px", fontSize: "12px", fontWeight: "500", border: "1px solid #000000", borderRadius: "4px", background: "#fffde7", width: "100%", textTransform: "uppercase" }} />
              </div>
              <div style={{ flex: 2, minWidth: "250px", position: "relative" }}>
                <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Account Title</label>
                <div style={{ position: "relative", width: "100%" }}>
                  {ghost && !isNavigating && !selectedEntity && (
                    <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", whiteSpace: "nowrap", fontSize: "12px", fontFamily: "inherit", display: "flex", zIndex: 2, color: "#a0aec0", backgroundColor: "transparent", paddingLeft: "10px" }}>
                      <span style={{ visibility: "hidden" }}>{originalQuery}</span>
                      <span style={{ color: "#a0aec0" }}>{ghost}</span>
                    </div>
                  )}
                  <input ref={accountTitleRef} type="text" className="xp-input" value={searchQuery} onChange={handleAccountTitleChange} onKeyDown={handleKeyDown} autoComplete="off" style={{ width: "100%", height: "32px", padding: "0 10px", fontSize: "12px", fontWeight: "500", border: "1px solid #000000", borderRadius: "4px", background: "#fffde7", position: "relative", zIndex: 1 }} />
                </div>
              </div>
              <div style={{ flex: 2, minWidth: "250px" }}>
                <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>📝 Remarks</label>
                <input 
                  ref={remarksRef} 
                  type="text" 
                  className="xp-input" 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  onKeyDown={handleRemarksKeyDown}
                  placeholder="Filter by remarks..." 
                  style={{ height: "32px", padding: "0 8px", fontSize: "12px", fontWeight: "500", border: "1px solid #000000", borderRadius: "4px", width: "100%", background: "#ffffff" }} 
                />
              </div>
              <div>
                <button className="xp-btn xp-btn-primary" onClick={() => selectedEntity && loadLedger(selectedEntity._id)} disabled={!selectedEntity || loading} style={{ height: "32px", padding: "0 20px", fontSize: "11px", fontWeight: "bold", background: "#22c55e", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {loading ? "Loading..." : "⟳ Show"}
                </button>
              </div>
            </div>
          </div>
          
          {/* Right side: Customer Image - ONLY IMAGE, NO NAME OR PHONE */}
          <div style={{ width: "110px", flexShrink: 0, display: "flex", justifyContent: "flex-end", alignItems: "flex-start" }}>
            {selectedEntity && selectedEntity.imageFront ? (
              <div style={{ textAlign: "center" }}>
                <img src={selectedEntity.imageFront} alt={selectedEntity.name} style={{ width: "100px", height: "100px", objectFit: "cover", border: "3px solid #000000", boxShadow: "0 4px 8px rgba(0,0,0,0.2)", borderRadius: "8px" }} />
              </div>
            ) : selectedEntity ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "100px", height: "100px", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "50px", border: "3px solid #000000", boxShadow: "0 4px 8px rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                  {activeTab === "customer" ? "👤" : "🏢"}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#94a3b8" }}>
                <div style={{ width: "100px", height: "100px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "50px", border: "2px dashed #cbd5e1", borderRadius: "8px" }}>🖼️</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Selected Entity Info Bar - Only code, phone, type */}
        {selectedEntity && (
          <div style={{ marginTop: "4px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #000000" }}>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Code: {selectedEntity.code || "—"} | Phone: {selectedEntity.phone || "—"} | Type: {activeTab === "customer" ? (selectedEntity.customerType || selectedEntity.type || "Credit Customer") : "Supplier"}</div>
            <button onClick={clearSelection} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Clear</button>
          </div>
        )}
        
        {/* Transaction Table */}
        <div style={{ background: "#ffffff", borderRadius: "8px", padding: "16px", border: "2px solid #000000" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid #000000" }}>
            <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>
              📋 Transaction History {selectedEntity && `- ${selectedEntity.name}`}
              {filteredTransactions.length > 0 && <span style={{ fontSize: "11px", marginLeft: "8px", color: "#64748b" }}>({filteredTransactions.length})</span>}
            </h3>
            <div style={{ fontSize: "10px", color: "#64748b" }}>{fromDate} to {toDate}</div>
          </div>
          
          {!selectedEntity && (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontWeight: "500" }}>
              🔍 Select a {activeTab === "customer" ? "credit customer" : "supplier"} by Code or Account Title above
            </div>
          )}
          
          {loading && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
              Loading...
            </div>
          )}
          
          {!loading && selectedEntity && filteredTransactions.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
              📭 No transactions found for {fromDate} to {toDate}
              {remarks && ` with remarks containing "${remarks}"`}
            </div>
          )}
          
          {!loading && filteredTransactions.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: "2px solid #000000" }}>
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
                  {filteredTransactions.map((t, i) => (
                    <tr key={t._id || i} style={{ borderBottom: "2px solid #000000" }}>
                      <td style={{ padding: "4px 3px", textAlign: "center", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>{i + 1}</td>
                      <td style={{ padding: "4px 3px", whiteSpace: "nowrap", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>{t.date}</td>
                      <td style={{ padding: "4px 3px", fontFamily: "monospace", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", color: "#1e293b" }}>{t.transactionId}</td>
                      <td style={{ padding: "4px 3px", border: "1px solid #000000" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: t.type === "sale" ? "#dbeafe" : t.type === "return" ? "#fef3c7" : t.type === "payment" || t.type === "cash-receipt" ? "#dcfce7" : "#fef3c7", border: "1px solid #000000", display: "inline-block" }}>
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
                    <td colSpan="7" style={{ padding: "6px 3px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", textTransform: "uppercase", color: "#000000" }}>
                      Closing Balance:
                    </td>
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
          {selectedEntity ? `${activeTab === "customer" ? "Credit Customer" : "Supplier"}: ${selectedEntity.name}` : "No entity selected"}
        </div>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "10px", fontWeight: "500" }}>
          {transactions.length > 0 && `Balance: PKR ${fmt(Math.abs(closingBalance))}`}
          {remarks && ` | Filtered by: "${remarks}"`}
        </div>
      </div>
    </div>
  );
}