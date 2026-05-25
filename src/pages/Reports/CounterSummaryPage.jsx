// pages/Reports/CounterSummaryPage.jsx
import { useState, useEffect, useCallback } from "react";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../../styles/theme.css";
import "../../../styles/CounterSummaryPage.css";
import { SHOP_INFO } from "../../constants/shopInfo.js";

const isoDate = () => new Date().toISOString().split("T")[0];
const timeNow = () => new Date().toLocaleTimeString("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

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
      totalRawSales: 0,
      totalRawPurchases: 0,
      netCash: 0,
    },
  });
  const [selectedCounter, setSelectedCounter] = useState("all");
  const [expandedCounters, setExpandedCounters] = useState({});
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Update current time every second
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(timeNow()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch summary data
  const fetchSummary = async () => {
    setLoading(true);
    try {
      const [salesRes, returnsRes, purchasesRes, rawSalesRes, rawPurchasesRes, usersRes] = await Promise.all([
        api.get(EP.SALES.GET_ALL),
        api.get(EP.SALES.GET_ALL),
        api.get(EP.PURCHASES.GET_ALL),
        api.get(EP.RAW_SALES.GET_ALL),
        api.get(EP.RAW_PURCHASES.GET_ALL),
        api.get("/users"),
      ]);

      const dateStr = summaryDate;
      
      const sales = (salesRes.data.data || []).filter(
        (s) => s.saleType !== "return" && s.invoiceDate?.startsWith(dateStr)
      );
      
      const returns = (returnsRes.data.data || []).filter(
        (r) => (r.saleType === "return" || r.type === "return") && r.invoiceDate?.startsWith(dateStr)
      );
      
      const purchases = (purchasesRes.data.data || []).filter(
        (p) => p.invoiceDate?.startsWith(dateStr)
      );
      
      const rawSales = (rawSalesRes.data.data || []).filter(
        (rs) => rs.invoiceDate?.startsWith(dateStr)
      );
      
      const rawPurchases = (rawPurchasesRes.data.data || []).filter(
        (rp) => rp.invoiceDate?.startsWith(dateStr)
      );

      let users = [];
      if (usersRes.data && usersRes.data.data) {
        users = usersRes.data.data;
      } else {
        const uniqueUsers = new Set();
        sales.forEach(s => { if (s.username) uniqueUsers.add(s.username); });
        returns.forEach(r => { if (r.username) uniqueUsers.add(r.username); });
        purchases.forEach(p => { if (p.username) uniqueUsers.add(p.username); });
        users = Array.from(uniqueUsers).map(name => ({ username: name, name: name }));
      }

      const counters = users.map(user => {
        const userSales = sales.filter(s => s.username === user.username || s.userId === user._id);
        const userReturns = returns.filter(r => r.username === user.username || r.userId === user._id);
        const userPurchases = purchases.filter(p => p.username === user.username || p.userId === user._id);
        const userRawSales = rawSales.filter(rs => rs.username === user.username || rs.userId === user._id);
        const userRawPurchases = rawPurchases.filter(rp => rp.username === user.username || rp.userId === user._id);

        const salesTotal = userSales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
        const returnsTotal = userReturns.reduce((sum, r) => sum + (r.netTotal || 0), 0);
        const purchasesTotal = userPurchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
        const rawSalesTotal = userRawSales.reduce((sum, rs) => sum + (rs.netTotal || 0), 0);
        const rawPurchasesTotal = userRawPurchases.reduce((sum, rp) => sum + (rp.netTotal || 0), 0);
        
        const cashReceived = userSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
        const cashRefunded = userReturns.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
        const cashPaid = userPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        
        const netCash = cashReceived - cashRefunded - cashPaid;

        return {
          id: user._id || user.username,
          name: user.name || user.username,
          username: user.username,
          sales: userSales,
          returns: userReturns,
          purchases: userPurchases,
          rawSales: userRawSales,
          rawPurchases: userRawPurchases,
          totals: {
            sales: salesTotal,
            returns: returnsTotal,
            purchases: purchasesTotal,
            rawSales: rawSalesTotal,
            rawPurchases: rawPurchasesTotal,
            cashReceived,
            cashRefunded,
            cashPaid,
            netCash,
          },
          counts: {
            sales: userSales.length,
            returns: userReturns.length,
            purchases: userPurchases.length,
            rawSales: userRawSales.length,
            rawPurchases: userRawPurchases.length,
          },
        };
      });

      counters.sort((a, b) => a.name.localeCompare(b.name));

      const totals = counters.reduce(
        (acc, counter) => ({
          totalSales: acc.totalSales + counter.totals.sales,
          totalReturns: acc.totalReturns + counter.totals.returns,
          totalPurchases: acc.totalPurchases + counter.totals.purchases,
          totalRawSales: acc.totalRawSales + counter.totals.rawSales,
          totalRawPurchases: acc.totalRawPurchases + counter.totals.rawPurchases,
          netCash: acc.netCash + counter.totals.netCash,
        }),
        {
          totalSales: 0,
          totalReturns: 0,
          totalPurchases: 0,
          totalRawSales: 0,
          totalRawPurchases: 0,
          netCash: 0,
        }
      );

      setSummaryData({ counters, totals });
      showMsg("Data loaded successfully", "success");
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

  const toggleCounter = (counterId) => {
    setExpandedCounters(prev => ({
      ...prev,
      [counterId]: !prev[counterId],
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    summaryData.counters.forEach(counter => {
      allExpanded[counter.id] = true;
    });
    setExpandedCounters(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCounters({});
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-PK");
  };

  const filteredCounters = selectedCounter === "all" 
    ? summaryData.counters 
    : summaryData.counters.filter(c => c.id === selectedCounter);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const buildPrintHtml = () => {
    const urduFont = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
    const printDateTime = new Date().toLocaleString("en-PK", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const countersHtml = filteredCounters.map(counter => `
      <div class="print-counter-card">
        <div class="print-counter-header">
          <div class="print-counter-name">👤 ${counter.name}</div>
          <div class="print-counter-net ${counter.totals.netCash >= 0 ? 'positive' : 'negative'}">
            Net Cash: ${counter.totals.netCash >= 0 ? '+' : '-'}PKR ${formatCurrency(Math.abs(counter.totals.netCash))}
          </div>
        </div>
        <table class="print-table">
          <thead>
            <tr>
              <th>Transaction Type</th>
              <th>Count</th>
              <th>Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>💰 Sales</td><td>${counter.counts.sales}</td><td>${formatCurrency(counter.totals.sales)}</td></tr>
            <tr><td>↩️ Returns</td><td>${counter.counts.returns}</td><td class="negative">${formatCurrency(counter.totals.returns)}</td></tr>
            <tr><td>📦 Purchases</td><td>${counter.counts.purchases}</td><td class="negative">${formatCurrency(counter.totals.purchases)}</td></tr>
            <tr><td>🏭 Raw Sales</td><td>${counter.counts.rawSales}</td><td>${formatCurrency(counter.totals.rawSales)}</td></tr>
            <tr><td>🏭 Raw Purchases</td><td>${counter.counts.rawPurchases}</td><td class="negative">${formatCurrency(counter.totals.rawPurchases)}</td></tr>
          </tbody>
          <tfoot>
            <tr class="total-row"><td><strong>NET CASH FLOW</strong></td><td></td><td class="${counter.totals.netCash >= 0 ? 'positive' : 'negative'}"><strong>${counter.totals.netCash >= 0 ? '+' : '-'}PKR ${formatCurrency(Math.abs(counter.totals.netCash))}</strong></td></tr>
          </tfoot>
        </table>
      </div>
    `).join("");

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Counter Summary Report - ${SHOP_INFO.name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #000}
        .bismillah{font-family:${urduFont};font-size:28px;font-weight:bold;margin-bottom:10px;direction:rtl}
        .shop-name-urdu{font-family:${urduFont};font-size:22px;font-weight:bold;margin:5px 0;direction:rtl}
        .shop-name-en{font-size:16px;font-weight:bold;margin:5px 0}
        .shop-addr{font-size:11px;color:#444;margin:3px 0}
        .title{font-size:18px;font-weight:bold;margin:15px 0;padding:10px;background:#1e40af;color:#fff;text-align:center}
        .date-time{display:flex;justify-content:space-between;margin:10px 0;padding:8px;background:#f8fafc;border:1px solid #000}
        .print-counter-card{border:2px solid #000;margin-bottom:20px;border-radius:8px;overflow:hidden}
        .print-counter-header{display:flex;justify-content:space-between;padding:10px 15px;background:#f0f0f0;border-bottom:1px solid #000}
        .print-counter-name{font-weight:bold;font-size:14px}
        .print-counter-net{font-weight:bold;font-size:13px}
        .positive{color:#059669}
        .negative{color:#dc2626}
        .print-table{width:100%;border-collapse:collapse}
        .print-table th,.print-table td{padding:8px;border:1px solid #000;text-align:left}
        .print-table th{background:#333;color:#fff}
        .print-table td{text-align:right}
        .print-table td:first-child{text-align:left}
        .print-table td:nth-child(2){text-align:center}
        .total-row{background:#f0f0f0;font-weight:bold}
        .overall-totals{margin-top:20px;padding:15px;background:#f8fafc;border:2px solid #000;border-radius:8px}
        .overall-title{font-size:16px;font-weight:bold;margin-bottom:10px;text-align:center}
        .overall-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .overall-item{text-align:center;padding:10px}
        .overall-label{font-size:11px;color:#666}
        .overall-value{font-size:18px;font-weight:bold}
        .notes-section{margin-top:20px;padding:15px;border:2px solid #000;border-radius:8px;background:#fffbe6}
        .notes-title{font-weight:bold;margin-bottom:10px;font-size:14px}
        .notes-content{font-size:11px;line-height:1.5;min-height:80px;white-space:pre-wrap}
        .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#666}
        @media print{
          body{padding:10px}
          .no-print{display:none}
          .print-counter-card{break-inside:avoid}
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        <div class="shop-name-urdu">${SHOP_INFO.name}</div>
        <div class="shop-name-en">${SHOP_INFO.name.toUpperCase()}</div>
        <div class="shop-addr">${SHOP_INFO.address}</div>
        <div class="shop-addr">Ph: ${SHOP_INFO.phone1} | ${SHOP_INFO.phone2} | ${SHOP_INFO.phone3}</div>
      </div>
      <div class="title">COUNTER SUMMARY REPORT</div>
      <div class="date-time">
        <span>📅 Date: ${summaryDate}</span>
        <span>🕐 Printed: ${printDateTime}</span>
      </div>
      ${countersHtml}
      <div class="overall-totals">
        <div class="overall-title">📊 OVERALL TOTALS</div>
        <div class="overall-grid">
          <div class="overall-item"><div class="overall-label">Total Sales</div><div class="overall-value">PKR ${formatCurrency(summaryData.totals.totalSales)}</div></div>
          <div class="overall-item"><div class="overall-label">Total Returns</div><div class="overall-value negative">PKR ${formatCurrency(summaryData.totals.totalReturns)}</div></div>
          <div class="overall-item"><div class="overall-label">Total Purchases</div><div class="overall-value negative">PKR ${formatCurrency(summaryData.totals.totalPurchases)}</div></div>
          <div class="overall-item"><div class="overall-label">Raw Sales</div><div class="overall-value">PKR ${formatCurrency(summaryData.totals.totalRawSales)}</div></div>
          <div class="overall-item"><div class="overall-label">Raw Purchases</div><div class="overall-value negative">PKR ${formatCurrency(summaryData.totals.totalRawPurchases)}</div></div>
          <div class="overall-item"><div class="overall-label">Net Cash Flow</div><div class="overall-value ${summaryData.totals.netCash >= 0 ? 'positive' : 'negative'}">${summaryData.totals.netCash >= 0 ? '+' : '-'}PKR ${formatCurrency(Math.abs(summaryData.totals.netCash))}</div></div>
        </div>
      </div>
      <div class="notes-section">
        <div class="notes-title">📝 Notes / Remarks</div>
        <div class="notes-content">${notes || "No notes added."}</div>
      </div>
      <div class="footer">© ${new Date().getFullYear()} ${SHOP_INFO.name} | Developed by: Creative Babar / 03098325271</div>
    </body>
    </html>`;
  };

  return (
    <div className="cs-page">
      <div className="cs-header" style={{ background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)" }}>
        {/* Bismillah and Shop Name in Urdu */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <div style={{ 
            fontSize: "24px", 
            fontWeight: "bold", 
            fontFamily: "'Noto Nastaliq Urdu', 'Mehr Nastaliq', 'Jameel Noori Nastaleeq', serif",
            direction: "rtl",
            color: "#fff",
            marginBottom: "8px"
          }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <div style={{ 
            fontSize: "18px", 
            fontWeight: "bold", 
            fontFamily: "'Noto Nastaliq Urdu', 'Mehr Nastaliq', 'Jameel Noori Nastaleeq', serif",
            direction: "rtl",
            color: "#fff"
          }}>
            {SHOP_INFO.name}
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", marginTop: "4px" }}>
            {SHOP_INFO.address}
          </div>
        </div>
        
        <div className="cs-title-section">
          <h1 className="cs-title">📊 Counter Summary Report</h1>
        </div>
        
        <div className="cs-controls">
          <div className="cs-date-picker">
            <label>Select Date:</label>
            <input
              type="date"
              value={summaryDate}
              onChange={(e) => setSummaryDate(e.target.value)}
              className="cs-date-input"
            />
          </div>
          
          <div className="cs-counter-filter">
            <label>Filter by Counter:</label>
            <select
              value={selectedCounter}
              onChange={(e) => setSelectedCounter(e.target.value)}
              className="cs-filter-select"
            >
              <option value="all">All Counters</option>
              {summaryData.counters.map(counter => (
                <option key={counter.id} value={counter.id}>
                  {counter.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="cs-actions">
            <button onClick={expandAll} className="cs-btn cs-btn-secondary">📂 Expand All</button>
            <button onClick={collapseAll} className="cs-btn cs-btn-secondary">📁 Collapse All</button>
            <button onClick={fetchSummary} disabled={loading} className="cs-btn cs-btn-primary">
              {loading ? "Loading..." : "🔄 Refresh"}
            </button>
            <button onClick={handlePrint} disabled={loading || filteredCounters.length === 0} className="cs-btn cs-btn-print">
              🖨 Print
            </button>
          </div>
        </div>
      </div>

      {msg.text && (
        <div className={`cs-alert cs-alert-${msg.type}`}>
          {msg.text}
        </div>
      )}

      {/* Main Content Area - Two Columns */}
      <div style={{ display: "flex", gap: "20px", padding: "20px", flex: 1, minHeight: 0 }}>
        
        {/* Left Column - Counter Details */}
        <div style={{ flex: 2, overflow: "auto", minWidth: 0 }}>
          {/* Overall Summary Cards */}
          <div className="cs-summary-cards">
            <div className="cs-card cs-card-sales">
              <div className="cs-card-icon">💰</div>
              <div className="cs-card-content">
                <div className="cs-card-label">Total Sales</div>
                <div className="cs-card-value">PKR {formatCurrency(summaryData.totals.totalSales)}</div>
              </div>
            </div>
            
            <div className="cs-card cs-card-returns">
              <div className="cs-card-icon">↩️</div>
              <div className="cs-card-content">
                <div className="cs-card-label">Total Returns</div>
                <div className="cs-card-value">PKR {formatCurrency(summaryData.totals.totalReturns)}</div>
              </div>
            </div>
            
            <div className="cs-card cs-card-purchases">
              <div className="cs-card-icon">📦</div>
              <div className="cs-card-content">
                <div className="cs-card-label">Total Purchases</div>
                <div className="cs-card-value">PKR {formatCurrency(summaryData.totals.totalPurchases)}</div>
              </div>
            </div>
            
            <div className="cs-card cs-card-raw-sales">
              <div className="cs-card-icon">🏭</div>
              <div className="cs-card-content">
                <div className="cs-card-label">Raw Sales</div>
                <div className="cs-card-value">PKR {formatCurrency(summaryData.totals.totalRawSales)}</div>
              </div>
            </div>
            
            <div className="cs-card cs-card-raw-purchases">
              <div className="cs-card-icon">🏭</div>
              <div className="cs-card-content">
                <div className="cs-card-label">Raw Purchases</div>
                <div className="cs-card-value">PKR {formatCurrency(summaryData.totals.totalRawPurchases)}</div>
              </div>
            </div>
            
            <div className="cs-card cs-card-net">
              <div className="cs-card-icon">💵</div>
              <div className="cs-card-content">
                <div className="cs-card-label">Net Cash Flow</div>
                <div className="cs-card-value" style={{ color: summaryData.totals.netCash >= 0 ? "#10b981" : "#dc2626" }}>
                  PKR {formatCurrency(Math.abs(summaryData.totals.netCash))}
                  {summaryData.totals.netCash >= 0 ? " (Income)" : " (Expense)"}
                </div>
              </div>
            </div>
          </div>

          {/* Counter Details */}
          <div className="cs-counters-container">
            {loading && (
              <div className="cs-loading">
                <div className="cs-spinner"></div>
                <p>Loading summary data...</p>
              </div>
            )}

            {!loading && filteredCounters.length === 0 && (
              <div className="cs-empty-state">
                <div className="cs-empty-icon">📭</div>
                <p>No data found for {summaryDate}</p>
                <p className="cs-empty-sub">Try selecting a different date</p>
              </div>
            )}

            {filteredCounters.map((counter) => (
              <div key={counter.id} className="cs-counter-card">
                <div 
                  className="cs-counter-header"
                  onClick={() => toggleCounter(counter.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="cs-counter-info">
                    <div className="cs-counter-icon">👤</div>
                    <div className="cs-counter-details">
                      <h3 className="cs-counter-name">{counter.name}</h3>
                      <div className="cs-counter-stats">
                        <span className="cs-stat-badge cs-stat-sales">
                          📊 Sales: {counter.counts.sales} ({formatCurrency(counter.totals.sales)})
                        </span>
                        <span className="cs-stat-badge cs-stat-returns">
                          ↩️ Returns: {counter.counts.returns} ({formatCurrency(counter.totals.returns)})
                        </span>
                        <span className="cs-stat-badge cs-stat-purchases">
                          📦 Purchases: {counter.counts.purchases} ({formatCurrency(counter.totals.purchases)})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="cs-counter-net">
                    <span className="cs-net-label">Net Cash:</span>
                    <span className={`cs-net-value ${counter.totals.netCash >= 0 ? "positive" : "negative"}`}>
                      {counter.totals.netCash >= 0 ? "+" : "-"}PKR {formatCurrency(Math.abs(counter.totals.netCash))}
                    </span>
                    <div className="cs-expand-icon">
                      {expandedCounters[counter.id] ? "▲" : "▼"}
                    </div>
                  </div>
                </div>

                {expandedCounters[counter.id] && (
                  <div className="cs-counter-body">
                    {/* Sales Section */}
                    {counter.sales.length > 0 && (
                      <div className="cs-section">
                        <div className="cs-section-title">
                          <span className="cs-section-icon">💰</span>
                          <h4>Sales Transactions ({counter.sales.length})</h4>
                          <span className="cs-section-total">
                            Total: PKR {formatCurrency(counter.totals.sales)}
                          </span>
                        </div>
                        <div className="cs-table-wrapper">
                          <table className="cs-table">
                            <thead>
                              <tr>
                                <th>Invoice #</th>
                                <th>Time</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Received</th>
                                <th>Payment</th>
                              </tr>
                            </thead>
                            <tbody>
                              {counter.sales.map((sale, idx) => (
                                <tr key={sale._id || idx}>
                                  <td className="cs-invoice-no">{sale.invoiceNo}</td>
                                  <td>{sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString() : "-"}</td>
                                  <td>{sale.customerName || "COUNTER SALE"}</td>
                                  <td>{sale.items?.length || 0}</td>
                                  <td className="cs-amount">PKR {formatCurrency(sale.netTotal)}</td>
                                  <td className="cs-amount">PKR {formatCurrency(sale.paidAmount)}</td>
                                  <td>
                                    <span className={`cs-payment-badge cs-payment-${sale.paymentMode?.toLowerCase() || "cash"}`}>
                                      {sale.paymentMode || "Cash"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="cs-table-footer">
                                <td colSpan="4"><strong>Total</strong></td>
                                <td className="cs-amount"><strong>PKR {formatCurrency(counter.totals.sales)}</strong></td>
                                <td className="cs-amount"><strong>PKR {formatCurrency(counter.totals.cashReceived)}</strong></td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Returns Section */}
                    {counter.returns.length > 0 && (
                      <div className="cs-section">
                        <div className="cs-section-title cs-section-returns">
                          <span className="cs-section-icon">↩️</span>
                          <h4>Return Transactions ({counter.returns.length})</h4>
                          <span className="cs-section-total">
                            Total: PKR {formatCurrency(counter.totals.returns)}
                          </span>
                        </div>
                        <div className="cs-table-wrapper">
                          <table className="cs-table">
                            <thead>
                              <tr>
                                <th>Return #</th>
                                <th>Ref Invoice</th>
                                <th>Time</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Refunded</th>
                              </tr>
                            </thead>
                            <tbody>
                              {counter.returns.map((ret, idx) => (
                                <tr key={ret._id || idx}>
                                  <td className="cs-invoice-no">{ret.returnNo || ret.invoiceNo}</td>
                                  <td>{ret.saleInvNo || "-"}</td>
                                  <td>{ret.createdAt ? new Date(ret.createdAt).toLocaleTimeString() : "-"}</td>
                                  <td>{ret.customerName || "COUNTER SALE"}</td>
                                  <td>{ret.items?.length || 0}</td>
                                  <td className="cs-amount cs-negative">PKR {formatCurrency(ret.netTotal)}</td>
                                  <td className="cs-amount">PKR {formatCurrency(ret.paidAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="cs-table-footer">
                                <td colSpan="5"><strong>Total Returns</strong></td>
                                <td className="cs-amount cs-negative"><strong>PKR {formatCurrency(counter.totals.returns)}</strong></td>
                                <td className="cs-amount"><strong>PKR {formatCurrency(counter.totals.cashRefunded)}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Purchases Section */}
                    {counter.purchases.length > 0 && (
                      <div className="cs-section">
                        <div className="cs-section-title cs-section-purchases">
                          <span className="cs-section-icon">📦</span>
                          <h4>Purchase Transactions ({counter.purchases.length})</h4>
                          <span className="cs-section-total">
                            Total: PKR {formatCurrency(counter.totals.purchases)}
                          </span>
                        </div>
                        <div className="cs-table-wrapper">
                          <table className="cs-table">
                            <thead>
                              <tr>
                                <th>Purchase #</th>
                                <th>Time</th>
                                <th>Supplier</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Paid</th>
                              </tr>
                            </thead>
                            <tbody>
                              {counter.purchases.map((purchase, idx) => (
                                <tr key={purchase._id || idx}>
                                  <td className="cs-invoice-no">{purchase.invoiceNo}</td>
                                  <td>{purchase.createdAt ? new Date(purchase.createdAt).toLocaleTimeString() : "-"}</td>
                                  <td>{purchase.supplierName || "-"}</td>
                                  <td>{purchase.items?.length || 0}</td>
                                  <td className="cs-amount cs-negative">PKR {formatCurrency(purchase.netTotal)}</td>
                                  <td className="cs-amount">PKR {formatCurrency(purchase.paidAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="cs-table-footer">
                                <td colSpan="4"><strong>Total Purchases</strong></td>
                                <td className="cs-amount cs-negative"><strong>PKR {formatCurrency(counter.totals.purchases)}</strong></td>
                                <td className="cs-amount"><strong>PKR {formatCurrency(counter.totals.cashPaid)}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Raw Sales Section */}
                    {counter.rawSales.length > 0 && (
                      <div className="cs-section">
                        <div className="cs-section-title cs-section-raw">
                          <span className="cs-section-icon">🏭</span>
                          <h4>Raw Material Sales ({counter.rawSales.length})</h4>
                          <span className="cs-section-total">
                            Total: PKR {formatCurrency(counter.totals.rawSales)}
                          </span>
                        </div>
                        <div className="cs-table-wrapper">
                          <table className="cs-table">
                            <thead>
                              <tr>
                                <th>Invoice #</th>
                                <th>Time</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {counter.rawSales.map((sale, idx) => (
                                <tr key={sale._id || idx}>
                                  <td className="cs-invoice-no">{sale.invoiceNo}</td>
                                  <td>{sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString() : "-"}</td>
                                  <td>{sale.customerName || "-"}</td>
                                  <td>{sale.items?.length || 0}</td>
                                  <td className="cs-amount">PKR {formatCurrency(sale.netTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="cs-table-footer">
                                <td colSpan="4"><strong>Total Raw Sales</strong></td>
                                <td className="cs-amount"><strong>PKR {formatCurrency(counter.totals.rawSales)}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Raw Purchases Section */}
                    {counter.rawPurchases.length > 0 && (
                      <div className="cs-section">
                        <div className="cs-section-title cs-section-raw">
                          <span className="cs-section-icon">🏭</span>
                          <h4>Raw Material Purchases ({counter.rawPurchases.length})</h4>
                          <span className="cs-section-total">
                            Total: PKR {formatCurrency(counter.totals.rawPurchases)}
                          </span>
                        </div>
                        <div className="cs-table-wrapper">
                          <table className="cs-table">
                            <thead>
                              <tr>
                                <th>Invoice #</th>
                                <th>Time</th>
                                <th>Supplier</th>
                                <th>Items</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {counter.rawPurchases.map((purchase, idx) => (
                                <tr key={purchase._id || idx}>
                                  <td className="cs-invoice-no">{purchase.invoiceNo}</td>
                                  <td>{purchase.createdAt ? new Date(purchase.createdAt).toLocaleTimeString() : "-"}</td>
                                  <td>{purchase.supplierName || "-"}</td>
                                  <td>{purchase.items?.length || 0}</td>
                                  <td className="cs-amount cs-negative">PKR {formatCurrency(purchase.netTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="cs-table-footer">
                                <td colSpan="4"><strong>Total Raw Purchases</strong></td>
                                <td className="cs-amount cs-negative"><strong>PKR {formatCurrency(counter.totals.rawPurchases)}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Counter Summary */}
                    <div className="cs-counter-summary">
                      <div className="cs-summary-grid">
                        <div className="cs-summary-item">
                          <div className="cs-summary-label">Total Sales Revenue</div>
                          <div className="cs-summary-value positive">+PKR {formatCurrency(counter.totals.sales)}</div>
                        </div>
                        <div className="cs-summary-item">
                          <div className="cs-summary-label">Total Returns</div>
                          <div className="cs-summary-value negative">-PKR {formatCurrency(counter.totals.returns)}</div>
                        </div>
                        <div className="cs-summary-item">
                          <div className="cs-summary-label">Total Purchases</div>
                          <div className="cs-summary-value negative">-PKR {formatCurrency(counter.totals.purchases)}</div>
                        </div>
                        <div className="cs-summary-item">
                          <div className="cs-summary-label">Raw Sales</div>
                          <div className="cs-summary-value positive">+PKR {formatCurrency(counter.totals.rawSales)}</div>
                        </div>
                        <div className="cs-summary-item">
                          <div className="cs-summary-label">Raw Purchases</div>
                          <div className="cs-summary-value negative">-PKR {formatCurrency(counter.totals.rawPurchases)}</div>
                        </div>
                        <div className="cs-summary-item cs-summary-total">
                          <div className="cs-summary-label">Net Cash Flow</div>
                          <div className={`cs-summary-value ${counter.totals.netCash >= 0 ? "positive" : "negative"}`}>
                            {counter.totals.netCash >= 0 ? "+" : "-"}PKR {formatCurrency(Math.abs(counter.totals.netCash))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Notes Section */}
        <div style={{ flex: 1, minWidth: "280px", maxWidth: "350px" }}>
          <div className="cs-notes-panel" style={{ 
            background: "#fffbe6", 
            border: "2px solid #f59e0b", 
            borderRadius: "12px", 
            overflow: "hidden",
            position: "sticky",
            top: "20px"
          }}>
            <div className="cs-notes-header" style={{ 
              background: "#f59e0b", 
              padding: "12px 16px", 
              color: "#fff",
              fontWeight: "bold",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>📝</span>
              <span>Notes / Remarks</span>
            </div>
            <div style={{ padding: "16px" }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes here...&#10;&#10;Examples:&#10;• Daily summary remarks&#10;• Important observations&#10;• Cash count notes&#10;• Any issues or comments"
                style={{
                  width: "100%",
                  minHeight: "300px",
                  padding: "12px",
                  border: "1px solid #f59e0b",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  resize: "vertical",
                  background: "#ffffff"
                }}
              />
              <div style={{ 
                marginTop: "12px", 
                fontSize: "11px", 
                color: "#92400e",
                background: "#fef3c7",
                padding: "8px",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>✏️ {notes.length} characters</span>
                <button 
                  onClick={() => setNotes("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#92400e",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "bold"
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="cs-quick-stats" style={{ 
            marginTop: "20px", 
            background: "#f0fdf4", 
            border: "2px solid #10b981", 
            borderRadius: "12px",
            overflow: "hidden"
          }}>
            <div className="cs-stats-header" style={{ 
              background: "#10b981", 
              padding: "10px 16px", 
              color: "#fff",
              fontWeight: "bold",
              fontSize: "13px"
            }}>
              📈 Quick Stats
            </div>
            <div style={{ padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>📅 Date:</span>
                <span style={{ fontWeight: "bold" }}>{summaryDate}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>🕐 Time:</span>
                <span style={{ fontWeight: "bold" }}>{currentTime}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>👥 Active Counters:</span>
                <span style={{ fontWeight: "bold" }}>{summaryData.counters.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>📊 Total Invoices:</span>
                <span style={{ fontWeight: "bold" }}>
                  {summaryData.counters.reduce((sum, c) => sum + c.counts.sales + c.counts.returns + c.counts.purchases, 0)}
                </span>
              </div>
              <div style={{ borderTop: "1px solid #d1fae5", marginTop: "8px", paddingTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>💵 Net Cash:</span>
                  <span style={{ fontWeight: "bold", color: summaryData.totals.netCash >= 0 ? "#059669" : "#dc2626" }}>
                    {summaryData.totals.netCash >= 0 ? "+" : "-"}PKR {formatCurrency(Math.abs(summaryData.totals.netCash))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="cs-footer">
        <div className="cs-footer-content">
          <p>Report generated on {new Date().toLocaleString()}</p>
          <p>© {new Date().getFullYear()} {SHOP_INFO.name} - All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}