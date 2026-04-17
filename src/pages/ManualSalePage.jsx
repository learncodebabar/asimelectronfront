// pages/ManualSalePage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/ManualPurchasePage.css";

const isoDate = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const SHOP = "Asim Electric and Electronic Store";

const EMPTY_ROW = {
  code: "",
  accountTitle: "",
  description: "",
  invoiceNo: "",
  credit: 0,
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function ManualSalePage() {
  const [date, setDate] = useState(isoDate());
  const [customers, setCustomers] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState(isoDate());
  const [filterEndDate, setFilterEndDate] = useState(isoDate());
  const [filterAccountTitle, setFilterAccountTitle] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form Rows
  const [row1, setRow1] = useState({ ...EMPTY_ROW });
  const [row2, setRow2] = useState({ ...EMPTY_ROW });
  
  // Saved entries list
  const [entries, setEntries] = useState([]);
  
  // Refs for Row 1
  const code1Ref = useRef(null);
  const title1Ref = useRef(null);
  const desc1Ref = useRef(null);
  const inv1Ref = useRef(null);
  const credit1Ref = useRef(null);
  
  // Refs for Row 2
  const code2Ref = useRef(null);
  const title2Ref = useRef(null);
  const desc2Ref = useRef(null);
  const inv2Ref = useRef(null);
  const credit2Ref = useRef(null);
  
  // Suggestion states for Row 1
  const [suggestions1, setSuggestions1] = useState([]);
  const [showSuggestions1, setShowSuggestions1] = useState(false);
  const [selectedIdx1, setSelectedIdx1] = useState(-1);
  const [activeField1, setActiveField1] = useState(null);
  
  // Suggestion states for Row 2
  const [suggestions2, setSuggestions2] = useState([]);
  const [showSuggestions2, setShowSuggestions2] = useState(false);
  const [selectedIdx2, setSelectedIdx2] = useState(-1);
  const [activeField2, setActiveField2] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchSalesRecords();
    // Focus on first field
    setTimeout(() => code1Ref.current?.focus(), 100);
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchSalesRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.SALES.GET_ALL);
      if (data.success) {
        setSalesRecords(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sales records:", error);
    }
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
    ).slice(0, 10);
  };

  // Row 1 handlers
  const handleCodeChange1 = (value) => {
    setRow1(prev => ({ ...prev, code: value }));
    if (!value.trim()) {
      setSuggestions1([]);
      setShowSuggestions1(false);
      return;
    }
    const matches = searchCustomers(value);
    setSuggestions1(matches);
    setShowSuggestions1(matches.length > 0);
    setSelectedIdx1(-1);
    setActiveField1('code');
  };

  const handleTitleChange1 = (value) => {
    setRow1(prev => ({ ...prev, accountTitle: value }));
    if (!value.trim()) {
      setSuggestions1([]);
      setShowSuggestions1(false);
      return;
    }
    const matches = searchCustomers(value);
    setSuggestions1(matches);
    setShowSuggestions1(matches.length > 0);
    setSelectedIdx1(-1);
    setActiveField1('title');
  };

  // Row 2 handlers
  const handleCodeChange2 = (value) => {
    setRow2(prev => ({ ...prev, code: value }));
    if (!value.trim()) {
      setSuggestions2([]);
      setShowSuggestions2(false);
      return;
    }
    const matches = searchCustomers(value);
    setSuggestions2(matches);
    setShowSuggestions2(matches.length > 0);
    setSelectedIdx2(-1);
    setActiveField2('code');
  };

  const handleTitleChange2 = (value) => {
    setRow2(prev => ({ ...prev, accountTitle: value }));
    if (!value.trim()) {
      setSuggestions2([]);
      setShowSuggestions2(false);
      return;
    }
    const matches = searchCustomers(value);
    setSuggestions2(matches);
    setShowSuggestions2(matches.length > 0);
    setSelectedIdx2(-1);
    setActiveField2('title');
  };

  const selectCustomer = (customer, isRow1) => {
    if (isRow1) {
      setRow1(prev => ({ 
        ...prev, 
        code: customer.code || "",
        accountTitle: customer.name
      }));
      setSuggestions1([]);
      setShowSuggestions1(false);
      setTimeout(() => desc1Ref.current?.focus(), 50);
    } else {
      setRow2(prev => ({ 
        ...prev, 
        code: customer.code || "",
        accountTitle: customer.name
      }));
      setSuggestions2([]);
      setShowSuggestions2(false);
      setTimeout(() => desc2Ref.current?.focus(), 50);
    }
  };

  const handleSuggestionKeyDown = (e, isRow1) => {
    const suggestions = isRow1 ? suggestions1 : suggestions2;
    const setSelected = isRow1 ? setSelectedIdx1 : setSelectedIdx2;
    const selected = isRow1 ? selectedIdx1 : selectedIdx2;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === "Enter" && selected >= 0 && suggestions[selected]) {
      e.preventDefault();
      selectCustomer(suggestions[selected], isRow1);
    } else if (e.key === "Escape") {
      if (isRow1) {
        setShowSuggestions1(false);
        setSuggestions1([]);
      } else {
        setShowSuggestions2(false);
        setSuggestions2([]);
      }
    }
  };

  const updateRow = (row, field, val, isRow1) => {
    const newVal = field === "credit" ? parseFloat(val) || 0 : val;
    if (isRow1) {
      setRow1(prev => ({ ...prev, [field]: newVal }));
    } else {
      setRow2(prev => ({ ...prev, [field]: newVal }));
    }
  };

  // Handle Enter key navigation for Row 1
  const handleRow1KeyDown = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      switch(field) {
        case 'code':
          if (row1.code && !row1.accountTitle) {
            // Try to find customer by code
            const customer = customers.find(c => c.code === row1.code);
            if (customer) {
              selectCustomer(customer, true);
            } else {
              title1Ref.current?.focus();
            }
          } else {
            title1Ref.current?.focus();
          }
          break;
        case 'title':
          if (row1.accountTitle && !row1.code) {
            const customer = customers.find(c => c.name === row1.accountTitle);
            if (customer) {
              selectCustomer(customer, true);
            } else {
              desc1Ref.current?.focus();
            }
          } else {
            desc1Ref.current?.focus();
          }
          break;
        case 'desc':
          inv1Ref.current?.focus();
          break;
        case 'inv':
          credit1Ref.current?.focus();
          break;
        case 'credit':
          // After credit amount, move to Row 2 Code field
          if (row1.accountTitle && row1.credit > 0) {
            // Auto-save row1? Or just move to next
            code2Ref.current?.focus();
          } else {
            code2Ref.current?.focus();
          }
          break;
        default:
          break;
      }
    }
  };

  // Handle Enter key navigation for Row 2
  const handleRow2KeyDown = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      switch(field) {
        case 'code':
          if (row2.code && !row2.accountTitle) {
            const customer = customers.find(c => c.code === row2.code);
            if (customer) {
              selectCustomer(customer, false);
            } else {
              title2Ref.current?.focus();
            }
          } else {
            title2Ref.current?.focus();
          }
          break;
        case 'title':
          if (row2.accountTitle && !row2.code) {
            const customer = customers.find(c => c.name === row2.accountTitle);
            if (customer) {
              selectCustomer(customer, false);
            } else {
              desc2Ref.current?.focus();
            }
          } else {
            desc2Ref.current?.focus();
          }
          break;
        case 'desc':
          inv2Ref.current?.focus();
          break;
        case 'inv':
          credit2Ref.current?.focus();
          break;
        case 'credit':
          // After credit amount, trigger save if both rows have data
          if ((row1.accountTitle && row1.credit > 0) || (row2.accountTitle && row2.credit > 0)) {
            saveAllEntries();
          }
          break;
        default:
          break;
      }
    }
  };

  const saveAllEntries = async () => {
    // Check if at least one row has customer and amount (description is optional)
    const hasRow1Data = row1.accountTitle && row1.credit > 0;
    const hasRow2Data = row2.accountTitle && row2.credit > 0;
    
    if (!hasRow1Data && !hasRow2Data) {
      showMsg("Please fill at least one entry with customer and amount", "error");
      return;
    }

    setSaving(true);
    const savedEntries = [];
    
    try {
      // Save Row 1 if filled
      if (hasRow1Data) {
        const customer = customers.find(c => 
          c.name === row1.accountTitle || c.code === row1.code
        );
        
        const payload1 = {
          invoiceNo: row1.invoiceNo || `MANUAL-${Date.now()}-1`,
          invoiceDate: date,
          customerId: customer?._id,
          customerName: row1.accountTitle,
          customerPhone: "",
          items: [{
            productId: "",
            code: row1.code,
            name: row1.description || "Manual entry",
            description: row1.description || "Manual entry",
            uom: "",
            pcs: 1,
            qty: 1,
            rate: row1.credit,
            amount: row1.credit,
          }],
          subTotal: row1.credit,
          extraDisc: 0,
          netTotal: row1.credit,
          prevBalance: 0,
          paidAmount: row1.credit,
          balance: 0,
          paymentMode: "Cash",
          saleSource: "cash",
          remarks: `Manual entry - ${row1.description || "No description"}`,
          saleType: "sale",
        };
        
        const response1 = await api.post(EP.SALES.CREATE, payload1);
        if (response1.data.success) {
          savedEntries.push({ ...row1, type: "DEBIT", description: row1.description || "Manual entry" });
        }
      }
      
      // Save Row 2 if filled
      if (hasRow2Data) {
        const customer = customers.find(c => 
          c.name === row2.accountTitle || c.code === row2.code
        );
        
        const payload2 = {
          invoiceNo: row2.invoiceNo || `MANUAL-${Date.now()}-2`,
          invoiceDate: date,
          customerId: customer?._id,
          customerName: row2.accountTitle,
          customerPhone: "",
          items: [{
            productId: "",
            code: row2.code,
            name: row2.description || "Manual entry",
            description: row2.description || "Manual entry",
            uom: "",
            pcs: 1,
            qty: 1,
            rate: row2.credit,
            amount: row2.credit,
          }],
          subTotal: row2.credit,
          extraDisc: 0,
          netTotal: row2.credit,
          prevBalance: 0,
          paidAmount: row2.credit,
          balance: 0,
          paymentMode: "Credit",
          saleSource: "credit",
          remarks: `Manual entry - ${row2.description || "No description"}`,
          saleType: "sale",
        };
        
        const response2 = await api.post(EP.SALES.CREATE, payload2);
        if (response2.data.success) {
          savedEntries.push({ ...row2, type: "CREDIT", description: row2.description || "Manual entry" });
        }
      }
      
      if (savedEntries.length > 0) {
        showMsg(`${savedEntries.length} record(s) saved successfully`, "success");
        
        // Add to entries list
        setEntries(prev => [...prev, ...savedEntries.map(e => ({ ...e, id: Date.now() + Math.random() }))]);
        
        // Reset forms
        setRow1({ ...EMPTY_ROW });
        setRow2({ ...EMPTY_ROW });
        setSuggestions1([]);
        setSuggestions2([]);
        setShowSuggestions1(false);
        setShowSuggestions2(false);
        
        await fetchSalesRecords();
        code1Ref.current?.focus();
      }
    } catch (error) {
      console.error("Save error:", error);
      showMsg("Failed to save records", "error");
    }
    setSaving(false);
  };

  const resetForm = () => {
    setRow1({ ...EMPTY_ROW });
    setRow2({ ...EMPTY_ROW });
    setEntries([]);
    setSuggestions1([]);
    setSuggestions2([]);
    setShowSuggestions1(false);
    setShowSuggestions2(false);
    setSelectedIdx1(-1);
    setSelectedIdx2(-1);
    setTimeout(() => code1Ref.current?.focus(), 50);
  };

  const calculateTotal = () => {
    return entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  };

  // Filtered sales records
  const filteredSales = salesRecords.filter(sale => {
    const saleDate = sale.invoiceDate;
    const matchesDate = saleDate >= filterStartDate && saleDate <= filterEndDate;
    const matchesAccount = !filterAccountTitle.trim() || 
      (sale.customerName?.toLowerCase().includes(filterAccountTitle.toLowerCase()));
    return matchesDate && matchesAccount;
  }).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  const totalFilteredAmount = filteredSales.reduce((sum, sale) => sum + (sale.netTotal || 0), 0);

  const renderSuggestions = (isRow1) => {
    const suggestions = isRow1 ? suggestions1 : suggestions2;
    const show = isRow1 ? showSuggestions1 : showSuggestions2;
    const selected = isRow1 ? selectedIdx1 : selectedIdx2;
    
    if (!show || suggestions.length === 0) return null;
    
    return (
      <div style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        background: "white",
        border: "2px solid #1e40af",
        borderRadius: "6px",
        maxHeight: "250px",
        overflowY: "auto",
        zIndex: 100,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
      }}>
        {suggestions.map((c, idx) => (
          <div
            key={c._id}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              background: idx === selected ? "#e5f0ff" : "white",
              borderBottom: "1px solid #eee"
            }}
            onClick={() => selectCustomer(c, isRow1)}
          >
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>
              {c.code && <span style={{ color: "#1e40af" }}>[{c.code}]</span>} {c.name}
            </div>
            <div style={{ fontSize: "10px", color: "#666" }}>
              Phone: {c.phone || "—"} | Balance: {fmt(c.currentBalance || 0)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mp-page" style={{ background: "#ffffff", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
          <path d="M9 5.5a.5.5 0 0 0-1 0V7H6.5a.5.5 0 0 0 0 1H8v1.5a.5.5 0 0 0 1 0V8h1.5a.5.5 0 0 0 0-1H9z"/>
          <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1z"/>
        </svg>
        <span className="xp-tb-title" style={{ fontSize: "13px" }}>Manual Sale Bill (Credit/Debit) — {SHOP}</span>
        <div className="xp-tb-actions">
          <button className="xp-cap-btn">─</button>
          <button className="xp-cap-btn" onClick={() => document.documentElement.requestFullscreen()}>□</button>
          <button className="xp-cap-btn xp-cap-close">✕</button>
        </div>
      </div>

      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "2px 8px 0", fontSize: "11px", padding: "4px 8px", flexShrink: 0 }}>
          {msg.text}
        </div>
      )}

      {/* Main Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px", overflow: "hidden" }}>
        
        {/* Filter Bar */}
        <div style={{ 
          background: "#f8fafc", 
          padding: "6px 10px", 
          borderRadius: "6px", 
          marginBottom: "8px",
          border: "1px solid #e5e7eb",
          flexShrink: 0,
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap"
        }}>
          <span style={{ fontWeight: "bold", fontSize: "12px" }}>📅 Filter:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <label style={{ fontSize: "10px", fontWeight: "bold" }}>From</label>
            <input type="date" style={{ width: "110px", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #ccc" }} value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <label style={{ fontSize: "10px", fontWeight: "bold" }}>To</label>
            <input type="date" style={{ width: "110px", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #ccc" }} value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, maxWidth: "250px" }}>
            <label style={{ fontSize: "10px", fontWeight: "bold" }}>Account Title</label>
            <input 
              type="text" 
              style={{ flex: 1, padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #ccc" }} 
              placeholder="Search by customer name..."
              value={filterAccountTitle} 
              onChange={(e) => setFilterAccountTitle(e.target.value)}
            />
          </div>
          <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px" }} onClick={fetchSalesRecords}>Refresh</button>
          <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px" }} onClick={resetForm}>Reset</button>
          <span style={{ marginLeft: "auto", fontWeight: "bold", fontSize: "11px" }}>
            Total: <span style={{ color: "#1e40af" }}>{fmt(totalFilteredAmount)}</span>
          </span>
        </div>

        {/* Row 1 - Debit Entry */}
        <div style={{ 
          background: "#f8fafc", 
          border: "2px solid #1e40af", 
          borderRadius: "6px", 
          padding: "8px 10px", 
          marginBottom: "8px",
          flexShrink: 0
        }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "6px", color: "#1e40af" }}>
            📝 Entry #1 (Debit Entry - Cash Sale)
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: "100px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Code</label>
              <input
                ref={code1Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#1e40af" }}
                value={row1.code}
                onChange={(e) => handleCodeChange1(e.target.value)}
                onKeyDown={(e) => {
                  handleSuggestionKeyDown(e, true);
                  handleRow1KeyDown(e, 'code');
                }}
                onFocus={() => {
                  if (row1.code) {
                    const matches = searchCustomers(row1.code);
                    setSuggestions1(matches);
                    setShowSuggestions1(matches.length > 0);
                    setActiveField1('code');
                  }
                }}
                placeholder="Customer code"
                autoComplete="off"
              />
              {activeField1 === 'code' && renderSuggestions(true)}
            </div>
            <div style={{ flex: 2, minWidth: "180px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Account Title *</label>
              <input
                ref={title1Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#1e40af" }}
                value={row1.accountTitle}
                onChange={(e) => handleTitleChange1(e.target.value)}
                onKeyDown={(e) => {
                  handleSuggestionKeyDown(e, true);
                  handleRow1KeyDown(e, 'title');
                }}
                onFocus={() => {
                  if (row1.accountTitle) {
                    const matches = searchCustomers(row1.accountTitle);
                    setSuggestions1(matches);
                    setShowSuggestions1(matches.length > 0);
                    setActiveField1('title');
                  }
                }}
                placeholder="Customer name"
                autoComplete="off"
              />
              {activeField1 === 'title' && renderSuggestions(true)}
            </div>
            <div style={{ flex: 2, minWidth: "150px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Description (Optional)</label>
              <input
                ref={desc1Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#1e40af" }}
                value={row1.description}
                onChange={(e) => updateRow(row1, "description", e.target.value, true)}
                onKeyDown={(e) => handleRow1KeyDown(e, 'desc')}
                placeholder="Optional description"
              />
            </div>
            <div style={{ flex: 1, minWidth: "100px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Invoice #</label>
              <input
                ref={inv1Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#1e40af" }}
                value={row1.invoiceNo}
                onChange={(e) => updateRow(row1, "invoiceNo", e.target.value, true)}
                onKeyDown={(e) => handleRow1KeyDown(e, 'inv')}
                placeholder="Optional"
              />
            </div>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Debit Amount (PKR) *</label>
              <input
                ref={credit1Ref}
                type="number"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", textAlign: "right", fontWeight: "bold", borderColor: "#1e40af" }}
                value={row1.credit}
                onChange={(e) => updateRow(row1, "credit", e.target.value, true)}
                onKeyDown={(e) => handleRow1KeyDown(e, 'credit')}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Row 2 - Credit Entry */}
        <div style={{ 
          background: "#f8fafc", 
          border: "2px solid #16a34a", 
          borderRadius: "6px", 
          padding: "8px 10px", 
          marginBottom: "8px",
          flexShrink: 0
        }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "6px", color: "#16a34a" }}>
            📝 Entry #2 (Credit Entry - Credit Sale)
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: "100px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Code</label>
              <input
                ref={code2Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#16a34a" }}
                value={row2.code}
                onChange={(e) => handleCodeChange2(e.target.value)}
                onKeyDown={(e) => {
                  handleSuggestionKeyDown(e, false);
                  handleRow2KeyDown(e, 'code');
                }}
                onFocus={() => {
                  if (row2.code) {
                    const matches = searchCustomers(row2.code);
                    setSuggestions2(matches);
                    setShowSuggestions2(matches.length > 0);
                    setActiveField2('code');
                  }
                }}
                placeholder="Customer code"
                autoComplete="off"
              />
              {activeField2 === 'code' && renderSuggestions(false)}
            </div>
            <div style={{ flex: 2, minWidth: "180px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Account Title *</label>
              <input
                ref={title2Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#16a34a" }}
                value={row2.accountTitle}
                onChange={(e) => handleTitleChange2(e.target.value)}
                onKeyDown={(e) => {
                  handleSuggestionKeyDown(e, false);
                  handleRow2KeyDown(e, 'title');
                }}
                onFocus={() => {
                  if (row2.accountTitle) {
                    const matches = searchCustomers(row2.accountTitle);
                    setSuggestions2(matches);
                    setShowSuggestions2(matches.length > 0);
                    setActiveField2('title');
                  }
                }}
                placeholder="Customer name"
                autoComplete="off"
              />
              {activeField2 === 'title' && renderSuggestions(false)}
            </div>
            <div style={{ flex: 2, minWidth: "150px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Description (Optional)</label>
              <input
                ref={desc2Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#16a34a" }}
                value={row2.description}
                onChange={(e) => updateRow(row2, "description", e.target.value, false)}
                onKeyDown={(e) => handleRow2KeyDown(e, 'desc')}
                placeholder="Optional description"
              />
            </div>
            <div style={{ flex: 1, minWidth: "100px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Invoice #</label>
              <input
                ref={inv2Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#16a34a" }}
                value={row2.invoiceNo}
                onChange={(e) => updateRow(row2, "invoiceNo", e.target.value, false)}
                onKeyDown={(e) => handleRow2KeyDown(e, 'inv')}
                placeholder="Optional"
              />
            </div>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Credit Amount (PKR) *</label>
              <input
                ref={credit2Ref}
                type="number"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", textAlign: "right", fontWeight: "bold", borderColor: "#16a34a" }}
                value={row2.credit}
                onChange={(e) => updateRow(row2, "credit", e.target.value, false)}
                onKeyDown={(e) => handleRow2KeyDown(e, 'credit')}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Single Save Button */}
        <div style={{ marginBottom: "8px", flexShrink: 0, textAlign: "center" }}>
          <button 
            className="xp-btn xp-btn-primary" 
            style={{ background: "#1e40af", fontSize: "13px", padding: "8px 32px", fontWeight: "bold" }} 
            onClick={saveAllEntries}
            disabled={saving}
          >
            {saving ? "Saving..." : "💾 Save All Records"}
          </button>
        </div>

        {/* Recent Entries Summary */}
        {entries.length > 0 && (
          <div style={{ marginBottom: "8px", flexShrink: 0 }}>
            <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}>📋 Recently Saved ({entries.length})</div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "4px", overflow: "auto", maxHeight: "120px" }}>
              <table style={{ width: "100%", fontSize: "10px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", position: "sticky", top: 0 }}>
                    <th style={{ width: 30, padding: "3px" }}>#</th>
                    <th style={{ width: 80, padding: "3px" }}>Code</th>
                    <th style={{ width: 120, padding: "3px" }}>Account Title</th>
                    <th style={{ padding: "3px" }}>Description</th>
                    <th style={{ width: 80, padding: "3px", textAlign: "right" }}>Amount</th>
                    <th style={{ width: 60, padding: "3px" }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(-5).reverse().map((entry, idx) => (
                    <tr key={entry.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "3px", textAlign: "center" }}>{entries.length - idx}</td>
                      <td style={{ padding: "3px", fontWeight: "bold" }}>{entry.code || "—"}</td>
                      <td style={{ padding: "3px", fontWeight: "bold" }}>{entry.accountTitle}</td>
                      <td style={{ padding: "3px" }}>{entry.description || "—"}</td>
                      <td style={{ padding: "3px", textAlign: "right", fontWeight: "bold", color: entry.type === "CREDIT" ? "#dc2626" : "#16a34a" }}>
                        {fmt(entry.credit)}
                      </td>
                      <td style={{ padding: "3px", textAlign: "center" }}>
                        <span style={{ 
                          background: entry.type === "CREDIT" ? "#fee2e2" : "#dcfce7", 
                          color: entry.type === "CREDIT" ? "#dc2626" : "#16a34a",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          fontSize: "8px",
                          fontWeight: "bold"
                        }}>
                          {entry.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sales Records Table */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}>📊 Sales Records ({filteredSales.length})</div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "4px", overflow: "auto", flex: 1 }}>
            <table style={{ width: "100%", fontSize: "10px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", position: "sticky", top: 0 }}>
                  <th style={{ width: 30, padding: "5px", textAlign: "center" }}>#</th>
                  <th style={{ width: 90, padding: "5px" }}>Invoice #</th>
                  <th style={{ width: 80, padding: "5px" }}>Date</th>
                  <th style={{ width: 100, padding: "5px" }}>Code</th>
                  <th style={{ width: 130, padding: "5px" }}>Customer</th>
                  <th style={{ width: 60, padding: "5px", textAlign: "center" }}>Type</th>
                  <th style={{ width: 85, padding: "5px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "5px" }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#999" }}>No records found for selected filters</td></tr>
                )}
                {filteredSales.map((sale, idx) => (
                  <tr key={sale._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "4px", textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ padding: "4px", fontWeight: "bold" }}>{sale.invoiceNo}</td>
                    <td style={{ padding: "4px" }}>{sale.invoiceDate}</td>
                    <td style={{ padding: "4px", fontWeight: "bold" }}>{sale.items?.[0]?.code || "—"}</td>
                    <td style={{ padding: "4px", fontWeight: "bold" }}>{sale.customerName || "—"}</td>
                    <td style={{ padding: "4px", textAlign: "center" }}>
                      <span style={{ 
                        background: sale.paymentMode === "Credit" ? "#fee2e2" : "#dcfce7",
                        color: sale.paymentMode === "Credit" ? "#dc2626" : "#16a34a",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontSize: "8px",
                        fontWeight: "bold"
                      }}>
                        {sale.paymentMode === "Credit" ? "CREDIT" : "DEBIT"}
                      </span>
                    </td>
                    <td style={{ padding: "4px", textAlign: "right", fontWeight: "bold", color: "#1e40af" }}>
                      {fmt(sale.netTotal)}
                    </td>
                    <td style={{ padding: "4px", fontSize: "9px", color: "#666" }}>
                      {sale.remarks || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredSales.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #1e40af" }}>
                    <td colSpan={6} style={{ padding: "5px", textAlign: "right" }}>Total:</td>
                    <td style={{ padding: "5px", textAlign: "right", color: "#1e40af", fontSize: "11px" }}>{fmt(totalFilteredAmount)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Command Bar */}
      <div style={{ padding: "4px 10px", background: "#f1f5f9", borderTop: "2px solid #1e40af", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
        <button className="xp-btn xp-btn-sm" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={resetForm}>🔄 Reset All</button>
        <span style={{ flex: 1, textAlign: "right", fontSize: "11px", fontWeight: "bold" }}>
          Total Saved Today: {entries.length} | Amount: {fmt(calculateTotal())}
        </span>
        <button className="xp-btn xp-btn-sm" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => window.history.back()}>✕ Close</button>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar" style={{ fontSize: "10px", padding: "2px 8px", flexShrink: 0 }}>
        <div className="xp-status-pane">Manual Sale Bill</div>
        <div className="xp-status-pane">Saved Today: {entries.length}</div>
        <div className="xp-status-pane">Records: {filteredSales.length}</div>
      </div>
    </div>
  );
}