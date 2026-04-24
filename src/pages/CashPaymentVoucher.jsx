// pages/CashPaymentVoucher.jsx - Same design as Cash Receipt
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];
const generateVoucherNo = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CPV-${year}${month}${day}-${random}`;
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

export default function CashPaymentVoucher() {
  const navigate = useNavigate();
  
  const [voucherId, setVoucherId] = useState(generateVoucherNo());
  const [voucherDate, setVoucherDate] = useState(isoD());
  const [supplierId, setSupplierId] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [sendSms, setSendSms] = useState(false);
  
  const [errors, setErrors] = useState({ supplier: "", amount: "" });
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [editId, setEditId] = useState(null);
  const [searchVoucherNo, setSearchVoucherNo] = useState("");
  const [showVoucherSearch, setShowVoucherSearch] = useState(false);
  const [searchVoucherResult, setSearchVoucherResult] = useState(null);
  
  const codeInputRef = useRef(null);
  const remarksRef = useRef(null);
  const invoiceRef = useRef(null);
  const amountRef = useRef(null);
  const submitRef = useRef(null);
  const searchRef = useRef(null);
  
  useEffect(() => {
    loadSuppliers();
    loadTransactions();
    codeInputRef.current?.focus();
  }, []);
  
  // Filter transactions when search is performed
  useEffect(() => {
    if (searchVoucherResult) {
      setFilteredTransactions([searchVoucherResult]);
    } else if (selectedSupplier) {
      const supplierTransactions = transactions.filter(t => t.account_title?.toLowerCase() === selectedSupplier?.name?.toLowerCase());
      setFilteredTransactions(supplierTransactions);
    } else {
      setFilteredTransactions(transactions);
    }
  }, [transactions, searchVoucherResult, selectedSupplier]);
  
  const loadSuppliers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        const suppliers = data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type === "supplier";
        });
        setAllSuppliers(suppliers);
      }
    } catch (err) {
      showMsg("Failed to load suppliers", "error");
    }
  };
  
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.CPV.GET_ALL);
      const allRecords = Array.isArray(data) ? data : data.data || [];
      allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(allRecords);
      setFilteredTransactions(allRecords);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    }
    setLoading(false);
  };
  
  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };
  
  const handleSupplierSelect = async (supplier) => {
    if (!supplier || !supplier._id) {
      showMsg("Invalid supplier selected", "error");
      return;
    }
    try {
      const freshSupplier = await api.get(EP.CUSTOMERS.GET_ONE(supplier._id));
      if (freshSupplier.data.success) {
        const sup = freshSupplier.data.data;
        setSupplierId(sup._id);
        setSupplierCode(sup.code || "");
        setSupplierName(sup.name);
        setSelectedSupplier(sup);
        setErrors({ ...errors, supplier: "" });
        setSearchVoucherResult(null);
        // Filter transactions by this supplier
        const supplierTransactions = transactions.filter(t => t.account_title?.toLowerCase() === sup.name?.toLowerCase());
        setFilteredTransactions(supplierTransactions);
        setTimeout(() => remarksRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error("Failed to fetch supplier details:", error);
      showMsg("Failed to load supplier data", "error");
    }
  };
  
  const handleSupplierClear = () => {
    setSupplierId("");
    setSupplierCode("");
    setSupplierName("");
    setSelectedSupplier(null);
    setFilteredTransactions(transactions);
    setErrors({ supplier: "", amount: "" });
    setEditId(null);
    setVoucherId(generateVoucherNo());
    setVoucherDate(isoD());
    setRemarks("");
    setInvoiceNo("");
    setAmount("");
    setSendSms(false);
    setSearchVoucherResult(null);
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
    const amt = parseFloat(value);
    if (!value || value === "") {
      setErrors({ ...errors, amount: "Required" });
      return false;
    }
    if (isNaN(amt) || amt <= 0) {
      setErrors({ ...errors, amount: "Valid amount > 0" });
      return false;
    }
    setErrors({ ...errors, amount: "" });
    return true;
  };
  
  const handleAmountChange = (value) => {
    setAmount(value);
    validateAmount(value);
  };
  
  const handleRemarksKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      invoiceRef.current?.focus();
    }
  };
  
  const handleInvoiceKeyDown = (e) => {
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
  
  const handleNew = () => {
    setVoucherId(generateVoucherNo());
    setVoucherDate(isoD());
    setSupplierId("");
    setSupplierCode("");
    setSupplierName("");
    setSelectedSupplier(null);
    setRemarks("");
    setInvoiceNo("");
    setAmount("");
    setSendSms(false);
    setEditId(null);
    setSearchVoucherResult(null);
    setErrors({ supplier: "", amount: "" });
    codeInputRef.current?.focus();
  };
  
  const handleEdit = (row) => {
    setEditId(row._id);
    setVoucherId(row.cpv_number);
    setVoucherDate(row.date?.slice(0, 10) || isoD());
    setSupplierCode(row.code || "");
    setSupplierName(row.account_title || "");
    setRemarks(row.remarks || "");
    setInvoiceNo(row.invoice || "");
    setAmount(row.amount || "");
    setSendSms(row.send_sms || false);
    
    const found = allSuppliers.find(s => s.name === row.account_title);
    if (found) {
      setSupplierId(found._id);
      setSelectedSupplier(found);
    } else {
      setSupplierId("");
      setSelectedSupplier(null);
    }
    
    setTimeout(() => remarksRef.current?.focus(), 100);
  };
  
  const handleDelete = async () => {
    if (!editId) return;
    if (!window.confirm(`Delete Voucher #${voucherId}?`)) return;
    try {
      await api.delete(EP.CPV.DELETE(editId));
      showMsg("Record deleted");
      await loadTransactions();
      handleNew();
    } catch (e) {
      showMsg(e.response?.data?.error || "Delete failed", "error");
    }
  };
  
  const searchVoucher = () => {
    const voucherNo = searchVoucherNo.trim();
    if (!voucherNo) {
      showMsg("Enter voucher number to search", "error");
      return;
    }
    
    const found = transactions.find(t => 
      t.cpv_number && t.cpv_number.toLowerCase().includes(voucherNo.toLowerCase())
    );
    
    if (found) {
      setSearchVoucherResult(found);
      setFilteredTransactions([found]);
      setShowVoucherSearch(false);
      showMsg(`Found voucher: ${found.cpv_number}`, "success");
    } else {
      showMsg(`Voucher "${voucherNo}" not found`, "error");
      setSearchVoucherResult(null);
      if (selectedSupplier) {
        const supplierTransactions = transactions.filter(t => t.account_title?.toLowerCase() === selectedSupplier.name?.toLowerCase());
        setFilteredTransactions(supplierTransactions);
      } else {
        setFilteredTransactions(transactions);
      }
    }
  };
  
  const clearSearch = () => {
    setSearchVoucherResult(null);
    if (selectedSupplier) {
      const supplierTransactions = transactions.filter(t => t.account_title?.toLowerCase() === selectedSupplier.name?.toLowerCase());
      setFilteredTransactions(supplierTransactions);
    } else {
      setFilteredTransactions(transactions);
    }
    setSearchVoucherNo("");
    showMsg("Search cleared", "success");
  };
  
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchVoucher();
    }
    if (e.key === "Escape") {
      setShowVoucherSearch(false);
      setSearchVoucherNo("");
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedSupplier) {
      setErrors({ ...errors, supplier: "Please select a supplier" });
      showMsg("Please select a supplier", "error");
      return;
    }
    
    if (!validateAmount(amount)) {
      amountRef.current?.focus();
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        cpv_number: voucherId,
        date: voucherDate,
        code: supplierCode,
        account_title: supplierName,
        remarks: remarks,
        invoice: invoiceNo || 0,
        amount: parseFloat(amount),
        send_sms: sendSms,
      };
      
      let response;
      if (editId) {
        response = await api.put(EP.CPV.UPDATE(editId), payload);
        showMsg("Record updated");
      } else {
        response = await api.post(EP.CPV.CREATE, payload);
        showMsg(`CPV #${response.data.cpv_number} saved`);
      }
      
      setVoucherId(generateVoucherNo());
      setRemarks("");
      setInvoiceNo("");
      setAmount("");
      setSendSms(false);
      setEditId(null);
      
      await loadTransactions();
      if (selectedSupplier) {
        const supplierTransactions = transactions.filter(t => t.account_title?.toLowerCase() === selectedSupplier.name?.toLowerCase());
        setFilteredTransactions(supplierTransactions);
      }
      
      setTimeout(() => remarksRef.current?.focus(), 100);
    } catch (err) {
      showMsg(err.response?.data?.error || "Save failed", "error");
    }
    setSubmitting(false);
  };
  
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Cash Payment Voucher</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={() => setShowVoucherSearch(!showVoucherSearch)} style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold", marginRight: "8px", background: "#f59e0b", color: "white", border: "1px solid #000000" }}>🔍 Search Voucher</button>
          <button className="xp-btn xp-btn-sm" onClick={handleNew} style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold", background: "#10b981", color: "white", border: "1px solid #000000" }}>🔄 New Voucher</button>
        </div>
      </div>
      
      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "6px 12px", fontSize: "12px", padding: "6px 12px", fontWeight: "500", border: "1px solid #000000" }}>
          {msg.text}
        </div>
      )}
      
      {showVoucherSearch && (
        <div style={{ margin: "6px 12px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "2px solid #000000", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", fontSize: "11px" }}>🔍 Search Voucher:</span>
          <input
            ref={searchRef}
            type="text"
            value={searchVoucherNo}
            onChange={(e) => setSearchVoucherNo(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Enter Voucher Number"
            style={{ flex: 1, padding: "6px 10px", border: "1px solid #000000", borderRadius: "4px", fontSize: "12px" }}
          />
          <button onClick={searchVoucher} style={{ padding: "6px 16px", background: "#1e40af", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Search</button>
          <button onClick={clearSearch} style={{ padding: "6px 16px", background: "#10b981", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Clear</button>
          <button onClick={() => setShowVoucherSearch(false)} style={{ padding: "6px 16px", background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Cancel</button>
        </div>
      )}
      
      <div className="xp-page-body" style={{ padding: "10px 12px", background: "#ffffff" }}>
        {/* Main Form - ALL IN ONE ROW like Cash Receipt */}
        <div style={{
          background: "#ffffff",
          borderRadius: "6px",
          padding: "12px",
          marginBottom: "12px",
          border: "2px solid #000000"
        }}>
          <form onSubmit={handleSubmit}>
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
                  readOnly={!editId}
                  style={{ 
                    background: editId ? "#fffde7" : "#f5f5f5", 
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
                {editId && <div style={{ fontSize: "7px", color: "#f59e0b", marginTop: "1px", fontWeight: "bold" }}>✏ Editing</div>}
              </div>
              
              {/* Date */}
              <div style={{ width: "100px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Date</label>
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
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
              
              {/* Account Title - LARGER like Cash Receipt */}
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
              
              {/* Remarks - LARGER like Cash Receipt */}
              <div style={{ flex: 2, minWidth: "220px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>📝 Remarks</label>
                <input
                  ref={remarksRef}
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onKeyDown={handleRemarksKeyDown}
                  placeholder="Enter remarks..."
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
              
              {/* Invoice No */}
              <div style={{ width: "90px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Invoice #</label>
                <input
                  ref={invoiceRef}
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  onKeyDown={handleInvoiceKeyDown}
                  placeholder="0"
                  style={{ height: "28px", padding: "0 6px", fontSize: "11px", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
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
                  disabled={submitting || (!selectedSupplier && !editId) || !amount}
                  style={{
                    background: editId ? "#f59e0b" : "#22c55e",
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
                  {submitting ? "SAVING..." : (editId ? "✏ UPDATE" : "💾 SAVE")}
                </button>
              </div>
            </div>
            
            {/* Send SMS Checkbox */}
            <div style={{
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 12px",
              background: "#f8fafc",
              borderRadius: "4px",
              border: "1px solid #000000"
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  style={{ width: "14px", height: "14px" }}
                />
                <span style={{ fontSize: "10px", fontWeight: "500", color: "#1e293b" }}>📱 Send SMS to Supplier</span>
              </label>
            </div>
            
            {/* Supplier Info Display */}
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
                {selectedSupplier.imageFront ? (
                  <img src={selectedSupplier.imageFront} alt="" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
                ) : (
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", border: "1px solid #000000" }}>🏢</div>
                )}
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
        
        {/* Transaction History Table */}
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
              📋 Payment History {selectedSupplier ? `- ${selectedSupplier.name}` : ""} {filteredTransactions.length > 0 && `(${filteredTransactions.length})`}
              {searchVoucherResult && <span style={{ fontSize: "10px", color: "#f59e0b", marginLeft: "8px" }}> - Search Result</span>}
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              {searchVoucherResult && (
                <button onClick={clearSearch} style={{ fontSize: "10px", padding: "3px 10px", border: "1px solid #000000", borderRadius: "4px", background: "#f59e0b", color: "white", cursor: "pointer", fontWeight: "bold" }}>Clear Search</button>
              )}
              <button onClick={loadTransactions} style={{ fontSize: "10px", padding: "3px 10px", border: "1px solid #000000", borderRadius: "4px", background: "#f8fafc", cursor: "pointer", fontWeight: "bold" }}>⟳ Refresh</button>
            </div>
          </div>
          
          {filteredTransactions.length === 0 && (
            <div style={{ padding: "30px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
              📭 No payment records found
              {searchVoucherResult && <div>Try clearing the search</div>}
            </div>
          )}
          
          {loading && (
            <div style={{ padding: "30px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>Loading...</div>
          )}
          
          {!loading && filteredTransactions.length > 0 && (
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
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Account Title</th>
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Remarks</th>
                    <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Invoice #</th>
                    <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Amount</th>
                    <th style={{ padding: "4px 4px", textAlign: "center", width: "75px", border: "1px solid #000000", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t, i) => (
                    <tr 
                      key={t._id || i} 
                      onClick={() => handleEdit(t)}
                      style={{ cursor: "pointer", backgroundColor: editId === t._id ? "#fef3c7" : "transparent" }}
                    >
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000", fontWeight: "600" }}>{i + 1}</td>
                      <td style={{ padding: "4px 4px", whiteSpace: "nowrap", border: "1px solid #000000" }}>{t.date?.slice(0, 10) || "—"}</td>
                      <td style={{ padding: "4px 4px", fontFamily: "monospace", fontWeight: "bold", border: "1px solid #000000", fontSize: "9px" }}>{t.cpv_number}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #000000", fontWeight: "bold" }}>{t.account_title || "—"}</td>
                      <td style={{ padding: "4px 4px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #000000" }}>{t.remarks || "—"}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "600", border: "1px solid #000000" }}>{t.invoice || "—"}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000" }}>PKR {fmt(t.amount)}</td>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000" }}>
                        <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                            style={{ background: "#f59e0b", color: "white", border: "1px solid #000000", borderRadius: "3px", padding: "3px 8px", fontSize: "9px", fontWeight: "bold", cursor: "pointer" }}
                          >
                            ✏ Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(t._id, t.cpv_number); }}
                            style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "3px", padding: "3px 8px", fontSize: "9px", fontWeight: "bold", cursor: "pointer" }}
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
                    <td colSpan="6" style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "9px" }}>TOTAL:</td>
                    <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000", fontSize: "9px" }}>PKR {fmt(totalAmount)}</td>
                    <td style={{ padding: "4px 4px", border: "1px solid #000000" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "4px 12px" }}>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>💰 Cash Payment Voucher</div>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>{selectedSupplier ? selectedSupplier.name : `${filteredTransactions.length} records`}</div>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>{editId ? "✏ Editing Mode" : (amount && `Paying: PKR ${fmt(amount)}`)}</div>
      </div>
    </div>
  );
}