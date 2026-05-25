// pages/Reports/CounterSummaryPage.jsx - CORRECTED (Sales and Purchases from different APIs)
import { useState, useEffect } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import { SHOP_INFO } from "../constants/shopInfo.js";
import { useNavigate } from "react-router-dom";

const isoDate = () => new Date().toISOString().split("T")[0];
const timeNow = () => new Date().toLocaleTimeString("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Urdu Font Family
const URDU_FONT_FAMILY = "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Alvi Nastaleeq', 'Mehr Nastaliq', 'Gulzar', serif";

export default function CounterSummaryPage() {
  const [summaryDate, setSummaryDate] = useState(isoDate());
  const [currentTime, setCurrentTime] = useState(timeNow());
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [summaryData, setSummaryData] = useState({
    counters: [],
    totals: {
      totalSales: 0,
      totalReturns: 0,
      totalPurchases: 0,
      netCash: 0,
    },
  });
  const [selectedCounter, setSelectedCounter] = useState("all");
  const [expandedCounters, setExpandedCounters] = useState({});
  const [msg, setMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Initialize data arrays
      let salesData = [];
      let purchasesData = [];

      // ========== 1. FETCH SALES FROM SALES API ==========
      try {
        const salesRes = await api.get(EP.SALES.GET_ALL);
        if (salesRes.data.success && salesRes.data.data) {
          salesData = salesRes.data.data;
          console.log("✅ Sales data loaded:", salesData.length, "records");
        } else {
          console.warn("Sales API returned no data");
        }
      } catch (err) {
        console.error("Failed to fetch sales:", err);
        showMsg("Could not fetch sales data", "warning");
      }

      // ========== 2. FETCH PURCHASES FROM PURCHASES API (Separate!) ==========
      try {
        const purchasesRes = await api.get(EP.PURCHASES.GET_ALL);
        if (purchasesRes.data.success && purchasesRes.data.data) {
          purchasesData = purchasesRes.data.data;
          console.log("✅ Purchases data loaded:", purchasesData.length, "records");
        } else {
          console.warn("Purchases API returned no data");
        }
      } catch (err) {
        console.error("Failed to fetch purchases:", err);
        showMsg("Could not fetch purchases data", "warning");
      }

      const dateStr = summaryDate;
      
      // ========== FILTER BY DATE ==========
      // Filter Sales (non-return sales only)
      const sales = salesData.filter(
        (s) => s.saleType !== "return" && s.type !== "return" && s.invoiceDate?.startsWith(dateStr)
      );
      
      // Filter Returns (from sales with return type)
      const returns = salesData.filter(
        (r) => (r.saleType === "return" || r.type === "return") && r.invoiceDate?.startsWith(dateStr)
      );
      
      // Filter Purchases - FROM PURCHASES API (NOT from sales!)
      const purchases = purchasesData.filter(
        (p) => p.invoiceDate?.startsWith(dateStr)
      );
      
      console.log(`📊 Date: ${dateStr} | Sales: ${sales.length} | Returns: ${returns.length} | Purchases: ${purchases.length}`);

      // ========== EXTRACT UNIQUE USERS ==========
      const uniqueUsers = new Set();
      sales.forEach(s => { if (s.username) uniqueUsers.add(s.username); });
      purchases.forEach(p => { if (p.username) uniqueUsers.add(p.username); });
      
      const users = Array.from(uniqueUsers).map(name => ({ username: name, name: name }));

      // ========== BUILD COUNTER DATA ==========
      const counters = users.map(user => {
        // Sales from SALES API
        const userSales = sales.filter(s => s.username === user.username);
        const userReturns = returns.filter(r => r.username === user.username);
        
        // Purchases from PURCHASES API (different data structure!)
        const userPurchases = purchases.filter(p => p.username === user.username);

        // Calculate totals
        const salesTotal = userSales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
        const returnsTotal = userReturns.reduce((sum, r) => sum + (r.netTotal || 0), 0);
        const purchasesTotal = userPurchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
        
        // Cash calculations
        const cashReceived = userSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
        const cashRefunded = userReturns.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
        const cashPaid = userPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        const netCash = cashReceived - cashRefunded - cashPaid;

        return {
          id: user.username,
          name: user.name,
          username: user.username,
          sales: userSales,
          returns: userReturns,
          purchases: userPurchases,  // This comes from PURCHASES API
          totals: { 
            sales: salesTotal, 
            returns: returnsTotal, 
            purchases: purchasesTotal,
            cashReceived, 
            cashRefunded, 
            cashPaid, 
            netCash 
          },
          counts: { 
            sales: userSales.length, 
            returns: userReturns.length, 
            purchases: userPurchases.length 
          },
        };
      });

      // Filter out counters with no activity
      const activeCounters = counters.filter(c => 
        c.counts.sales > 0 || c.counts.returns > 0 || c.counts.purchases > 0
      );
      activeCounters.sort((a, b) => a.name.localeCompare(b.name));

      // Calculate overall totals
      const totals = activeCounters.reduce((acc, c) => ({
        totalSales: acc.totalSales + c.totals.sales,
        totalReturns: acc.totalReturns + c.totals.returns,
        totalPurchases: acc.totalPurchases + c.totals.purchases,
        netCash: acc.netCash + c.totals.netCash,
      }), { totalSales: 0, totalReturns: 0, totalPurchases: 0, netCash: 0 });

      setSummaryData({ counters: activeCounters, totals });
      
      if (activeCounters.length === 0) {
        showMsg(`No data found for ${summaryDate}`, "info");
      } else {
        showMsg(`Loaded: ${activeCounters.length} counters`, "success");
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

  const filteredCounters = selectedCounter === "all" ? summaryData.counters : summaryData.counters.filter(c => c.id === selectedCounter);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Full Screen Urdu Header */}
      <div style={{ 
        background: "linear-gradient(135deg, #0a2b3e 0%, #064e3b 100%)", 
        padding: "60px 24px",
        textAlign: "center",
        borderBottom: "5px solid #fbbf24",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)",
          pointerEvents: "none"
        }} />
        
        <div style={{
          fontSize: "clamp(48px, 10vw, 80px)",
          fontWeight: "700",
          fontFamily: URDU_FONT_FAMILY,
          color: "#fbbf24",
          textShadow: "3px 3px 6px rgba(0,0,0,0.4)",
          marginBottom: "30px",
          letterSpacing: "6px",
          lineHeight: "1.5",
          direction: "rtl",
          background: "linear-gradient(135deg, #fbbf24 0%, #fcd34d 50%, #f59e0b 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
        
        <div style={{
          fontSize: "clamp(36px, 7vw, 64px)",
          fontWeight: "700",
          fontFamily: URDU_FONT_FAMILY,
          color: "white",
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
          marginBottom: "15px",
          direction: "rtl",
          lineHeight: "1.4"
        }}>
          عاصم الیکٹرک الیکٹرونکس اینڈ سولر ہاؤس
        </div>
        
        <div style={{
          fontSize: "clamp(30px, 6vw, 52px)",
          fontWeight: "700",
          fontFamily: URDU_FONT_FAMILY,
          color: "#fcd34d",
          textShadow: "1px 1px 3px rgba(0,0,0,0.3)",
          marginBottom: "20px",
          direction: "rtl",
          opacity: 0.9
        }}>
          عاصم الیکٹرک الیکٹرونکس اینڈ سولر ہاؤس
        </div>
        
        <div style={{
          fontSize: "clamp(16px, 2.5vw, 20px)",
          color: "#e2e8f0",
          fontFamily: URDU_FONT_FAMILY,
          maxWidth: "800px",
          margin: "0 auto 15px auto",
          direction: "rtl",
          lineHeight: "1.6"
        }}>
          مین بازار بخاری ٹاؤن، نزد بجلی گھر اسٹاپ، جڑانوالہ روڈ، فیصل آباد
        </div>
        
        <div style={{
          fontSize: "clamp(14px, 2vw, 17px)",
          color: "#cbd5e1",
          marginTop: "12px",
          display: "flex",
          justifyContent: "center",
          gap: "30px",
          flexWrap: "wrap",
          fontWeight: "500"
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>📞 Faqir Hussain 0300 7262129</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>📞 PTCL 041 8711575</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>📞 Shop 0315 7262129</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={{ background: "white", padding: "16px 24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid #e0e0e0", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f7fa", padding: "6px 14px", borderRadius: "20px" }}>
          <span style={{ fontSize: "14px" }}>📅</span>
          <input type="date" value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} style={{ border: "none", background: "transparent", fontSize: "13px", fontWeight: "500", outline: "none" }} />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f7fa", padding: "6px 14px", borderRadius: "20px" }}>
          <span style={{ fontSize: "14px" }}>👥</span>
          <select value={selectedCounter} onChange={(e) => setSelectedCounter(e.target.value)} style={{ border: "none", background: "transparent", fontSize: "13px", fontWeight: "500", outline: "none", cursor: "pointer" }}>
            <option value="all">All Counters</option>
            {summaryData.counters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => setExpandedCounters(Object.fromEntries(summaryData.counters.map(c => [c.id, true])))} style={{ background: "#e8f0fe", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>📂 Expand All</button>
          <button onClick={() => setExpandedCounters({})} style={{ background: "#e8f0fe", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>📁 Collapse All</button>
          <button onClick={fetchSummary} disabled={loading} style={{ background: "#1e3a5f", color: "white", border: "none", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>⟳ Refresh</button>
        </div>
      </div>

      {/* Date and Time Bar */}
      <div style={{ background: "#f8fafc", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
        <div>📋 Report Date: <strong>{summaryDate}</strong></div>
        <div>🕐 Current Time: <strong>{currentTime}</strong></div>
      </div>

      {msg.text && (
        <div style={{ margin: "16px 24px", padding: "10px 16px", borderRadius: "8px", background: msg.type === "success" ? "#d4edda" : msg.type === "error" ? "#f8d7da" : "#fff3cd", color: msg.type === "success" ? "#155724" : msg.type === "error" ? "#721c24" : "#856404", fontSize: "13px" }}>
          {msg.text}
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: "flex", gap: "24px", padding: "24px", flexWrap: "wrap" }}>
        
        {/* Left Column */}
        <div style={{ flex: "2.5", minWidth: "300px" }}>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "white", borderRadius: "16px", padding: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: "4px solid #10b981" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>💰 Total Sales</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>{formatCurrency(summaryData.totals.totalSales)}</div>
            </div>
            <div style={{ background: "white", borderRadius: "16px", padding: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: "4px solid #ef4444" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>↩️ Total Returns</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}>{formatCurrency(summaryData.totals.totalReturns)}</div>
            </div>
            <div style={{ background: "white", borderRadius: "16px", padding: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: "4px solid #f59e0b" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>📦 Total Purchases</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>{formatCurrency(summaryData.totals.totalPurchases)}</div>
            </div>
            <div style={{ background: "white", borderRadius: "16px", padding: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: "4px solid #1e3a5f" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>💵 Net Cash Flow</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: summaryData.totals.netCash >= 0 ? "#10b981" : "#ef4444" }}>{formatCurrency(Math.abs(summaryData.totals.netCash))} {summaryData.totals.netCash >= 0 ? "📈" : "📉"}</div>
            </div>
          </div>

          {/* Counter Cards */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px" }}>Loading...</div>
          ) : filteredCounters.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px", color: "#999" }}>No data found for selected date</div>
          ) : (
            filteredCounters.map(counter => (
              <div key={counter.id} style={{ background: "white", borderRadius: "16px", marginBottom: "20px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <div onClick={() => toggleCounter(counter.id)} style={{ padding: "18px 24px", background: "#f8fafc", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: expandedCounters[counter.id] ? "2px solid #e0e0e0" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <div style={{ width: "48px", height: "48px", background: "#1e3a5f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>👤</div>
                    <div>
                      <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a5f" }}>{counter.name}</div>
                      <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "12px", flexWrap: "wrap" }}>
                        <span style={{ color: "#10b981" }}>💰 Sales: {counter.counts.sales}</span>
                        <span style={{ color: "#ef4444" }}>↩️ Returns: {counter.counts.returns}</span>
                        <span style={{ color: "#f59e0b" }}>📦 Purchases: {counter.counts.purchases}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: counter.totals.netCash >= 0 ? "#10b981" : "#ef4444" }}>
                      {counter.totals.netCash >= 0 ? "+" : "-"}{formatCurrency(Math.abs(counter.totals.netCash))}
                    </div>
                    <div style={{ fontSize: "11px", color: "#666" }}>Net Cash</div>
                  </div>
                </div>

                {expandedCounters[counter.id] && (
                  <div style={{ padding: "20px 24px", background: "white" }}>
                    {/* Stats Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #eee" }}>
                      <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", color: "#666" }}>Sales Revenue</div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>{formatCurrency(counter.totals.sales)}</div>
                      </div>
                      <div style={{ background: "#fef2f2", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", color: "#666" }}>Returns</div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444" }}>{formatCurrency(counter.totals.returns)}</div>
                      </div>
                      <div style={{ background: "#fefce8", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", color: "#666" }}>Cash Received</div>
                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#10b981" }}>{formatCurrency(counter.totals.cashReceived)}</div>
                      </div>
                      <div style={{ background: "#fef3c7", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", color: "#666" }}>Purchases (Expense)</div>
                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f59e0b" }}>{formatCurrency(counter.totals.purchases)}</div>
                      </div>
                    </div>

                    {/* Sales Table */}
                    {counter.sales.length > 0 && (
                      <div style={{ marginBottom: "24px" }}>
                        <div style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid #10b981", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>💰</span> Sales ({counter.sales.length})
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                            <thead><tr style={{ background: "#f8fafc", borderBottom: "2px solid #e0e0e0" }}>
                              <th style={{ padding: "10px", textAlign: "left" }}>Invoice #</th>
                              <th style={{ padding: "10px", textAlign: "left" }}>Customer</th>
                              <th style={{ padding: "10px", textAlign: "center" }}>Items</th>
                              <th style={{ padding: "10px", textAlign: "right" }}>Total</th>
                            </tr></thead>
                            <tbody>
                              {counter.sales.slice(0, 20).map((s, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                  <td style={{ padding: "10px", fontWeight: "500" }}>{s.invoiceNo}</td>
                                  <td style={{ padding: "10px" }}>{s.customerName || "COUNTER SALE"}</td>
                                  <td style={{ padding: "10px", textAlign: "center" }}>{s.items?.length || 0}</td>
                                  <td style={{ padding: "10px", textAlign: "right", fontWeight: "500" }}>{formatCurrency(s.netTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Purchases Table - FROM PURCHASES API */}
                    {counter.purchases.length > 0 && (
                      <div style={{ marginBottom: "24px" }}>
                        <div style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid #f59e0b", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>📦</span> Purchase Transactions ({counter.purchases.length})
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                            <thead><tr style={{ background: "#f8fafc", borderBottom: "2px solid #e0e0e0" }}>
                              <th style={{ padding: "10px", textAlign: "left" }}>Purchase #</th>
                              <th style={{ padding: "10px", textAlign: "left" }}>Supplier</th>
                              <th style={{ padding: "10px", textAlign: "center" }}>Items</th>
                              <th style={{ padding: "10px", textAlign: "right" }}>Total</th>
                            </tr></thead>
                            <tbody>
                              {counter.purchases.slice(0, 20).map((p, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                  <td style={{ padding: "10px", fontWeight: "500" }}>{p.invoiceNo}</td>
                                  <td style={{ padding: "10px" }}>{p.supplierName || "-"}</td>
                                  <td style={{ padding: "10px", textAlign: "center" }}>{p.items?.length || 0}</td>
                                  <td style={{ padding: "10px", textAlign: "right", color: "#f59e0b", fontWeight: "500" }}>{formatCurrency(p.netTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Summary Footer */}
                    <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "2px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: "#f8fafc", padding: "15px", borderRadius: "12px" }}>
                      <div><span style={{ color: "#666" }}>Net Cash:</span> <strong style={{ fontSize: "16px", color: counter.totals.netCash >= 0 ? "#10b981" : "#ef4444" }}>{counter.totals.netCash >= 0 ? "+" : "-"}{formatCurrency(Math.abs(counter.totals.netCash))}</strong></div>
                      <div><span style={{ color: "#666" }}>Cash Received:</span> <strong style={{ color: "#10b981" }}>{formatCurrency(counter.totals.cashReceived)}</strong></div>
                      <div><span style={{ color: "#666" }}>Cash Paid:</span> <strong style={{ color: "#f59e0b" }}>{formatCurrency(counter.totals.cashPaid)}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Column - Notes Panel */}
        <div style={{ flex: "1", minWidth: "280px" }}>
          <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden", position: "sticky", top: "20px" }}>
            <div style={{ background: "#1e3a5f", color: "white", padding: "14px 18px", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📝</span> Daily Notes / Remarks
            </div>
            <div style={{ padding: "16px" }}>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Add your daily notes here...\n\n• Cash count summary\n• Important observations\n• Issues or comments" 
                style={{ width: "100%", minHeight: "280px", padding: "12px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "12px", fontFamily: "inherit", resize: "vertical", outline: "none" }} 
              />
              <div style={{ marginTop: "12px", fontSize: "11px", color: "#666", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>✏️ {notes.length} characters</span>
                <button onClick={() => setNotes("")} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px" }}>Clear</button>
              </div>
            </div>
          </div>

          {/* Quick Info Card */}
          <div style={{ background: "white", borderRadius: "16px", marginTop: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ background: "#f59e0b", color: "white", padding: "12px 18px", fontWeight: "bold", fontSize: "13px" }}>ℹ️ Quick Info</div>
            <div style={{ padding: "14px", fontSize: "12px", lineHeight: "1.8" }}>
              <div><strong>Total Counters:</strong> {summaryData.counters.length}</div>
              <div><strong>Sales Invoices:</strong> {summaryData.counters.reduce((s, c) => s + c.counts.sales, 0)}</div>
              <div><strong>Purchase Invoices:</strong> {summaryData.counters.reduce((s, c) => s + c.counts.purchases, 0)}</div>
              <div><strong>Returns:</strong> {summaryData.counters.reduce((s, c) => s + c.counts.returns, 0)}</div>
              <div><strong>Report Generated:</strong> {new Date().toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#1e293b", color: "#94a3b8", padding: "16px 24px", textAlign: "center", fontSize: "11px", marginTop: "20px" }}>
        <div style={{ marginBottom: "4px" }}>© {new Date().getFullYear()} {SHOP_INFO.name} - All Rights Reserved</div>
        <div style={{ fontSize: "10px", opacity: 0.7 }}>Developed by: Creative Babar / 03098325271</div>
      </div>
    </div>
  );
}