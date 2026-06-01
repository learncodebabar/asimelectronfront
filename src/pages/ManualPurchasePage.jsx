// pages/ManualPurchasePage.jsx - Single Purchase Entry with Ghost Text Search, Large Image & Print Receipt
import { useState, useEffect, useRef } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";

const isoDate = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-PK");

// SHOP INFORMATION
const SHOP = "DGS and Electronic Store";
const SHOP_ADDR = "Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad";
const SHOP_PHONE = "0300 7262129, 041 8711575, 0315 7262129";
const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
const GOOGLE_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&amp;display=swap" rel="stylesheet">`;

const EMPTY_ROW = {
  code: "",
  supplierName: "",
  description: "",
  invoiceNo: "",
  amount: 0,
  confirmAmount: 0,
};

// Print receipt function
const printPurchaseReceipt = (purchaseData) => {
  const printDateTime = new Date().toLocaleString("en-PK", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const receiptHtml = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Purchase Receipt - ${purchaseData.invoiceNo}</title>
    ${GOOGLE_FONT_LINK}
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        font-size: 9px; 
        width: 80mm; 
        margin: 0 auto; 
        padding: 2mm 2mm; 
        color: #000;
      }
      .urdu { font-family: ${URDU_FONT}; direction: rtl; text-align: center; }
      .shop-urdu { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; font-family: ${URDU_FONT}; direction: rtl; }
      .shop-name-en { font-size: 8px; font-weight: bold; text-align: center; margin-bottom: 1px; }
      .shop-addr { font-size: 7.5px; text-align: center; margin-bottom: 1px; font-family: ${URDU_FONT}; direction: rtl; line-height: 1.3; }
      .shop-phones { font-size: 7.5px; text-align: center; font-weight: bold; margin-bottom: 2px; }
      .banner { background: #555; color: #fff; font-size: 7px; text-align: center; padding: 2px; margin: 2px 0; font-family: ${URDU_FONT}; direction: rtl; line-height: 1.5; }
      .receipt-title { text-align: center; font-size: 12px; font-weight: bold; margin: 5px 0; padding: 3px; background: #dc2626; color: white; }
      .meta-row { display: flex; justify-content: space-between; font-size: 8px; margin: 2px 0; }
      .divider-dash { border: none; border-top: 1px dashed #666; margin: 2px 0; }
      .divider-solid { border: none; border-top: 1.5px solid #000; margin: 2px 0; }
      .divider-dots { border: none; border-top: 1px dotted #888; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; }
      thead tr { border-bottom: 1px solid #000; }
      th { font-size: 7px; font-weight: bold; padding: 2px 1px; text-align: left; }
      th.r { text-align: right; }
      td { padding: 2px 1px; font-size: 8px; vertical-align: top; }
      .sum-row { display: flex; justify-content: space-between; font-size: 8.5px; padding: 1px 0; }
      .sum-row.bold { font-weight: bold; font-size: 9.5px; margin-top: 2px; }
      .sum-row.sep { border-top: 1px dashed #555; margin-top: 2px; padding-top: 2px; }
      .red { color: #b00; }
      .green { color: #060; }
      .totals-box { margin-top: 2px; }
      .terms { font-family: ${URDU_FONT}; direction: rtl; font-size: 7.5px; color: #333; border-top: 1px dashed #999; padding: 3px; margin-top: 3px; line-height: 1.6; text-align: right; }
      .devby { text-align: center; font-size: 6.5px; color: #777; margin-top: 3px; border-top: 1px dotted #ccc; padding-top: 2px; }
      .thankyou { text-align: center; font-size: 8px; font-weight: bold; margin: 3px 0; color: #1e40af; }
      @media print { @page { size: 80mm auto; margin: 0.5mm; } body { width: 79mm; } }
    </style>
  </head>
  <body>
    <div class="shop-urdu">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
    <div class="shop-name-en">${SHOP}</div>
    <div class="shop-addr">${SHOP_ADDR}</div>
    <div class="shop-phones">Tel: ${SHOP_PHONE}</div>
    <div class="banner">الیکٹریکل و الیکٹرانکس اشیاء، پنکھے، موٹر، وائرنگ مواد، ایل ای ڈی بلب اور دیگر تمام اشیاء</div>
    
    <div class="receipt-title">📥 PURCHASE RECEIPT</div>
    
    <div class="divider-dash"></div>
    
    <div class="meta-row">
      <span><b>Invoice #:</b> ${purchaseData.invoiceNo}</span>
      <span><b>Date:</b> ${purchaseData.date}</span>
    </div>
    <div class="meta-row">
      <span><b>Supplier:</b> ${purchaseData.supplierName}</span>
    </div>
    ${purchaseData.supplierPhone ? `<div class="meta-row"><span><b>Phone:</b> ${purchaseData.supplierPhone}</span></div>` : ""}
    ${purchaseData.code ? `<div class="meta-row"><span><b>Code:</b> ${purchaseData.code}</span></div>` : ""}
    
    <div class="divider-dots"></div>
    
    <table>
      <thead>
        <tr>
          <th style="width:25px">#</th>
          <th>Description</th>
          <th style="width:40px;text-align:center">Qty</th>
          <th style="width:50px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align:center">1</td>
          <td>${purchaseData.description || "Purchase Entry"}</td>
          <td style="text-align:center">1</td>
          <td style="text-align:right"><b>PKR ${fmt(purchaseData.amount)}</b></td>
        </tr>
      </tbody>
    </table>
    
    <div class="divider-dash"></div>
    
    <div class="totals-box">
      <div class="sum-row bold sep">
        <span>TOTAL AMOUNT:</span>
        <span>PKR ${fmt(purchaseData.amount)}</span>
      </div>
    </div>
    
    <div class="thankyou">★ شکرت‌ا ★</div>
    <div class="terms">
      براہ کرم خریداری کے بعد چیک کرلیں<br>
      بدلا ہوا سامان واپس نہیں لیا جائے گا<br>
      شکایت کی صورت میں 7 دن میں رابطہ کریں
    </div>
    <div class="devby">Developed by: Creative Babar / 03098325271 | www.digitalglobalschool.com</div>
    <div class="devby">Printed: ${printDateTime}</div>
  </body>
  </html>`;
  
  const printWindow = window.open("", "_blank", "width=420,height=640");
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

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
  
  const [row, setRow] = useState({ ...EMPTY_ROW });
  const [entries, setEntries] = useState([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Ghost text states for Supplier Name
  const [searchQuery, setSearchQuery] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [ghost, setGhost] = useState("");
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const codeRef = useRef(null);
  const supplierRef = useRef(null);
  const descRef = useRef(null);
  const invRef = useRef(null);
  const amountRef = useRef(null);
  const confirmAmountRef = useRef(null);

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseRecords();
    setTimeout(() => codeRef.current?.focus(), 100);
  }, []);

  // Get filtered suppliers based on search query (for ghost text)
  const getFilteredSuppliersForGhost = (query) => {
    if (!query.trim()) return [];
    const searchLower = query.toLowerCase();
    return suppliers.filter(s => 
      s.name?.toLowerCase().startsWith(searchLower) ||
      s.code?.toLowerCase().startsWith(searchLower)
    );
  };

  // Handle ghost text and suggestions
  useEffect(() => {
    if (!originalQuery.trim()) {
      setFilteredSuppliers([]);
      setGhost("");
      return;
    }
    
    const matches = getFilteredSuppliersForGhost(originalQuery);
    setFilteredSuppliers(matches);
    
    if (!isNavigating && matches.length > 0 && matches[0].name) {
      const remaining = matches[0].name.slice(originalQuery.length);
      setGhost(remaining);
    } else {
      setGhost("");
    }
  }, [originalQuery, isNavigating, suppliers]);

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        const supplierList = data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          const isNotCreditCustomer = type !== "credit";
          const isSupplier = type === "supplier";
          return isSupplier || (isNotCreditCustomer && c.name && c.name.trim() !== "");
        });
        setSuppliers(supplierList);
        console.log("Suppliers loaded:", supplierList.length);
      }
    } catch (error) { 
      console.error("Failed to fetch suppliers:", error); 
      showMsg("Failed to load suppliers", "error");
    }
  };

  const fetchPurchaseRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.SALES.GET_ALL);
      if (data.success) {
        const purchases = data.data.filter(r => r.saleType === "purchase");
        setPurchaseRecords(purchases);
      }
    } catch (error) { console.error("Failed to fetch purchase records:", error); }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const selectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setRow(prev => ({ ...prev, code: supplier.code || "", supplierName: supplier.name }));
    setSearchQuery(supplier.name);
    setOriginalQuery(supplier.name);
    setFilteredSuppliers([]);
    setGhost("");
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
    setTimeout(() => descRef.current?.focus(), 50);
    showMsg(`Supplier selected: ${supplier.name}`, "success");
  };

  const clearSupplier = () => {
    setSelectedSupplier(null);
    setRow(prev => ({ ...prev, code: "", supplierName: "" }));
    setSearchQuery("");
    setOriginalQuery("");
    setGhost("");
    setFilteredSuppliers([]);
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
    codeRef.current?.focus();
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = codeRef.current?.value.trim().toUpperCase();
      if (code) {
        const found = suppliers.find(s => s.code?.toUpperCase() === code);
        if (found) {
          selectSupplier(found);
        } else {
          showMsg(`Supplier with code "${code}" not found`, "error");
        }
      }
      supplierRef.current?.focus();
    }
  };

  const handleSupplierKeyDown = (e) => {
    if (ghost && (e.key === "ArrowRight" || e.key === "Tab") && !isNavigating) {
      e.preventDefault();
      const fullName = originalQuery + ghost;
      setSearchQuery(fullName);
      setOriginalQuery(fullName);
      setGhost("");
      setIsNavigating(false);
      
      const matchedSupplier = filteredSuppliers[0];
      if (matchedSupplier) {
        selectSupplier(matchedSupplier);
      }
      return;
    }
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredSuppliers.length === 0) return;
      
      setIsNavigating(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = 0;
      } else {
        newIndex = selectedSuggestionIndex + 1;
        if (newIndex >= filteredSuppliers.length) {
          newIndex = 0;
        }
      }
      
      setSelectedSuggestionIndex(newIndex);
      
      const selectedSupplierItem = filteredSuppliers[newIndex];
      if (selectedSupplierItem) {
        setSearchQuery(selectedSupplierItem.name);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredSuppliers.length === 0) return;
      
      setIsNavigating(true);
      
      let newIndex;
      if (selectedSuggestionIndex === -1) {
        newIndex = filteredSuppliers.length - 1;
      } else {
        newIndex = selectedSuggestionIndex - 1;
        if (newIndex < 0) {
          newIndex = filteredSuppliers.length - 1;
        }
      }
      
      setSelectedSuggestionIndex(newIndex);
      
      const selectedSupplierItem = filteredSuppliers[newIndex];
      if (selectedSupplierItem) {
        setSearchQuery(selectedSupplierItem.name);
        setGhost("");
      }
      return;
    }
    
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (selectedSuggestionIndex >= 0 && filteredSuppliers[selectedSuggestionIndex]) {
        selectSupplier(filteredSuppliers[selectedSuggestionIndex]);
      } else if (filteredSuppliers.length > 0 && filteredSuppliers[0]) {
        selectSupplier(filteredSuppliers[0]);
      } else if (searchQuery.trim()) {
        clearSupplier();
      }
      return;
    }
    
    if (e.key === "Escape") {
      e.preventDefault();
      clearSupplier();
      supplierRef.current?.blur();
    }
  };

  const handleSupplierChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setOriginalQuery(newValue);
    if (selectedSupplier && newValue !== selectedSupplier.name) {
      clearSupplier();
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
        case 'code': supplierRef.current?.focus(); break;
        case 'supplier': descRef.current?.focus(); break;
        case 'desc': invRef.current?.focus(); break;
        case 'inv': amountRef.current?.focus(); break;
        case 'amount': confirmAmountRef.current?.focus(); break;
        case 'confirmAmount': saveSingleEntry(); break;
        default: break;
      }
    }
  };

  const saveSingleEntry = async () => {
    if (row.amount !== row.confirmAmount) {
      showMsg(`Purchase amount does not match confirmation!`, "error");
      return;
    }
    
    if (row.amount <= 0) {
      showMsg(`Purchase amount must be greater than 0`, "error");
      return;
    }

    if (!row.supplierName) {
      showMsg(`Please select a supplier`, "error");
      return;
    }

    setSaving(true);

    try {
      const supplier = suppliers.find(s => s.name === row.supplierName || s.code === row.code);
      const finalInvoiceNo = row.invoiceNo || `PUR-${Date.now()}`;
      const payload = {
        invoiceNo: finalInvoiceNo, invoiceDate: date, customerId: supplier?._id || "",
        customerName: row.supplierName, customerPhone: supplier?.phone || "",
        items: [{ productId: "", code: row.code || "", name: row.description || "Purchase Entry", description: row.description || "Purchase Entry", uom: "", measurement: "", rack: "", pcs: 1, qty: 1, rate: row.amount, disc: 0, amount: row.amount }],
        subTotal: row.amount, extraDisc: 0, discAmount: 0, netTotal: row.amount, prevBalance: 0, paidAmount: row.amount, balance: 0,
        paymentMode: "Cash", saleSource: "purchase", sendSms: false, printType: "Thermal",
        remarks: `Purchase - ${row.description || "No description"}`, saleType: "purchase", type: "sale"
      };
      const response = await api.post(EP.SALES.CREATE, payload);
      if (response.data && response.data.success) {
        const savedEntry = { 
          ...row, 
          type: "PURCHASE", 
          displayType: "PURCHASE", 
          invoiceNo: finalInvoiceNo, 
          id: Date.now(),
          date: date,
          supplierPhone: supplier?.phone || ""
        };
        setEntries(prev => [savedEntry, ...prev]);
        
        // Print receipt after successful save
        printPurchaseReceipt(savedEntry);
        
        clearSupplier();
        setRow({ ...EMPTY_ROW });
        setSearchQuery("");
        setOriginalQuery("");
        setGhost("");
        await fetchPurchaseRecords();
        codeRef.current?.focus();
        showMsg(`Purchase saved successfully!`, "success");
      } else { 
        showMsg(`Failed: ${response.data?.message || "Unknown error"}`, "error"); 
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Network error";
      showMsg(`Purchase save failed: ${errorMsg}`, "error");
    }
    setSaving(false);
  };

  const resetForm = () => {
    clearSupplier();
    setRow({ ...EMPTY_ROW });
    setEntries([]);
    setSearchQuery("");
    setOriginalQuery("");
    setGhost("");
    setFilteredSuppliers([]);
    setSelectedSuggestionIndex(-1);
    setIsNavigating(false);
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const reprintReceipt = (entry) => {
    const reprintData = {
      ...entry,
      date: isoDate(),
      supplierPhone: entry.supplierPhone || "—"
    };
    printPurchaseReceipt(reprintData);
  };

  const calculateTotal = () => {
    const purchaseTotal = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    return { purchaseTotal };
  };

  const { purchaseTotal } = calculateTotal();

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
            <input type="text" style={{ width: "150px", padding: "3px 6px", fontSize: "10px", border: "1px solid #000000", borderRadius: "3px" }} placeholder="Supplier..." value={filterSupplierName} onChange={(e) => setFilterSupplierName(e.target.value)} />
            <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }} onClick={fetchPurchaseRecords}>Refresh</button>
            <button className="xp-btn xp-btn-sm" style={{ padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }} onClick={resetForm}>Reset</button>
            <span style={{ marginLeft: "auto", fontWeight: "bold", fontSize: "10px" }}>Total: <span style={{ color: "#1e40af" }}>{fmt(totalFilteredAmount)}</span></span>
          </div>
        </div>

        {/* Main Content Area - Title and Large Image in same row */}
        <div style={{
          background: "#ffffff",
          borderRadius: "6px",
          padding: "12px 16px",
          marginBottom: "12px",
          border: "2px solid #1e40af"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "12px", color: "#1e40af", background: "#dbeafe", padding: "4px 8px", borderRadius: "4px", display: "inline-block" }}>
              📥 PURCHASE - DEBIT (Money OUT)
            </div>
            
            {selectedSupplier && (
              <div style={{ textAlign: "center" }}>
                {selectedSupplier.imageFront ? (
                  <img 
                    src={selectedSupplier.imageFront} 
                    alt={selectedSupplier.name} 
                    style={{ 
                      width: "100px", 
                      height: "100px", 
                      objectFit: "cover", 
                      border: "3px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }} 
                  />
                ) : (
                  <div style={{ 
                    width: "100px", 
                    height: "100px", 
                    background: "#e2e8f0", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "50px", 
                    border: "3px solid #000000",
                    borderRadius: "8px"
                  }}>
                    🏭
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "80px 1fr 1fr 80px 100px 100px", 
            gap: "10px", 
            alignItems: "end"
          }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>CODE</label>
              <input 
                ref={codeRef} 
                type="text" 
                style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%", background: "#fffde7", textTransform: "uppercase" }} 
                value={row.code} 
                onChange={(e) => setRow(prev => ({ ...prev, code: e.target.value }))}
                onKeyDown={handleCodeKeyDown}
              />
            </div>
            
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>SUPPLIER NAME</label>
              <div style={{ position: "relative", width: "100%" }}>
                {ghost && !isNavigating && !selectedSupplier && originalQuery && (
                  <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", whiteSpace: "nowrap", fontSize: "12px", display: "flex", zIndex: 2, color: "#a0aec0" }}>
                    <span style={{ visibility: "hidden" }}>{originalQuery}</span>
                    <span>{ghost}</span>
                  </div>
                )}
                <input
                  ref={supplierRef}
                  type="text"
                  style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%", background: "#fffde7", position: "relative", zIndex: 1 }}
                  value={searchQuery}
                  onChange={handleSupplierChange}
                  onKeyDown={handleSupplierKeyDown}
                  autoComplete="off"
                  placeholder="Type supplier name or code..."
                />
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>DESCRIPTION</label>
              <input ref={descRef} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row.description} onChange={(e) => updateRow("description", e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, 'desc')} placeholder="Purchase description..." />
            </div>
            
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>INVOICE #</label>
              <input ref={invRef} type="text" style={{ fontSize: "12px", padding: "6px 8px", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row.invoiceNo} onChange={(e) => updateRow("invoiceNo", e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, 'inv')} placeholder="Optional" />
            </div>
            
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px" }}>AMOUNT</label>
              <input ref={amountRef} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "1px solid #000000", borderRadius: "3px", width: "100%" }} value={row.amount} onChange={(e) => updateRow("amount", e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, 'amount')} placeholder="0" />
            </div>
            
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "2px", color: "#dc2626" }}>CONFIRM</label>
              <input ref={confirmAmountRef} type="number" style={{ fontSize: "13px", fontWeight: "bold", padding: "6px 8px", textAlign: "right", border: "2px solid #dc2626", borderRadius: "3px", width: "100%", background: "#fef2f2" }} value={row.confirmAmount} onChange={(e) => updateRow("confirmAmount", e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, 'confirmAmount')} placeholder="0" />
            </div>
          </div>
          
          {selectedSupplier && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderRadius: "4px", border: "1px solid #000000", marginTop: "10px" }}>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                <strong>{selectedSupplier.name}</strong> | Code: {selectedSupplier.code || "—"} | Phone: {selectedSupplier.phone || "—"} | Balance: <span style={{ fontWeight: "bold", color: (selectedSupplier.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>PKR {fmt(selectedSupplier.currentBalance || 0)}</span>
              </div>
              <button onClick={clearSupplier} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", padding: "3px 10px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>CLEAR</button>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div style={{ marginBottom: "12px", textAlign: "center", flexShrink: 0 }}>
          <button style={{ background: "#1e40af", color: "white", padding: "8px 28px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer" }} onClick={saveSingleEntry} disabled={saving}>
            {saving ? "Saving..." : "💾 Save & Print Receipt"}
          </button>
        </div>

        {/* Purchase Records Table with Reprint Button */}
        <div style={{ background: "#ffffff", borderRadius: "6px", border: "2px solid #000000", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", padding: "10px 12px", background: "#f1f5f9", borderBottom: "2px solid #000000", flexShrink: 0 }}>
            📊 Purchase Records ({filteredPurchases.length})
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
                  <th style={{ padding: "8px 6px", textAlign: "center", width: "100px", border: "1px solid #000000", fontWeight: "bold" }}>Type</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: "100px", border: "1px solid #000000", fontWeight: "bold" }}>Amount</th>
                  <th style={{ padding: "8px 6px", textAlign: "center", width: "80px", border: "1px solid #000000", fontWeight: "bold" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && filteredPurchases.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No purchase records found</td></tr>
                )}
                {!loading && filteredPurchases.map((record, idx) => (
                  <tr key={record._id}>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000", fontWeight: "600" }}>{idx + 1}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold", fontFamily: "monospace" }}>{record.invoiceNo}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000" }}>{record.invoiceDate}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "600" }}>{record.items?.[0]?.code || record.code || "—"}</td>
                    <td style={{ padding: "6px", border: "1px solid #000000", fontWeight: "bold" }}>{record.customerName || "—"}</td>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000" }}>
                      <span style={{ padding: "2px 10px", borderRadius: "3px", fontSize: "10px", fontWeight: "bold", background: "#dbeafe", border: "1px solid #000000", whiteSpace: "nowrap" }}>PURCHASE</span>
                    </td>
                    <td style={{ padding: "6px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#1e40af" }}>{fmt(record.netTotal)}</td>
                    <td style={{ padding: "6px", textAlign: "center", border: "1px solid #000000" }}>
                      <button 
                        onClick={() => {
                          const reprintData = {
                            invoiceNo: record.invoiceNo,
                            supplierName: record.customerName,
                            code: record.items?.[0]?.code || record.code || "",
                            supplierPhone: record.customerPhone || "—",
                            description: record.remarks || "Purchase Entry",
                            amount: record.netTotal,
                            date: record.invoiceDate
                          };
                          printPurchaseReceipt(reprintData);
                        }}
                        style={{ background: "#22c55e", color: "white", border: "1px solid #000000", borderRadius: "3px", padding: "3px 8px", fontSize: "10px", cursor: "pointer" }}
                      >
                        🖨 Reprint
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredPurchases.length > 0 && (
                <tfoot style={{ background: "#f8fafc", position: "sticky", bottom: 0 }}>
                  <tr>
                    <td colSpan="6" style={{ padding: "8px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Total:</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#1e40af", fontSize: "13px", border: "1px solid #000000" }}>{fmt(totalFilteredAmount)}</td>
                    <td style={{ border: "1px solid #000000" }}> </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Recent Entries Summary with Print Button */}
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
                    <th style={{ padding: "5px", textAlign: "center", width: "80px", border: "1px solid #000000" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 10).map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{ padding: "4px", textAlign: "center", border: "1px solid #000000" }}>{idx + 1}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000" }}>{entry.code || "—"}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000", fontWeight: "bold" }}>{entry.supplierName}</td>
                      <td style={{ padding: "4px", border: "1px solid #000000" }}>{entry.description || "—"}</td>
                      <td style={{ padding: "4px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#1e40af" }}>{fmt(entry.amount)}</td>
                      <td style={{ padding: "4px", textAlign: "center", border: "1px solid #000000" }}>
                        <button onClick={() => reprintReceipt(entry)} style={{ background: "#22c55e", color: "white", border: "1px solid #000000", borderRadius: "2px", padding: "2px 6px", fontSize: "9px", cursor: "pointer" }}>🖨 Print</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc" }}>
                  <tr>
                    <td colSpan="4" style={{ padding: "5px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>Purchase Total:</td>
                    <td style={{ padding: "5px", textAlign: "right", fontWeight: "bold", color: "#1e40af", border: "1px solid #000000" }}>{fmt(purchaseTotal)}</td>
                    <td style={{ border: "1px solid #000000" }}> </td>
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
        <span style={{ flex: 1, textAlign: "right", fontSize: "11px", fontWeight: "bold" }}>Total Purchase: {fmt(purchaseTotal)}</span>
        <button className="xp-btn xp-btn-sm" style={{ fontSize: "11px", fontWeight: "bold" }} onClick={() => window.history.back()}>✕ Close</button>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px", flexShrink: 0 }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Manual Purchase Bill</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Session: {entries.length}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>DB: {purchaseRecords.length}</div>
      </div>
    </div>
  );
}