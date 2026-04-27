// pages/Reports/BankPaymentsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];
const generateVoucherNo = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BPV-${year}${month}${day}-${random}`;
};

// Supplier Dropdown Component
function SupplierDropdown({
  allSuppliers,
  value,
  displayName,
  onSelect,
  onClear,
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

  const getSuggestions = (searchTerm) => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase();
    return allSuppliers.filter(s => 
      s.name?.toLowerCase().startsWith(searchLower) ||
      s.code?.toLowerCase().startsWith(searchLower)
    );
  };

  useEffect(() => {
    if (displayName) {
      setQuery("");
      setOriginalQuery("");
      setGhost("");
      setShowDropdown(false);
      setSelectedSuggestionIndex(-1);
      setIsNavigating(false);
    }
  }, [displayName]);

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

  const selectSupplier = (supplier) => {
    onSelect(supplier);
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
      
      const matchedSupplier = suggestions[0];
      if (matchedSupplier) {
        selectSupplier(matchedSupplier);
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
      const selectedSupplier = suggestions[newIndex];
      if (selectedSupplier) {
        setQuery(selectedSupplier.name);
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
      const selectedSupplier = suggestions[newIndex];
      if (selectedSupplier) {
        setQuery(selectedSupplier.name);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        selectSupplier(suggestions[selectedSuggestionIndex]);
      } else if (suggestions.length > 0 && suggestions[0]) {
        selectSupplier(suggestions[0]);
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

  const getInputValue = () => {
    if (value && displayName) {
      return displayName;
    }
    if (query) {
      return query;
    }
    return "";
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
          {ghost && !isNavigating && originalQuery && !value && (
            <div style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              fontSize: "13px",
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
              padding: "6px 6px",
              fontSize: "13px",
              fontWeight: "500",
            }}
            value={getInputValue()}
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
            placeholder="Type supplier name or code..."
          />
        </div>

        {value && (
          <button
            type="button"
            style={{
              height: 28,
              padding: "0 8px",
              fontSize: 10,
              flexShrink: 0,
              background: "#ef4444",
              color: "white",
              border: "1px solid #000000",
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
            ✕
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
          {suggestions.map((supplier, idx) => (
            <div
              key={supplier._id}
              onClick={() => selectSupplier(supplier)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white",
                borderBottom: "1px solid #e2e8f0",
                fontSize: 13,
              }}
              onMouseEnter={() => {
                setSelectedSuggestionIndex(idx);
                setIsNavigating(true);
                setQuery(supplier.name);
                setGhost("");
              }}
              onMouseLeave={() => setIsNavigating(false)}
            >
              <div style={{ fontWeight: "bold", fontSize: 13, color: "#1e293b" }}>
                {supplier.name}
              </div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                {supplier.code && <span>📋 Code: {supplier.code}</span>}
                {supplier.phone && <span> | 📞 {supplier.phone}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sample demo bank payments
const getDemoPayments = () => {
  const stored = localStorage.getItem("bank_payments_demo");
  if (stored) {
    return JSON.parse(stored);
  }
  
  const demoPayments = [
    {
      _id: "demo_bp_1",
      voucherNo: "BPV-20241215-0001",
      paymentDate: "2024-12-15",
      supplierId: "demo_supp_1",
      supplierName: "ABC Suppliers",
      supplierCode: "SUP001",
      amount: 50000,
      remarks: "Bank payment for raw materials",
      createdAt: "2024-12-15T10:30:00Z",
      isEditable: true
    },
    {
      _id: "demo_bp_2",
      voucherNo: "BPV-20241216-0002",
      paymentDate: "2024-12-16",
      supplierId: "demo_supp_2",
      supplierName: "XYZ Industries",
      supplierCode: "SUP002",
      amount: 25000,
      remarks: "Bank payment for ADV-001",
      createdAt: "2024-12-16T14:20:00Z",
      isEditable: true
    },
    {
      _id: "demo_bp_3",
      voucherNo: "BPV-20241217-0003",
      paymentDate: "2024-12-17",
      supplierId: "demo_supp_1",
      supplierName: "ABC Suppliers",
      supplierCode: "SUP001",
      amount: 75000,
      remarks: "Final bank payment",
      createdAt: "2024-12-17T09:15:00Z",
      isEditable: true
    }
  ];
  
  localStorage.setItem("bank_payments_demo", JSON.stringify(demoPayments));
  return demoPayments;
};

export default function BankPaymentsPage() {
  const navigate = useNavigate();
  
  const [voucherId, setVoucherId] = useState(generateVoucherNo());
  const [paymentDate, setPaymentDate] = useState(isoD());
  const [supplierId, setSupplierId] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [amount, setAmount] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  
  const [errors, setErrors] = useState({ supplier: "", amount: "" });
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [searchVoucherNo, setSearchVoucherNo] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  
  const codeInputRef = useRef(null);
  const remarksRef = useRef(null);
  const amountRef = useRef(null);
  const submitRef = useRef(null);
  const searchRef = useRef(null);
  
  useEffect(() => {
    loadSuppliers();
    loadPayments();
    codeInputRef.current?.focus();
  }, []);
  
  useEffect(() => {
    if (searchResult) {
      setFilteredPayments([searchResult]);
    } else if (selectedSupplier) {
      const supplierPayments = payments.filter(p => p.supplierId === selectedSupplier._id || p.supplierName === selectedSupplier.name);
      setFilteredPayments(supplierPayments);
    } else {
      setFilteredPayments(payments);
    }
  }, [payments, searchResult, selectedSupplier]);
  
  const loadSuppliers = () => {
    setAllSuppliers([
      { _id: "demo_supp_1", name: "ABC Suppliers", code: "SUP001", customerType: "supplier", phone: "03001234567" },
      { _id: "demo_supp_2", name: "XYZ Industries", code: "SUP002", customerType: "supplier", phone: "03007654321" }
    ]);
  };
  
  const loadPayments = () => {
    setLoading(true);
    const paymentsData = getDemoPayments();
    const formatted = paymentsData.map(p => ({
      ...p,
      transactionId: p.voucherNo,
      date: p.paymentDate,
      amountValue: p.amount,
      type: "payment",
      transType: "Bank Payment"
    }));
    formatted.sort((a, b) => new Date(b.date) - new Date(a.date));
    setPayments(formatted);
    setFilteredPayments(formatted);
    setLoading(false);
  };
  
  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };
  
  const handleSupplierSelect = (supplier) => {
    if (!supplier || !supplier._id) {
      showMsg("Invalid supplier selected", "error");
      return;
    }
    
    setSupplierId(supplier._id);
    setSupplierCode(supplier.code || "");
    setSupplierName(supplier.name);
    setSelectedSupplier(supplier);
    setErrors({ ...errors, supplier: "" });
    setSearchResult(null);
    
    const supplierPayments = payments.filter(p => p.supplierId === supplier._id || p.supplierName === supplier.name);
    setFilteredPayments(supplierPayments);
    
    setTimeout(() => remarksRef.current?.focus(), 100);
  };
  
  const handleSupplierClear = () => {
    setSupplierId("");
    setSupplierCode("");
    setSupplierName("");
    setSelectedSupplier(null);
    setFilteredPayments(payments);
    setAmount("");
    setErrors({ supplier: "", amount: "" });
    setIsEditing(false);
    setEditingId(null);
    setEditingData(null);
    setSearchResult(null);
    setSearchVoucherNo("");
    setVoucherId(generateVoucherNo());
    codeInputRef.current?.focus();
  };
  
  const handleCodeSearch = () => {
    const code = supplierCode.trim().toUpperCase();
    if (!code) return;
    const found = allSuppliers.find(s => s.code?.toUpperCase() === code);
    if (found) {
      handleSupplierSelect(found);
      setSupplierCode(found.code || "");
    } else {
      showMsg(`Supplier with code "${code}" not found`, "error");
      setSupplierCode("");
    }
  };
  
  const validateAmount = (value) => {
    if (!value || value === "") {
      setErrors(prev => ({ ...prev, amount: "Required" }));
      return false;
    }
    const amt = parseFloat(value);
    if (isNaN(amt) || amt <= 0) {
      setErrors(prev => ({ ...prev, amount: "Valid amount > 0" }));
      return false;
    }
    setErrors(prev => ({ ...prev, amount: "" }));
    return true;
  };
  
  const handleAmountChange = (value) => {
    setAmount(value);
    validateAmount(value);
  };
  
  const handleRemarksKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      amountRef.current?.focus();
    }
  };
  
  const handleAmountKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitRef.current?.click();
    }
  };
  
  const resetForm = () => {
    setVoucherId(generateVoucherNo());
    setPaymentDate(isoD());
    setAmount("");
    setRemarks("");
    setSearchVoucherNo("");
    setShowSearch(false);
    setSearchResult(null);
    setIsEditing(false);
    setEditingId(null);
    setEditingData(null);
    setErrors({ supplier: "", amount: "" });
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 100);
  };
  
  const editPayment = (payment) => {
    setEditingData(payment);
    setEditingId(payment._id);
    setIsEditing(true);
    
    setVoucherId(payment.transactionId || payment.voucherNo || generateVoucherNo());
    setPaymentDate(payment.date || payment.paymentDate || isoD());
    setAmount(payment.amount || payment.amountValue || 0);
    setRemarks(payment.remarks || "");
    
    let supplier = allSuppliers.find(s => s._id === payment.supplierId);
    if (!supplier && payment.supplierName) {
      supplier = allSuppliers.find(s => s.name === payment.supplierName);
    }
    
    if (supplier) {
      setSupplierId(supplier._id);
      setSupplierCode(supplier.code || "");
      setSupplierName(supplier.name);
      setSelectedSupplier(supplier);
    } else if (payment.supplierName) {
      setSupplierName(payment.supplierName);
      setSelectedSupplier({ name: payment.supplierName, _id: payment.supplierId });
    }
    
    showMsg(`Editing payment: ${payment.transactionId || payment.voucherNo}`, "success");
    setTimeout(() => remarksRef.current?.focus(), 100);
  };
  
  const searchPayment = () => {
    const voucherNo = searchVoucherNo.trim();
    if (!voucherNo) {
      showMsg("Enter voucher number to search", "error");
      return;
    }
    
    const found = payments.find(p => 
      (p.transactionId && p.transactionId.toLowerCase().includes(voucherNo.toLowerCase())) ||
      (p.voucherNo && p.voucherNo.toLowerCase().includes(voucherNo.toLowerCase()))
    );
    
    if (found) {
      setSearchResult(found);
      setFilteredPayments([found]);
      setShowSearch(false);
      showMsg(`Found payment: ${found.transactionId || found.voucherNo}`, "success");
    } else {
      showMsg(`Payment "${voucherNo}" not found`, "error");
      setSearchResult(null);
      if (selectedSupplier) {
        const supplierPayments = payments.filter(p => p.supplierId === selectedSupplier._id);
        setFilteredPayments(supplierPayments);
      } else {
        setFilteredPayments(payments);
      }
    }
  };
  
  const clearSearch = () => {
    setSearchResult(null);
    if (selectedSupplier) {
      const supplierPayments = payments.filter(p => p.supplierId === selectedSupplier._id);
      setFilteredPayments(supplierPayments);
    } else {
      setFilteredPayments(payments);
    }
    setSearchVoucherNo("");
    showMsg("Search cleared", "success");
  };
  
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchPayment();
    }
    if (e.key === "Escape") {
      setShowSearch(false);
      setSearchVoucherNo("");
    }
  };
  
  const handleUpdatePayment = () => {
    if (!selectedSupplier) {
      setErrors(prev => ({ ...prev, supplier: "Select supplier" }));
      showMsg("Please select a supplier", "error");
      return;
    }
    
    if (!amount || amount === "") {
      setErrors(prev => ({ ...prev, amount: "Amount required" }));
      amountRef.current?.focus();
      return;
    }
    
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setErrors(prev => ({ ...prev, amount: "Valid amount > 0" }));
      amountRef.current?.focus();
      return;
    }
    
    setSubmitting(true);
    try {
      const updatedPayment = {
        ...editingData,
        voucherNo: voucherId,
        paymentDate: paymentDate,
        supplierId: selectedSupplier._id,
        supplierName: selectedSupplier.name,
        supplierCode: selectedSupplier.code,
        amount: amt,
        remarks: remarks || "Bank payment recorded",
        updatedAt: new Date().toISOString()
      };
      
      const allPayments = JSON.parse(localStorage.getItem("bank_payments_demo") || "[]");
      const index = allPayments.findIndex(p => p._id === editingData._id);
      if (index !== -1) {
        allPayments[index] = updatedPayment;
        localStorage.setItem("bank_payments_demo", JSON.stringify(allPayments));
      }
      
      showMsg(`✓ Payment ${voucherId} updated! Amount: PKR ${fmt(amt)}`, "success");
      
      setIsEditing(false);
      setEditingId(null);
      setEditingData(null);
      loadPayments();
      resetForm();
    } catch (err) {
      showMsg("Update failed", "error");
    }
    setSubmitting(false);
  };
  
  const handleDeletePayment = (id, voucherNo) => {
    if (!window.confirm(`Delete payment "${voucherNo}"?`)) return;
    try {
      const allPayments = JSON.parse(localStorage.getItem("bank_payments_demo") || "[]");
      const filtered = allPayments.filter(p => p._id !== id);
      localStorage.setItem("bank_payments_demo", JSON.stringify(filtered));
      
      showMsg(`Payment "${voucherNo}" deleted!`, "success");
      
      loadPayments();
      if (editingId === id) {
        resetForm();
      }
      setSearchResult(null);
    } catch (err) {
      showMsg("Delete failed", "error");
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isEditing) {
      handleUpdatePayment();
      return;
    }
    
    if (!selectedSupplier) {
      setErrors(prev => ({ ...prev, supplier: "Select supplier" }));
      showMsg("Please select a supplier", "error");
      return;
    }
    
    if (!amount || amount === "") {
      setErrors(prev => ({ ...prev, amount: "Amount required" }));
      amountRef.current?.focus();
      return;
    }
    
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setErrors(prev => ({ ...prev, amount: "Valid amount > 0" }));
      amountRef.current?.focus();
      return;
    }
    
    setSubmitting(true);
    try {
      const newPayment = {
        _id: Date.now().toString(),
        voucherNo: voucherId,
        paymentDate: paymentDate,
        supplierId: selectedSupplier._id,
        supplierCode: selectedSupplier.code,
        supplierName: selectedSupplier.name,
        amount: amt,
        remarks: remarks || "Bank payment recorded",
        createdAt: new Date().toISOString(),
        isEditable: true
      };
      
      const allPayments = JSON.parse(localStorage.getItem("bank_payments_demo") || "[]");
      allPayments.push(newPayment);
      localStorage.setItem("bank_payments_demo", JSON.stringify(allPayments));
      
      showMsg(`✓ Payment ${voucherId} recorded! Amount: PKR ${fmt(amt)}`, "success");
      
      loadPayments();
      resetForm();
    } catch (err) {
      showMsg("Failed to save payment", "error");
    }
    setSubmitting(false);
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Bank Payment Voucher</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={() => setShowSearch(!showSearch)} style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold", marginRight: "8px", background: "#f59e0b", color: "white", border: "1px solid #000000" }}>🔍 Search Payment</button>
          <button className="xp-btn xp-btn-sm" onClick={loadPayments} style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold", marginRight: "8px", background: "#3b82f6", color: "white", border: "1px solid #000000" }}>⟳ Load</button>
          <button className="xp-btn xp-btn-sm" onClick={resetForm} style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold", background: "#10b981", color: "white", border: "1px solid #000000" }}>🔄 New Payment</button>
        </div>
      </div>
      
      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "6px 12px", fontSize: "12px", padding: "6px 12px", fontWeight: "500", border: "1px solid #000000" }}>
          {msg.text}
        </div>
      )}
      
      {showSearch && (
        <div style={{ margin: "6px 12px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "2px solid #000000", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", fontSize: "11px" }}>🔍 Search Payment:</span>
          <input
            ref={searchRef}
            type="text"
            value={searchVoucherNo}
            onChange={(e) => setSearchVoucherNo(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Enter Voucher Number"
            style={{ flex: 1, padding: "6px 10px", border: "1px solid #000000", borderRadius: "4px", fontSize: "12px" }}
          />
          <button onClick={searchPayment} style={{ padding: "6px 16px", background: "#1e40af", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Search</button>
          <button onClick={clearSearch} style={{ padding: "6px 16px", background: "#10b981", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Clear</button>
          <button onClick={() => setShowSearch(false)} style={{ padding: "6px 16px", background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Cancel</button>
        </div>
      )}
      
      <div className="xp-page-body" style={{ padding: "10px 12px", background: "#ffffff" }}>
        <div style={{
          background: "#ffffff",
          borderRadius: "6px",
          padding: "12px",
          marginBottom: "12px",
          border: "2px solid #000000"
        }}>
          <form onSubmit={handleSubmit}>
            {/* ALL INPUTS IN ONE ROW - Same as Cash Receipt */}
            <div style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
              flexWrap: "wrap"
            }}>
              {/* Voucher ID */}
              <div style={{ width: "145px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Voucher ID</label>
                <input
                  type="text"
                  value={voucherId}
                  readOnly={!isEditing}
                  style={{ 
                    background: isEditing ? "#fffde7" : "#f5f5f5", 
                    fontFamily: "monospace", 
                    fontSize: "9px", 
                    fontWeight: "bold",
                    height: "28px", 
                    padding: "0 6px",
                    border: "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
                {isEditing && <div style={{ fontSize: "7px", color: "#f59e0b", marginTop: "1px", fontWeight: "bold" }}>✏ Editing</div>}
              </div>
              
              {/* Date */}
              <div style={{ width: "100px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{ height: "28px", padding: "0 6px", fontSize: "11px", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              {/* Supplier Code */}
              <div style={{ width: "95px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Code</label>
                <input
                  ref={codeInputRef}
                  type="text"
                  value={supplierCode}
                  onChange={(e) => setSupplierCode(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === "Enter") { 
                      e.preventDefault(); 
                      handleCodeSearch(); 
                    } 
                  }}
                  placeholder="Code"
                  style={{ 
                    height: "28px", 
                    padding: "0 6px", 
                    fontSize: "11px", 
                    textTransform: "uppercase",
                    border: errors.supplier ? "2px solid #ef4444" : "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
              </div>
              
              {/* Account Title - LARGER */}
              <div style={{ flex: 2, minWidth: "220px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>🏦 Account Title <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{
                  border: errors.supplier ? "2px solid #ef4444" : "1px solid #000000",
                  borderRadius: "4px",
                  background: "#ffffff",
                  minHeight: "28px"
                }}>
                  <SupplierDropdown
                    allSuppliers={allSuppliers}
                    value={supplierId}
                    displayName={supplierName}
                    onSelect={handleSupplierSelect}
                    onClear={handleSupplierClear}
                    onEnterPress={() => remarksRef.current?.focus()}
                  />
                </div>
                {errors.supplier && <div style={{ fontSize: "8px", color: "#ef4444", marginTop: "2px" }}>{errors.supplier}</div>}
              </div>
              
              {/* Remarks - LARGER */}
              <div style={{ flex: 2, minWidth: "220px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>📝 Remarks</label>
                <input
                  ref={remarksRef}
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onKeyDown={handleRemarksKeyDown}
                  placeholder="Optional..."
                  style={{ 
                    height: "28px", 
                    padding: "0 8px", 
                    fontSize: "11px", 
                    border: "1px solid #000000", 
                    borderRadius: "4px", 
                    width: "100%"
                  }}
                />
              </div>
              
              {/* Amount */}
              <div style={{ width: "100px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Amount <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  ref={amountRef}
                  type="number"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onKeyDown={handleAmountKeyDown}
                  placeholder="0"
                  step="1"
                  style={{ 
                    height: "28px", 
                    padding: "0 6px", 
                    fontSize: "11px", 
                    fontWeight: "bold", 
                    textAlign: "right", 
                    border: errors.amount ? "2px solid #ef4444" : "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
                {errors.amount && <div style={{ fontSize: "7px", color: "#ef4444", marginTop: "1px" }}>{errors.amount}</div>}
              </div>
              
              {/* Submit Button */}
              <div style={{ marginTop: "18px" }}>
                <button
                  ref={submitRef}
                  type="submit"
                  disabled={submitting || (!selectedSupplier && !isEditing) || !amount}
                  style={{
                    background: isEditing ? "#f59e0b" : "#22c55e",
                    color: "white",
                    padding: "0 16px",
                    height: "28px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    border: "1px solid #000000",
                    cursor: "pointer",
                    borderRadius: "4px",
                    whiteSpace: "nowrap"
                  }}
                >
                  {submitting ? "SAVING..." : (isEditing ? "✏ UPDATE" : "💾 SAVE")}
                </button>
              </div>
            </div>
            
            {/* Selected Supplier Info */}
            {selectedSupplier && (
              <div style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: "#f8fafc",
                borderRadius: "4px",
                border: "1px solid #000000"
              }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", border: "1px solid #000000" }}>🏢</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b" }}>{selectedSupplier.name}</div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    Code: {selectedSupplier.code || "—"} | Phone: {selectedSupplier.phone || "—"}
                  </div>
                </div>
                <button type="button" onClick={handleSupplierClear} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", padding: "4px 12px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>Clear</button>
              </div>
            )}
          </form>
        </div>
        
        {/* Payments Table */}
        <div style={{
          background: "#ffffff",
          borderRadius: "6px",
          padding: "8px",
          border: "2px solid #000000"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            paddingBottom: "6px",
            borderBottom: "2px solid #000000"
          }}>
            <h3 style={{ margin: 0, fontSize: "12px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>
              📋 Bank Payments {filteredPayments.length > 0 && `(${filteredPayments.length})`}
              {searchResult && <span style={{ fontSize: "10px", color: "#f59e0b", marginLeft: "8px" }}> - Search Result</span>}
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              {searchResult && (
                <button onClick={clearSearch} style={{ fontSize: "10px", padding: "3px 10px", border: "1px solid #000000", borderRadius: "4px", background: "#f59e0b", color: "white", cursor: "pointer", fontWeight: "bold" }}>Clear Search</button>
              )}
              <button onClick={loadPayments} style={{ fontSize: "10px", padding: "3px 10px", border: "1px solid #000000", borderRadius: "4px", background: "#f8fafc", cursor: "pointer", fontWeight: "bold" }}>⟳ Refresh</button>
            </div>
          </div>
          
          {loading && (
            <div style={{ padding: "30px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>Loading payments...</div>
          )}
          
          {!loading && filteredPayments.length === 0 && (
            <div style={{ padding: "30px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
              📭 No bank payment records found
              <div style={{ marginTop: "8px", fontSize: "10px" }}>
                Click "Load" button to load demo data, or create a new payment using the form above
              </div>
            </div>
          )}
          
          {!loading && filteredPayments.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ 
                width: "100%", 
                borderCollapse: "collapse", 
                fontSize: "10px", 
                border: "1px solid #000000"
              }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ padding: "4px 4px", textAlign: "center", width: "30px", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>#</th>
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Date</th>
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Voucher #</th>
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Supplier</th>
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Remarks</th>
                    <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Amount</th>
                    <th style={{ padding: "4px 4px", textAlign: "center", width: "75px", border: "1px solid #000000", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p, i) => (
                    <tr 
                      key={p._id || i} 
                      style={{ 
                        backgroundColor: editingId === p._id ? "#fef3c7" : "transparent",
                        borderBottom: "1px solid #000000"
                      }}
                    >
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000", fontWeight: "600" }}>{i + 1}</td>
                      <td style={{ padding: "4px 4px", whiteSpace: "nowrap", border: "1px solid #000000" }}>{p.paymentDate || p.date}</td>
                      <td style={{ padding: "4px 4px", fontFamily: "monospace", fontWeight: "bold", border: "1px solid #000000", fontSize: "9px" }}>{p.voucherNo || p.transactionId}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #000000", fontWeight: "bold" }}>{p.supplierName}</td>
                      <td style={{ padding: "4px 4px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #000000" }}>{p.remarks || "—"}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", color: "#dc2626", border: "1px solid #000000" }}>PKR {fmt(p.amount || p.amountValue || 0)}</td>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000" }}>
                        <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                          <button
                            onClick={() => editPayment(p)}
                            style={{
                              background: "#f59e0b",
                              color: "white",
                              border: "1px solid #000000",
                              borderRadius: "3px",
                              padding: "3px 8px",
                              fontSize: "9px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                            title="Edit Payment"
                          >
                            ✏ Edit
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p._id, p.voucherNo || p.transactionId)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "1px solid #000000",
                              borderRadius: "3px",
                              padding: "3px 8px",
                              fontSize: "9px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                            title="Delete Payment"
                          >
                            🗑 Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f1f5f9" }}>
                  <tr>
                    <td colSpan="5" style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "9px" }}>TOTAL:</td>
                    <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", color: "#dc2626", border: "1px solid #000000", fontSize: "9px" }}>PKR {fmt(filteredPayments.reduce((sum, p) => sum + (p.amount || p.amountValue || 0), 0))}</td>
                    <td style={{ padding: "4px 4px", border: "1px solid #000000" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "4px 12px" }}>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>🏦 Bank Payment</div>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>{selectedSupplier ? selectedSupplier.name : `${filteredPayments.length} payments total`}</div>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>{isEditing ? "✏ Editing Mode" : (amount && `Paying: PKR ${fmt(amount)}`)}</div>
      </div>
    </div>
  );
}