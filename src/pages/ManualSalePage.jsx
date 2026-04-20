// pages/ManualSalePage.jsx - Fixed with proper JSX syntax
import { useState, useEffect, useRef } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const isoDate = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const SHOP = "Asim Electric and Electronic Store";

const EMPTY_ROW = {
  code: "",
  accountTitle: "",
  description: "",
  invoiceNo: "",
  credit: 0,
  confirmCredit: 0, // Added confirm amount field
};

// Customer Dropdown Component
function CustomerDropdown({ allCustomers, value, displayName, customerType, onSelect, onClear, allowedTypes, onEnterPress }) {
  const [query, setQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const creditCustomers = allCustomers.filter((c) => {
    const t = (c.customerType || c.type || "").toLowerCase();
    const allowed = allowedTypes || ["credit"];
    return allowed.includes(t) && c.name?.toUpperCase().trim() !== "COUNTER SALE";
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
    setTimeout(() => { if (onEnterPress) onEnterPress(); }, 100);
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
      if (matchedCustomer) selectCustomer(matchedCustomer);
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
      if (selectedCustomer) { setQuery(selectedCustomer.name); setGhost(""); }
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
      if (selectedCustomer) { setQuery(selectedCustomer.name); setGhost(""); }
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
        <div style={{ position: "relative", flex: 1, background: isFocused ? "#fffbe6" : "transparent", borderRadius: "4px", transition: "background 0.15s ease", width: "100%" }}>
          {ghost && !isNavigating && originalQuery && (
            <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", whiteSpace: "nowrap", fontSize: "13px", fontFamily: "inherit", display: "flex", zIndex: 2, color: "#a0aec0", backgroundColor: "transparent" }}>
              <span style={{ visibility: "hidden" }}>{originalQuery}</span>
              <span style={{ color: "#a0aec0" }}>{ghost}</span>
            </div>
          )}
          <input
            ref={inputRef}
            style={{ flex: 1, minWidth: 0, cursor: "text", background: "transparent", position: "relative", zIndex: 1, width: "100%", border: "none", outline: "none", padding: "6px 6px", fontSize: "13px", fontWeight: "500" }}
            value={value ? (query || displayName) : query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setTimeout(() => { if (!isNavigating) setShowDropdown(false); }, 200); }}
            autoComplete="off"
            spellCheck={false}
            placeholder="Type name or code..."
          />
        </div>
        {value && (
          <button type="button" style={{ height: 26, padding: "0 8px", fontSize: 11, flexShrink: 0, background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            onMouseDown={(e) => { e.preventDefault(); onClear(); setQuery(""); setOriginalQuery(""); setGhost(""); setSuggestions([]); setSelectedSuggestionIndex(-1); setShowDropdown(false); setIsNavigating(false); inputRef.current?.focus(); }} title="Clear">Clear</button>
        )}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", border: "1px solid #000000", borderRadius: 4, maxHeight: 280, overflowY: "auto", zIndex: 1000, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginTop: 2 }}>
          {suggestions.map((customer, idx) => (
            <div key={customer._id} onClick={() => selectCustomer(customer)} style={{ padding: "8px 10px", cursor: "pointer", backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white", borderBottom: "1px solid #e2e8f0", fontSize: 12, display: "flex", alignItems: "center", gap: "10px" }}
              onMouseEnter={() => { setSelectedSuggestionIndex(idx); setIsNavigating(true); setQuery(customer.name); setGhost(""); }} onMouseLeave={() => setIsNavigating(false)}>
              {customer.imageFront ? (
                <img src={customer.imageFront} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
              ) : (
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", border: "1px solid #000000" }}>👤</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 13, color: "#1e293b" }}>{customer.name}</div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>{customer.code && <span>📋 Code: {customer.code}</span>}{customer.phone && <span> | 📞 {customer.phone}</span>}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Selected Customer Card Component
function SelectedCustomerCard({ customer, onClear }) {
  if (!customer) return null;
  
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "8px 12px",
      background: "#f8fafc",
      borderRadius: "6px",
      border: "1px solid #000000",
      marginTop: "8px"
    }}>
      {customer.imageFront ? (
        <img src={customer.imageFront} alt="" style={{ width: "45px", height: "45px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
      ) : (
        <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", border: "1px solid #000000" }}>👤</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{customer.name}</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
          Code: {customer.code || "—"} | Phone: {customer.phone || "—"} | Balance: <span style={{ fontWeight: "bold", color: (customer.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>PKR {fmt(customer.currentBalance || 0)}</span>
        </div>
      </div>
      <button type="button" onClick={onClear} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>CLEAR</button>
    </div>
  );
}

export default function ManualSalePage() {
  const [date] = useState(isoDate());
  const [customers, setCustomers] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState(isoDate());
  const [filterEndDate, setFilterEndDate] = useState(isoDate());
  const [filterAccountTitle, setFilterAccountTitle] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [row1, setRow1] = useState({ ...EMPTY_ROW });
  const [row2, setRow2] = useState({ ...EMPTY_ROW });
  const [entries, setEntries] = useState([]);
  
  const [selectedCustomer1, setSelectedCustomer1] = useState(null);
  const [selectedCustomer2, setSelectedCustomer2] = useState(null);
  
  const code1Ref = useRef(null);
  const title1Ref = useRef(null);
  const desc1Ref = useRef(null);
  const inv1Ref = useRef(null);
  const credit1Ref = useRef(null);
  const confirmCredit1Ref = useRef(null);
  
  const code2Ref = useRef(null);
  const title2Ref = useRef(null);
  const desc2Ref = useRef(null);
  const inv2Ref = useRef(null);
  const credit2Ref = useRef(null);
  const confirmCredit2Ref = useRef(null);
  
  const [suggestions1, setSuggestions1] = useState([]);
  const [showSuggestions1, setShowSuggestions1] = useState(false);
  const [selectedIdx1, setSelectedIdx1] = useState(-1);
  const [activeField1, setActiveField1] = useState(null);
  
  const [suggestions2, setSuggestions2] = useState([]);
  const [showSuggestions2, setShowSuggestions2] = useState(false);
  const [selectedIdx2, setSelectedIdx2] = useState(-1);
  const [activeField2, setActiveField2] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchSalesRecords();
    setTimeout(() => code1Ref.current?.focus(), 100);
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        const creditCustomers = data.data.filter(c => 
          (c.customerType === "credit" || c.type === "credit") && 
          c.name?.toUpperCase() !== "COUNTER SALE"
        );
        setCustomers(creditCustomers);
      }
    } catch (error) { console.error("Failed to fetch customers:", error); }
  };

  const fetchSalesRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.SALES.GET_ALL);
      if (data.success) {
        setSalesRecords(data.data);
      }
    } catch (error) { console.error("Failed to fetch sales records:", error); }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const searchCustomers = (searchText) => {
    if (!searchText.trim()) return [];
    const q = searchText.trim().toLowerCase();
    return customers.filter(c => 
      c.code?.toLowerCase().includes(q) || 
      c.name?.toLowerCase().includes(q)
    ).slice(0, 8);
  };

  const handleCodeChange1 = (value) => {
    setRow1(prev => ({ ...prev, code: value, accountTitle: "" }));
    if (!value.trim()) { setSuggestions1([]); setShowSuggestions1(false); return; }
    const matches = searchCustomers(value);
    setSuggestions1(matches);
    setShowSuggestions1(matches.length > 0);
    setSelectedIdx1(-1);
    setActiveField1('code');
  };

  const handleTitleChange1 = (value) => {
    setRow1(prev => ({ ...prev, accountTitle: value, code: "" }));
    if (!value.trim()) { setSuggestions1([]); setShowSuggestions1(false); return; }
    const matches = searchCustomers(value);
    setSuggestions1(matches);
    setShowSuggestions1(matches.length > 0);
    setSelectedIdx1(-1);
    setActiveField1('title');
  };

  const handleCodeChange2 = (value) => {
    setRow2(prev => ({ ...prev, code: value, accountTitle: "" }));
    if (!value.trim()) { setSuggestions2([]); setShowSuggestions2(false); return; }
    const matches = searchCustomers(value);
    setSuggestions2(matches);
    setShowSuggestions2(matches.length > 0);
    setSelectedIdx2(-1);
    setActiveField2('code');
  };

  const handleTitleChange2 = (value) => {
    setRow2(prev => ({ ...prev, accountTitle: value, code: "" }));
    if (!value.trim()) { setSuggestions2([]); setShowSuggestions2(false); return; }
    const matches = searchCustomers(value);
    setSuggestions2(matches);
    setShowSuggestions2(matches.length > 0);
    setSelectedIdx2(-1);
    setActiveField2('title');
  };

  const selectCustomer = (customer, isRow1) => {
    if (isRow1) {
      setRow1(prev => ({ ...prev, code: customer.code || "", accountTitle: customer.name }));
      setSelectedCustomer1(customer);
      setSuggestions1([]);
      setShowSuggestions1(false);
      setTimeout(() => desc1Ref.current?.focus(), 50);
    } else {
      setRow2(prev => ({ ...prev, code: customer.code || "", accountTitle: customer.name }));
      setSelectedCustomer2(customer);
      setSuggestions2([]);
      setShowSuggestions2(false);
      setTimeout(() => desc2Ref.current?.focus(), 50);
    }
  };

  const clearCustomer1 = () => {
    setRow1(prev => ({ ...prev, code: "", accountTitle: "" }));
    setSelectedCustomer1(null);
    code1Ref.current?.focus();
  };

  const clearCustomer2 = () => {
    setRow2(prev => ({ ...prev, code: "", accountTitle: "" }));
    setSelectedCustomer2(null);
    code2Ref.current?.focus();
  };

  const handleSuggestionKeyDown = (e, isRow1) => {
    const suggestions = isRow1 ? suggestions1 : suggestions2;
    const setSelected = isRow1 ? setSelectedIdx1 : setSelectedIdx2;
    const selected = isRow1 ? selectedIdx1 : selectedIdx2;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(prev => prev < suggestions.length - 1 ? prev + 1 : prev); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(prev => prev > 0 ? prev - 1 : -1); }
    else if (e.key === "Enter" && selected >= 0 && suggestions[selected]) { e.preventDefault(); selectCustomer(suggestions[selected], isRow1); }
    else if (e.key === "Escape") { if (isRow1) { setShowSuggestions1(false); setSuggestions1([]); } else { setShowSuggestions2(false); setSuggestions2([]); } }
  };

  const updateRow = (row, field, val, isRow1) => {
    const newVal = field === "credit" || field === "confirmCredit" ? parseFloat(val) || 0 : val;
    if (isRow1) setRow1(prev => ({ ...prev, [field]: newVal }));
    else setRow2(prev => ({ ...prev, [field]: newVal }));
  };

  const handleRow1KeyDown = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      switch(field) {
        case 'code': title1Ref.current?.focus(); break;
        case 'title': desc1Ref.current?.focus(); break;
        case 'desc': inv1Ref.current?.focus(); break;
        case 'inv': credit1Ref.current?.focus(); break;
        case 'credit': confirmCredit1Ref.current?.focus(); break;
        case 'confirmCredit': code2Ref.current?.focus(); break;
        default: break;
      }
    }
  };

  const handleRow2KeyDown = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      switch(field) {
        case 'code': title2Ref.current?.focus(); break;
        case 'title': desc2Ref.current?.focus(); break;
        case 'desc': inv2Ref.current?.focus(); break;
        case 'inv': credit2Ref.current?.focus(); break;
        case 'credit': confirmCredit2Ref.current?.focus(); break;
        case 'confirmCredit': saveAllEntries(); break;
        default: break;
      }
    }
  };

  const saveSingleEntry = async (rowData, type) => {
    // Validate amount matches confirmation
    if (rowData.credit !== rowData.confirmCredit) {
      showMsg(`${type === "debit" ? "Debit" : "Credit"} amount does not match confirmation!`, "error");
      return null;
    }
    
    if (rowData.credit <= 0) {
      showMsg(`${type === "debit" ? "Debit" : "Credit"} amount must be greater than 0`, "error");
      return null;
    }

    try {
      const customer = customers.find(c => c.name === rowData.accountTitle || c.code === rowData.code);
      const invoicePrefix = type === "debit" ? "DEB" : "CRE";
      const finalInvoiceNo = rowData.invoiceNo || `${invoicePrefix}-${Date.now()}`;
      const payload = {
        invoiceNo: finalInvoiceNo, invoiceDate: date, customerId: customer?._id || "",
        customerName: rowData.accountTitle, customerPhone: customer?.phone || "",
        items: [{ productId: "", code: rowData.code || "", name: rowData.description || (type === "debit" ? "Debit Entry" : "Credit Entry"), description: rowData.description || (type === "debit" ? "Debit Entry" : "Credit Entry"), uom: "", measurement: "", rack: "", pcs: 1, qty: 1, rate: rowData.credit, disc: 0, amount: rowData.credit }],
        subTotal: rowData.credit, extraDisc: 0, discAmount: 0, netTotal: rowData.credit, prevBalance: 0, paidAmount: rowData.credit, balance: 0,
        paymentMode: type === "debit" ? "Cash" : "Credit", saleSource: type === "debit" ? "cash" : "credit", sendSms: false, printType: "Thermal",
        remarks: `${type === "debit" ? "Debit" : "Credit"} - ${rowData.description || "No description"}`, saleType: type === "debit" ? "sale" : "sale", type: "sale"
      };
      const response = await api.post(EP.SALES.CREATE, payload);
      if (response.data && response.data.success) {
        return { ...rowData, type: type.toUpperCase(), displayType: type === "debit" ? "DEBIT" : "CREDIT", invoiceNo: finalInvoiceNo };
      } else { showMsg(`Failed: ${response.data?.message || "Unknown error"}`, "error"); return null; }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Network error";
      showMsg(`${type === "debit" ? "Debit" : "Credit"} save failed: ${errorMsg}`, "error");
      return null;
    }
  };

  const saveAllEntries = async () => {
    const hasRow1Data = row1.accountTitle && row1.credit > 0;
    const hasRow2Data = row2.accountTitle && row2.credit > 0;
    if (!hasRow1Data && !hasRow2Data) { showMsg("Please fill at least one entry with customer and amount", "error"); return; }
    
    setSaving(true);
    const savedEntries = [];
    try {
      if (hasRow1Data) { 
        const result = await saveSingleEntry(row1, "debit"); 
        if (result) savedEntries.push(result); 
        else { setSaving(false); return; }
      }
      if (hasRow2Data) { 
        const result = await saveSingleEntry(row2, "credit"); 
        if (result) savedEntries.push(result); 
        else { setSaving(false); return; }
      }
      if (savedEntries.length > 0) {
        setEntries(prev => [...prev, ...savedEntries.map(e => ({ ...e, id: Date.now() + Math.random() }))]);
        setRow1({ ...EMPTY_ROW }); setRow2({ ...EMPTY_ROW });
        setSelectedCustomer1(null); setSelectedCustomer2(null);
        setSuggestions1([]); setSuggestions2([]); setShowSuggestions1(false); setShowSuggestions2(false);
        await fetchSalesRecords(); code1Ref.current?.focus();
      }
    } catch (error) { console.error("Save error:", error); showMsg("Failed to save records", "error"); }
    setSaving(false);
  };

  const resetForm = () => {
    setRow1({ ...EMPTY_ROW }); setRow2({ ...EMPTY_ROW }); setEntries([]);
    setSelectedCustomer1(null); setSelectedCustomer2(null);
    setSuggestions1([]); setSuggestions2([]); setShowSuggestions1(false); setShowSuggestions2(false);
    setSelectedIdx1(-1); setSelectedIdx2(-1);
    setTimeout(() => code1Ref.current?.focus(), 50);
  };

  const calculateTotal = () => {
    const debitTotal = entries.filter(e => e.type === "DEBIT").reduce((sum, e) => sum + (e.credit || 0), 0);
    const creditTotal = entries.filter(e => e.type === "CREDIT").reduce((sum, e) => sum + (e.credit || 0), 0);
    return { debitTotal, creditTotal, netTotal: debitTotal - creditTotal };
  };

  const { debitTotal, creditTotal, netTotal } = calculateTotal();

  const filteredSales = salesRecords.filter(record => {
    const recordDate = record.invoiceDate;
    const matchesDate = recordDate >= filterStartDate && recordDate <= filterEndDate;
    const matchesAccount = !filterAccountTitle.trim() || (record.customerName?.toLowerCase().includes(filterAccountTitle.toLowerCase()));
    return matchesDate && matchesAccount;
  }).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  const totalFilteredAmount = filteredSales.reduce((sum, record) => sum + (record.netTotal || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px", flexShrink: 0 }}>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>Manual Sale Bill (Credit/Debit) — {SHOP}</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={resetForm} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>🔄 New Entry</button>
        </div>
      </div>

      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "4px 12px", fontSize: "11px", padding: "4px 12px", fontWeight: "500", flexShrink: 0 }}>
          {msg.text}
        </div>
      )}

      <div style={{ padding: "12px 16px", background: "#ffffff", flex: 1, overflow: "auto" }}>
        
        {/* Filter Bar - Made Smaller */}
        <div style={{ background: "#f8fafc", borderRadius: "6px", padding: "6px 10px", marginBottom: "12px", border: "1px solid #000000", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "bold", fontSize: "10px" }}>📅 Filter:</span>
            <input type="date" style={{ padding: "3px 6px", fontSize: "10px", border: "1px solid #000000", borderRadius: "3px", width: "110px" }} value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
            <span style={{ fontSize: "10px" }}>to</span>
            <input type="date" style={{ padding: "3px 6px", fontSize: "10px", border: "1px solid #000000", borderRadius: "3px", width: "110px" }} value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            <input type="text" style={{ width: "150px", padding: "3px 6px", fontSize: "10px", border: "1px solid #000000", borderRadius: "3px" }} placeholder="Customer..." value={filterAccountTitle} onChange={(e) => setFilterAccountTitle(e.target.value)} />
            <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }} onClick={fetchSalesRecords}>Refresh</button>
            <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }} onClick={resetForm}>Reset</button>
            <span style={{ marginLeft: "auto", fontWeight: "bold", fontSize: "10px" }}>Total: <span style={{ color: "#1e40af" }}>{fmt(totalFilteredAmount)}</span></span>
          </div>
        </div>

        {/* Row 1 - Debit Entry (Cash Sale) */}
        <div style={{ background: "#ffffff", borderRadius: "6px", padding: "10px 12px", marginBottom: "10px", border: "2px solid #1e40af", flexShrink: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "#1e40af", background: "#dbeafe", padding: "4px 8px", borderRadius: "4px", display: "inline-block" }}>💰 DEBIT - CASH SALE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr 1fr 1.2fr 1.2fr", gap: "10px", alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>CODE</label>
              <input ref={code1Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.code} onChange={(e) => handleCodeChange1(e.target.value)} onKeyDown={(e) => { handleSuggestionKeyDown(e, true); handleRow1KeyDown(e, 'code'); }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>ACCOUNT TITLE</label>
              <div style={{ border: "1px solid #000000", borderRadius: "3px", background: "#ffffff" }}>
                <CustomerDropdown allCustomers={customers} value={row1.accountTitle} displayName={row1.accountTitle} onSelect={(c) => selectCustomer(c, true)} onClear={clearCustomer1} allowedTypes={["credit"]} onEnterPress={() => desc1Ref.current?.focus()} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>DESCRIPTION</label>
              <input ref={desc1Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.description} onChange={(e) => updateRow(row1, "description", e.target.value, true)} onKeyDown={(e) => handleRow1KeyDown(e, 'desc')} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>INVOICE #</label>
              <input ref={inv1Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.invoiceNo} onChange={(e) => updateRow(row1, "invoiceNo", e.target.value, true)} onKeyDown={(e) => handleRow1KeyDown(e, 'inv')} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>AMOUNT (PKR)</label>
              <input ref={credit1Ref} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.credit} onChange={(e) => updateRow(row1, "credit", e.target.value, true)} onKeyDown={(e) => handleRow1KeyDown(e, 'credit')} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px", color: "#dc2626" }}>CONFIRM AMOUNT</label>
              <input ref={confirmCredit1Ref} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "2px solid #dc2626", borderRadius: "3px", width: "100%", background: "#fef2f2" }} value={row1.confirmCredit} onChange={(e) => updateRow(row1, "confirmCredit", e.target.value, true)} onKeyDown={(e) => handleRow1KeyDown(e, 'confirmCredit')} />
            </div>
          </div>
          {selectedCustomer1 && <SelectedCustomerCard customer={selectedCustomer1} onClear={clearCustomer1} />}
        </div>

        {/* Row 2 - Credit Entry (Credit Sale) */}
        <div style={{ background: "#ffffff", borderRadius: "6px", padding: "10px 12px", marginBottom: "10px", border: "2px solid #16a34a", flexShrink: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "#16a34a", background: "#dcfce7", padding: "4px 8px", borderRadius: "4px", display: "inline-block" }}>💳 CREDIT - CREDIT SALE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr 1fr 1.2fr 1.2fr", gap: "10px", alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>CODE</label>
              <input ref={code2Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.code} onChange={(e) => handleCodeChange2(e.target.value)} onKeyDown={(e) => { handleSuggestionKeyDown(e, false); handleRow2KeyDown(e, 'code'); }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>ACCOUNT TITLE</label>
              <div style={{ border: "1px solid #000000", borderRadius: "3px", background: "#ffffff" }}>
                <CustomerDropdown allCustomers={customers} value={row2.accountTitle} displayName={row2.accountTitle} onSelect={(c) => selectCustomer(c, false)} onClear={clearCustomer2} allowedTypes={["credit"]} onEnterPress={() => desc2Ref.current?.focus()} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>DESCRIPTION</label>
              <input ref={desc2Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.description} onChange={(e) => updateRow(row2, "description", e.target.value, false)} onKeyDown={(e) => handleRow2KeyDown(e, 'desc')} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>INVOICE #</label>
              <input ref={inv2Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.invoiceNo} onChange={(e) => updateRow(row2, "invoiceNo", e.target.value, false)} onKeyDown={(e) => handleRow2KeyDown(e, 'inv')} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>AMOUNT (PKR)</label>
              <input ref={credit2Ref} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.credit} onChange={(e) => updateRow(row2, "credit", e.target.value, false)} onKeyDown={(e) => handleRow2KeyDown(e, 'credit')} />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px", color: "#dc2626" }}>CONFIRM AMOUNT</label>
              <input ref={confirmCredit2Ref} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "2px solid #dc2626", borderRadius: "3px", width: "100%", background: "#fef2f2" }} value={row2.confirmCredit} onChange={(e) => updateRow(row2, "confirmCredit", e.target.value, false)} onKeyDown={(e) => handleRow2KeyDown(e, 'confirmCredit')} />
            </div>
          </div>
          {selectedCustomer2 && <SelectedCustomerCard customer={selectedCustomer2} onClear={clearCustomer2} />}
        </div>

        {/* Save Button */}
        <div style={{ marginBottom: "12px", textAlign: "center", flexShrink: 0 }}>
          <button style={{ background: "#1e40af", color: "white", padding: "8px 28px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer" }} onClick={saveAllEntries} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Records"}
          </button>
        </div>

        {/* Transaction Records Table */}
        <div style={{ background: "#ffffff", borderRadius: "6px", border: "2px solid #000000", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", padding: "10px 12px", background: "#f1f5f9", borderBottom: "2px solid #000000", flexShrink: 0 }}>
            📊 Transaction Records ({filteredSales.length})
          </div>
          <div style={{ overflow: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f1f5f9", zIndex: 10 }}>
                <tr>
                  <th style={{ padding: "8px 6px", textAlign: "center", width: "40px", border: "1px solid #000000", fontWeight: "bold" }}>#</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Invoice #</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Date</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Code</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Customer</th>
                  <th style={{ padding: "8px 6px", textAlign: "center", width: "80px", border: "1px solid #000000", fontWeight: "bold" }}>Type</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: "100px", border: "1px solid #000000", fontWeight: "bold" }}>Amount</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="8" style={{ padding: "40px", textAlign: "center" }}>Loading...</td>
                  </tr>
                )}
                {!loading && filteredSales.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No records found</td>
                  </tr>
                )}
                {!loading && filteredSales.map((record, idx) => (
                  <tr key={record._id}>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000", fontWeight: "600" }}>{idx + 1}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold", fontFamily: "monospace" }}>{record.invoiceNo}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000" }}>{record.invoiceDate}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "600" }}>{record.items?.[0]?.code || record.code || "—"}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold" }}>{record.customerName || "—"}</td>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: "bold", background: record.paymentMode === "Credit" ? "#dcfce7" : "#dbeafe", border: "1px solid #000000" }}>
                        {record.paymentMode === "Credit" ? "CREDIT" : "DEBIT"}
                      </span>
                    </td>
                    <td style={{ padding: "6px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: record.paymentMode === "Credit" ? "#16a34a" : "#1e40af" }}>
                      {fmt(record.netTotal)}
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #000000" }}>{record.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
              {filteredSales.length > 0 && (
                <tfoot style={{ background: "#f8fafc", position: "sticky", bottom: 0 }}>
                  <tr>
                    <td colSpan="6" style={{ padding: "8px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Total:</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#1e40af", fontSize: "13px", border: "1px solid #000000" }}>{fmt(totalFilteredAmount)}</td>
                    <td style={{ border: "1px solid #000000" }}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Recent Entries Summary */}
        {entries.length > 0 && (
          <div style={{ background: "#ffffff", borderRadius: "6px", marginTop: "12px", border: "1px solid #000000", flexShrink: 0 }}>
            <div style={{ fontWeight: "bold", fontSize: "11px", padding: "8px 12px", background: "#f1f5f9", borderBottom: "1px solid #000000" }}>📋 This Session ({entries.length})</div>
            <div style={{ overflowX: "auto", maxHeight: "150px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8fafc" }}>
                  <tr>
                    <th style={{ padding: "5px", textAlign: "center", width: "35px", border: "1px solid #000000" }}>#</th>
                    <th style={{ padding: "5px", textAlign: "left", border: "1px solid #000000" }}>Code</th>
                    <th style={{ padding: "5px", textAlign: "left", border: "1px solid #000000" }}>Customer</th>
                    <th style={{ padding: "5px", textAlign: "left", border: "1px solid #000000" }}>Description</th>
                    <th style={{ padding: "5px", textAlign: "right", border: "1px solid #000000" }}>Amount</th>
                    <th style={{ padding: "5px", textAlign: "center", border: "1px solid #000000" }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(-5).reverse().map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{ padding: "4px", textAlign: "center", border: "1px solid #000000" }}>{entries.length - idx}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000" }}>{entry.code || "—"}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000", fontWeight: "bold" }}>{entry.accountTitle}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000" }}>{entry.description || "—"}</td>
                      <td style={{ padding: "4px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: entry.type === "DEBIT" ? "#1e40af" : "#16a34a" }}>{fmt(entry.credit)}</td>
                      <td style={{ padding: "4px", textAlign: "center", border: "1px solid #000000" }}>
                        <span style={{ padding: "2px 6px", borderRadius: "2px", fontSize: "9px", fontWeight: "bold", background: entry.type === "DEBIT" ? "#dbeafe" : "#dcfce7" }}>{entry.displayType}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc" }}>
                  <tr>
                    <td colSpan="4" style={{ padding: "5px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Debit Total:</td>
                    <td style={{ padding: "5px", textAlign: "right", fontWeight: "bold", color: "#1e40af", border: "1px solid #000000" }}>{fmt(debitTotal)}</td>
                    <td style={{ border: "1px solid #000000" }}></td>
                  </tr>
                  <tr>
                    <td colSpan="4" style={{ padding: "5px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Credit Total:</td>
                    <td style={{ padding: "5px", textAlign: "right", fontWeight: "bold", color: "#16a34a", border: "1px solid #000000" }}>{fmt(creditTotal)}</td>
                    <td style={{ border: "1px solid #000000" }}></td>
                  </tr>
                  <tr style={{ background: "#f1f5f9" }}>
                    <td colSpan="4" style={{ padding: "5px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Net Total:</td>
                    <td style={{ padding: "5px", textAlign: "right", fontWeight: "bold", color: "#1e40af", fontSize: "12px", border: "1px solid #000000" }}>{fmt(netTotal)}</td>
                    <td style={{ border: "1px solid #000000" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Command Bar */}
      <div style={{ padding: "8px 16px", background: "#f1f5f9", borderTop: "2px solid #000000", display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
        <button className="xp-btn xp-btn-sm" style={{ fontSize: "11px", fontWeight: "bold" }} onClick={resetForm}>🔄 Reset</button>
        <span style={{ flex: 1, textAlign: "right", fontSize: "11px", fontWeight: "bold" }}>Debit: {fmt(debitTotal)} | Credit: {fmt(creditTotal)} | Net: {fmt(netTotal)}</span>
        <button className="xp-btn xp-btn-sm" style={{ fontSize: "11px", fontWeight: "bold" }} onClick={() => window.history.back()}>✕ Close</button>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px", flexShrink: 0 }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Manual Sale Bill</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Session: {entries.length}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>DB: {salesRecords.length}</div>
      </div>
    </div>
  );
}