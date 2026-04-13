// pages/CashReceiptPage.jsx - Complete file with fixed table fonts
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];
const generateReceiptNo = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CRV-${year}${month}${day}-${random}`;
};

// Customer Dropdown Component
function CustomerDropdown({
  allCustomers,
  value,
  displayName,
  customerType,
  onSelect,
  onClear,
  allowedTypes,
  onEnterPress,
}) {
  const [query, setQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const parentRef = useRef(null);

  const creditCustomers = allCustomers.filter((c) => {
    const t = (c.customerType || c.type || "").toLowerCase();
    const allowed = allowedTypes || ["credit"];
    return (
      allowed.includes(t) && c.name?.toUpperCase().trim() !== "COUNTER SALE"
    );
  });

  const getSuggestions = (searchTerm) => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase();
    return creditCustomers.filter(c => 
      c.name?.toLowerCase().startsWith(searchLower) ||
      c.code?.toLowerCase().startsWith(searchLower)
    );
  };

  useEffect(() => {
    if (!originalQuery.trim()) {
      setSuggestions([]);
      setGhost("");
      setShowDropdown(false);
      return;
    }

    const matches = getSuggestions(originalQuery);
    setSuggestions(matches);
    setShowDropdown(matches.length > 0);
    
    if (!isNavigating && matches.length > 0 && matches[0].name) {
      const remaining = matches[0].name.slice(originalQuery.length);
      setGhost(remaining);
    } else {
      setGhost("");
    }
  }, [originalQuery, isNavigating]);

  const selectCustomer = (customer) => {
    onSelect(customer);
    setQuery("");
    setOriginalQuery("");
    setGhost("");
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setShowDropdown(false);
    setIsNavigating(false);
    setTimeout(() => {
      if (onEnterPress) onEnterPress();
    }, 100);
  };

  const handleKeyDown = (e) => {
    if (ghost && (e.key === "ArrowRight" || e.key === "Tab") && !isNavigating) {
      e.preventDefault();
      const fullName = originalQuery + ghost;
      setQuery(fullName);
      setOriginalQuery(fullName);
      setGhost("");
      setIsNavigating(false);
      
      const matchedCustomer = suggestions[0];
      if (matchedCustomer) {
        selectCustomer(matchedCustomer);
      }
      return;
    }
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setIsNavigating(true);
      setShowDropdown(true);
      let newIndex = selectedSuggestionIndex === -1 ? 0 : selectedSuggestionIndex + 1;
      if (newIndex >= suggestions.length) newIndex = 0;
      setSelectedSuggestionIndex(newIndex);
      const selectedCustomer = suggestions[newIndex];
      if (selectedCustomer) {
        setQuery(selectedCustomer.name);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setIsNavigating(true);
      setShowDropdown(true);
      let newIndex = selectedSuggestionIndex === -1 ? suggestions.length - 1 : selectedSuggestionIndex - 1;
      if (newIndex < 0) newIndex = suggestions.length - 1;
      setSelectedSuggestionIndex(newIndex);
      const selectedCustomer = suggestions[newIndex];
      if (selectedCustomer) {
        setQuery(selectedCustomer.name);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        selectCustomer(suggestions[selectedSuggestionIndex]);
      } else if (suggestions.length > 0 && suggestions[0]) {
        selectCustomer(suggestions[0]);
      } else if (onEnterPress) {
        onEnterPress();
      }
      return;
    }
    
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      setOriginalQuery("");
      setGhost("");
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
      setShowDropdown(false);
      setIsNavigating(false);
      if (value) onClear();
      inputRef.current?.blur();
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setOriginalQuery(newValue);
    if (value && newValue !== displayName) onClear();
    setSelectedSuggestionIndex(-1);
    setShowDropdown(true);
    setIsNavigating(false);
  };

  return (
    <div style={{ position: "relative", flex: 1, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, position: "relative", width: "100%" }}>
        <div 
          ref={parentRef}
          style={{ 
            position: "relative", 
            flex: 1,
            background: isFocused ? "#fffbe6" : "transparent",
            borderRadius: "4px",
            transition: "background 0.15s ease",
            width: "100%"
          }}
        >
          {ghost && !isNavigating && originalQuery && (
            <div style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontFamily: "inherit",
              display: "flex",
              zIndex: 2,
              color: "#a0aec0",
              backgroundColor: "transparent"
            }}>
              <span style={{ visibility: "hidden" }}>{originalQuery}</span>
              <span style={{ color: "#a0aec0" }}>{ghost}</span>
            </div>
          )}
          
          <input
            ref={inputRef}
            style={{
              flex: 1,
              minWidth: 0,
              cursor: "text",
              background: "transparent",
              position: "relative",
              zIndex: 1,
              width: "100%",
              border: "none",
              outline: "none",
              padding: "8px 6px",
              fontSize: "14px",
              fontWeight: "500",
            }}
            value={value ? (query || displayName) : query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => {
                if (!isNavigating) setShowDropdown(false);
              }, 200);
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="Type name or code..."
          />
        </div>

        {value && (
          <button
            type="button"
            style={{
              height: 28,
              padding: "0 10px",
              fontSize: 12,
              flexShrink: 0,
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              onClear();
              setQuery("");
              setOriginalQuery("");
              setGhost("");
              setSuggestions([]);
              setSelectedSuggestionIndex(-1);
              setShowDropdown(false);
              setIsNavigating(false);
              inputRef.current?.focus();
            }}
            title="Clear"
          >
            Clear
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: "white",
          border: "2px solid #000000",
          borderRadius: 6,
          maxHeight: 280,
          overflowY: "auto",
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          marginTop: 2,
        }}>
          {suggestions.map((customer, idx) => (
            <div
              key={customer._id}
              onClick={() => selectCustomer(customer)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white",
                borderBottom: "1px solid #e2e8f0",
                fontSize: 13,
              }}
              onMouseEnter={() => {
                setSelectedSuggestionIndex(idx);
                setIsNavigating(true);
                setQuery(customer.name);
                setGhost("");
              }}
              onMouseLeave={() => setIsNavigating(false)}
            >
              <div style={{ fontWeight: "bold", fontSize: 14, color: "#1e293b" }}>
                {customer.name}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                {customer.code && <span>📋 Code: {customer.code}</span>}
                {customer.phone && <span> | 📞 {customer.phone}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CashReceiptPage() {
  const navigate = useNavigate();
  
  const [receiptId, setReceiptId] = useState(generateReceiptNo());
  const [receiptDate, setReceiptDate] = useState(isoD());
  const [customerId, setCustomerId] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [remainingBalance, setRemainingBalance] = useState(0);
  
  const [errors, setErrors] = useState({ customer: "", amountReceived: "" });
  const [allCustomers, setAllCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  
  const codeInputRef = useRef(null);
  const remarksRef = useRef(null);
  const invoiceAmountRef = useRef(null);
  const amountReceivedRef = useRef(null);
  const submitRef = useRef(null);
  
  useEffect(() => {
    loadCustomers();
    codeInputRef.current?.focus();
  }, []);
  
  const loadCustomers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) setAllCustomers(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      showMsg("Failed to load customers", "error");
    }
  };
  
  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };
  
  const creditCustomers = allCustomers.filter(c => {
    const type = (c.customerType || c.type || "").toLowerCase();
    return type === "credit";
  });
  
  const handleCodeSearch = () => {
    const code = customerCode.trim().toUpperCase();
    if (!code) return;
    const found = creditCustomers.find(c => c.code?.toUpperCase() === code);
    if (found) {
      handleCustomerSelect(found);
      setCustomerCode(found.code || "");
    } else {
      showMsg(`Customer with code "${code}" not found`, "error");
      setCustomerCode("");
    }
  };
  
  const handleCustomerSelect = async (customer) => {
    if (!customer || !customer._id) {
      showMsg("Invalid customer selected", "error");
      return;
    }
    try {
      const freshCustomer = await api.get(EP.CUSTOMERS.GET_ONE(customer._id));
      if (freshCustomer.data.success) {
        const cust = freshCustomer.data.data;
        setCustomerId(cust._id);
        setCustomerCode(cust.code || "");
        setBuyerName(cust.name);
        setCustomerType(cust.customerType || cust.type || "");
        setSelectedCustomer(cust);
        setErrors({ ...errors, customer: "" });
        loadTransactionHistory(cust._id);
        setTimeout(() => remarksRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error("Failed to fetch customer details:", error);
      showMsg("Failed to load customer data", "error");
    }
  };
  
  const handleCustomerClear = () => {
    setCustomerId("");
    setCustomerCode("");
    setBuyerName("");
    setCustomerType("");
    setSelectedCustomer(null);
    setTransactions([]);
    setInvoiceAmount("");
    setAmountReceived("");
    setRemainingBalance(0);
    setErrors({ customer: "", amountReceived: "" });
    codeInputRef.current?.focus();
  };
  
  const loadTransactionHistory = async (custId) => {
    setLoading(true);
    setTransactions([]);
    try {
      const salesRes = await api.get(EP.CUSTOMERS.SALE_HISTORY(custId));
      let sales = salesRes.data.success ? (Array.isArray(salesRes.data.data) ? salesRes.data.data : []) : [];
      
      let payments = [];
      try {
        const paymentsRes = await api.get(EP.PAYMENTS.BY_CUSTOMER(custId));
        if (paymentsRes.data.success) payments = Array.isArray(paymentsRes.data.data) ? paymentsRes.data.data : [];
      } catch (err) {}
      
      let cashReceipts = [];
      try {
        const cashReceiptsRes = await api.get(EP.CASH_RECEIPTS.GET_BY_CUSTOMER(custId));
        if (cashReceiptsRes.data.success) cashReceipts = Array.isArray(cashReceiptsRes.data.data) ? cashReceiptsRes.data.data : [];
      } catch (err) {}
      
      const allTransactions = [
        ...sales.map(s => ({ ...s, type: "sale", transType: "Sale", date: s.invoiceDate, transactionId: s.invoiceNo, remarks: s.remarks || `${s.items?.length || 0} items`, invoiceAmount: s.netTotal || 0, amount: s.paidAmount || 0, balance: s.balance || 0 })),
        ...payments.map(p => ({ ...p, type: "payment", transType: "Payment", date: p.paymentDate || p.createdAt?.split("T")[0], transactionId: p.paymentNo || p._id?.slice(-8), remarks: p.remarks || "Payment received", invoiceAmount: 0, amount: p.amount || 0, balance: 0 })),
        ...cashReceipts.map(cr => ({ ...cr, type: "cash-receipt", transType: "Cash Receipt", date: cr.receiptDate, transactionId: cr.receiptNo, remarks: cr.remarks || "Cash received", invoiceAmount: cr.invoiceAmount || 0, amount: cr.amountReceived || cr.amount || 0, balance: cr.remainingBalance || 0 }))
      ];
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(allTransactions);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    }
    setLoading(false);
  };
  
  const validateAmountReceived = (value) => {
    const amount = parseFloat(value);
    if (!value || value === "") {
      setErrors({ ...errors, amountReceived: "Amount is required" });
      return false;
    }
    if (isNaN(amount) || amount <= 0) {
      setErrors({ ...errors, amountReceived: "Valid amount > 0 required" });
      return false;
    }
    setErrors({ ...errors, amountReceived: "" });
    return true;
  };
  
  const handleAmountReceivedChange = (value) => {
    setAmountReceived(value);
    validateAmountReceived(value);
  };
  
  useEffect(() => {
    const invAmount = parseFloat(invoiceAmount) || 0;
    const received = parseFloat(amountReceived) || 0;
    setRemainingBalance(invAmount - received);
  }, [invoiceAmount, amountReceived]);
  
  const handleRemarksKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      invoiceAmountRef.current?.focus();
    }
  };
  
  const handleInvoiceAmountKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      amountReceivedRef.current?.focus();
    }
  };
  
  const handleAmountReceivedKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitRef.current?.click();
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setErrors({ ...errors, customer: "Select a customer" });
      showMsg("Please select a customer", "error");
      return;
    }
    if (!validateAmountReceived(amountReceived)) {
      amountReceivedRef.current?.focus();
      return;
    }
    
    const received = parseFloat(amountReceived);
    const invAmount = parseFloat(invoiceAmount) || 0;
    if (invAmount > 0 && received > invAmount) {
      setErrors({ ...errors, amountReceived: `Cannot exceed invoice amount (PKR ${fmt(invAmount)})` });
      amountReceivedRef.current?.focus();
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        receiptNo: receiptId,
        receiptDate: receiptDate,
        customerId: selectedCustomer._id,
        customerCode: selectedCustomer.code,
        customerName: selectedCustomer.name,
        customerPhoto: selectedCustomer.imageFront,
        invoiceAmount: invAmount,
        amountReceived: received,
        remainingBalance: remainingBalance,
        remarks: remarks || "Cash receipt recorded",
        previousBalance: selectedCustomer.currentBalance || 0,
        newBalance: (selectedCustomer.currentBalance || 0) + remainingBalance
      };
      
      const { data } = await api.post(EP.CASH_RECEIPTS.CREATE, payload);
      if (data.success) {
        showMsg(`✓ Receipt ${receiptId} recorded! Amount: PKR ${fmt(received)}`, "success");
        setReceiptId(generateReceiptNo());
        setInvoiceAmount("");
        setAmountReceived("");
        setRemainingBalance(0);
        setRemarks("");
        if (selectedCustomer) {
          await loadTransactionHistory(selectedCustomer._id);
          const updatedCustomer = { ...selectedCustomer, currentBalance: (selectedCustomer.currentBalance || 0) + remainingBalance };
          setSelectedCustomer(updatedCustomer);
          setCustomerCode(updatedCustomer.code || "");
          setBuyerName(updatedCustomer.name);
        }
        amountReceivedRef.current?.focus();
      } else {
        showMsg(data.message || "Failed to save receipt", "error");
      }
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to save receipt", "error");
    }
    setSubmitting(false);
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Cash Receipt Voucher</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={handleCustomerClear} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold" }}>🔄 New Receipt</button>
        </div>
      </div>
      
      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "8px 16px", fontSize: "13px", padding: "8px 16px", fontWeight: "500" }}>
          {msg.text}
        </div>
      )}
      
      <div className="xp-page-body" style={{ padding: "12px 16px", background: "#ffffff" }}>
        {/* Main Form - ALL IN ONE ROW */}
        <div style={{
          background: "#ffffff",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
          border: "2px solid #000000"
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-end",
              flexWrap: "wrap"
            }}>
              {/* Receipt ID */}
              <div style={{ width: "160px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Receipt ID</label>
                <input
                  type="text"
                  value={receiptId}
                  readOnly
                  style={{ 
                    background: "#f5f5f5", 
                    fontFamily: "monospace", 
                    fontSize: "13px", 
                    fontWeight: "bold",
                    height: "38px", 
                    padding: "0 10px",
                    border: "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
              </div>
              
              {/* Date */}
              <div style={{ width: "130px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Date</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  style={{ height: "38px", padding: "0 10px", fontSize: "13px", fontWeight: "500", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              {/* Customer Code */}
              <div style={{ width: "130px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Customer Code</label>
                <input
                  ref={codeInputRef}
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === "Enter") { 
                      e.preventDefault(); 
                      handleCodeSearch(); 
                    } 
                  }}
                  placeholder="Enter code"
                  style={{ 
                    height: "38px", 
                    padding: "0 10px", 
                    fontSize: "13px", 
                    fontWeight: "500",
                    textTransform: "uppercase",
                    border: errors.customer ? "2px solid #ef4444" : "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
              </div>
              
              {/* Account Title */}
              <div style={{ minWidth: "240px", flex: 2 }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Account Title <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{
                  border: errors.customer ? "2px solid #ef4444" : "1px solid #000000",
                  borderRadius: "4px",
                  background: "#ffffff",
                  minHeight: "38px"
                }}>
                  <CustomerDropdown
                    allCustomers={allCustomers}
                    value={customerId}
                    displayName={buyerName}
                    customerType={customerType}
                    onSelect={handleCustomerSelect}
                    onClear={handleCustomerClear}
                    allowedTypes={["credit"]}
                    onEnterPress={() => remarksRef.current?.focus()}
                  />
                </div>
                {errors.customer && <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "3px", fontWeight: "500" }}>{errors.customer}</div>}
              </div>
              
              {/* Remarks */}
              <div style={{ minWidth: "150px", flex: 1 }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Remarks</label>
                <input
                  ref={remarksRef}
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onKeyDown={handleRemarksKeyDown}
                  placeholder="Optional"
                  style={{ height: "38px", padding: "0 10px", fontSize: "13px", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              {/* Invoice Amount */}
              <div style={{ width: "120px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Invoice Amt</label>
                <input
                  ref={invoiceAmountRef}
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  onKeyDown={handleInvoiceAmountKeyDown}
                  placeholder="0"
                  style={{ height: "38px", padding: "0 10px", fontSize: "14px", fontWeight: "bold", textAlign: "right", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              {/* Amount Received */}
              <div style={{ width: "140px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Amount Received <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  ref={amountReceivedRef}
                  type="number"
                  value={amountReceived}
                  onChange={(e) => handleAmountReceivedChange(e.target.value)}
                  onKeyDown={handleAmountReceivedKeyDown}
                  placeholder="0"
                  step="1"
                  style={{ 
                    height: "38px", 
                    padding: "0 10px", 
                    fontSize: "14px", 
                    fontWeight: "bold", 
                    textAlign: "right", 
                    border: errors.amountReceived ? "2px solid #ef4444" : "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
                {errors.amountReceived && <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "3px", fontWeight: "500" }}>{errors.amountReceived}</div>}
              </div>
              
              {/* Save Button */}
              <div>
                <button
                  ref={submitRef}
                  type="submit"
                  disabled={submitting || !selectedCustomer || !amountReceived}
                  style={{
                    background: "#22c55e",
                    color: "white",
                    padding: "0 28px",
                    height: "38px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    border: "1px solid #000000",
                    cursor: "pointer",
                    borderRadius: "4px",
                    marginBottom: "0"
                  }}
                >
                  {submitting ? "SAVING..." : "💾 SAVE"}
                </button>
              </div>
            </div>
            
            {/* Remaining Balance */}
            {invoiceAmount && parseFloat(invoiceAmount) > 0 && (
              <div style={{
                marginTop: "12px",
                padding: "10px 16px",
                background: remainingBalance > 0 ? "#fef3c7" : "#dcfce7",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #000000"
              }}>
                <span style={{ fontSize: "13px", fontWeight: "bold", color: "#000000" }}>Remaining Balance:</span>
                <span style={{ fontSize: "20px", fontWeight: "bold", color: remainingBalance > 0 ? "#d97706" : "#059669" }}>
                  PKR {fmt(remainingBalance)}
                </span>
              </div>
            )}
            
            {/* Customer Info */}
            {selectedCustomer && (
              <div style={{
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                background: "#f8fafc",
                borderRadius: "6px",
                border: "1px solid #000000"
              }}>
                {selectedCustomer.imageFront ? (
                  <img src={selectedCustomer.imageFront} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
                ) : (
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", border: "1px solid #000000" }}>👤</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{selectedCustomer.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Code: {selectedCustomer.code || "—"} | Phone: {selectedCustomer.phone || "—"} | Balance: <span style={{ fontWeight: "bold", color: (selectedCustomer.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>PKR {fmt(selectedCustomer.currentBalance || 0)}</span>
                  </div>
                </div>
                <button type="button" onClick={handleCustomerClear} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", padding: "6px 16px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>CLEAR</button>
              </div>
            )}
          </form>
        </div>
        
        {/* Transaction History Table */}
        <div style={{
          background: "#ffffff",
          borderRadius: "8px",
          padding: "12px",
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
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>
              📋 Transaction History {transactions.length > 0 && `(${transactions.length})`}
            </h3>
            {selectedCustomer && (
              <button onClick={() => loadTransactionHistory(selectedCustomer._id)} style={{ fontSize: "11px", padding: "4px 12px", border: "1px solid #000000", borderRadius: "4px", background: "#f8fafc", cursor: "pointer", fontWeight: "bold" }}>⟳ Refresh</button>
            )}
          </div>
          
          {!selectedCustomer && (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontWeight: "500" }}>
              🔍 Select a customer to view transaction history
            </div>
          )}
          
          {loading && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#64748b", fontWeight: "500" }}>Loading...</div>
          )}
          
          {!loading && selectedCustomer && transactions.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>📭 No transactions found</div>
          )}
          
         {!loading && transactions.length > 0 && (
  <div style={{ overflowX: "auto" }}>
    <table style={{ 
      width: "100%", 
      borderCollapse: "collapse", 
      fontSize: "13px", 
      border: "2px solid #000000"
    }}>
      <thead>
        <tr style={{ background: "#f1f5f9" }}>
          <th style={{ padding: "4px 4px", textAlign: "center", width: "40px", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>#</th>
          <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Date</th>
          <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Transaction ID</th>
          <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Type</th>
          <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Remarks</th>
          <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Invoice Amt</th>
          <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Amount</th>
          <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Balance</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t, i) => (
          <tr key={t._id || i}>
            <td style={{ padding: "3px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "13px", fontWeight: "600" }}>{i + 1}</td>
            <td style={{ padding: "3px 4px", whiteSpace: "nowrap", border: "1px solid #000000", fontSize: "13px", fontWeight: "600" }}>{t.date}</td>
            <td style={{ padding: "3px 4px", fontFamily: "monospace", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px" }}>{t.transactionId}</td>
            <td style={{ padding: "3px 4px", border: "1px solid #000000" }}>
              <span style={{
                padding: "2px 8px",
                borderRadius: "3px",
                fontSize: "11px",
                fontWeight: "bold",
                background: t.type === "sale" ? "#dbeafe" : t.type === "payment" ? "#dcfce7" : "#fef3c7",
                border: "1px solid #000000",
                display: "inline-block"
              }}>{t.transType}</span>
            </td>
            <td style={{ padding: "3px 4px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #000000", fontSize: "13px", fontWeight: "600" }}>{t.remarks || "—"}</td>
            <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px" }}>{t.invoiceAmount > 0 ? `PKR ${fmt(t.invoiceAmount)}` : "—"}</td>
            <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000", fontSize: "13px" }}>{t.amount > 0 ? `PKR ${fmt(t.amount)}` : "—"}</td>
            <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: "bold", color: t.balance > 0 ? "#dc2626" : "#059669", border: "1px solid #000000", fontSize: "13px" }}>{t.balance !== undefined ? `PKR ${fmt(Math.abs(t.balance))}` : "—"}</td>
          </tr>
        ))}
      </tbody>
      <tfoot style={{ background: "#f1f5f9" }}>
        <tr>
          <td colSpan="5" style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", textTransform: "uppercase" }}>TOTALS:</td>
          <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px" }}>PKR {fmt(transactions.reduce((sum, t) => sum + (t.invoiceAmount || 0), 0))}</td>
          <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000", fontSize: "13px" }}>PKR {fmt(transactions.reduce((sum, t) => sum + (t.amount || 0), 0))}</td>
          <td style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000" }}></td>
        </tr>
      </tfoot>
    </table>
  </div>
)}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "11px", fontWeight: "500" }}>💰 Cash Receipt Voucher</div>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "11px", fontWeight: "500" }}>{selectedCustomer ? selectedCustomer.name : "No customer selected"}</div>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "11px", fontWeight: "500" }}>{amountReceived && `Receiving: PKR ${fmt(amountReceived)}`}</div>
      </div>
    </div>
  );
}