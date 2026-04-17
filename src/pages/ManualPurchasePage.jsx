// pages/ManualPurchasePage.jsx
import { useState, useEffect, useRef } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/ManualPurchasePage.css";

const isoDate = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const SHOP = "Asim Electric and Electronic Store";

const EMPTY_ROW = {
  code: "",
  supplierName: "",
  description: "",
  invoiceNo: "",
  amount: 0,
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function ManualPurchasePage() {
  const [date, setDate] = useState(isoDate());
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState(isoDate());
  const [filterEndDate, setFilterEndDate] = useState(isoDate());
  const [filterSupplierName, setFilterSupplierName] = useState("");
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
  const supplier1Ref = useRef(null);
  const desc1Ref = useRef(null);
  const inv1Ref = useRef(null);
  const amount1Ref = useRef(null);
  
  // Refs for Row 2
  const code2Ref = useRef(null);
  const supplier2Ref = useRef(null);
  const desc2Ref = useRef(null);
  const inv2Ref = useRef(null);
  const amount2Ref = useRef(null);
  
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
    fetchSuppliers();
    fetchPurchaseRecords();
    setTimeout(() => code1Ref.current?.focus(), 100);
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        // Filter for suppliers (you may have a supplier type in your customers)
        const supplierList = data.data.filter(c => 
          (c.customerType === "supplier" || c.type === "supplier" || c.isSupplier === true)
        );
        setSuppliers(supplierList.length > 0 ? supplierList : data.data);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const fetchPurchaseRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.PURCHASE?.GET_ALL || EP.SALES.GET_ALL);
      if (data.success) {
        // Filter for purchase records (you may have a purchase type)
        const purchases = data.data.filter(r => r.saleType === "purchase" || r.paymentMode === "Purchase");
        setPurchaseRecords(purchases);
      }
    } catch (error) {
      console.error("Failed to fetch purchase records:", error);
    }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const searchSuppliers = (searchText) => {
    if (!searchText.trim()) return [];
    const q = searchText.trim().toLowerCase();
    return suppliers.filter(s => 
      s.code?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q)
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
    const matches = searchSuppliers(value);
    setSuggestions1(matches);
    setShowSuggestions1(matches.length > 0);
    setSelectedIdx1(-1);
    setActiveField1('code');
  };

  const handleSupplierChange1 = (value) => {
    setRow1(prev => ({ ...prev, supplierName: value }));
    if (!value.trim()) {
      setSuggestions1([]);
      setShowSuggestions1(false);
      return;
    }
    const matches = searchSuppliers(value);
    setSuggestions1(matches);
    setShowSuggestions1(matches.length > 0);
    setSelectedIdx1(-1);
    setActiveField1('supplier');
  };

  // Row 2 handlers
  const handleCodeChange2 = (value) => {
    setRow2(prev => ({ ...prev, code: value }));
    if (!value.trim()) {
      setSuggestions2([]);
      setShowSuggestions2(false);
      return;
    }
    const matches = searchSuppliers(value);
    setSuggestions2(matches);
    setShowSuggestions2(matches.length > 0);
    setSelectedIdx2(-1);
    setActiveField2('code');
  };

  const handleSupplierChange2 = (value) => {
    setRow2(prev => ({ ...prev, supplierName: value }));
    if (!value.trim()) {
      setSuggestions2([]);
      setShowSuggestions2(false);
      return;
    }
    const matches = searchSuppliers(value);
    setSuggestions2(matches);
    setShowSuggestions2(matches.length > 0);
    setSelectedIdx2(-1);
    setActiveField2('supplier');
  };

  const selectSupplier = (supplier, isRow1) => {
    if (isRow1) {
      setRow1(prev => ({ 
        ...prev, 
        code: supplier.code || "",
        supplierName: supplier.name
      }));
      setSuggestions1([]);
      setShowSuggestions1(false);
      setTimeout(() => desc1Ref.current?.focus(), 50);
    } else {
      setRow2(prev => ({ 
        ...prev, 
        code: supplier.code || "",
        supplierName: supplier.name
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
      selectSupplier(suggestions[selected], isRow1);
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
    const newVal = field === "amount" ? parseFloat(val) || 0 : val;
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
          if (row1.code && !row1.supplierName) {
            const supplier = suppliers.find(s => s.code === row1.code);
            if (supplier) {
              selectSupplier(supplier, true);
            } else {
              supplier1Ref.current?.focus();
            }
          } else {
            supplier1Ref.current?.focus();
          }
          break;
        case 'supplier':
          if (row1.supplierName && !row1.code) {
            const supplier = suppliers.find(s => s.name === row1.supplierName);
            if (supplier) {
              selectSupplier(supplier, true);
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
          amount1Ref.current?.focus();
          break;
        case 'amount':
          if (row1.supplierName && row1.amount > 0) {
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
          if (row2.code && !row2.supplierName) {
            const supplier = suppliers.find(s => s.code === row2.code);
            if (supplier) {
              selectSupplier(supplier, false);
            } else {
              supplier2Ref.current?.focus();
            }
          } else {
            supplier2Ref.current?.focus();
          }
          break;
        case 'supplier':
          if (row2.supplierName && !row2.code) {
            const supplier = suppliers.find(s => s.name === row2.supplierName);
            if (supplier) {
              selectSupplier(supplier, false);
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
          amount2Ref.current?.focus();
          break;
        case 'amount':
          if ((row1.supplierName && row1.amount > 0) || (row2.supplierName && row2.amount > 0)) {
            saveAllEntries();
          }
          break;
        default:
          break;
      }
    }
  };

  const saveAllEntries = async () => {
    const hasRow1Data = row1.supplierName && row1.amount > 0;
    const hasRow2Data = row2.supplierName && row2.amount > 0;
    
    if (!hasRow1Data && !hasRow2Data) {
      showMsg("Please fill at least one entry with supplier and amount", "error");
      return;
    }

    setSaving(true);
    const savedEntries = [];
    
    try {
      if (hasRow1Data) {
        const supplier = suppliers.find(s => 
          s.name === row1.supplierName || s.code === row1.code
        );
        
        const payload1 = {
          invoiceNo: row1.invoiceNo || `PURCHASE-${Date.now()}-1`,
          invoiceDate: date,
          customerId: supplier?._id,
          customerName: row1.supplierName,
          customerPhone: "",
          items: [{
            productId: "",
            code: row1.code,
            name: row1.description || "Purchase entry",
            description: row1.description || "Purchase entry",
            uom: "",
            pcs: 1,
            qty: 1,
            rate: row1.amount,
            amount: row1.amount,
          }],
          subTotal: row1.amount,
          extraDisc: 0,
          netTotal: row1.amount,
          prevBalance: 0,
          paidAmount: row1.amount,
          balance: 0,
          paymentMode: "Purchase",
          saleSource: "purchase",
          remarks: `Purchase entry - ${row1.description || "No description"}`,
          saleType: "purchase",
        };
        
        const response1 = await api.post(EP.SALES.CREATE, payload1);
        if (response1.data.success) {
          savedEntries.push({ ...row1, type: "PURCHASE" });
        }
      }
      
      if (hasRow2Data) {
        const supplier = suppliers.find(s => 
          s.name === row2.supplierName || s.code === row2.code
        );
        
        const payload2 = {
          invoiceNo: row2.invoiceNo || `PURCHASE-${Date.now()}-2`,
          invoiceDate: date,
          customerId: supplier?._id,
          customerName: row2.supplierName,
          customerPhone: "",
          items: [{
            productId: "",
            code: row2.code,
            name: row2.description || "Purchase entry",
            description: row2.description || "Purchase entry",
            uom: "",
            pcs: 1,
            qty: 1,
            rate: row2.amount,
            amount: row2.amount,
          }],
          subTotal: row2.amount,
          extraDisc: 0,
          netTotal: row2.amount,
          prevBalance: 0,
          paidAmount: row2.amount,
          balance: 0,
          paymentMode: "Purchase",
          saleSource: "purchase",
          remarks: `Purchase entry - ${row2.description || "No description"}`,
          saleType: "purchase",
        };
        
        const response2 = await api.post(EP.SALES.CREATE, payload2);
        if (response2.data.success) {
          savedEntries.push({ ...row2, type: "PURCHASE" });
        }
      }
      
      if (savedEntries.length > 0) {
        showMsg(`${savedEntries.length} purchase record(s) saved successfully`, "success");
        
        setEntries(prev => [...prev, ...savedEntries.map(e => ({ ...e, id: Date.now() + Math.random() }))]);
        
        setRow1({ ...EMPTY_ROW });
        setRow2({ ...EMPTY_ROW });
        setSuggestions1([]);
        setSuggestions2([]);
        setShowSuggestions1(false);
        setShowSuggestions2(false);
        
        await fetchPurchaseRecords();
        code1Ref.current?.focus();
      }
    } catch (error) {
      console.error("Save error:", error);
      showMsg("Failed to save purchase records", "error");
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
    return entries.reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const filteredPurchases = purchaseRecords.filter(purchase => {
    const purchaseDate = purchase.invoiceDate;
    const matchesDate = purchaseDate >= filterStartDate && purchaseDate <= filterEndDate;
    const matchesSupplier = !filterSupplierName.trim() || 
      (purchase.customerName?.toLowerCase().includes(filterSupplierName.toLowerCase()));
    return matchesDate && matchesSupplier;
  }).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  const totalFilteredAmount = filteredPurchases.reduce((sum, purchase) => sum + (purchase.netTotal || 0), 0);

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
        {suggestions.map((s, idx) => (
          <div
            key={s._id}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              background: idx === selected ? "#e5f0ff" : "white",
              borderBottom: "1px solid #eee"
            }}
            onClick={() => selectSupplier(s, isRow1)}
          >
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>
              {s.code && <span style={{ color: "#1e40af" }}>[{s.code}]</span>} {s.name}
            </div>
            <div style={{ fontSize: "10px", color: "#666" }}>
              Phone: {s.phone || "—"} | Balance: {fmt(s.currentBalance || 0)}
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
          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7z"/>
        </svg>
        <span className="xp-tb-title" style={{ fontSize: "13px" }}>Manual Purchase Bill — {SHOP}</span>
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
            <label style={{ fontSize: "10px", fontWeight: "bold" }}>Supplier Name</label>
            <input 
              type="text" 
              style={{ flex: 1, padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #ccc" }} 
              placeholder="Search by supplier..."
              value={filterSupplierName} 
              onChange={(e) => setFilterSupplierName(e.target.value)}
            />
          </div>
          <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px" }} onClick={fetchPurchaseRecords}>Refresh</button>
          <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px" }} onClick={resetForm}>Reset</button>
          <span style={{ marginLeft: "auto", fontWeight: "bold", fontSize: "11px" }}>
            Total: <span style={{ color: "#1e40af" }}>{fmt(totalFilteredAmount)}</span>
          </span>
        </div>

        {/* Row 1 - Purchase Entry */}
        <div style={{ 
          background: "#f8fafc", 
          border: "2px solid #1e40af", 
          borderRadius: "6px", 
          padding: "8px 10px", 
          marginBottom: "8px",
          flexShrink: 0
        }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "6px", color: "#1e40af" }}>
            📝 Entry #1 (Purchase Entry)
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: "100px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Supplier Code</label>
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
                    const matches = searchSuppliers(row1.code);
                    setSuggestions1(matches);
                    setShowSuggestions1(matches.length > 0);
                    setActiveField1('code');
                  }
                }}
                placeholder="Supplier code"
                autoComplete="off"
              />
              {activeField1 === 'code' && renderSuggestions(true)}
            </div>
            <div style={{ flex: 2, minWidth: "180px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Supplier Name *</label>
              <input
                ref={supplier1Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#1e40af" }}
                value={row1.supplierName}
                onChange={(e) => handleSupplierChange1(e.target.value)}
                onKeyDown={(e) => {
                  handleSuggestionKeyDown(e, true);
                  handleRow1KeyDown(e, 'supplier');
                }}
                onFocus={() => {
                  if (row1.supplierName) {
                    const matches = searchSuppliers(row1.supplierName);
                    setSuggestions1(matches);
                    setShowSuggestions1(matches.length > 0);
                    setActiveField1('supplier');
                  }
                }}
                placeholder="Supplier name"
                autoComplete="off"
              />
              {activeField1 === 'supplier' && renderSuggestions(true)}
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
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Purchase Amount (PKR) *</label>
              <input
                ref={amount1Ref}
                type="number"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", textAlign: "right", fontWeight: "bold", borderColor: "#1e40af" }}
                value={row1.amount}
                onChange={(e) => updateRow(row1, "amount", e.target.value, true)}
                onKeyDown={(e) => handleRow1KeyDown(e, 'amount')}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Row 2 - Purchase Entry */}
        <div style={{ 
          background: "#f8fafc", 
          border: "2px solid #16a34a", 
          borderRadius: "6px", 
          padding: "8px 10px", 
          marginBottom: "8px",
          flexShrink: 0
        }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "6px", color: "#16a34a" }}>
            📝 Entry #2 (Purchase Entry)
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: "100px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Supplier Code</label>
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
                    const matches = searchSuppliers(row2.code);
                    setSuggestions2(matches);
                    setShowSuggestions2(matches.length > 0);
                    setActiveField2('code');
                  }
                }}
                placeholder="Supplier code"
                autoComplete="off"
              />
              {activeField2 === 'code' && renderSuggestions(false)}
            </div>
            <div style={{ flex: 2, minWidth: "180px", position: "relative" }}>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Supplier Name *</label>
              <input
                ref={supplier2Ref}
                type="text"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", borderColor: "#16a34a" }}
                value={row2.supplierName}
                onChange={(e) => handleSupplierChange2(e.target.value)}
                onKeyDown={(e) => {
                  handleSuggestionKeyDown(e, false);
                  handleRow2KeyDown(e, 'supplier');
                }}
                onFocus={() => {
                  if (row2.supplierName) {
                    const matches = searchSuppliers(row2.supplierName);
                    setSuggestions2(matches);
                    setShowSuggestions2(matches.length > 0);
                    setActiveField2('supplier');
                  }
                }}
                placeholder="Supplier name"
                autoComplete="off"
              />
              {activeField2 === 'supplier' && renderSuggestions(false)}
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
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>Purchase Amount (PKR) *</label>
              <input
                ref={amount2Ref}
                type="number"
                className="xp-input"
                style={{ fontSize: "11px", padding: "5px", textAlign: "right", fontWeight: "bold", borderColor: "#16a34a" }}
                value={row2.amount}
                onChange={(e) => updateRow(row2, "amount", e.target.value, false)}
                onKeyDown={(e) => handleRow2KeyDown(e, 'amount')}
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
            {saving ? "Saving..." : "💾 Save All Purchase Records"}
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
                    <th style={{ width: 120, padding: "3px" }}>Supplier Name</th>
                    <th style={{ padding: "3px" }}>Description</th>
                    <th style={{ width: 80, padding: "3px", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(-5).reverse().map((entry, idx) => (
                    <tr key={entry.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "3px", textAlign: "center" }}>{entries.length - idx}</td>
                      <td style={{ padding: "3px", fontWeight: "bold" }}>{entry.code || "—"}</td>
                      <td style={{ padding: "3px", fontWeight: "bold" }}>{entry.supplierName}</td>
                      <td style={{ padding: "3px" }}>{entry.description || "—"}</td>
                      <td style={{ padding: "3px", textAlign: "right", fontWeight: "bold", color: "#1e40af" }}>
                        {fmt(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Purchase Records Table */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}>📊 Purchase Records ({filteredPurchases.length})</div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "4px", overflow: "auto", flex: 1 }}>
            <table style={{ width: "100%", fontSize: "10px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", position: "sticky", top: 0 }}>
                  <th style={{ width: 30, padding: "5px", textAlign: "center" }}>#</th>
                  <th style={{ width: 90, padding: "5px" }}>Invoice #</th>
                  <th style={{ width: 80, padding: "5px" }}>Date</th>
                  <th style={{ width: 100, padding: "5px" }}>Code</th>
                  <th style={{ width: 150, padding: "5px" }}>Supplier</th>
                  <th style={{ width: 85, padding: "5px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "5px" }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#999" }}>No purchase records found for selected filters</td></tr>
                )}
                {filteredPurchases.map((purchase, idx) => (
                  <tr key={purchase._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "4px", textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ padding: "4px", fontWeight: "bold" }}>{purchase.invoiceNo}</td>
                    <td style={{ padding: "4px" }}>{purchase.invoiceDate}</td>
                    <td style={{ padding: "4px", fontWeight: "bold" }}>{purchase.items?.[0]?.code || "—"}</td>
                    <td style={{ padding: "4px", fontWeight: "bold" }}>{purchase.customerName || "—"}</td>
                    <td style={{ padding: "4px", textAlign: "right", fontWeight: "bold", color: "#1e40af" }}>
                      {fmt(purchase.netTotal)}
                    </td>
                    <td style={{ padding: "4px", fontSize: "9px", color: "#666" }}>
                      {purchase.remarks || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredPurchases.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #1e40af" }}>
                    <td colSpan={5} style={{ padding: "5px", textAlign: "right" }}>Total:</td>
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
        <div className="xp-status-pane">Manual Purchase Bill</div>
        <div className="xp-status-pane">Saved Today: {entries.length}</div>
        <div className="xp-status-pane">Records: {filteredPurchases.length}</div>
      </div>
    </div>
  );
}