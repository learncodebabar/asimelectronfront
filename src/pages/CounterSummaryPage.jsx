// pages/Reports/CounterSummaryPage.jsx - RESPONSIVE LAYOUT with Auto-Adjusting Fonts
import { useState, useEffect } from "react";
import React from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import { SHOP_INFO } from "../constants/shopInfo.js";

const isoDate = () => new Date().toISOString().split("T")[0];
const timeNow = () => new Date().toLocaleTimeString("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Urdu font family
const URDU_FONT_FAMILY = "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Gulzar', 'Mehr Nastaliq', serif";

// CSS for Urdu fonts
const URDU_FONT_CSS = `
  @font-face {
    font-family: 'Jameel Noori Nastaleeq';
    src: local('Jameel Noori Nastaleeq'), local('Jameel Noori Nastaleeq Regular');
  }
  
  @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Gulzar:wght@400;500;600;700&display=swap');
  
  .urdu-text, .urdu-bold, [class*="urdu"] {
    font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Gulzar', 'Mehr Nastaliq', 'Alvi Nastaleeq', 'Urdu Typesetting', serif !important;
    direction: rtl;
  }
  
  .urdu-text {
    font-weight: 500 !important;
  }
  
  .urdu-bold {
    font-weight: 700 !important;
  }
  
  .bismillah {
    font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Gulzar', 'Mehr Nastaliq', 'Alvi Nastaleeq', 'Urdu Typesetting', serif !important;
    font-size: clamp(32px, 4vw, 56px) !important;
    font-weight: 800 !important;
    direction: rtl !important;
    text-align: right !important;
  }
  
  .shop-name-urdu {
    font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Gulzar', 'Mehr Nastaliq', 'Alvi Nastaleeq', 'Urdu Typesetting', serif !important;
    font-size: clamp(24px, 3.5vw, 42px) !important;
    font-weight: 800 !important;
    direction: rtl !important;
    text-align: left !important;
  }
  
  .shop-address {
    font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Gulzar', 'Mehr Nastaliq', 'Alvi Nastaleeq', 'Urdu Typesetting', serif !important;
    font-size: clamp(14px, 1.8vw, 20px) !important;
    font-weight: 500 !important;
    direction: rtl !important;
    text-align: center !important;
  }
  
  @media (max-width: 1366px) {
    .bismillah { font-size: clamp(28px, 3.5vw, 48px) !important; }
    .shop-name-urdu { font-size: clamp(20px, 3vw, 36px) !important; }
    .shop-address { font-size: clamp(12px, 1.5vw, 18px) !important; }
  }
  
  @media (max-width: 1024px) {
    .bismillah { font-size: clamp(24px, 3vw, 40px) !important; }
    .shop-name-urdu { font-size: clamp(18px, 2.5vw, 32px) !important; }
    .shop-address { font-size: clamp(11px, 1.3vw, 16px) !important; }
  }
`;

export default function CounterSummaryPage() {
  const [summaryDate, setSummaryDate] = useState(isoDate());
  const [currentTime, setCurrentTime] = useState(timeNow());
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedCounter, setSelectedCounter] = useState("all");
  const [expandedCounters, setExpandedCounters] = useState({});
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Data states
  const [salesData, setSalesData] = useState([]);
  const [purchasesData, setPurchasesData] = useState([]);
  const [counters, setCounters] = useState([]);
  const [todayTotals, setTodayTotals] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalCredit: 0,
    totalCash: 0,
    totalBank: 0,
    totalCheque: 0,
    totalReturns: 0,
    netCashFlow: 0,
    totalInvoices: 0,
    totalItems: 0,
  });

  // Track window resize for responsive adjustments
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inject Urdu font CSS
  useEffect(() => {
    const existingStyle = document.querySelector('#urdu-font-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'urdu-font-styles';
    styleElement.textContent = URDU_FONT_CSS;
    document.head.appendChild(styleElement);
    
    if (!document.querySelector('#google-fonts-noto')) {
      const link1 = document.createElement('link');
      link1.id = 'google-fonts-noto';
      link1.rel = 'stylesheet';
      link1.href = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link1);
    }
    
    if (!document.querySelector('#google-fonts-gulzar')) {
      const link2 = document.createElement('link');
      link2.id = 'google-fonts-gulzar';
      link2.rel = 'stylesheet';
      link2.href = 'https://fonts.googleapis.com/css2?family=Gulzar:wght@400;500;600;700&display=swap';
      document.head.appendChild(link2);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      let sales = [];
      let purchases = [];

      try {
        const salesRes = await api.get(EP.SALES.GET_ALL);
        if (salesRes.data.success && salesRes.data.data) {
          sales = salesRes.data.data;
        }
      } catch (err) {
        console.error("Failed to fetch sales:", err);
        showMsg("Could not fetch sales data", "warning");
      }

      try {
        const purchasesRes = await api.get(EP.PURCHASES.GET_ALL);
        if (purchasesRes.data.success && purchasesRes.data.data) {
          purchases = purchasesRes.data.data;
        }
      } catch (err) {
        console.error("Failed to fetch purchases:", err);
        showMsg("Could not fetch purchases data", "warning");
      }

      const dateStr = summaryDate;
      
      const todaySales = sales.filter(s => s.invoiceDate?.startsWith(dateStr) && s.saleType !== "return" && s.type !== "return");
      const todayReturns = sales.filter(r => (r.saleType === "return" || r.type === "return") && r.invoiceDate?.startsWith(dateStr));
      const todayPurchases = purchases.filter(p => p.invoiceDate?.startsWith(dateStr));

      const totalSales = todaySales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
      const totalPurchases = todayPurchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
      const totalReturns = todayReturns.reduce((sum, r) => sum + (r.netTotal || 0), 0);
      
      const totalCash = todaySales.filter(s => s.paymentMode === "Cash").reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      const totalCredit = todaySales.filter(s => s.paymentMode === "Credit").reduce((sum, s) => sum + (s.netTotal || 0), 0);
      const totalBank = todaySales.filter(s => s.paymentMode === "Bank").reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      const totalCheque = todaySales.filter(s => s.paymentMode === "Cheque").reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      
      const totalInvoices = todaySales.length;
      const totalItems = todaySales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
      const netCashFlow = totalCash + totalBank + totalCheque - totalPurchases;

      setTodayTotals({
        totalSales,
        totalPurchases,
        totalCredit,
        totalCash,
        totalBank,
        totalCheque,
        totalReturns,
        netCashFlow,
        totalInvoices,
        totalItems,
      });

      const uniqueUsers = new Set();
      todaySales.forEach(s => { if (s.username) uniqueUsers.add(s.username); });
      todayPurchases.forEach(p => { if (p.username) uniqueUsers.add(p.username); });
      
      const counterList = Array.from(uniqueUsers).map(username => {
        const userSales = todaySales.filter(s => s.username === username);
        const userReturns = todayReturns.filter(r => r.username === username);
        const userPurchases = todayPurchases.filter(p => p.username === username);

        const salesTotal = userSales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
        const returnsTotal = userReturns.reduce((sum, r) => sum + (r.netTotal || 0), 0);
        const purchasesTotal = userPurchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
        
        const cashReceived = userSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
        const cashPaid = userPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        
        const creditTotal = userSales.filter(s => s.paymentMode === "Credit").reduce((sum, s) => sum + (s.netTotal || 0), 0);
        const cashTotal = userSales.filter(s => s.paymentMode === "Cash").reduce((sum, s) => sum + (s.paidAmount || 0), 0);
        const bankTotal = userSales.filter(s => s.paymentMode === "Bank").reduce((sum, s) => sum + (s.paidAmount || 0), 0);
        
        const netCash = cashReceived - cashPaid;

        return {
          id: username,
          name: username,
          username: username,
          sales: userSales,
          returns: userReturns,
          purchases: userPurchases,
          totals: { 
            sales: salesTotal, 
            returns: returnsTotal, 
            purchases: purchasesTotal,
            cashReceived, 
            cashPaid, 
            netCash,
            credit: creditTotal,
            cash: cashTotal,
            bank: bankTotal,
          },
          counts: { 
            sales: userSales.length, 
            returns: userReturns.length, 
            purchases: userPurchases.length,
            items: userSales.reduce((sum, s) => sum + (s.items?.length || 0), 0),
          },
        };
      });

      counterList.sort((a, b) => a.name.localeCompare(b.name));
      setCounters(counterList);
      setSalesData(todaySales);
      setPurchasesData(todayPurchases);
      
      if (counterList.length === 0) {
        showMsg(`No data found for ${summaryDate}`, "info");
      } else {
        showMsg(`Loaded: ${counterList.length} counters`, "success");
      }
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      showMsg("Failed to load summary data", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary();
  }, [summaryDate]);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const formatCurrency = (amount) => `PKR ${(Number(amount) || 0).toLocaleString("en-PK")}`;

  const toggleCounter = (id) => setExpandedCounters(prev => ({ ...prev, [id]: !prev[id] }));

  const filteredCounters = selectedCounter === "all" ? counters : counters.filter(c => c.id === selectedCounter);

  // Responsive font sizes based on window width
  const getResponsiveFontSize = (baseSize, laptopSize, smallSize) => {
    if (windowWidth <= 1024) return smallSize;
    if (windowWidth <= 1366) return laptopSize;
    return baseSize;
  };

  const bismillahFontSize = getResponsiveFontSize('56px', '44px', '36px');
  const shopNameFontSize = getResponsiveFontSize('42px', '34px', '28px');
  const englishNameFontSize = getResponsiveFontSize('24px', '20px', '18px');
  const addressFontSize = getResponsiveFontSize('18px', '15px', '13px');
  const contactFontSize = getResponsiveFontSize('16px', '14px', '12px');

  return (
    <div style={{ 
      height: "100vh", 
      width: "100%", 
      display: "flex", 
      flexDirection: "column", 
      background: "#f0f2f5",
      overflow: "hidden"
    }}>
      
      {/* Header - Responsive */}
      <div style={{ 
        background: "linear-gradient(135deg, #0a2b3e 0%, #064e3b 100%)", 
        padding: windowWidth <= 1024 ? "12px 16px" : "20px 24px",
        borderBottom: "5px solid #fbbf24",
        flexShrink: 0
      }}>
        
        {/* Row with Bismillah Right and Shop Name Left */}
        <div style={{ 
          display: 'flex', 
          flexDirection: windowWidth <= 768 ? "column" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: windowWidth <= 768 ? "15px" : "20px",
          marginBottom: "20px"
        }}>
          {/* Bismillah - RIGHT SIDE */}
          <div className="bismillah" style={{
            color: "#fbbf24",
            textShadow: "3px 3px 6px rgba(0,0,0,0.4)",
            letterSpacing: "1px",
            lineHeight: "1.3",
            width: windowWidth <= 768 ? "100%" : "40%",
            textAlign: "right",
            fontSize: bismillahFontSize
          }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          
          {/* Shop Name - LEFT SIDE */}
          <div className="shop-name-urdu" style={{
            color: "white",
            textShadow: "2px 2px 5px rgba(0,0,0,0.3)",
            lineHeight: "1.4",
            width: windowWidth <= 768 ? "100%" : "50%",
            textAlign: "left",
            fontSize: shopNameFontSize
          }}>
            عاصم الیکٹرک الیکٹرونکس اینڈ سولر ہاؤس
          </div>
        </div>
        
        {/* English Shop Name */}
        <div style={{
          fontSize: englishNameFontSize,
          fontWeight: "700",
          color: "#fcd34d",
          marginBottom: "15px",
          letterSpacing: "1px",
          textShadow: "1px 1px 3px rgba(0,0,0,0.3)",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          textAlign: "center"
        }}>
          Asim Electric Electronics & Solar House
        </div>
        
        {/* Address */}
        <div className="shop-address" style={{
          color: "#e2e8f0",
          maxWidth: "90%",
          margin: "0 auto 10px auto",
          lineHeight: "1.5",
          fontSize: addressFontSize
        }}>
          مین بازار بخاری ٹاؤن، نزد بجلی گھر اسٹاپ، جڑانوالہ روڈ، فیصل آباد
        </div>
        
        {/* Contact Numbers */}
        <div style={{
          fontSize: contactFontSize,
          color: "#cbd5e1",
          display: "flex",
          justifyContent: "center",
          gap: windowWidth <= 768 ? "12px" : "25px",
          flexWrap: "wrap",
          fontWeight: "600",
          fontFamily: "'Segoe UI', Arial, sans-serif"
        }}>
          <span>📞 Faqir Hussain 0300 7262129</span>
          <span>📞 PTCL 041 8711575</span>
          <span>📞 Shop 0315 7262129</span>
        </div>
      </div>

      {/* Controls Bar - Responsive */}
      <div style={{ 
        background: "white", 
        padding: windowWidth <= 768 ? "8px 12px" : "10px 20px", 
        display: "flex", 
        gap: windowWidth <= 768 ? "10px" : "15px", 
        flexWrap: "wrap", 
        alignItems: "center", 
        borderBottom: "1px solid #e0e0e0",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f7fa", padding: "4px 10px", borderRadius: "20px" }}>
          <span style={{ fontSize: windowWidth <= 768 ? "12px" : "14px" }}>📅</span>
          <input type="date" value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} style={{ border: "none", background: "transparent", fontSize: windowWidth <= 768 ? "11px" : "13px", outline: "none" }} />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f7fa", padding: "4px 10px", borderRadius: "20px" }}>
          <span style={{ fontSize: windowWidth <= 768 ? "12px" : "14px" }}>👥</span>
          <select value={selectedCounter} onChange={(e) => setSelectedCounter(e.target.value)} style={{ border: "none", background: "transparent", fontSize: windowWidth <= 768 ? "11px" : "13px", outline: "none", cursor: "pointer" }}>
            <option value="all">All Counters</option>
            {counters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", fontSize: windowWidth <= 768 ? "10px" : "12px" }}>
          <span>🕐 {currentTime}</span>
          <button onClick={fetchSummary} disabled={loading} style={{ background: "#1e3a5f", color: "white", border: "none", padding: "4px 12px", borderRadius: "20px", cursor: "pointer", fontSize: windowWidth <= 768 ? "10px" : "12px" }}>⟳ Refresh</button>
        </div>
      </div>

      {msg.text && (
        <div style={{ margin: "8px 20px", padding: "6px 12px", borderRadius: "6px", background: msg.type === "success" ? "#d4edda" : "#f8d7da", color: msg.type === "success" ? "#155724" : "#721c24", fontSize: "11px", flexShrink: 0 }}>
          {msg.text}
        </div>
      )}

      {/* 3 COLUMN LAYOUT - Responsive */}
      <div style={{ 
        display: "flex", 
        flexDirection: windowWidth <= 1024 ? "column" : "row",
        gap: windowWidth <= 768 ? "12px" : "16px", 
        padding: windowWidth <= 768 ? "12px" : "16px", 
        flex: 1, 
        minHeight: 0,
        overflow: "auto"
      }}>
        
        {/* COLUMN 1 - Counter Wise Sales */}
        <div style={{ 
          flex: windowWidth <= 1024 ? "auto" : 1.2, 
          minWidth: windowWidth <= 768 ? "auto" : "280px", 
          background: "white", 
          borderRadius: "12px", 
          overflow: "hidden", 
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", 
          display: "flex", 
          flexDirection: "column",
          maxHeight: windowWidth <= 1024 ? "400px" : "100%"
        }}>
          <div style={{ background: "#1e3a5f", color: "white", padding: "8px 12px", fontWeight: "bold", fontSize: windowWidth <= 768 ? "12px" : "13px", borderBottom: "3px solid #fbbf24", flexShrink: 0 }}>
            📊 Counter Wise Sales Summary
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
            ) : filteredCounters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>No data found</div>
            ) : (
              <table style={{ width: "100%", fontSize: windowWidth <= 768 ? "10px" : "11px", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                  <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                    <th style={{ padding: "6px 4px", textAlign: "left" }}>Counter</th>
                    <th style={{ padding: "6px 4px", textAlign: "center" }}>Sales</th>
                    <th style={{ padding: "6px 4px", textAlign: "center" }}>Items</th>
                    <th style={{ padding: "6px 4px", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCounters.map((counter, idx) => (
                    <React.Fragment key={counter.id}>
                      <tr 
                        style={{ 
                          background: idx % 2 === 0 ? "white" : "#f9fafb",
                          borderBottom: "1px solid #f0f0f0",
                          cursor: "pointer"
                        }}
                        onClick={() => toggleCounter(counter.id)}
                      >
                        <td style={{ padding: "6px 4px", fontWeight: "600" }}>
                          <span style={{ marginRight: "4px", fontSize: windowWidth <= 768 ? "8px" : "10px" }}>{expandedCounters[counter.id] ? "▼" : "▶"}</span>
                          {counter.name}
                        </td>
                        <td style={{ padding: "6px 4px", textAlign: "center" }}>{counter.counts.sales}</td>
                        <td style={{ padding: "6px 4px", textAlign: "center" }}>{counter.counts.items}</td>
                        <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: "bold", color: "#10b981" }}>{formatCurrency(counter.totals.sales)}</td>
                      </tr>
                      {expandedCounters[counter.id] && (
                        <tr>
                          <td colSpan="4" style={{ padding: "0" }}>
                            <div style={{ padding: "8px", background: "#f8fafc", borderTop: "1px solid #e0e0e0" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "6px", marginBottom: "8px", fontSize: windowWidth <= 768 ? "9px" : "10px" }}>
                                <div><strong>💰 Cash:</strong> {formatCurrency(counter.totals.cash)}</div>
                                <div><strong>💳 Credit:</strong> {formatCurrency(counter.totals.credit)}</div>
                                <div><strong>🏦 Bank:</strong> {formatCurrency(counter.totals.bank)}</div>
                                <div><strong>📦 Purchases:</strong> {formatCurrency(counter.totals.purchases)}</div>
                                <div><strong>↩️ Returns:</strong> {formatCurrency(counter.totals.returns)}</div>
                                <div><strong>💵 Net Cash:</strong> <span style={{ color: counter.totals.netCash >= 0 ? "#10b981" : "#ef4444" }}>{formatCurrency(counter.totals.netCash)}</span></div>
                              </div>
                              {counter.sales.length > 0 && (
                                <details style={{ fontSize: windowWidth <= 768 ? "9px" : "10px" }}>
                                  <summary style={{ cursor: "pointer", fontWeight: "bold", marginBottom: "4px" }}>📋 Invoice Details ({counter.sales.length})</summary>
                                  <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                                    {counter.sales.slice(0, 10).map((s, i) => (
                                      <div key={i} style={{ padding: "2px 0", borderBottom: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between" }}>
                                        <span>{s.invoiceNo}</span>
                                        <span>{formatCurrency(s.netTotal)}</span>
                                      </div>
                                    ))}
                                    {counter.sales.length > 10 && <div style={{ padding: "2px 0", color: "#666" }}>+{counter.sales.length - 10} more...</div>}
                                  </div>
                                </details>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f1f5f9", borderTop: "2px solid #e0e0e0", fontWeight: "bold", position: "sticky", bottom: 0 }}>
                  <tr>
                    <td style={{ padding: "6px 4px" }}>Total</td>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}>{counters.reduce((sum, c) => sum + c.counts.sales, 0)}</td>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}>{counters.reduce((sum, c) => sum + c.counts.items, 0)}</td>
                    <td style={{ padding: "6px 4px", textAlign: "right", color: "#10b981" }}>{formatCurrency(todayTotals.totalSales)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* COLUMN 2 - Today's Summary */}
        <div style={{ 
          flex: windowWidth <= 1024 ? "auto" : 1, 
          minWidth: windowWidth <= 768 ? "auto" : "260px", 
          background: "white", 
          borderRadius: "12px", 
          overflow: "hidden", 
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", 
          display: "flex", 
          flexDirection: "column",
          maxHeight: windowWidth <= 1024 ? "400px" : "100%"
        }}>
          <div style={{ background: "#f59e0b", color: "white", padding: "8px 12px", fontWeight: "bold", fontSize: windowWidth <= 768 ? "12px" : "13px", textAlign: "center", flexShrink: 0 }}>
            📈 Today's Summary — {summaryDate}
          </div>
          
          <div style={{ padding: "12px", flex: 1, overflowY: "auto", minHeight: 0 }}>
            <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "10px", padding: "12px", marginBottom: "12px", color: "white" }}>
              <div style={{ fontSize: windowWidth <= 768 ? "10px" : "11px", opacity: 0.9 }}>💰 Total Sales</div>
              <div style={{ fontSize: windowWidth <= 768 ? "20px" : "24px", fontWeight: "bold" }}>{formatCurrency(todayTotals.totalSales)}</div>
              <div style={{ fontSize: windowWidth <= 768 ? "9px" : "10px", opacity: 0.8, marginTop: "4px" }}>{todayTotals.totalInvoices} Invoices | {todayTotals.totalItems} Items</div>
            </div>
            
            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "10px", fontSize: windowWidth <= 768 ? "11px" : "12px", color: "#1e3a5f" }}>💳 Payment Breakdown</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: windowWidth <= 768 ? "10px" : "11px" }}>
                <span>💰 Cash</span>
                <span style={{ fontWeight: "bold", color: "#10b981" }}>{formatCurrency(todayTotals.totalCash)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: windowWidth <= 768 ? "10px" : "11px" }}>
                <span>📝 Credit</span>
                <span style={{ fontWeight: "bold", color: "#ef4444" }}>{formatCurrency(todayTotals.totalCredit)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: windowWidth <= 768 ? "10px" : "11px" }}>
                <span>🏦 Bank</span>
                <span style={{ fontWeight: "bold", color: "#3b82f6" }}>{formatCurrency(todayTotals.totalBank)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: windowWidth <= 768 ? "10px" : "11px" }}>
                <span>📄 Cheque</span>
                <span style={{ fontWeight: "bold", color: "#8b5cf6" }}>{formatCurrency(todayTotals.totalCheque)}</span>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div style={{ background: "#fef3c7", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: windowWidth <= 768 ? "9px" : "10px", color: "#666" }}>📦 Purchases</div>
                <div style={{ fontSize: windowWidth <= 768 ? "16px" : "18px", fontWeight: "bold", color: "#f59e0b" }}>{formatCurrency(todayTotals.totalPurchases)}</div>
              </div>
              <div style={{ background: "#fee2e2", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: windowWidth <= 768 ? "9px" : "10px", color: "#666" }}>↩️ Returns</div>
                <div style={{ fontSize: windowWidth <= 768 ? "16px" : "18px", fontWeight: "bold", color: "#ef4444" }}>{formatCurrency(todayTotals.totalReturns)}</div>
              </div>
            </div>
            
            <div style={{ 
              background: todayTotals.netCashFlow >= 0 ? "#d1fae5" : "#fee2e2", 
              borderRadius: "10px", 
              padding: "12px", 
              textAlign: "center", 
              marginBottom: "12px" 
            }}>
              <div style={{ fontSize: windowWidth <= 768 ? "9px" : "10px", color: "#666" }}>💵 Net Cash Flow</div>
              <div style={{ fontSize: windowWidth <= 768 ? "18px" : "20px", fontWeight: "bold", color: todayTotals.netCashFlow >= 0 ? "#10b981" : "#ef4444" }}>
                {todayTotals.netCashFlow >= 0 ? "+" : "-"}{formatCurrency(Math.abs(todayTotals.netCashFlow))}
              </div>
              <div style={{ fontSize: windowWidth <= 768 ? "8px" : "9px", color: "#666", marginTop: "4px" }}>
                Cash In: {formatCurrency(todayTotals.totalCash + todayTotals.totalBank + todayTotals.totalCheque)} | Cash Out: {formatCurrency(todayTotals.totalPurchases)}
              </div>
            </div>
            
            <div style={{ background: "#e0e7ff", borderRadius: "10px", padding: "10px" }}>
              <div style={{ fontSize: windowWidth <= 768 ? "9px" : "10px", fontWeight: "bold", marginBottom: "6px", color: "#1e3a5f" }}>📊 Quick Stats</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: windowWidth <= 768 ? "9px" : "10px" }}>
                <div>Avg Invoice: {formatCurrency(todayTotals.totalSales / (todayTotals.totalInvoices || 1))}</div>
                <div>Avg Items/Inv: {(todayTotals.totalItems / (todayTotals.totalInvoices || 1)).toFixed(1)}</div>
                <div>Credit Ratio: {((todayTotals.totalCredit / (todayTotals.totalSales || 1)) * 100).toFixed(1)}%</div>
                <div>Cash Ratio: {((todayTotals.totalCash / (todayTotals.totalSales || 1)) * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3 - Notes */}
        <div style={{ 
          flex: windowWidth <= 1024 ? "auto" : 0.8, 
          minWidth: windowWidth <= 768 ? "auto" : "240px", 
          background: "white", 
          borderRadius: "12px", 
          overflow: "hidden", 
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", 
          display: "flex", 
          flexDirection: "column",
          maxHeight: windowWidth <= 1024 ? "300px" : "100%"
        }}>
          <div style={{ background: "#1e3a5f", color: "white", padding: "8px 12px", fontWeight: "bold", fontSize: windowWidth <= 768 ? "12px" : "13px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span>📝</span> Daily Notes / Remarks
          </div>
          
          <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Add your daily notes here...

• Cash count summary
• Important observations
• Issues or comments
• Pending tasks
• Tomorrow's reminders"
              style={{ 
                width: "100%", 
                flex: 1,
                padding: "10px", 
                border: "1px solid #ddd", 
                borderRadius: "10px", 
                fontSize: windowWidth <= 768 ? "10px" : "11px", 
                fontFamily: "inherit", 
                resize: "none", 
                outline: "none",
                lineHeight: "1.5"
              }} 
            />
            
            <div style={{ marginTop: "10px", fontSize: windowWidth <= 768 ? "9px" : "10px", color: "#666", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
              <span>✏️ {notes.length} characters</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button 
                  onClick={() => {
                    const date = new Date().toLocaleString();
                    setNotes(prev => prev + `\n\n[${date}] `);
                  }} 
                  style={{ background: "#e0e7ff", border: "none", padding: "3px 8px", borderRadius: "5px", cursor: "pointer", fontSize: windowWidth <= 768 ? "8px" : "9px" }}
                >
                  📅 Add Timestamp
                </button>
                <button 
                  onClick={() => setNotes("")} 
                  style={{ background: "#fee2e2", border: "none", padding: "3px 8px", borderRadius: "5px", cursor: "pointer", fontSize: windowWidth <= 768 ? "8px" : "9px", color: "#dc2626" }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
          
          <div className="urdu-text" style={{
            padding: "8px",
            fontSize: windowWidth <= 768 ? "8px" : "9px",
            background: "#fefce8",
            borderTop: "1px solid #fde68a",
            color: "#78350f",
            lineHeight: "1.4",
            textAlign: "right",
            flexShrink: 0
          }}>
            {SHOP_INFO.urduTerms.split('\n').slice(0, 2).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#1e293b", color: "#94a3b8", padding: "8px 20px", textAlign: "center", fontSize: windowWidth <= 768 ? "8px" : "9px", flexShrink: 0 }}>
        <div>© {new Date().getFullYear()} Asim Electric Electronics & Solar House - All Rights Reserved</div>
        <div className="urdu-text" style={{ fontSize: windowWidth <= 768 ? "7px" : "8px", opacity: 0.7, marginTop: "2px" }}>
          {SHOP_INFO.devBy}
        </div>
      </div>
    </div>
  );
}