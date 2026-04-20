// pages/ManualSalePage.jsx - Single Debit/Cash Sale Entry with Ghost Text Search & Image on Right
import { useState, useEffect, useRef } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const isoDate = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const SHOP = "Asim Electric and Electronic Store";

const EMPTY_ROW = {
  code: "",
  customerName: "",
  description: "",
  invoiceNo: "",
  amount: 0,
  confirmAmount: 0,
};

export default function ManualSalePage() {
  const [date] = useState(isoDate());
  const [customers, setCustomers] = useState([]);
  const [saleRecords, setSaleRecords] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState(isoDate());
  const [filterEndDate, setFilterEndDate] = useState(isoDate());
  const [filterCustomerName, setFilterCustomerName] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [row, setRow] = useState({ ...EMPTY_ROW });
  const [entries, setEntries] = useState([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Ghost text states for Customer Name
  const [searchQuery, setSearchQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const codeRef = useRef(null);
  const customerRef = useRef(null);
  const descRef = useRef(null);
  const invRef = useRef(null);
  const amountRef = useRef(null);
  const confirmAmountRef = useRef(null);

  useEffect(() => {
    fetchCustomers();
    fetchSaleRecords();
    setTimeout(() => codeRef.current?.focus(), 100);
  }, []);

  // Get filtered customers based on search query (for ghost text)
  const getFilteredCustomersForGhost = (query) => {
    if (!query.trim()) return [];
    const searchLower = query.toLowerCase();
    return customers.filter(c => 
      c.name?.toLowerCase().startsWith(searchLower) ||
      c.code?.toLowerCase().startsWith(searchLower)
    );
  };

  // Handle ghost text and suggestions
  useEffect(() => {
    if (!originalQuery.trim()) {
      setFilteredCustomers([]);
      setGhost("");
      return;
    }
    
    const matches = getFilteredCustomersForGhost(originalQuery);
    setFilteredCustomers(matches);
    
    if (!isNavigating && matches.length > 0 && matches[0].name) {
      const remaining = matches[0].name.slice(originalQuery.length);
      setGhost(remaining);
    } else {
      setGhost("");
    }
  }, [originalQuery, isNavigating, customers]);

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

  const fetchSaleRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.SALES.GET_ALL);
      if (data.success) {
        const sales = data.data.filter(r => r.saleType === "sale" && r.paymentMode !== "Credit");
        setSaleRecords(sales);
      }
    } catch (error) { console.error("Failed to fetch sale records:", error); }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setRow(prev => ({ ...prev, code: customer.code || "", customerName: customer.name }));
    setSearchQuery(customer.name);
    setOriginalQuery(customer.name);
    setFilteredCustomers([]);
    setGhost("");
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
    setTimeout(() => descRef.current?.focus(), 50);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setRow(prev => ({ ...prev, code: "", customerName: "" }));
    setSearchQuery("");
    setOriginalQuery("");
    setGhost("");
    setFilteredCustomers([]);
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
    codeRef.current?.focus();
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = codeRef.current?.value.trim().toUpperCase();
      if (code) {
        const found = customers.find(c => c.code?.toUpperCase() === code);
        if (found) {
          selectCustomer(found);
        } else {
          showMsg(`Customer with code "${code}" not found`, "error");
        }
      }
      customerRef.current?.focus();
    }
  };

  const handleCustomerKeyDown = (e) => {
    // Handle ghost text acceptance (Right Arrow or Tab)
    if (ghost && (e.key === "ArrowRight" || e.key === "Tab") && !isNavigating) {
      e.preventDefault();
      const fullName = originalQuery + ghost;
      setSearchQuery(fullName);
      setOriginalQuery(fullName);
      setGhost("");
      setIsNavigating(false);
      
      const matchedCustomer = filteredCustomers[0];
      if (matchedCustomer) {
        selectCustomer(matchedCustomer);
      }
      return;
    }
    
    // Handle Arrow Down
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredCustomers.length === 0) return;
      
      setIsNavigating(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = 0;
      } else {
        newIndex = selectedSuggestionIndex + 1;
        if (newIndex >= filteredCustomers.length) {
          newIndex = 0;
        }
      }
      
      setSelectedSuggestionIndex(newIndex);
      
      const selectedCustomerItem = filteredCustomers[newIndex];
      if (selectedCustomerItem) {
        setSearchQuery(selectedCustomerItem.name);
        setGhost("");
      }
      return;
    }
    
    // Handle Arrow Up
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredCustomers.length === 0) return;
      
      setIsNavigating(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = filteredCustomers.length - 1;
      } else {
        newIndex = selectedSuggestionIndex - 1;
        if (newIndex < 0) {
          newIndex = filteredCustomers.length - 1;
        }
      }
      
      setSelectedSuggestionIndex(newIndex);
      
      const selectedCustomerItem = filteredCustomers[newIndex];
      if (selectedCustomerItem) {
        setSearchQuery(selectedCustomerItem.name);
        setGhost("");
      }
      return;
    }
    
    // Handle Enter
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (selectedSuggestionIndex >= 0 && filteredCustomers[selectedSuggestionIndex]) {
        selectCustomer(filteredCustomers[selectedSuggestionIndex]);
      } else if (filteredCustomers.length > 0 && filteredCustomers[0]) {
        selectCustomer(filteredCustomers[0]);
      } else if (searchQuery.trim()) {
        // If no match found, clear the field
        clearCustomer();
      }
      return;
    }
    
    // Handle Escape
    if (e.key === "Escape") {
      e.preventDefault();
      clearCustomer();
      customerRef.current?.blur();
    }
  };

  const handleCustomerChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setOriginalQuery(newValue);
    if (selectedCustomer && newValue !== selectedCustomer.name) {
      clearCustomer();
    }
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
  };

  const updateRow = (field, val) => {
    const newVal = field === "amount" || field === "confirmAmount" ? parseFloat(val) || 0 : val;
    setRow(prev => ({ ...prev, [field]: newVal }));
  };

  const handleRowKeyDown = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      switch(field) {
        case 'code': customerRef.current?.focus(); break;
        case 'customer': descRef.current?.focus(); break;
        case 'desc': invRef.current?.focus(); break;
        case 'inv': amountRef.current?.focus(); break;
        case 'amount': confirmAmountRef.current?.focus(); break;
        case 'confirmAmount': saveSingleEntry(); break;
        default: break;
      }
    }
  };

  const saveSingleEntry = async () => {
    // Validate amount matches confirmation
    if (row.amount !== row.confirmAmount) {
      showMsg(`Sale amount does not match confirmation!`, "error");
      return;
    }
    
    if (row.amount <= 0) {
      showMsg(`Sale amount must be greater than 0`, "error");
      return;
    }

    if (!row.customerName) {
      showMsg(`Please select a customer`, "error");
      return;
    }

    setSaving(true);

    try {
      const customer = customers.find(c => c.name === row.customerName || c.code === row.code);
      const finalInvoiceNo = row.invoiceNo || `SAL-${Date.now()}`;
      const payload = {
        invoiceNo: finalInvoiceNo, invoiceDate: date, customerId: customer?._id || "",
        customerName: row.customerName, customerPhone: customer?.phone || "",
        items: [{ productId: "", code: row.code || "", name: row.description || "Cash Sale Entry", description: row.description || "Cash Sale Entry", uom: "", measurement: "", rack: "", pcs: 1, qty: 1, rate: row.amount, disc: 0, amount: row.amount }],
        subTotal: row.amount, extraDisc: 0, discAmount: 0, netTotal: row.amount, prevBalance: 0, paidAmount: row.amount, balance: 0,
        paymentMode: "Cash", saleSource: "cash", sendSms: false, printType: "Thermal",
        remarks: `Cash Sale - ${row.description || "No description"}`, saleType: "sale", type: "sale"
      };
      const response = await api.post(EP.SALES.CREATE, payload);
      if (response.data && response.data.success) {
        const savedEntry = { ...row, type: "SALE", displayType: "CASH SALE", invoiceNo: finalInvoiceNo, id: Date.now() };
        setEntries(prev => [savedEntry, ...prev]);
        clearCustomer();
        setRow({ ...EMPTY_ROW });
        setSearchQuery("");
        setOriginalQuery("");
        setGhost("");
        await fetchSaleRecords();
        codeRef.current?.focus();
        showMsg(`Cash sale saved successfully!`, "success");
      } else { 
        showMsg(`Failed: ${response.data?.message || "Unknown error"}`, "error"); 
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Network error";
      showMsg(`Sale save failed: ${errorMsg}`, "error");
    }
    setSaving(false);
  };

  const resetForm = () => {
    clearCustomer();
    setRow({ ...EMPTY_ROW });
    setEntries([]);
    setSearchQuery("");
    setOriginalQuery("");
    setGhost("");
    setFilteredCustomers([]);
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const calculateTotal = () => {
    const saleTotal = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    return { saleTotal };
  };

  const { saleTotal } = calculateTotal();

  const filteredSales = saleRecords.filter(record => {
    const recordDate = record.invoiceDate;
    const matchesDate = recordDate >= filterStartDate && recordDate <= filterEndDate;
    const matchesCustomer = !filterCustomerName.trim() || (record.customerName?.toLowerCase().includes(filterCustomerName.toLowerCase()));
    return matchesDate && matchesCustomer;
  }).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  const totalFilteredAmount = filteredSales.reduce((sum, record) => sum + (record.netTotal || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px", flexShrink: 0 }}>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>Manual Cash Sale Bill — {SHOP}</span>
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
        <div style={{ background: "#f8fafc", borderRadius: "6px", padding: "6px 10px", marginBottom: "12px", border: "1px solid #000000", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "bold", fontSize: "10px" }}>📅 Filter:</span>
            <input type="date" style={{ padding: "3px 6px", fontSize: "10px", border: "1px solid #000000", borderRadius: "3px", width: "110px" }} value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
            <span style={{ fontSize: "10px" }}>to</span>
            <input type="date" style={{ padding: "3px 6px", fontSize: "10px", border: "1px solid #000000", borderRadius: "3px", width: "110px" }} value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            <input type="text" style={{ width: "150px", padding: "3px 6px", fontSize: "10px", border: "1px solid #000000", borderRadius: "3px" }} placeholder="Customer..." value={filterCustomerName} onChange={(e) => setFilterCustomerName(e.target.value)} />
            <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }} onClick={fetchSaleRecords}>Refresh</button>
            <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }} onClick={resetForm}>Reset</button>
            <span style={{ marginLeft: "auto", fontWeight: "bold", fontSize: "10px" }}>Total: <span style={{ color: "#1e40af" }}>{fmt(totalFilteredAmount)}</span></span>
          </div>
        </div>

        {/* Main Content Area - Two column layout: 70% inputs / 30% customer image */}
        <div style={{
          background: "#ffffff",
          borderRadius: "6px",
          padding: "12px 16px",
          marginBottom: "12px",
          border: "2px solid #1e40af",
          display: "flex",
          gap: "20px",
          alignItems: "flex-start"
        }}>
          
          {/* Left side: Input fields (70%) */}
          <div style={{ flex: "7", minWidth: 0 }}>
            <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "#1e40af", background: "#dbeafe", padding: "4px 8px", borderRadius: "4px", display: "inline-block" }}>💰 DEBIT - CASH SALE</div>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 2fr 2fr 1fr 1.2fr 1.2fr", 
              gap: "10px", 
              alignItems: "end"
            }}>
              {/* CODE */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>CODE</label>
                <input 
                  ref={codeRef} 
                  type="text" 
                  style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%", background: "#fffde7", textTransform: "uppercase" }} 
                  value={row.code} 
                  onChange={(e) => setRow(prev => ({ ...prev, code: e.target.value }))}
                  onKeyDown={handleCodeKeyDown}
                  placeholder="Enter code & press Enter"
                />
              </div>
              
              {/* CUSTOMER NAME with Ghost Text */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>CUSTOMER NAME</label>
                <div style={{ position: "relative", width: "100%" }}>
                  {ghost && !isNavigating && !selectedCustomer && originalQuery && (
                    <div
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                        fontSize: "12px",
                        fontFamily: "inherit",
                        display: "flex",
                        zIndex: 2,
                        color: "#a0aec0",
                        backgroundColor: "transparent",
                      }}
                    >
                      <span style={{ visibility: "hidden" }}>{originalQuery}</span>
                      <span style={{ color: "#a0aec0" }}>{ghost}</span>
                    </div>
                  )}
                  <input
                    ref={customerRef}
                    type="text"
                    style={{ 
                      fontSize: "12px", 
                      padding: "6px 8px", 
                      border: "1px solid #000000", 
                      borderRadius: "3px", 
                      width: "100%", 
                      background: "#fffde7",
                      position: "relative",
                      zIndex: 1
                    }}
                    value={searchQuery}
                    onChange={handleCustomerChange}
                    onKeyDown={handleCustomerKeyDown}
                    placeholder="Type name - ghost text appears..."
                    autoComplete="off"
                  />
                </div>
              </div>
              
              {/* DESCRIPTION */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>DESCRIPTION</label>
                <input ref={descRef} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row.description} onChange={(e) => updateRow("description", e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, 'desc')} />
              </div>
              
              {/* INVOICE # */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>INVOICE #</label>
                <input ref={invRef} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row.invoiceNo} onChange={(e) => updateRow("invoiceNo", e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, 'inv')} />
              </div>
              
              {/* AMOUNT */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>AMOUNT (PKR)</label>
                <input ref={amountRef} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row.amount} onChange={(e) => updateRow("amount", e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, 'amount')} />
              </div>
              
              {/* CONFIRM AMOUNT */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px", color: "#dc2626" }}>CONFIRM AMOUNT</label>
                <input ref={confirmAmountRef} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "2px solid #dc2626", borderRadius: "3px", width: "100%", background: "#fef2f2" }} value={row.confirmAmount} onChange={(e) => updateRow("confirmAmount", e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, 'confirmAmount')} />
              </div>
            </div>
          </div>
          
          {/* Right side: Customer Image (30%) */}
          <div style={{ flex: "3", display: "flex", justifyContent: "flex-end", alignItems: "center", minWidth: "160px" }}>
            {selectedCustomer && selectedCustomer.imageFront ? (
              <div style={{ textAlign: "center" }}>
                <img 
                  src={selectedCustomer.imageFront} 
                  alt={selectedCustomer.name} 
                  style={{ 
                    width: "120px", 
                    height: "120px", 
                    objectFit: "cover", 
                    border: "2px solid #000000",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    borderRadius: "4px"
                  }} 
                />
                <div style={{ fontSize: "11px", marginTop: "6px", fontWeight: "bold", color: "#1e293b" }}>
                  {selectedCustomer.name}
                </div>
                {selectedCustomer.phone && (
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    📞 {selectedCustomer.phone}
                  </div>
                )}
              </div>
            ) : selectedCustomer ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ 
                  width: "120px", 
                  height: "120px", 
                  background: "#e2e8f0", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "60px", 
                  border: "2px solid #000000",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  borderRadius: "4px"
                }}>
                  👤
                </div>
                <div style={{ fontSize: "11px", marginTop: "6px", fontWeight: "bold", color: "#1e293b" }}>
                  {selectedCustomer.name}
                </div>
                {selectedCustomer.phone && (
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    📞 {selectedCustomer.phone}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "11px", fontWeight: "bold", padding: "20px" }}>
                <div style={{ 
                  width: "120px", 
                  height: "120px", 
                  background: "#f1f5f9", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "50px", 
                  border: "2px dashed #cbd5e1",
                  borderRadius: "4px",
                  marginBottom: "8px"
                }}>
                  🖼️
                </div>
                No Customer Selected
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginBottom: "12px", textAlign: "center", flexShrink: 0 }}>
          <button style={{ background: "#1e40af", color: "white", padding: "8px 28px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer" }} onClick={saveSingleEntry} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Cash Sale"}
          </button>
        </div>

        {/* Transaction Records Table */}
        <div style={{ background: "#ffffff", borderRadius: "6px", border: "2px solid #000000", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", padding: "10px 12px", background: "#f1f5f9", borderBottom: "2px solid #000000", flexShrink: 0 }}>
            📊 Cash Sale Records ({filteredSales.length})
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
                  <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && filteredSales.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No cash sale records found</td></tr>
                )}
                {!loading && filteredSales.map((record, idx) => (
                  <tr key={record._id}>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000", fontWeight: "600" }}>{idx + 1}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold", fontFamily: "monospace" }}>{record.invoiceNo}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000" }}>{record.invoiceDate}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "600" }}>{record.items?.[0]?.code || record.code || "—"}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold" }}>{record.customerName || "—"}</td>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: "bold", background: "#dbeafe", border: "1px solid #000000" }}>CASH SALE</span>
                    </td>
                    <td style={{ padding: "6px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#1e40af" }}>
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
                  {entries.slice(0, 10).map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{ padding: "4px", textAlign: "center", border: "1px solid #000000" }}>{idx + 1}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000" }}>{entry.code || "—"}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000", fontWeight: "bold" }}>{entry.customerName}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000" }}>{entry.description || "—"}</td>
                      <td style={{ padding: "4px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#1e40af" }}>{fmt(entry.amount)}</td>
                      <td style={{ padding: "4px", textAlign: "center", border: "1px solid #000000" }}>
                        <span style={{ padding: "2px 6px", borderRadius: "2px", fontSize: "9px", fontWeight: "bold", background: "#dbeafe" }}>CASH SALE</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc" }}>
                  <tr>
                    <td colSpan="4" style={{ padding: "5px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Sale Total:</td>
                    <td style={{ padding: "5px", textAlign: "right", fontWeight: "bold", color: "#1e40af", border: "1px solid #000000" }}>{fmt(saleTotal)}</td>
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
        <span style={{ flex: 1, textAlign: "right", fontSize: "11px", fontWeight: "bold" }}>Total Sales: {fmt(saleTotal)}</span>
        <button className="xp-btn xp-btn-sm" style={{ fontSize: "11px", fontWeight: "bold" }} onClick={() => window.history.back()}>✕ Close</button>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px", flexShrink: 0 }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Manual Cash Sale Bill</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Session: {entries.length}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>DB: {saleRecords.length}</div>
      </div>
    </div>
  );
}