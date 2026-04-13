// pages/CashPaymentVoucher.jsx
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

  // Reset query when displayName changes (customer selection changes)
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

  // Determine what to show in the input
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
          {suggestions.map((supplier, idx) => (
            <div
              key={supplier._id}
              onClick={() => selectSupplier(supplier)}
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
                setQuery(supplier.name);
                setGhost("");
              }}
              onMouseLeave={() => setIsNavigating(false)}
            >
              <div style={{ fontWeight: "bold", fontSize: 14, color: "#1e293b" }}>
                {supplier.name}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
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
  const [description, setDescription] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [sendSms, setSendSms] = useState(false);
  
  const [errors, setErrors] = useState({ supplier: "", amount: "" });
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [editId, setEditId] = useState(null);
  
  const codeInputRef = useRef(null);
  const descriptionRef = useRef(null);
  const invoiceRef = useRef(null);
  const amountRef = useRef(null);
  const submitRef = useRef(null);
  
  useEffect(() => {
    loadSuppliers();
    codeInputRef.current?.focus();
  }, []);
  
  // Load payment history for selected supplier
  useEffect(() => {
    if (selectedSupplier) {
      loadSupplierPayments(selectedSupplier._id);
    } else {
      setTransactions([]);
    }
  }, [selectedSupplier]);
  
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
  
  const loadSupplierPayments = async (supplierId) => {
    setLoading(true);
    try {
      // Get all CPV records and filter by supplier
      const { data } = await api.get(EP.CPV.GET_ALL);
      const allRecords = Array.isArray(data) ? data : data.data || [];
      
      // Filter payments for the selected supplier (by account_title)
      const supplierPayments = allRecords.filter(record => 
        record.account_title?.toLowerCase() === supplierName?.toLowerCase()
      );
      
      // Sort by date (newest first)
      supplierPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setTransactions(supplierPayments);
    } catch (err) {
      console.error("Failed to load payments:", err);
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
        setTimeout(() => descriptionRef.current?.focus(), 100);
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
    setTransactions([]);
    setErrors({ supplier: "", amount: "" });
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
      setErrors({ ...errors, amount: "Amount is required" });
      return false;
    }
    if (isNaN(amt) || amt <= 0) {
      setErrors({ ...errors, amount: "Valid amount > 0 required" });
      return false;
    }
    setErrors({ ...errors, amount: "" });
    return true;
  };
  
  const handleAmountChange = (value) => {
    setAmount(value);
    validateAmount(value);
  };
  
  const handleDescriptionKeyDown = (e) => {
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
    setDescription("");
    setInvoiceNo("");
    setAmount("");
    setSendSms(false);
    setEditId(null);
    setTransactions([]);
    setErrors({ supplier: "", amount: "" });
    codeInputRef.current?.focus();
  };
  
  const handleEdit = (row) => {
    setEditId(row._id);
    setVoucherId(row.cpv_number);
    setVoucherDate(row.date?.slice(0, 10) || isoD());
    setSupplierCode(row.code || "");
    setSupplierName(row.account_title || "");
    setDescription(row.description || "");
    setInvoiceNo(row.invoice || "");
    setAmount(row.amount || "");
    setSendSms(row.send_sms || false);
    
    // Find and set selected supplier
    const found = allSuppliers.find(s => s.name === row.account_title);
    if (found) {
      setSupplierId(found._id);
      setSelectedSupplier(found);
    } else {
      setSupplierId("");
      setSelectedSupplier(null);
    }
    
    setTimeout(() => descriptionRef.current?.focus(), 100);
  };
  
  const handleDelete = async () => {
    if (!editId) return;
    if (!window.confirm(`Delete Voucher #${voucherId}?`)) return;
    try {
      await api.delete(EP.CPV.DELETE(editId));
      showMsg("Record deleted");
      handleNew();
      if (selectedSupplier) {
        loadSupplierPayments(selectedSupplier._id);
      }
    } catch (e) {
      showMsg(e.response?.data?.error || "Delete failed", "error");
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
        description: description,
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
      
      // Reset form but keep supplier selected
      setVoucherId(generateVoucherNo());
      setDescription("");
      setInvoiceNo("");
      setAmount("");
      setSendSms(false);
      setEditId(null);
      
      // Refresh payment history for the selected supplier
      if (selectedSupplier) {
        loadSupplierPayments(selectedSupplier._id);
      }
      
      // Focus back on description
      setTimeout(() => descriptionRef.current?.focus(), 100);
    } catch (err) {
      showMsg(err.response?.data?.error || "Save failed", "error");
    }
    setSubmitting(false);
  };
  
  const totalAmount = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Cash Payment Voucher</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={handleNew} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold" }}>🔄 New Voucher</button>
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
              {/* Voucher ID */}
              <div style={{ width: "160px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Voucher ID</label>
                <input
                  type="text"
                  value={voucherId}
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
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  style={{ height: "38px", padding: "0 10px", fontSize: "13px", fontWeight: "500", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              {/* Supplier Code */}
              <div style={{ width: "130px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Supplier Code</label>
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
                  placeholder="Enter code"
                  style={{ 
                    height: "38px", 
                    padding: "0 10px", 
                    fontSize: "13px", 
                    fontWeight: "500",
                    textTransform: "uppercase",
                    border: errors.supplier ? "2px solid #ef4444" : "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
              </div>
              
              {/* Account Title (Supplier Name) */}
              <div style={{ minWidth: "240px", flex: 2 }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Account Title <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{
                  border: errors.supplier ? "2px solid #ef4444" : "1px solid #000000",
                  borderRadius: "4px",
                  background: "#ffffff",
                  minHeight: "38px"
                }}>
                  <SupplierDropdown
                    allSuppliers={allSuppliers}
                    value={supplierId}
                    displayName={supplierName}
                    onSelect={handleSupplierSelect}
                    onClear={handleSupplierClear}
                    onEnterPress={() => descriptionRef.current?.focus()}
                  />
                </div>
                {errors.supplier && <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "3px", fontWeight: "500" }}>{errors.supplier}</div>}
              </div>
              
              {/* Description */}
              <div style={{ minWidth: "180px", flex: 1 }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Description</label>
                <input
                  ref={descriptionRef}
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleDescriptionKeyDown}
                  placeholder="Payment description"
                  style={{ height: "38px", padding: "0 10px", fontSize: "13px", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              {/* Invoice No */}
              <div style={{ width: "120px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Invoice No</label>
                <input
                  ref={invoiceRef}
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  onKeyDown={handleInvoiceKeyDown}
                  placeholder="0"
                  style={{ height: "38px", padding: "0 10px", fontSize: "13px", fontWeight: "500", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              {/* Amount */}
              <div style={{ width: "140px" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Amount <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  ref={amountRef}
                  type="number"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onKeyDown={handleAmountKeyDown}
                  placeholder="0"
                  step="1"
                  style={{ 
                    height: "38px", 
                    padding: "0 10px", 
                    fontSize: "14px", 
                    fontWeight: "bold", 
                    textAlign: "right", 
                    border: errors.amount ? "2px solid #ef4444" : "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
                {errors.amount && <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "3px", fontWeight: "500" }}>{errors.amount}</div>}
              </div>
              
              {/* Save Button */}
              <div>
                <button
                  ref={submitRef}
                  type="submit"
                  disabled={submitting || !selectedSupplier || !amount}
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
            
            {/* Send SMS Checkbox */}
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
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "12px", fontWeight: "500", color: "#1e293b" }}>📱 Send SMS to Supplier</span>
              </label>
            </div>
            
            {/* Supplier Info Display */}
            {selectedSupplier && (
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
                {selectedSupplier.imageFront ? (
                  <img src={selectedSupplier.imageFront} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
                ) : (
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", border: "1px solid #000000" }}>🏢</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{selectedSupplier.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Code: {selectedSupplier.code || "—"} | Phone: {selectedSupplier.phone || "—"} | Type: Supplier
                  </div>
                </div>
                <button type="button" onClick={handleSupplierClear} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", padding: "6px 16px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>CLEAR</button>
              </div>
            )}
          </form>
        </div>
        
        {/* Action Buttons Row */}
        <div style={{
          background: "#ffffff",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "16px",
          border: "2px solid #000000",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap"
        }}>
          <button className="xp-btn xp-btn-sm" onClick={() => selectedSupplier && loadSupplierPayments(selectedSupplier._id)} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold", border: "1px solid #000000" }}>⟳ Refresh</button>
          {editId && <button className="xp-btn xp-btn-sm" onClick={() => { setEditId(null); handleNew(); }} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold", border: "1px solid #000000" }}>✏ New Record</button>}
          <button className="xp-btn xp-btn-sm xp-btn-danger" disabled={!editId} onClick={handleDelete} style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "bold", border: "1px solid #000000", background: "#ef4444", color: "white" }}>🗑 Delete Record</button>
          <div className="xp-toolbar-divider" style={{ width: "1px", height: "24px", background: "#000000", margin: "0 4px" }} />
          <span style={{ fontSize: "12px", fontWeight: "500", color: "#1e293b" }}>Records: {transactions.length}</span>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#059669", marginLeft: "auto" }}>Total Paid: PKR {fmt(totalAmount)}</span>
        </div>
        
        {/* Payment History Table - Shows only for selected supplier */}
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
              📋 Payment History {selectedSupplier ? `- ${selectedSupplier.name}` : ""} {transactions.length > 0 && `(${transactions.length})`}
            </h3>
          </div>
          
          {!selectedSupplier && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>
              🔍 Select a supplier to view payment history
            </div>
          )}
          
          {loading && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#64748b", fontWeight: "500" }}>Loading...</div>
          )}
          
          {!loading && selectedSupplier && transactions.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>
              📭 No payment records found for {selectedSupplier.name}
            </div>
          )}
          
          {!loading && selectedSupplier && transactions.length > 0 && (
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
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>CPV #</th>
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Description</th>
                    <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Invoice No</th>
                    <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr 
                      key={t._id || i} 
                      onClick={() => handleEdit(t)}
                      style={{ cursor: "pointer", backgroundColor: editId === t._id ? "#e5f0ff" : "transparent" }}
                    >
                      <td style={{ padding: "3px 4px", textAlign: "center", border: "1px solid #000000", fontSize: "13px", fontWeight: "600" }}>{i + 1}</td>
                      <td style={{ padding: "3px 4px", whiteSpace: "nowrap", border: "1px solid #000000", fontSize: "13px", fontWeight: "600" }}>{t.date?.slice(0, 10) || "—"}</td>
                      <td style={{ padding: "3px 4px", fontFamily: "monospace", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px" }}>{t.cpv_number}</td>
                      <td style={{ padding: "3px 4px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #000000", fontSize: "13px", fontWeight: "600" }}>{t.description || "—"}</td>
                      <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: "600", border: "1px solid #000000", fontSize: "13px" }}>{t.invoice || "—"}</td>
                      <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000", fontSize: "13px" }}>PKR {fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f1f5f9" }}>
                  <tr>
                    <td colSpan="5" style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000", fontSize: "13px", textTransform: "uppercase" }}>TOTAL:</td>
                    <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000", fontSize: "13px" }}>PKR {fmt(totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "11px", fontWeight: "500" }}>💰 Cash Payment Voucher</div>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "11px", fontWeight: "500" }}>{selectedSupplier ? selectedSupplier.name : "No supplier selected"}</div>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "11px", fontWeight: "500" }}>{amount && `Paying: PKR ${fmt(amount)}`}</div>
      </div>
    </div>
  );
}