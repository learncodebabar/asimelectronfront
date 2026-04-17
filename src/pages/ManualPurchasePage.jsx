// pages/ManualPurchasePage.jsx - With image on left and double amount entry
import { useState, useEffect, useRef } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const isoDate = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const SHOP = "Asim Electric and Electronic Store";

const EMPTY_ROW = {
  code: "",
  supplierName: "",
  description: "",
  invoiceNo: "",
  amount: 0,
  confirmAmount: 0,
};

// Supplier Dropdown Component with Picture
function SupplierDropdown({ allSuppliers, value, displayName, onSelect, onClear, onEnterPress }) {
  const [query, setQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const getSuggestions = (searchTerm) => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase();
    return allSuppliers.filter(s => 
      s.name?.toLowerCase().startsWith(searchLower) ||
      s.code?.toLowerCase().startsWith(searchLower)
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

  const selectSupplier = (supplier) => {
    onSelect(supplier);
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
      const matchedSupplier = suggestions[0];
      if (matchedSupplier) selectSupplier(matchedSupplier);
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
      if (selectedSupplier) { setQuery(selectedSupplier.name); setGhost(""); }
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
      if (selectedSupplier) { setQuery(selectedSupplier.name); setGhost(""); }
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
          {suggestions.map((supplier, idx) => (
            <div key={supplier._id} onClick={() => selectSupplier(supplier)} style={{ padding: "8px 10px", cursor: "pointer", backgroundColor: idx === selectedSuggestionIndex ? "#e5f0ff" : "white", borderBottom: "1px solid #e2e8f0", fontSize: 12, display: "flex", alignItems: "center", gap: "10px" }}
              onMouseEnter={() => { setSelectedSuggestionIndex(idx); setIsNavigating(true); setQuery(supplier.name); setGhost(""); }} onMouseLeave={() => setIsNavigating(false)}>
              {supplier.imageFront ? (
                <img src={supplier.imageFront} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
              ) : (
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", border: "1px solid #000000" }}>🏭</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 13, color: "#1e293b" }}>{supplier.name}</div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>{supplier.code && <span>📋 Code: {supplier.code}</span>}{supplier.phone && <span> | 📞 {supplier.phone}</span>}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Selected Supplier Card Component with Image on Left
function SelectedSupplierCard({ supplier, onClear }) {
  if (!supplier) return null;
  
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
      {supplier.imageFront ? (
        <img src={supplier.imageFront} alt="" style={{ width: "45px", height: "45px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
      ) : (
        <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", border: "1px solid #000000" }}>🏭</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{supplier.name}</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
          Code: {supplier.code || "—"} | Phone: {supplier.phone || "—"} | Balance: <span style={{ fontWeight: "bold", color: (supplier.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>PKR {fmt(supplier.currentBalance || 0)}</span>
        </div>
      </div>
      <button type="button" onClick={onClear} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>CLEAR</button>
    </div>
  );
}

export default function ManualPurchasePage() {
  const [date] = useState(isoDate());
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState(isoDate());
  const [filterEndDate, setFilterEndDate] = useState(isoDate());
  const [filterSupplierName, setFilterSupplierName] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [row1, setRow1] = useState({ ...EMPTY_ROW });
  const [row2, setRow2] = useState({ ...EMPTY_ROW });
  const [entries, setEntries] = useState([]);
  
  const [selectedSupplier1, setSelectedSupplier1] = useState(null);
  const [selectedSupplier2, setSelectedSupplier2] = useState(null);
  
  // Amount validation errors
  const [amountError1, setAmountError1] = useState("");
  const [amountError2, setAmountError2] = useState("");
  
  const code1Ref = useRef(null);
  const supplier1Ref = useRef(null);
  const desc1Ref = useRef(null);
  const inv1Ref = useRef(null);
  const amount1Ref = useRef(null);
  const confirmAmount1Ref = useRef(null);
  
  const code2Ref = useRef(null);
  const supplier2Ref = useRef(null);
  const desc2Ref = useRef(null);
  const inv2Ref = useRef(null);
  const amount2Ref = useRef(null);
  const confirmAmount2Ref = useRef(null);
  
  const [suggestions1, setSuggestions1] = useState([]);
  const [showSuggestions1, setShowSuggestions1] = useState(false);
  const [selectedIdx1, setSelectedIdx1] = useState(-1);
  const [activeField1, setActiveField1] = useState(null);
  
  const [suggestions2, setSuggestions2] = useState([]);
  const [showSuggestions2, setShowSuggestions2] = useState(false);
  const [selectedIdx2, setSelectedIdx2] = useState(-1);
  const [activeField2, setActiveField2] = useState(null);

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseRecords();
    setTimeout(() => code1Ref.current?.focus(), 100);
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        const supplierList = data.data.filter(c => 
          (c.customerType === "supplier" || c.type === "supplier" || c.isSupplier === true) &&
          c.name && c.name.trim() !== ""
        );
        setSuppliers(supplierList);
      }
    } catch (error) { console.error("Failed to fetch suppliers:", error); }
  };

  const fetchPurchaseRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.SALES.GET_ALL);
      if (data.success) {
        const purchases = data.data.filter(r => r.saleType === "purchase" || r.saleType === "return");
        setPurchaseRecords(purchases);
      }
    } catch (error) { console.error("Failed to fetch purchase records:", error); }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const searchSuppliers = (searchText) => {
    if (!searchText.trim()) return [];
    const q = searchText.trim().toLowerCase();
    return suppliers.filter(s => s.code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)).slice(0, 8);
  };

  const handleCodeChange1 = (value) => {
    setRow1(prev => ({ ...prev, code: value, supplierName: "" }));
    if (!value.trim()) { setSuggestions1([]); setShowSuggestions1(false); return; }
    const matches = searchSuppliers(value);
    setSuggestions1(matches);
    setShowSuggestions1(matches.length > 0);
    setSelectedIdx1(-1);
    setActiveField1('code');
  };

  const handleSupplierChange1 = (value) => {
    setRow1(prev => ({ ...prev, supplierName: value, code: "" }));
    if (!value.trim()) { setSuggestions1([]); setShowSuggestions1(false); return; }
    const matches = searchSuppliers(value);
    setSuggestions1(matches);
    setShowSuggestions1(matches.length > 0);
    setSelectedIdx1(-1);
    setActiveField1('supplier');
  };

  const handleCodeChange2 = (value) => {
    setRow2(prev => ({ ...prev, code: value, supplierName: "" }));
    if (!value.trim()) { setSuggestions2([]); setShowSuggestions2(false); return; }
    const matches = searchSuppliers(value);
    setSuggestions2(matches);
    setShowSuggestions2(matches.length > 0);
    setSelectedIdx2(-1);
    setActiveField2('code');
  };

  const handleSupplierChange2 = (value) => {
    setRow2(prev => ({ ...prev, supplierName: value, code: "" }));
    if (!value.trim()) { setSuggestions2([]); setShowSuggestions2(false); return; }
    const matches = searchSuppliers(value);
    setSuggestions2(matches);
    setShowSuggestions2(matches.length > 0);
    setSelectedIdx2(-1);
    setActiveField2('supplier');
  };

  const selectSupplier = (supplier, isRow1) => {
    if (isRow1) {
      setRow1(prev => ({ ...prev, code: supplier.code || "", supplierName: supplier.name }));
      setSelectedSupplier1(supplier);
      setSuggestions1([]);
      setShowSuggestions1(false);
      setTimeout(() => desc1Ref.current?.focus(), 50);
    } else {
      setRow2(prev => ({ ...prev, code: supplier.code || "", supplierName: supplier.name }));
      setSelectedSupplier2(supplier);
      setSuggestions2([]);
      setShowSuggestions2(false);
      setTimeout(() => desc2Ref.current?.focus(), 50);
    }
  };

  const clearSupplier1 = () => {
    setRow1(prev => ({ ...prev, code: "", supplierName: "" }));
    setSelectedSupplier1(null);
    code1Ref.current?.focus();
  };

  const clearSupplier2 = () => {
    setRow2(prev => ({ ...prev, code: "", supplierName: "" }));
    setSelectedSupplier2(null);
    code2Ref.current?.focus();
  };

  const handleSuggestionKeyDown = (e, isRow1) => {
    const suggestions = isRow1 ? suggestions1 : suggestions2;
    const setSelected = isRow1 ? setSelectedIdx1 : setSelectedIdx2;
    const selected = isRow1 ? selectedIdx1 : selectedIdx2;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(prev => prev < suggestions.length - 1 ? prev + 1 : prev); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(prev => prev > 0 ? prev - 1 : -1); }
    else if (e.key === "Enter" && selected >= 0 && suggestions[selected]) { e.preventDefault(); selectSupplier(suggestions[selected], isRow1); }
    else if (e.key === "Escape") { if (isRow1) { setShowSuggestions1(false); setSuggestions1([]); } else { setShowSuggestions2(false); setSuggestions2([]); } }
  };

  const updateRow = (row, field, val, isRow1) => {
    const newVal = field === "amount" || field === "confirmAmount" ? parseFloat(val) || 0 : val;
    if (isRow1) {
      setRow1(prev => ({ ...prev, [field]: newVal }));
      // Validate amount match
      if (field === "amount" || field === "confirmAmount") {
        if (row1.confirmAmount > 0 && newVal > 0) {
          if (field === "amount" && row1.confirmAmount !== newVal) {
            setAmountError1("Amounts do not match!");
          } else if (field === "confirmAmount" && row1.amount !== newVal) {
            setAmountError1("Amounts do not match!");
          } else {
            setAmountError1("");
          }
        }
      }
    } else {
      setRow2(prev => ({ ...prev, [field]: newVal }));
      if (field === "amount" || field === "confirmAmount") {
        if (row2.confirmAmount > 0 && newVal > 0) {
          if (field === "amount" && row2.confirmAmount !== newVal) {
            setAmountError2("Amounts do not match!");
          } else if (field === "confirmAmount" && row2.amount !== newVal) {
            setAmountError2("Amounts do not match!");
          } else {
            setAmountError2("");
          }
        }
      }
    }
  };

  const handleRow1KeyDown = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      switch(field) {
        case 'code': 
          supplier1Ref.current?.focus(); 
          break;
        case 'supplier': 
          desc1Ref.current?.focus(); 
          break;
        case 'desc': 
          inv1Ref.current?.focus(); 
          break;
        case 'inv': 
          amount1Ref.current?.focus(); 
          break;
        case 'amount': 
          confirmAmount1Ref.current?.focus(); 
          break;
        case 'confirmAmount':
          if (!amountError1 && row1.amount > 0 && row1.confirmAmount > 0 && row1.amount === row1.confirmAmount) {
            code2Ref.current?.focus();
          } else if (row1.amount > 0 && row1.confirmAmount > 0 && row1.amount !== row1.confirmAmount) {
            setAmountError1("Amounts do not match!");
            amount1Ref.current?.focus();
          }
          break;
        default: break;
      }
    }
  };

  const handleRow2KeyDown = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      switch(field) {
        case 'code': 
          supplier2Ref.current?.focus(); 
          break;
        case 'supplier': 
          desc2Ref.current?.focus(); 
          break;
        case 'desc': 
          inv2Ref.current?.focus(); 
          break;
        case 'inv': 
          amount2Ref.current?.focus(); 
          break;
        case 'amount': 
          confirmAmount2Ref.current?.focus(); 
          break;
        case 'confirmAmount':
          if (!amountError2 && row2.amount > 0 && row2.confirmAmount > 0 && row2.amount === row2.confirmAmount) {
            saveAllEntries();
          } else if (row2.amount > 0 && row2.confirmAmount > 0 && row2.amount !== row2.confirmAmount) {
            setAmountError2("Amounts do not match!");
            amount2Ref.current?.focus();
          }
          break;
        default: break;
      }
    }
  };

  const saveSingleEntry = async (rowData, type) => {
    try {
      const supplier = suppliers.find(s => s.name === rowData.supplierName || s.code === rowData.code);
      const invoicePrefix = type === "purchase" ? "PUR" : "RET";
      const finalInvoiceNo = rowData.invoiceNo || `${invoicePrefix}-${Date.now()}`;
      const payload = {
        invoiceNo: finalInvoiceNo, invoiceDate: date, customerId: supplier?._id || "",
        customerName: rowData.supplierName, customerPhone: supplier?.phone || "",
        items: [{ productId: "", code: rowData.code || "", name: rowData.description || (type === "purchase" ? "Purchase Entry" : "Return Entry"), description: rowData.description || (type === "purchase" ? "Purchase Entry" : "Return Entry"), uom: "", measurement: "", rack: "", pcs: 1, qty: 1, rate: rowData.amount, disc: 0, amount: rowData.amount }],
        subTotal: rowData.amount, extraDisc: 0, discAmount: 0, netTotal: rowData.amount, prevBalance: 0, paidAmount: rowData.amount, balance: 0,
        paymentMode: "Cash", saleSource: type === "purchase" ? "purchase" : "return", sendSms: false, printType: "Thermal",
        remarks: `${type === "purchase" ? "Purchase" : "Return"} - ${rowData.description || "No description"}`, saleType: type, type: "sale"
      };
      const response = await api.post(EP.SALES.CREATE, payload);
      if (response.data && response.data.success) {
        return { ...rowData, type: type.toUpperCase(), displayType: type === "purchase" ? "Purchase" : "Return", invoiceNo: finalInvoiceNo };
      } else { showMsg(`Failed: ${response.data?.message || "Unknown error"}`, "error"); return null; }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Network error";
      showMsg(`${type === "purchase" ? "Purchase" : "Return"} save failed: ${errorMsg}`, "error");
      return null;
    }
  };

  const saveAllEntries = async () => {
    const hasRow1Data = row1.supplierName && row1.amount > 0 && row1.confirmAmount > 0 && row1.amount === row1.confirmAmount;
    const hasRow2Data = row2.supplierName && row2.amount > 0 && row2.confirmAmount > 0 && row2.amount === row2.confirmAmount;
    
    if (!hasRow1Data && !hasRow2Data) { 
      showMsg("Please fill at least one entry with supplier and matching amounts", "error"); 
      return; 
    }
    
    if (hasRow1Data && row1.amount !== row1.confirmAmount) {
      setAmountError1("Amounts do not match!");
      amount1Ref.current?.focus();
      return;
    }
    
    if (hasRow2Data && row2.amount !== row2.confirmAmount) {
      setAmountError2("Amounts do not match!");
      amount2Ref.current?.focus();
      return;
    }
    
    setSaving(true);
    const savedEntries = [];
    try {
      if (hasRow1Data) { const result = await saveSingleEntry(row1, "purchase"); if (result) savedEntries.push(result); }
      if (hasRow2Data) { const result = await saveSingleEntry(row2, "return"); if (result) savedEntries.push(result); }
      if (savedEntries.length > 0) {
        setEntries(prev => [...prev, ...savedEntries.map(e => ({ ...e, id: Date.now() + Math.random() }))]);
        setRow1({ ...EMPTY_ROW }); setRow2({ ...EMPTY_ROW });
        setSelectedSupplier1(null); setSelectedSupplier2(null);
        setAmountError1(""); setAmountError2("");
        setSuggestions1([]); setSuggestions2([]); setShowSuggestions1(false); setShowSuggestions2(false);
        await fetchPurchaseRecords(); code1Ref.current?.focus();
      }
    } catch (error) { console.error("Save error:", error); showMsg("Failed to save records", "error"); }
    setSaving(false);
  };

  const resetForm = () => {
    setRow1({ ...EMPTY_ROW }); setRow2({ ...EMPTY_ROW }); setEntries([]);
    setSelectedSupplier1(null); setSelectedSupplier2(null);
    setAmountError1(""); setAmountError2("");
    setSuggestions1([]); setSuggestions2([]); setShowSuggestions1(false); setShowSuggestions2(false);
    setSelectedIdx1(-1); setSelectedIdx2(-1);
    setTimeout(() => code1Ref.current?.focus(), 50);
  };

  const calculateTotal = () => {
    const purchaseTotal = entries.filter(e => e.type === "PURCHASE").reduce((sum, e) => sum + (e.amount || 0), 0);
    const returnTotal = entries.filter(e => e.type === "RETURN").reduce((sum, e) => sum + (e.amount || 0), 0);
    return { purchaseTotal, returnTotal, netTotal: purchaseTotal - returnTotal };
  };

  const { purchaseTotal, returnTotal, netTotal } = calculateTotal();

  const filteredPurchases = purchaseRecords.filter(record => {
    const recordDate = record.invoiceDate;
    const matchesDate = recordDate >= filterStartDate && recordDate <= filterEndDate;
    const matchesSupplier = !filterSupplierName.trim() || (record.customerName?.toLowerCase().includes(filterSupplierName.toLowerCase()));
    return matchesDate && matchesSupplier;
  }).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  const totalFilteredAmount = filteredPurchases.reduce((sum, record) => sum + (record.netTotal || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px", flexShrink: 0 }}>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>Manual Purchase / Return Bill — {SHOP}</span>
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
        
        {/* Filter Bar */}
        <div style={{ background: "#f8fafc", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", border: "1px solid #000000", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "bold", fontSize: "11px" }}>📅 Filter:</span>
            <input type="date" style={{ padding: "5px 8px", fontSize: "11px", border: "1px solid #000000", borderRadius: "3px" }} value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
            <span>to</span>
            <input type="date" style={{ padding: "5px 8px", fontSize: "11px", border: "1px solid #000000", borderRadius: "3px" }} value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            <input type="text" style={{ width: "160px", padding: "5px 8px", fontSize: "11px", border: "1px solid #000000", borderRadius: "3px" }} placeholder="Supplier name..." value={filterSupplierName} onChange={(e) => setFilterSupplierName(e.target.value)} />
            <button className="xp-btn xp-btn-sm" style={{ padding: "4px 12px", fontSize: "11px", fontWeight: "bold" }} onClick={fetchPurchaseRecords}>Refresh</button>
            <button className="xp-btn xp-btn-sm" style={{ padding: "4px 12px", fontSize: "11px", fontWeight: "bold" }} onClick={resetForm}>Reset</button>
            <span style={{ marginLeft: "auto", fontWeight: "bold", fontSize: "11px" }}>Total: <span style={{ color: "#1e40af" }}>{fmt(totalFilteredAmount)}</span></span>
          </div>
        </div>

        {/* Row 1 - Purchase Entry */}
        <div style={{ background: "#ffffff", borderRadius: "6px", padding: "10px 12px", marginBottom: "10px", border: "1px solid #1e40af", flexShrink: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "8px", color: "#1e40af" }}>📝 Purchase (Debit - Money OUT)</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "80px" }}>
              <input ref={code1Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.code} onChange={(e) => handleCodeChange1(e.target.value)} onKeyDown={(e) => { handleSuggestionKeyDown(e, true); handleRow1KeyDown(e, 'code'); }} placeholder="Code" />
            </div>
            <div style={{ flex: 2, minWidth: "180px" }}>
              <div style={{ border: "1px solid #000000", borderRadius: "3px", background: "#ffffff" }}>
                <SupplierDropdown allSuppliers={suppliers} value={row1.supplierName} displayName={row1.supplierName} onSelect={(s) => selectSupplier(s, true)} onClear={clearSupplier1} onEnterPress={() => desc1Ref.current?.focus()} />
              </div>
            </div>
            <div style={{ flex: 2, minWidth: "140px" }}>
              <input ref={desc1Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.description} onChange={(e) => updateRow(row1, "description", e.target.value, true)} onKeyDown={(e) => handleRow1KeyDown(e, 'desc')} placeholder="Description" />
            </div>
            <div style={{ width: "100px" }}>
              <input ref={inv1Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.invoiceNo} onChange={(e) => updateRow(row1, "invoiceNo", e.target.value, true)} onKeyDown={(e) => handleRow1KeyDown(e, 'inv')} placeholder="Inv #" />
            </div>
            <div style={{ width: "120px" }}>
              <input ref={amount1Ref} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.amount} onChange={(e) => updateRow(row1, "amount", e.target.value, true)} onKeyDown={(e) => handleRow1KeyDown(e, 'amount')} placeholder="Amount" />
            </div>
            <div style={{ width: "120px" }}>
              <input ref={confirmAmount1Ref} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: amountError1 ? "2px solid #ef4444" : "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row1.confirmAmount} onChange={(e) => updateRow(row1, "confirmAmount", e.target.value, true)} onKeyDown={(e) => handleRow1KeyDown(e, 'confirmAmount')} placeholder="Confirm Amount" />
            </div>
          </div>
          {amountError1 && <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "5px", textAlign: "right" }}>{amountError1}</div>}
          {selectedSupplier1 && <SelectedSupplierCard supplier={selectedSupplier1} onClear={clearSupplier1} />}
        </div>

        {/* Row 2 - Return Entry */}
        <div style={{ background: "#ffffff", borderRadius: "6px", padding: "10px 12px", marginBottom: "10px", border: "1px solid #16a34a", flexShrink: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "8px", color: "#16a34a" }}>📝 Return (Credit - Money IN)</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "80px" }}>
              <input ref={code2Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.code} onChange={(e) => handleCodeChange2(e.target.value)} onKeyDown={(e) => { handleSuggestionKeyDown(e, false); handleRow2KeyDown(e, 'code'); }} placeholder="Code" />
            </div>
            <div style={{ flex: 2, minWidth: "180px" }}>
              <div style={{ border: "1px solid #000000", borderRadius: "3px", background: "#ffffff" }}>
                <SupplierDropdown allSuppliers={suppliers} value={row2.supplierName} displayName={row2.supplierName} onSelect={(s) => selectSupplier(s, false)} onClear={clearSupplier2} onEnterPress={() => desc2Ref.current?.focus()} />
              </div>
            </div>
            <div style={{ flex: 2, minWidth: "140px" }}>
              <input ref={desc2Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.description} onChange={(e) => updateRow(row2, "description", e.target.value, false)} onKeyDown={(e) => handleRow2KeyDown(e, 'desc')} placeholder="Description" />
            </div>
            <div style={{ width: "100px" }}>
              <input ref={inv2Ref} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.invoiceNo} onChange={(e) => updateRow(row2, "invoiceNo", e.target.value, false)} onKeyDown={(e) => handleRow2KeyDown(e, 'inv')} placeholder="Inv #" />
            </div>
            <div style={{ width: "120px" }}>
              <input ref={amount2Ref} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.amount} onChange={(e) => updateRow(row2, "amount", e.target.value, false)} onKeyDown={(e) => handleRow2KeyDown(e, 'amount')} placeholder="Amount" />
            </div>
            <div style={{ width: "120px" }}>
              <input ref={confirmAmount2Ref} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: amountError2 ? "2px solid #ef4444" : "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row2.confirmAmount} onChange={(e) => updateRow(row2, "confirmAmount", e.target.value, false)} onKeyDown={(e) => handleRow2KeyDown(e, 'confirmAmount')} placeholder="Confirm Amount" />
            </div>
          </div>
          {amountError2 && <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "5px", textAlign: "right" }}>{amountError2}</div>}
          {selectedSupplier2 && <SelectedSupplierCard supplier={selectedSupplier2} onClear={clearSupplier2} />}
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
            📊 Transaction Records ({filteredPurchases.length})
          </div>
          <div style={{ overflow: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f1f5f9", zIndex: 10 }}>
                <tr>
                  <th style={{ padding: "8px 6px", textAlign: "center", width: "40px", border: "1px solid #000000", fontWeight: "bold" }}>#</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Invoice #</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Date</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Code</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Supplier</th>
                  <th style={{ padding: "8px 6px", textAlign: "center", width: "80px", border: "1px solid #000000", fontWeight: "bold" }}>Type</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: "100px", border: "1px solid #000000", fontWeight: "bold" }}>Amount</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #000000", fontWeight: "bold" }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && filteredPurchases.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No records found</td></tr>
                )}
                {!loading && filteredPurchases.map((record, idx) => (
                  <tr key={record._id}>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000", fontWeight: "600" }}>{idx + 1}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold", fontFamily: "monospace" }}>{record.invoiceNo}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000" }}>{record.invoiceDate}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "600" }}>{record.items?.[0]?.code || record.code || "—"}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold" }}>{record.customerName || "—"}</td>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: "bold", background: record.saleType === "purchase" ? "#dbeafe" : "#dcfce7", border: "1px solid #000000" }}>
                        {record.saleType === "purchase" ? "PURCHASE" : "RETURN"}
                      </span>
                    </td>
                    <td style={{ padding: "6px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: record.saleType === "purchase" ? "#1e40af" : "#16a34a" }}>
                      {fmt(record.netTotal)}
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #000000" }}>{record.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
              {filteredPurchases.length > 0 && (
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
                    <th style={{ padding: "5px", textAlign: "left", border: "1px solid #000000" }}>Supplier</th>
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
                      <td style={{ padding: "4px", border: "1px solid #000000", fontWeight: "bold" }}>{entry.supplierName}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000" }}>{entry.description || "—"}</td>
                      <td style={{ padding: "4px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: entry.type === "PURCHASE" ? "#1e40af" : "#16a34a" }}>{fmt(entry.amount)}</td>
                      <td style={{ padding: "4px", textAlign: "center", border: "1px solid #000000" }}>
                        <span style={{ padding: "2px 6px", borderRadius: "2px", fontSize: "9px", fontWeight: "bold", background: entry.type === "PURCHASE" ? "#dbeafe" : "#dcfce7" }}>{entry.displayType}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc" }}>
                  <tr>
                    <td colSpan="4" style={{ padding: "5px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Purchase Total:</td>
                    <td style={{ padding: "5px", textAlign: "right", fontWeight: "bold", color: "#1e40af", border: "1px solid #000000" }}>{fmt(purchaseTotal)}</td>
                    <td style={{ border: "1px solid #000000" }}></td>
                  </tr>
                  <tr>
                    <td colSpan="4" style={{ padding: "5px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Return Total:</td>
                    <td style={{ padding: "5px", textAlign: "right", fontWeight: "bold", color: "#16a34a", border: "1px solid #000000" }}>{fmt(returnTotal)}</td>
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
        <span style={{ flex: 1, textAlign: "right", fontSize: "11px", fontWeight: "bold" }}>Purchase: {fmt(purchaseTotal)} | Return: {fmt(returnTotal)} | Net: {fmt(netTotal)}</span>
        <button className="xp-btn xp-btn-sm" style={{ fontSize: "11px", fontWeight: "bold" }} onClick={() => window.history.back()}>✕ Close</button>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px", flexShrink: 0 }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Manual Purchase/Return Bill</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Session: {entries.length}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>DB: {purchaseRecords.length}</div>
      </div>
    </div>
  );
}