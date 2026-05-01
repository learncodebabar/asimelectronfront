// pages/CashReceiptPage.jsx - Added Print Previous Receipts
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

// Print Receipt Component
const PrintReceipt = React.forwardRef(({ receiptData, customerData }, ref) => {
  const totalAmount = receiptData.amount || receiptData.amountReceived || 0;
  const inWords = (amount) => {
    const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertToWords = (num) => {
      if (num === 0) return '';
      if (num < 20) return words[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + words[num % 10] : '');
      if (num < 1000) return words[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertToWords(num % 100) : '');
      if (num < 100000) return convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertToWords(num % 1000) : '');
      if (num < 10000000) return convertToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convertToWords(num % 100000) : '');
      return convertToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convertToWords(num % 10000000) : '');
    };
    
    return convertToWords(Math.floor(amount)) + ' Rupees Only';
  };
  
  return (
    <div ref={ref} style={{ 
      width: '280px', 
      padding: '12px', 
      fontFamily: "'Courier New', monospace", 
      fontSize: '11px',
      background: 'white',
      color: 'black'
    }}>
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>CASH RECEIPT</h3>
        <p style={{ margin: '2px 0', fontSize: '9px' }}>Tax Invoice / Cash Memo</p>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Receipt No:</span>
          <span style={{ fontWeight: 'bold' }}>{receiptData.receiptNo}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Date:</span>
          <span>{receiptData.receiptDate}</span>
        </div>
      </div>
      
      <div style={{ marginBottom: '8px', borderTop: '1px dotted #ccc', borderBottom: '1px dotted #ccc', padding: '6px 0' }}>
        <div><strong>Received From:</strong></div>
        <div style={{ fontWeight: 'bold', marginTop: '2px' }}>{customerData?.name || receiptData.customerName}</div>
        {customerData?.code && <div style={{ fontSize: '9px' }}>Code: {customerData.code}</div>}
        {customerData?.phone && <div style={{ fontSize: '9px' }}>Phone: {customerData.phone}</div>}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <div><strong>Amount:</strong></div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center', margin: '4px 0' }}>
          PKR {fmt(totalAmount)}
        </div>
        <div style={{ fontSize: '9px', fontStyle: 'italic', textAlign: 'center' }}>
          {inWords(totalAmount)}
        </div>
      </div>
      
      {receiptData.remarks && (
        <div style={{ marginBottom: '8px', borderTop: '1px dotted #ccc', paddingTop: '4px' }}>
          <div><strong>Remarks:</strong></div>
          <div style={{ fontSize: '9px' }}>{receiptData.remarks}</div>
        </div>
      )}
      
      <div style={{ marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '6px', textAlign: 'center' }}>
        <div style={{ fontSize: '9px' }}>Authorized Signature</div>
        <div style={{ marginTop: '15px' }}>
          <div style={{ borderTop: '1px dotted #999', width: '120px', margin: '0 auto' }}></div>
        </div>
        <div style={{ fontSize: '8px', marginTop: '6px', color: '#666' }}>
          Thank you for your business!
        </div>
      </div>
    </div>
  );
});

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
          {suggestions.map((customer, idx) => (
            <div
              key={customer._id}
              onClick={() => selectCustomer(customer)}
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
                setQuery(customer.name);
                setGhost("");
              }}
              onMouseLeave={() => setIsNavigating(false)}
            >
              <div style={{ fontWeight: "bold", fontSize: 13, color: "#1e293b" }}>
                {customer.name}
              </div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
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

// Sample demo receipts for testing
const getDemoReceipts = () => {
  const stored = localStorage.getItem("cash_receipts_demo");
  if (stored) {
    return JSON.parse(stored);
  }
  
  const demoReceipts = [
    {
      _id: "demo_1",
      receiptNo: "CRV-20241215-0001",
      receiptDate: "2024-12-15",
      customerId: "demo_cust_1",
      customerName: "ABC Traders",
      customerCode: "ABC001",
      amount: 25000,
      remarks: "Payment received for invoice INV-001",
      createdAt: "2024-12-15T10:30:00Z",
      isEditable: true
    },
    {
      _id: "demo_2",
      receiptNo: "CRV-20241216-0002",
      receiptDate: "2024-12-16",
      customerId: "demo_cust_2",
      customerName: "XYZ Enterprises",
      customerCode: "XYZ002",
      amount: 15000,
      remarks: "Partial payment received",
      createdAt: "2024-12-16T14:20:00Z",
      isEditable: true
    },
    {
      _id: "demo_3",
      receiptNo: "CRV-20241217-0003",
      receiptDate: "2024-12-17",
      customerId: "demo_cust_1",
      customerName: "ABC Traders",
      customerCode: "ABC001",
      amount: 5000,
      remarks: "Balance payment",
      createdAt: "2024-12-17T09:15:00Z",
      isEditable: true
    }
  ];
  
  localStorage.setItem("cash_receipts_demo", JSON.stringify(demoReceipts));
  return demoReceipts;
};

export default function CashReceiptPage() {
  const navigate = useNavigate();
  const printRef = useRef();
  
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
  const [isEditing, setIsEditing] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState(null);
  const [editingReceiptData, setEditingReceiptData] = useState(null);
  
  const [errors, setErrors] = useState({ customer: "", amountReceived: "" });
  const [allCustomers, setAllCustomers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [searchReceiptNo, setSearchReceiptNo] = useState("");
  const [showReceiptSearch, setShowReceiptSearch] = useState(false);
  const [searchReceiptResult, setSearchReceiptResult] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [waitingForPrint, setWaitingForPrint] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  
  const codeInputRef = useRef(null);
  const remarksRef = useRef(null);
  const invoiceAmountRef = useRef(null);
  const amountReceivedRef = useRef(null);
  const submitRef = useRef(null);
  const searchRef = useRef(null);
  const printConfirmRef = useRef(null);
  
  useEffect(() => {
    loadCustomers();
    loadReceipts();
    codeInputRef.current?.focus();
  }, []);
  
  useEffect(() => {
    if (searchReceiptResult) {
      setFilteredReceipts([searchReceiptResult]);
    } else if (selectedCustomer) {
      const customerReceipts = receipts.filter(r => r.customerId === selectedCustomer._id || r.customerName === selectedCustomer.name);
      setFilteredReceipts(customerReceipts);
    } else {
      setFilteredReceipts(receipts);
    }
  }, [receipts, searchReceiptResult, selectedCustomer]);
  
  // Listen for Enter key when print dialog is shown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showPrintDialog && e.key === "Enter") {
        e.preventDefault();
        handlePrint();
      }
      if (showPrintDialog && e.key === "Escape") {
        e.preventDefault();
        setShowPrintDialog(false);
        setWaitingForPrint(false);
        setReceiptToPrint(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPrintDialog]);
  
  const loadCustomers = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success && data.data) {
        setAllCustomers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
      setAllCustomers([
        { _id: "demo_cust_1", name: "ABC Traders", code: "ABC001", customerType: "credit", phone: "03001234567" },
        { _id: "demo_cust_2", name: "XYZ Enterprises", code: "XYZ002", customerType: "credit", phone: "03007654321" }
      ]);
    }
  };
  
  const loadReceipts = async () => {
    setLoading(true);
    try {
      let receiptsData = [];
      
      try {
        const response = await api.get("/cash-receipts");
        if (response.data && response.data.success && response.data.data) {
          receiptsData = response.data.data;
        }
      } catch (err) {
        console.log("API not available, using localStorage");
      }
      
      if (receiptsData.length === 0) {
        receiptsData = getDemoReceipts();
      }
      
      const formattedReceipts = receiptsData.map(r => ({
        ...r,
        transactionId: r.receiptNo,
        date: r.receiptDate,
        amountValue: r.amount || r.amountReceived || 0,
        type: "receipt",
        transType: "Cash Receipt"
      }));
      
      formattedReceipts.sort((a, b) => new Date(b.date) - new Date(a.date));
      setReceipts(formattedReceipts);
      setFilteredReceipts(formattedReceipts);
      
      if (formattedReceipts.length > 0) {
        showMsg(`${formattedReceipts.length} receipts loaded`, "success");
      } else {
        showMsg("No receipts found. Create a new receipt to get started.", "info");
      }
    } catch (err) {
      console.error("Failed to load receipts:", err);
      const demoReceipts = getDemoReceipts();
      setReceipts(demoReceipts);
      setFilteredReceipts(demoReceipts);
    }
    setLoading(false);
  };
  
  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };
  
  const handlePrint = () => {
    const receiptToPrintData = receiptToPrint || lastReceipt;
    if (!receiptToPrintData) return;
    
    // Find customer data for the receipt
    let customer = allCustomers.find(c => c._id === receiptToPrintData.customerId);
    if (!customer && receiptToPrintData.customerName) {
      customer = allCustomers.find(c => c.name === receiptToPrintData.customerName);
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receiptToPrintData.receiptNo}</title>
          <style>
            body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
            @media print {
              body { background: white; padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div id="print-content">
            <div style="width:280px; padding:12px; font-family:'Courier New', monospace; font-size:11px; background:white; color:black;">
              <div style="text-align:center; border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:8px;">
                <h3 style="margin:0; font-size:14px;">CASH RECEIPT</h3>
                <p style="margin:2px 0; font-size:9px;">Tax Invoice / Cash Memo</p>
              </div>
              
              <div style="margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                  <span>Receipt No:</span>
                  <span style="font-weight:bold;">${receiptToPrintData.receiptNo}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                  <span>Date:</span>
                  <span>${receiptToPrintData.receiptDate}</span>
                </div>
              </div>
              
              <div style="margin-bottom:8px; border-top:1px dotted #ccc; border-bottom:1px dotted #ccc; padding:6px 0;">
                <div><strong>Received From:</strong></div>
                <div style="font-weight:bold; margin-top:2px;">${customer?.name || receiptToPrintData.customerName}</div>
                ${customer?.code ? `<div style="font-size:9px;">Code: ${customer.code}</div>` : ''}
                ${customer?.phone ? `<div style="font-size:9px;">Phone: ${customer.phone}</div>` : ''}
              </div>
              
              <div style="margin-bottom:8px;">
                <div><strong>Amount:</strong></div>
                <div style="font-size:18px; font-weight:bold; text-align:center; margin:4px 0;">
                  PKR ${fmt(receiptToPrintData.amount || receiptToPrintData.amountReceived || 0)}
                </div>
                <div style="font-size:9px; font-style:italic; text-align:center;">
                  ${(() => {
                    const amount = receiptToPrintData.amount || receiptToPrintData.amountReceived || 0;
                    const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
                    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
                    const convertToWords = (num) => {
                      if (num === 0) return '';
                      if (num < 20) return words[num];
                      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + words[num % 10] : '');
                      if (num < 1000) return words[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertToWords(num % 100) : '');
                      if (num < 100000) return convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertToWords(num % 1000) : '');
                      if (num < 10000000) return convertToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convertToWords(num % 100000) : '');
                      return convertToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convertToWords(num % 10000000) : '');
                    };
                    return convertToWords(Math.floor(amount)) + ' Rupees Only';
                  })()}
                </div>
              </div>
              
              ${receiptToPrintData.remarks ? `
                <div style="margin-bottom:8px; border-top:1px dotted #ccc; padding-top:4px;">
                  <div><strong>Remarks:</strong></div>
                  <div style="font-size:9px;">${receiptToPrintData.remarks}</div>
                </div>
              ` : ''}
              
              <div style="margin-top:10px; border-top:1px dashed #000; padding-top:6px; text-align:center;">
                <div style="font-size:9px;">Authorized Signature</div>
                <div style="margin-top:15px;">
                  <div style="border-top:1px dotted #999; width:120px; margin:0 auto;"></div>
                </div>
                <div style="font-size:8px; margin-top:6px; color:#666;">
                  Thank you for your business!
                </div>
              </div>
            </div>
          </div>
          <button onclick="window.print()" style="position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; font-size: 14px;">🖨️ Print</button>
          <button onclick="window.close()" style="position: fixed; bottom: 20px; left: 20px; padding: 10px 20px; font-size: 14px;">✕ Close</button>
        </body>
      </html>
    `);
    printWindow.document.close();
    setShowPrintDialog(false);
    setWaitingForPrint(false);
    setReceiptToPrint(null);
    // Focus back to code input
    setTimeout(() => codeInputRef.current?.focus(), 100);
  };
  
  const handlePrintPrevious = (receipt) => {
    setReceiptToPrint(receipt);
    setShowPrintDialog(true);
    setWaitingForPrint(true);
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
    
    const cust = customer;
    setCustomerId(cust._id);
    setCustomerCode(cust.code || "");
    setBuyerName(cust.name);
    setCustomerType(cust.customerType || cust.type || "");
    setSelectedCustomer(cust);
    setErrors({ ...errors, customer: "" });
    setSearchReceiptResult(null);
    setSearchReceiptNo("");
    
    const customerReceipts = receipts.filter(r => r.customerId === cust._id || r.customerName === cust.name);
    setFilteredReceipts(customerReceipts);
    
    setTimeout(() => remarksRef.current?.focus(), 100);
  };
  
  const handleCustomerClear = () => {
    setCustomerId("");
    setCustomerCode("");
    setBuyerName("");
    setCustomerType("");
    setSelectedCustomer(null);
    setFilteredReceipts(receipts);
    setInvoiceAmount("");
    setAmountReceived("");
    setRemainingBalance(0);
    setErrors({ customer: "", amountReceived: "" });
    setIsEditing(false);
    setEditingReceiptId(null);
    setEditingReceiptData(null);
    setSearchReceiptResult(null);
    setSearchReceiptNo("");
    setReceiptId(generateReceiptNo());
    codeInputRef.current?.focus();
  };
  
  const validateAmountReceived = (value) => {
    if (!value || value === "" || value === null) {
      setErrors(prev => ({ ...prev, amountReceived: "Required" }));
      return false;
    }
    
    const amount = parseFloat(value);
    if (isNaN(amount)) {
      setErrors(prev => ({ ...prev, amountReceived: "Valid amount" }));
      return false;
    }
    
    if (amount <= 0) {
      setErrors(prev => ({ ...prev, amountReceived: ">0 required" }));
      return false;
    }
    
    setErrors(prev => ({ ...prev, amountReceived: "" }));
    return true;
  };
  
  const handleAmountReceivedChange = (value) => {
    setAmountReceived(value);
    if (value && value !== "") {
      validateAmountReceived(value);
    } else {
      setErrors(prev => ({ ...prev, amountReceived: "" }));
    }
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
  
  const resetForm = () => {
    setReceiptId(generateReceiptNo());
    setInvoiceAmount("");
    setAmountReceived("");
    setRemainingBalance(0);
    setRemarks("");
    setSearchReceiptNo("");
    setShowReceiptSearch(false);
    setSearchReceiptResult(null);
    setIsEditing(false);
    setEditingReceiptId(null);
    setEditingReceiptData(null);
    setErrors({ customer: "", amountReceived: "" });
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 100);
  };
  
  const editReceipt = (receipt) => {
    console.log("Editing receipt:", receipt);
    
    setEditingReceiptData(receipt);
    setEditingReceiptId(receipt._id);
    setIsEditing(true);
    
    setReceiptId(receipt.transactionId || receipt.receiptNo || generateReceiptNo());
    setReceiptDate(receipt.date || receipt.receiptDate || isoD());
    setInvoiceAmount(receipt.invoiceAmount || "");
    setAmountReceived(receipt.amount || receipt.amountValue || 0);
    setRemarks(receipt.remarks || "");
    setRemainingBalance(receipt.balance || 0);
    
    let customer = allCustomers.find(c => c._id === receipt.customerId);
    if (!customer && receipt.customerName) {
      customer = allCustomers.find(c => c.name === receipt.customerName);
    }
    
    if (customer) {
      setCustomerId(customer._id);
      setCustomerCode(customer.code || "");
      setBuyerName(customer.name);
      setCustomerType(customer.customerType || customer.type || "");
      setSelectedCustomer(customer);
    } else if (receipt.customerName) {
      setBuyerName(receipt.customerName);
      setSelectedCustomer({ name: receipt.customerName, _id: receipt.customerId });
    }
    
    showMsg(`Editing receipt: ${receipt.transactionId || receipt.receiptNo}`, "success");
    setTimeout(() => amountReceivedRef.current?.focus(), 100);
  };
  
  const searchReceipt = () => {
    const receiptNo = searchReceiptNo.trim();
    if (!receiptNo) {
      showMsg("Enter receipt number to search", "error");
      return;
    }
    
    const found = receipts.find(r => 
      (r.transactionId && r.transactionId.toLowerCase().includes(receiptNo.toLowerCase())) ||
      (r.receiptNo && r.receiptNo.toLowerCase().includes(receiptNo.toLowerCase()))
    );
    
    if (found) {
      setSearchReceiptResult(found);
      setFilteredReceipts([found]);
      setShowReceiptSearch(false);
      showMsg(`Found receipt: ${found.transactionId || found.receiptNo}`, "success");
    } else {
      showMsg(`Receipt "${receiptNo}" not found`, "error");
      setSearchReceiptResult(null);
      if (selectedCustomer) {
        const customerReceipts = receipts.filter(r => r.customerId === selectedCustomer._id);
        setFilteredReceipts(customerReceipts);
      } else {
        setFilteredReceipts(receipts);
      }
    }
  };
  
  const clearSearch = () => {
    setSearchReceiptResult(null);
    if (selectedCustomer) {
      const customerReceipts = receipts.filter(r => r.customerId === selectedCustomer._id);
      setFilteredReceipts(customerReceipts);
    } else {
      setFilteredReceipts(receipts);
    }
    setSearchReceiptNo("");
    showMsg("Search cleared", "success");
  };
  
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchReceipt();
    }
    if (e.key === "Escape") {
      setShowReceiptSearch(false);
      setSearchReceiptNo("");
    }
  };
  
  const handleUpdateReceipt = async () => {
    if (!selectedCustomer) {
      setErrors(prev => ({ ...prev, customer: "Select customer" }));
      showMsg("Please select a customer", "error");
      return;
    }
    
    if (!amountReceived || amountReceived === "") {
      setErrors(prev => ({ ...prev, amountReceived: "Amount required" }));
      amountReceivedRef.current?.focus();
      return;
    }
    
    const received = parseFloat(amountReceived);
    if (isNaN(received) || received <= 0) {
      setErrors(prev => ({ ...prev, amountReceived: "Valid amount > 0" }));
      amountReceivedRef.current?.focus();
      return;
    }
    
    setSubmitting(true);
    try {
      const updatedReceipt = {
        ...editingReceiptData,
        receiptNo: receiptId,
        receiptDate: receiptDate,
        amount: received,
        amountReceived: received,
        invoiceAmount: parseFloat(invoiceAmount) || 0,
        remainingBalance: remainingBalance,
        remarks: remarks || "Receipt updated",
        updatedAt: new Date().toISOString()
      };
      
      const allReceipts = JSON.parse(localStorage.getItem("cash_receipts_demo") || "[]");
      const index = allReceipts.findIndex(r => r._id === editingReceiptData._id);
      if (index !== -1) {
        allReceipts[index] = updatedReceipt;
        localStorage.setItem("cash_receipts_demo", JSON.stringify(allReceipts));
      }
      
      showMsg(`✓ Receipt ${receiptId} updated! Amount: PKR ${fmt(received)}`, "success");
      
      setIsEditing(false);
      setEditingReceiptId(null);
      setEditingReceiptData(null);
      await loadReceipts();
      resetForm();
    } catch (err) {
      showMsg("Update failed", "error");
    }
    setSubmitting(false);
  };
  
  const handleDeleteReceipt = async (id, receiptNo) => {
    if (!window.confirm(`Delete receipt "${receiptNo}"?`)) return;
    try {
      const allReceipts = JSON.parse(localStorage.getItem("cash_receipts_demo") || "[]");
      const filtered = allReceipts.filter(r => r._id !== id);
      localStorage.setItem("cash_receipts_demo", JSON.stringify(filtered));
      
      showMsg(`Receipt "${receiptNo}" deleted!`, "success");
      
      await loadReceipts();
      if (editingReceiptId === id) {
        resetForm();
      }
      setSearchReceiptResult(null);
    } catch (err) {
      showMsg("Delete failed", "error");
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isEditing) {
      await handleUpdateReceipt();
      return;
    }
    
    if (!selectedCustomer) {
      setErrors(prev => ({ ...prev, customer: "Select customer" }));
      showMsg("Please select a customer", "error");
      return;
    }
    
    if (!amountReceived || amountReceived === "") {
      setErrors(prev => ({ ...prev, amountReceived: "Amount required" }));
      amountReceivedRef.current?.focus();
      return;
    }
    
    const received = parseFloat(amountReceived);
    if (isNaN(received) || received <= 0) {
      setErrors(prev => ({ ...prev, amountReceived: "Valid amount > 0" }));
      amountReceivedRef.current?.focus();
      return;
    }
    
    const invAmount = parseFloat(invoiceAmount) || 0;
    if (invAmount > 0 && received > invAmount) {
      setErrors(prev => ({ ...prev, amountReceived: `Cannot exceed PKR ${fmt(invAmount)}` }));
      amountReceivedRef.current?.focus();
      return;
    }
    
    setSubmitting(true);
    try {
      const newReceipt = {
        _id: Date.now().toString(),
        receiptNo: receiptId,
        receiptDate: receiptDate,
        customerId: selectedCustomer._id,
        customerCode: selectedCustomer.code,
        customerName: selectedCustomer.name,
        amount: received,
        amountReceived: received,
        invoiceAmount: invAmount,
        remainingBalance: remainingBalance,
        remarks: remarks || "Cash receipt recorded",
        createdAt: new Date().toISOString(),
        isEditable: true
      };
      
      const allReceipts = JSON.parse(localStorage.getItem("cash_receipts_demo") || "[]");
      allReceipts.push(newReceipt);
      localStorage.setItem("cash_receipts_demo", JSON.stringify(allReceipts));
      
      showMsg(`✓ Receipt ${receiptId} recorded! Amount: PKR ${fmt(received)}`, "success");
      
      // Store last receipt for printing
      setLastReceipt({
        ...newReceipt,
        receiptNo: receiptId,
        receiptDate: receiptDate,
        amount: received,
        customerName: selectedCustomer.name
      });
      
      await loadReceipts();
      resetForm();
      
      // Show print dialog
      setReceiptToPrint(newReceipt);
      setShowPrintDialog(true);
      setWaitingForPrint(true);
      
    } catch (err) {
      showMsg("Failed to save receipt", "error");
    }
    setSubmitting(false);
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Hidden print content */}
      <div id="print-receipt-content" style={{ display: 'none' }}>
        {receiptToPrint && (
          <PrintReceipt 
            ref={printRef}
            receiptData={receiptToPrint}
            customerData={allCustomers.find(c => c._id === receiptToPrint.customerId)}
          />
        )}
      </div>
      
      {/* Print Dialog */}
      {showPrintDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            width: '320px',
            textAlign: 'center',
            border: '2px solid #000000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🖨️</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Print Receipt?</h3>
            <p style={{ fontSize: '12px', margin: '0 0 20px 0', color: '#666' }}>
              Receipt #{receiptToPrint?.receiptNo || lastReceipt?.receiptNo} 
              <br /><strong style={{ color: '#22c55e' }}>Press ENTER to print</strong> or ESC to close
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                ref={printConfirmRef}
                onClick={handlePrint}
                autoFocus
                style={{
                  padding: '8px 20px',
                  background: '#22c55e',
                  color: 'white',
                  border: '1px solid #000000',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                🖨️ Print (Enter)
              </button>
              <button
                onClick={() => {
                  setShowPrintDialog(false);
                  setWaitingForPrint(false);
                  setReceiptToPrint(null);
                  codeInputRef.current?.focus();
                }}
                style={{
                  padding: '8px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: '1px solid #000000',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                ✕ Close (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Cash Receipt Voucher</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={() => setShowReceiptSearch(!showReceiptSearch)} style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold", marginRight: "8px", background: "#f59e0b", color: "white", border: "1px solid #000000" }}>🔍 Search Receipt</button>
          <button className="xp-btn xp-btn-sm" onClick={loadReceipts} style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold", marginRight: "8px", background: "#3b82f6", color: "white", border: "1px solid #000000" }}>⟳ Load</button>
          <button className="xp-btn xp-btn-sm" onClick={resetForm} style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold", background: "#10b981", color: "white", border: "1px solid #000000" }}>🔄 New Receipt</button>
        </div>
      </div>
      
      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "6px 12px", fontSize: "12px", padding: "6px 12px", fontWeight: "500", border: "1px solid #000000" }}>
          {msg.text}
        </div>
      )}
      
      {showReceiptSearch && (
        <div style={{ margin: "6px 12px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "2px solid #000000", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", fontSize: "11px" }}>🔍 Search Receipt:</span>
          <input
            ref={searchRef}
            type="text"
            value={searchReceiptNo}
            onChange={(e) => setSearchReceiptNo(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Enter Receipt Number"
            style={{ flex: 1, padding: "6px 10px", border: "1px solid #000000", borderRadius: "4px", fontSize: "12px" }}
          />
          <button onClick={searchReceipt} style={{ padding: "6px 16px", background: "#1e40af", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Search</button>
          <button onClick={clearSearch} style={{ padding: "6px 16px", background: "#10b981", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Clear</button>
          <button onClick={() => setShowReceiptSearch(false)} style={{ padding: "6px 16px", background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Cancel</button>
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
            <div style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
              flexWrap: "wrap"
            }}>
              <div style={{ width: "145px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Receipt ID</label>
                <input
                  type="text"
                  value={receiptId}
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
              
              <div style={{ width: "100px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Date</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  style={{ height: "28px", padding: "0 6px", fontSize: "11px", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              <div style={{ width: "95px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Code</label>
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
                  placeholder="Code"
                  style={{ 
                    height: "28px", 
                    padding: "0 6px", 
                    fontSize: "11px", 
                    textTransform: "uppercase",
                    border: errors.customer ? "2px solid #ef4444" : "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
              </div>
              
              <div style={{ flex: 2, minWidth: "220px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>🏦 Account Title <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{
                  border: errors.customer ? "2px solid #ef4444" : "1px solid #000000",
                  borderRadius: "4px",
                  background: "#ffffff",
                  minHeight: "28px"
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
                {errors.customer && <div style={{ fontSize: "8px", color: "#ef4444", marginTop: "2px" }}>{errors.customer}</div>}
              </div>
              
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
              
              <div style={{ width: "90px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Invoice</label>
                <input
                  ref={invoiceAmountRef}
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  onKeyDown={handleInvoiceAmountKeyDown}
                  placeholder="0"
                  step="1"
                  style={{ height: "28px", padding: "0 6px", fontSize: "11px", fontWeight: "bold", textAlign: "right", border: "1px solid #000000", borderRadius: "4px", width: "100%" }}
                />
              </div>
              
              <div style={{ width: "100px" }}>
                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "3px", textTransform: "uppercase" }}>Received <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  ref={amountReceivedRef}
                  type="number"
                  value={amountReceived}
                  onChange={(e) => handleAmountReceivedChange(e.target.value)}
                  onKeyDown={handleAmountReceivedKeyDown}
                  placeholder="0"
                  step="1"
                  style={{ 
                    height: "28px", 
                    padding: "0 6px", 
                    fontSize: "11px", 
                    fontWeight: "bold", 
                    textAlign: "right", 
                    border: errors.amountReceived ? "2px solid #ef4444" : "1px solid #000000",
                    borderRadius: "4px",
                    width: "100%"
                  }}
                />
                {errors.amountReceived && <div style={{ fontSize: "7px", color: "#ef4444", marginTop: "1px" }}>{errors.amountReceived}</div>}
              </div>
              
              <div style={{ marginTop: "18px" }}>
                <button
                  ref={submitRef}
                  type="submit"
                  disabled={submitting || (!selectedCustomer && !isEditing) || !amountReceived}
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
            
            {invoiceAmount && parseFloat(invoiceAmount) > 0 && (
              <div style={{
                marginTop: "10px",
                padding: "6px 12px",
                background: remainingBalance > 0 ? "#fef3c7" : "#dcfce7",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #000000"
              }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>Remaining Balance:</span>
                <span style={{ fontSize: "16px", fontWeight: "bold", color: remainingBalance > 0 ? "#d97706" : "#059669" }}>
                  PKR {fmt(remainingBalance)}
                </span>
              </div>
            )}
            
            {selectedCustomer && (
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
                {selectedCustomer.imageFront ? (
                  <img src={selectedCustomer.imageFront} alt="" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", border: "1px solid #000000" }} />
                ) : (
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", border: "1px solid #000000" }}>👤</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b" }}>{selectedCustomer.name}</div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    Code: {selectedCustomer.code || "—"} | Balance: <span style={{ fontWeight: "bold", color: (selectedCustomer.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>PKR {fmt(selectedCustomer.currentBalance || 0)}</span>
                  </div>
                </div>
                <button type="button" onClick={handleCustomerClear} style={{ background: "#ef4444", color: "white", border: "1px solid #000000", borderRadius: "4px", padding: "4px 12px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>Clear</button>
              </div>
            )}
          </form>
        </div>
        
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
              📋 Cash Receipts {filteredReceipts.length > 0 && `(${filteredReceipts.length})`}
              {searchReceiptResult && <span style={{ fontSize: "10px", color: "#f59e0b", marginLeft: "8px" }}> - Search Result</span>}
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              {searchReceiptResult && (
                <button onClick={clearSearch} style={{ fontSize: "10px", padding: "3px 10px", border: "1px solid #000000", borderRadius: "4px", background: "#f59e0b", color: "white", cursor: "pointer", fontWeight: "bold" }}>Clear Search</button>
              )}
              <button onClick={loadReceipts} style={{ fontSize: "10px", padding: "3px 10px", border: "1px solid #000000", borderRadius: "4px", background: "#f8fafc", cursor: "pointer", fontWeight: "bold" }}>⟳ Refresh</button>
            </div>
          </div>
          
          {loading && (
            <div style={{ padding: "30px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>Loading receipts...</div>
          )}
          
          {!loading && filteredReceipts.length === 0 && (
            <div style={{ padding: "30px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
              📭 No receipts found
              <div style={{ marginTop: "8px", fontSize: "10px" }}>
                Click "Load" button to load demo data, or create a new receipt using the form above
              </div>
            </div>
          )}
          
          {!loading && filteredReceipts.length > 0 && (
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
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Receipt #</th>
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Customer</th>
                    <th style={{ padding: "4px 4px", textAlign: "left", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Remarks</th>
                    <th style={{ padding: "4px 4px", textAlign: "right", border: "1px solid #000000", fontSize: "9px", fontWeight: "bold" }}>Amount</th>
                    <th style={{ padding: "4px 4px", textAlign: "center", width: "100px", border: "1px solid #000000", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((r, i) => (
                    <tr 
                      key={r._id || i} 
                      style={{ 
                        backgroundColor: editingReceiptId === r._id ? "#fef3c7" : "transparent",
                        borderBottom: "1px solid #000000"
                      }}
                    >
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000", fontWeight: "600" }}>{i + 1}</td>
                      <td style={{ padding: "4px 4px", whiteSpace: "nowrap", border: "1px solid #000000" }}>{r.receiptDate || r.date}</td>
                      <td style={{ padding: "4px 4px", fontFamily: "monospace", fontWeight: "bold", border: "1px solid #000000", fontSize: "9px" }}>{r.receiptNo || r.transactionId}</td>
                      <td style={{ padding: "4px 4px", border: "1px solid #000000", fontWeight: "bold" }}>{r.customerName}</td>
                      <td style={{ padding: "4px 4px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #000000" }}>{r.remarks || "—"}</td>
                      <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000" }}>PKR {fmt(r.amount || r.amountReceived || 0)}</td>
                      <td style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #000000" }}>
                        <div style={{ display: "flex", gap: "4px", justifyContent: "center", }}>
                          <button
                            onClick={() => editReceipt(r)}
                            style={{
                              background: "#f59e0b",
                              color: "white",
                              border: "1px solid #000000",
                              borderRadius: "3px",
                              padding: "3px 6px",
                              fontSize: "9px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                            title="Edit Receipt"
                          >
                            ✏ Edit
                          </button>
                          <button
                            onClick={() => handlePrintPrevious(r)}
                            style={{
                              background: "#22c55e",
                              color: "white",
                              border: "1px solid #000000",
                              borderRadius: "3px",
                              padding: "3px 6px",
                              fontSize: "9px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                            title="Print Receipt"
                          >
                            🖨️ Print
                          </button>
                          <button
                            onClick={() => handleDeleteReceipt(r._id, r.receiptNo)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "1px solid #000000",
                              borderRadius: "3px",
                              padding: "3px 6px",
                              fontSize: "9px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                            title="Delete Receipt"
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
                    <td style={{ padding: "4px 4px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000", fontSize: "9px" }}>PKR {fmt(filteredReceipts.reduce((sum, r) => sum + (r.amount || r.amountReceived || 0), 0))}</td>
                    <td style={{ padding: "4px 4px", border: "1px solid #000000" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "4px 12px" }}>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>💰 Cash Receipt</div>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>{selectedCustomer ? selectedCustomer.name : `${filteredReceipts.length} receipts total`}</div>
        <div className="xp-status-pane" style={{ fontSize: "10px", fontWeight: "500" }}>{isEditing ? "✏ Editing Mode" : (amountReceived && `Receiving: PKR ${fmt(amountReceived)}`)}</div>
      </div>
    </div>
  );
}